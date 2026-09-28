from datetime import datetime, timedelta, timezone
from bson import ObjectId

from app.schemas.ai import AIPeriod, AIContext, HealthMonitorResult
from app.services import ai_context_service
from app.services.ai.vet_brief_service import build_vet_brief

def test_vet_brief_schema_disclaimer():
    assert '診斷' in '本報告不代表疾病診斷'

def test_vet_brief_is_structured():
    # VetBriefService delegates ownership/data retrieval to AIContextService; schema contract is tested by API models.
    assert AIPeriod(days=7,startAt=datetime.now(timezone.utc),endAt=datetime.now(timezone.utc)).days == 7


class FakeCursor(list):
    def sort(self, key, direction=1):
        return FakeCursor(sorted(self, key=lambda item: item.get(key), reverse=direction < 0))

    def limit(self, count):
        return FakeCursor(self[:count])


class FakeCollection:
    def __init__(self, records=()):
        self.records = list(records)

    @staticmethod
    def _matches(record, query):
        for key, expected in query.items():
            if isinstance(expected, dict):
                value = record.get(key)
                if "$gte" in expected and (value is None or value < expected["$gte"]):
                    return False
                if "$lte" in expected and (value is None or value > expected["$lte"]):
                    return False
            elif record.get(key) != expected:
                return False
        return True

    def find(self, query, projection=None):
        return FakeCursor([record for record in self.records if self._matches(record, query)])

    def find_one(self, query):
        return next((record for record in self.records if self._matches(record, query)), None)

    def count_documents(self, query):
        return len(self.find(query))


class FakeDB:
    def __init__(self, collections):
        self.__dict__.update(collections)


def test_7_15_30_day_briefs_match_source_record_dates(monkeypatch):
    now = datetime(2026, 9, 28, 12, tzinfo=timezone.utc)
    pet_id = "0123456789abcdef01234567"
    offsets = [1, 6, 7, 8, 14, 15, 16, 29, 30, 31]
    weights, daily_logs, health_events = [], [], []
    for index, days_ago in enumerate(offsets):
        when = now - timedelta(days=days_ago)
        weights.append({"petId": pet_id, "measuredAt": when, "weightKg": 8 + index / 10})
        daily_logs.append({"_id": str(index), "petId": pet_id, "loggedAt": when, "waterLevel": "normal"})
        health_events.append({"_id": str(index), "petId": pet_id, "occurredAt": when, "type": "vomiting", "severity": "mild", "summary": f"event-{days_ago}"})

    fake_db = FakeDB({
        "pets": FakeCollection([{"_id": ObjectId(pet_id), "userId": "u1", "name": "Kuro"}]),
        "weight_records": FakeCollection(weights),
        "daily_logs": FakeCollection(daily_logs),
        "health_events": FakeCollection(health_events),
        "medical_visits": FakeCollection(),
        "medications": FakeCollection(),
        "vaccinations": FakeCollection(),
        "dewormings": FakeCollection(),
        "reminders": FakeCollection(),
    })
    monkeypatch.setattr(ai_context_service, "db", fake_db)
    monkeypatch.setattr(ai_context_service, "now_taipei", lambda: now)

    for days, expected_count in ((7, 3), (15, 6), (30, 9)):
        source = ai_context_service.build_context(pet_id, "u1", days)
        brief = build_vet_brief(pet_id, "u1", days, context_data=source, sections={"health", "daily", "weight"})
        expected_dates = [when for when in sorted([now - timedelta(days=offset) for offset in offsets]) if when >= now - timedelta(days=days)]
        assert brief.period.days == days
        assert brief.weightSummary["recordCount"] == expected_count
        assert brief.dailyLogSummary["recordCount"] == expected_count
        assert len(brief.recentHealthEvents) == expected_count
        assert [point["measuredAt"] for point in brief.weightSummary["series"]] == expected_dates
        assert [item["loggedAt"] for item in source["dailyLogs"]["recent"]] == expected_dates
        assert [event["occurredAt"] for event in brief.recentHealthEvents] == list(reversed(expected_dates))
        assert all((now - item["loggedAt"]).days <= days for item in source["dailyLogs"]["recent"])
        series = brief.weightSummary["series"]
        assert brief.weightSummary["latestWeightKg"] == series[-1]["weightKg"]
        assert brief.weightSummary["differenceKg"] == series[-1]["weightKg"] - series[-2]["weightKg"]
