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
