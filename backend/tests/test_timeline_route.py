from datetime import datetime, timezone
from types import SimpleNamespace

from bson import ObjectId

from app.api.routes import timeline
from app.services import timeline_service


def test_timeline_route_forwards_calendar_month_range(monkeypatch):
    start_at = datetime(2026, 8, 31, 16, tzinfo=timezone.utc)
    end_at = datetime(2026, 9, 30, 16, tzinfo=timezone.utc)
    captured = {}

    def fake_list_timeline(*args):
        captured["args"] = args
        return {"items": [], "hasMore": False, "nextSkip": 0}

    monkeypatch.setattr(timeline, "list_timeline", fake_list_timeline)
    result = timeline.get_timeline("pet-1", "user-1", 50, 0, None, start_at, end_at)

    assert result["data"]["items"] == []
    assert captured["args"] == ("pet-1", "user-1", 50, 0, None, start_at, end_at)


def test_calendar_route_forwards_timezone_and_range(monkeypatch):
    start_at = datetime(2026, 8, 31, 16, tzinfo=timezone.utc)
    end_at = datetime(2026, 9, 30, 16, tzinfo=timezone.utc)
    captured = {}

    def fake_get_calendar(*args):
        captured["args"] = args
        return {"days": []}

    monkeypatch.setattr(timeline, "get_timeline_calendar", fake_get_calendar)
    result = timeline.get_timeline_calendar_summary(
        "pet-1", "user-1", start_at, end_at, "Asia/Taipei"
    )

    assert result["data"] == {"days": []}
    assert captured["args"] == ("pet-1", "user-1", start_at, end_at, "Asia/Taipei")


def test_month_range_includes_scheduled_reminders(monkeypatch):
    start_at = datetime(2026, 8, 31, 16, tzinfo=timezone.utc)
    end_at = datetime(2026, 9, 30, 16, tzinfo=timezone.utc)
    reminder_id = ObjectId()
    captured = {}

    class TimelineCollection:
        def aggregate(self, pipeline):
            captured["pipeline"] = pipeline
            return []

    class ReminderCollection:
        def find(self, query):
            captured["reminder_query"] = query
            return [
                {
                    "_id": reminder_id,
                    "petId": "pet-1",
                    "scheduledAt": datetime(2026, 9, 2, 1, tzinfo=timezone.utc),
                    "title": "疫苗接種",
                    "status": "pending",
                }
            ]

    monkeypatch.setattr(timeline_service, "_ensure_owned_pet", lambda *_: None)
    monkeypatch.setattr(
        timeline_service,
        "db",
        SimpleNamespace(timeline=TimelineCollection(), reminders=ReminderCollection()),
    )

    result = timeline_service.list_timeline(
        "pet-1", "user-1", 50, 0, None, start_at, end_at
    )

    date_filter = captured["pipeline"][0]["$match"]["occurredAt"]
    assert date_filter == {"$gte": start_at, "$lt": end_at}
    assert captured["reminder_query"]["scheduledAt"] == {"$gte": start_at, "$lt": end_at}
    assert captured["reminder_query"]["status"] == {"$in": ["pending", "snoozed"]}
    assert result["items"][0]["sourceId"] == str(reminder_id)
    assert result["items"][0]["description"] == "待完成"


def test_timeline_batches_source_checks_and_skips_orphaned_entries(monkeypatch):
    source_ids = [ObjectId() for _ in range(3)]
    timeline_items = [
        {
            "_id": ObjectId(),
            "petId": "pet-1",
            "type": "health_event",
            "sourceType": "health_event",
            "sourceId": str(source_id),
            "occurredAt": datetime(2026, 9, 3 - index, tzinfo=timezone.utc),
            "title": f"事件 {index}",
            "description": "",
            "attachmentCount": 0,
        }
        for index, source_id in enumerate(source_ids)
    ]
    source_queries = []

    class TimelineCollection:
        def aggregate(self, pipeline):
            assert pipeline[-1].get("$project")
            return iter(timeline_items)

    class SourceCollection:
        def find(self, query, projection):
            source_queries.append(query)
            # The middle timeline entry points at a deleted source record.
            return [{"_id": source_ids[index], "petId": "pet-1"} for index in (0, 2)]

    monkeypatch.setattr(timeline_service, "_ensure_owned_pet", lambda *_: None)
    monkeypatch.setattr(
        timeline_service,
        "db",
        SimpleNamespace(timeline=TimelineCollection(), reminders=SimpleNamespace(find=lambda *_: [])),
    )
    monkeypatch.setattr(timeline_service, "SOURCE_COLLECTIONS", {"health_event": SourceCollection()})

    result = timeline_service.list_timeline("pet-1", "user-1", limit=2)

    assert [item["title"] for item in result["items"]] == ["事件 0", "事件 2"]
    assert result["hasMore"] is False
    assert len(source_queries) == 1
    assert set(source_queries[0]["_id"]["$in"]) == set(source_ids)


def test_timeline_page_stops_after_valid_lookahead(monkeypatch):
    consumed = 0

    def timeline_cursor():
        nonlocal consumed
        for index in range(100):
            consumed += 1
            source_id = ObjectId()
            yield {
                "_id": ObjectId(),
                "petId": "pet-1",
                "type": "life_event",
                "sourceType": "life_event",
                "sourceId": str(source_id),
                "occurredAt": datetime(2026, 9, 30, tzinfo=timezone.utc),
                "title": f"事件 {index}",
                "description": "",
                "attachmentCount": 0,
            }

    class TimelineCollection:
        def aggregate(self, _pipeline):
            return timeline_cursor()

    monkeypatch.setattr(timeline_service, "_ensure_owned_pet", lambda *_: None)
    monkeypatch.setattr(
        timeline_service,
        "db",
        SimpleNamespace(timeline=TimelineCollection(), reminders=SimpleNamespace(find=lambda *_: [])),
    )

    result = timeline_service.list_timeline("pet-1", "user-1", limit=2)

    assert len(result["items"]) == 2
    assert result["hasMore"] is True
    assert result["nextSkip"] == 2
    assert consumed == 3


def test_calendar_summary_groups_types_and_ignores_orphaned_source_records(monkeypatch):
    valid_health_id = ObjectId()
    missing_daily_id = ObjectId()
    captured = {}

    class TimelineCollection:
        def aggregate(self, pipeline):
            captured["timeline_pipeline"] = pipeline
            return [
                {"_id": {"date": "2026-09-02", "type": "health_event", "sourceType": "health_event"}, "sourceIds": [str(valid_health_id)]},
                {"_id": {"date": "2026-09-02", "type": "daily_log", "sourceType": "daily_log"}, "sourceIds": [str(missing_daily_id)]},
                {"_id": {"date": "2026-09-03", "type": "life_event", "sourceType": "life_event"}, "sourceIds": ["life-1"]},
            ]

    class ReminderCollection:
        def aggregate(self, pipeline):
            captured["reminder_pipeline"] = pipeline
            return [{"_id": "2026-09-04"}]

    class SourceCollection:
        def __init__(self, valid_ids):
            self.valid_ids = valid_ids

        def find(self, query, projection):
            return [{"_id": item} for item in self.valid_ids]

    monkeypatch.setattr(timeline_service, "_ensure_owned_pet", lambda *_: None)
    monkeypatch.setattr(
        timeline_service,
        "db",
        SimpleNamespace(timeline=TimelineCollection(), reminders=ReminderCollection()),
    )
    monkeypatch.setattr(
        timeline_service,
        "SOURCE_COLLECTIONS",
        {
            "health_event": SourceCollection([valid_health_id]),
            "daily_log": SourceCollection([]),
        },
    )

    start_at = datetime(2026, 8, 31, 16, tzinfo=timezone.utc)
    end_at = datetime(2026, 9, 30, 16, tzinfo=timezone.utc)
    result = timeline_service.get_timeline_calendar(
        "pet-1", "user-1", start_at, end_at, "Asia/Taipei"
    )

    assert result["days"] == [
        {"date": "2026-09-02", "types": ["health_event"]},
        {"date": "2026-09-03", "types": ["life_event"]},
        {"date": "2026-09-04", "types": ["reminder_completed"]},
    ]
    date_expression = captured["timeline_pipeline"][4]["$addFields"]["calendarDate"]["$dateToString"]
    assert date_expression["timezone"] == "Asia/Taipei"
    assert captured["reminder_pipeline"][0]["$match"]["status"]["$in"] == ["pending", "snoozed"]


def test_calendar_summary_rejects_invalid_timezone(monkeypatch):
    monkeypatch.setattr(timeline_service, "_ensure_owned_pet", lambda *_: None)

    try:
        timeline_service.get_timeline_calendar(
            "pet-1",
            "user-1",
            datetime(2026, 1, 1, tzinfo=timezone.utc),
            datetime(2026, 2, 1, tzinfo=timezone.utc),
            "Not/A_Timezone",
        )
    except Exception as error:
        assert getattr(error, "status_code", None) == 400
    else:
        raise AssertionError("invalid timezone should be rejected")
