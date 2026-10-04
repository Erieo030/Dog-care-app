from datetime import date, datetime

from bson import ObjectId

from app.services import ai_usage_service


class FakeUsers:
    def __init__(self, exists=True):
        self.exists = exists

    def find_one(self, *_args, **_kwargs):
        return {"_id": "user"} if self.exists else None


class FakeUsage:
    def __init__(self, rows):
        self.rows = rows

    def find(self, query, _projection):
        start = query["day"]["$gte"]
        end = query["day"]["$lte"]
        return [
            row for row in self.rows
            if row["userId"] == query["userId"] and start <= row["day"] <= end
        ]


def test_usage_history_fills_missing_days_and_excludes_other_users(monkeypatch):
    today = date(2026, 10, 4)
    user_id = str(ObjectId())
    monkeypatch.setattr(ai_usage_service, "now_taipei", lambda: datetime(2026, 10, 4))
    monkeypatch.setattr(ai_usage_service, "db", type("FakeDB", (), {})())
    ai_usage_service.db.users = FakeUsers()
    ai_usage_service.db.ai_usage = FakeUsage([
            {"userId": user_id, "day": "2026-10-04", "count": 3},
            {"userId": user_id, "day": "2026-10-02", "count": 2},
            {"userId": "another-user", "day": "2026-10-03", "count": 90},
            {"userId": user_id, "day": "2026-09-27", "count": 50},
        ])

    result = ai_usage_service.get_usage_history(user_id, 7)

    assert result["startDate"] == "2026-09-28"
    assert result["endDate"] == today.isoformat()
    assert result["dailyUsage"] == [
        {"date": "2026-10-04", "used": 3},
        {"date": "2026-10-03", "used": 0},
        {"date": "2026-10-02", "used": 2},
        {"date": "2026-10-01", "used": 0},
        {"date": "2026-09-30", "used": 0},
        {"date": "2026-09-29", "used": 0},
        {"date": "2026-09-28", "used": 0},
    ]
    assert result["totalUsed"] == 5


def test_usage_history_rejects_missing_user(monkeypatch):
    from fastapi import HTTPException
    import pytest

    monkeypatch.setattr(ai_usage_service, "db", type("FakeDB", (), {})())
    ai_usage_service.db.users = FakeUsers(exists=False)
    with pytest.raises(HTTPException) as error:
        ai_usage_service.get_usage_history(str(ObjectId()), 7)
    assert error.value.status_code == 404


def test_usage_history_bounds_requested_period(monkeypatch):
    monkeypatch.setattr(ai_usage_service, "now_taipei", lambda: datetime(2026, 10, 4))
    monkeypatch.setattr(ai_usage_service, "db", type("FakeDB", (), {})())
    ai_usage_service.db.users = FakeUsers()
    ai_usage_service.db.ai_usage = FakeUsage([])

    assert ai_usage_service.get_usage_history(str(ObjectId()), 0)["periodDays"] == 1
    assert ai_usage_service.get_usage_history(str(ObjectId()), 100)["periodDays"] == 30
