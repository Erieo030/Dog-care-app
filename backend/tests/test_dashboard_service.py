from datetime import datetime, timedelta, timezone

from bson import ObjectId
from fastapi import HTTPException

from app.services import dashboard_service


class Cursor(list):
    def sort(self, keys):
        result = list(self)
        for key, direction in reversed(keys):
            result.sort(key=lambda item: item.get(key), reverse=direction < 0)
        return Cursor(result)

    def limit(self, count):
        return Cursor(self[:count])


class Collection:
    def __init__(self, records=()):
        self.records = list(records)

    @staticmethod
    def _matches(record, query):
        for key, expected in query.items():
            value = record.get(key)
            if isinstance(expected, dict):
                if "$gte" in expected and (value is None or value < expected["$gte"]):
                    return False
                if "$lte" in expected and (value is None or value > expected["$lte"]):
                    return False
                if "$lt" in expected and (value is None or value >= expected["$lt"]):
                    return False
                if "$in" in expected and value not in expected["$in"]:
                    return False
            elif value != expected:
                return False
        return True

    def find(self, query, projection=None):
        return Cursor(record for record in self.records if self._matches(record, query))

    def find_one(self, query, projection=None, sort=None):
        records = self.find(query)
        if sort:
            records = records.sort(sort)
        return records[0] if records else None

    def count_documents(self, query):
        return len(self.find(query))

    def aggregate(self, pipeline):
        match = pipeline[0]["$match"]
        filtered = [record for record in self.records if self._matches(record, match)]
        group_field = pipeline[1]["$group"]["_id"][1:]
        grouped = {}
        for record in filtered:
            key = record.get(group_field)
            grouped[key] = grouped.get(key, 0) + 1
        return [{"_id": key, "count": count} for key, count in grouped.items()]


class FakeDB:
    def __init__(self, **collections):
        self.__dict__.update(collections)


def make_db(pet_id, other_pet_id, now, include_records):
    pet_records = [
        {"_id": ObjectId(pet_id), "userId": "user-1", "name": "Kuro"},
        {"_id": ObjectId(other_pet_id), "userId": "user-2", "name": "Momo"},
    ]
    records = {name: [] for name in (
        "weight_records", "reminders", "health_events", "medical_visits",
        "vaccinations", "medications", "daily_logs",
    )}
    if include_records:
        yesterday = now - timedelta(days=1)
        records["weight_records"] = [
            {"_id": "w1", "petId": pet_id, "weightKg": 8.1, "measuredAt": yesterday},
            {"_id": "w2", "petId": pet_id, "weightKg": 8.0, "measuredAt": now},
            {"_id": "w3", "petId": other_pet_id, "weightKg": 20.0, "measuredAt": now},
        ]
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        records["reminders"] = [
            {"_id": "r1", "petId": pet_id, "type": "other", "title": "散步", "scheduledAt": today_start + timedelta(hours=9), "status": "pending"},
            {"_id": "r2", "petId": other_pet_id, "type": "other", "title": "other", "scheduledAt": today_start + timedelta(hours=9), "status": "pending"},
        ]
        records["health_events"] = [
            {"_id": "h1", "petId": pet_id, "type": "vomiting", "summary": "event", "severity": "mild", "occurredAt": yesterday},
            {"_id": "h2", "petId": other_pet_id, "type": "injury", "summary": "other", "severity": "mild", "occurredAt": now},
        ]
        records["medical_visits"] = [
            {"_id": "m1", "petId": pet_id, "visitedAt": yesterday, "reason": "檢查"},
            {"_id": "m2", "petId": other_pet_id, "visitedAt": now, "reason": "other"},
        ]
        records["vaccinations"] = [{"_id": "v1", "petId": pet_id, "administeredAt": yesterday, "vaccineName": "疫苗"}]
        records["medications"] = [{"_id": "d1", "petId": pet_id, "status": "active", "name": "藥物", "startDate": yesterday}]
        records["daily_logs"] = [{
            "_id": "l1", "petId": pet_id, "localDate": now.date().isoformat(), "loggedAt": yesterday,
            "waterLevel": "normal", "foodLevel": "normal", "energyLevel": "normal", "stoolLevel": "normal",
        }]
    return FakeDB(
        pets=Collection(pet_records),
        **{name: Collection(items) for name, items in records.items()},
    )


def test_dashboard_empty_state_has_zero_counts_and_empty_collections(monkeypatch):
    now = datetime(2026, 10, 4, 12, tzinfo=timezone.utc)
    pet_id, other_pet_id = "0123456789abcdef01234567", "1123456789abcdef01234567"
    monkeypatch.setattr(dashboard_service, "db", make_db(pet_id, other_pet_id, now, False))
    monkeypatch.setattr(dashboard_service, "now_taipei", lambda: now)
    monkeypatch.setattr(dashboard_service, "list_timeline", lambda *_args, **_kwargs: {"items": []})

    data = dashboard_service.get_dashboard(pet_id, "user-1", range_days=7)

    assert data["pet"]["name"] == "Kuro"
    assert data["todayReminders"] == {"items": [], "total": 0, "completed": 0, "pending": 0}
    assert data["weight"] == {"latest": None, "previous": None, "differenceKg": None, "change": None, "trend": []}
    assert data["todayDailyLog"] is None
    assert data["dailyRecords"] == []
    assert data["recentHealthEvents"] == []
    assert data["recentMedicalVisit"] is None
    assert data["currentMedications"] == []
    assert data["statistics30Days"] == {
        "healthEventCount": 0, "medicalVisitCount": 0, "reminderCount": 0,
        "reminderCompletedCount": 0, "reminderCompletionRate": 0,
    }
    assert set(data["healthEventCategories30Days"].values()) == {0}


def test_dashboard_large_and_other_pet_records_are_isolated(monkeypatch):
    now = datetime(2026, 10, 4, 12, tzinfo=timezone.utc)
    pet_id, other_pet_id = "0123456789abcdef01234567", "1123456789abcdef01234567"
    fake_db = make_db(pet_id, other_pet_id, now, True)
    # Exercise bounded result sections with many records; unrelated pet rows must never leak in.
    fake_db.health_events.records.extend({
        "_id": f"h{index}", "petId": pet_id, "type": "skin_issue", "summary": str(index),
        "severity": "mild", "occurredAt": now - timedelta(days=index % 20),
    } for index in range(30))
    fake_db.weight_records.records.extend({
        "_id": f"w{index}", "petId": pet_id, "weightKg": 8 + index / 100,
        "measuredAt": now - timedelta(days=index),
    } for index in range(100))
    monkeypatch.setattr(dashboard_service, "db", fake_db)
    monkeypatch.setattr(dashboard_service, "now_taipei", lambda: now)
    monkeypatch.setattr(dashboard_service, "list_timeline", lambda *_args, **_kwargs: {"items": []})

    data = dashboard_service.get_dashboard(pet_id, "user-1", range_days=7)

    assert data["pet"]["name"] == "Kuro"
    assert len(data["recentHealthEvents"]) == 5
    assert len(data["weight"]["trend"]) == 93  # The dashboard weight trend intentionally spans 90 days.
    assert all(point["weightKg"] < 20 for point in data["weight"]["trend"])
    assert data["todayReminders"]["total"] == 1
    assert data["statistics30Days"]["healthEventCount"] == 31
    assert data["statistics30Days"]["medicalVisitCount"] == 1
    assert data["healthEventCategories30Days"]["injury"] == 0
    assert data["healthEventCategories30Days"]["skin"] == 30


def test_dashboard_rejects_pet_owned_by_another_user(monkeypatch):
    now = datetime(2026, 10, 4, 12, tzinfo=timezone.utc)
    pet_id, other_pet_id = "0123456789abcdef01234567", "1123456789abcdef01234567"
    monkeypatch.setattr(dashboard_service, "db", make_db(pet_id, other_pet_id, now, False))

    try:
        dashboard_service.get_dashboard(other_pet_id, "user-1")
    except HTTPException as error:
        assert error.status_code == 404
    else:
        raise AssertionError("Dashboard must not return another user's pet data")
