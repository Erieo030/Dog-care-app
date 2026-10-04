from types import SimpleNamespace

import pytest
from bson import ObjectId
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.factory import create_app
from app.services import account_deletion_service, auth_service, auth_tokens


class Collection:
    def __init__(self, rows=None, events=None, name="collection"):
        self.rows = rows or []
        self.events = events if events is not None else []
        self.name = name

    def find_one(self, query):
        return next((row for row in self.rows if row.get("_id") == query.get("_id")), None)

    def find(self, query, *_args):
        if "userId" in query:
            return [row for row in self.rows if row.get("userId") == query["userId"]]
        return self.rows

    def delete_many(self, query):
        self.events.append((self.name, "delete_many", query))

    def delete_one(self, query):
        self.events.append((self.name, "delete_one", query))


def make_fake_db(user, events):
    pets = Collection([{"_id": ObjectId(), "userId": str(user["_id"])}], events, "pets")
    return SimpleNamespace(
        users=Collection([user], events, "users"),
        pets=pets,
        attachments=Collection([], events, "attachments"),
        daily_logs=Collection([], events, "daily_logs"),
        weight_records=Collection([], events, "weight_records"),
        health_events=Collection([], events, "health_events"),
        medical_visits=Collection([], events, "medical_visits"),
        vaccinations=Collection([], events, "vaccinations"),
        dewormings=Collection([], events, "dewormings"),
        medications=Collection([], events, "medications"),
        reminders=Collection([], events, "reminders"),
        timeline=Collection([], events, "timeline"),
        lost_pet_profiles=Collection([], events, "lost_pet_profiles"),
        ai_usage=Collection([], events, "ai_usage"),
        auth_sessions=Collection([], events, "auth_sessions"),
        export_jobs=Collection([], events, "export_jobs"),
    )


def test_delete_account_checks_password_before_deleting(monkeypatch):
    user_id = ObjectId()
    events = []
    user = {"_id": user_id, "email": "owner@example.com", "passwordHash": auth_service._hash_password("correct-password")}
    fake_db = make_fake_db(user, events)
    monkeypatch.setattr(account_deletion_service, "db", fake_db)

    with pytest.raises(HTTPException) as error:
        account_deletion_service.delete_account(str(user_id), "wrong-password")

    assert error.value.status_code == 403
    assert events == []


def test_delete_account_cleans_owned_records_then_deletes_user(monkeypatch):
    user_id = ObjectId()
    events = []
    user = {"_id": user_id, "email": "owner@example.com", "passwordHash": auth_service._hash_password("correct-password")}
    fake_db = make_fake_db(user, events)
    monkeypatch.setattr(account_deletion_service, "db", fake_db)
    monkeypatch.setattr("app.services.export_service.delete_user_exports", lambda _user_id: events.append(("exports", "delete")))
    monkeypatch.setattr("app.services.attachment_service.storage", SimpleNamespace(delete=lambda _key: None))

    account_deletion_service.delete_account(str(user_id), "correct-password")

    assert ("pets", "delete_many", {"userId": str(user_id)}) in events
    assert ("auth_sessions", "delete_many", {"userId": str(user_id)}) in events
    assert events[-1] == ("users", "delete_one", {"_id": user_id})


def test_delete_account_route_uses_authenticated_identity_without_user_id(monkeypatch):
    user_id = ObjectId()
    events = []
    user = {"_id": user_id, "email": "owner@example.com", "passwordHash": auth_service._hash_password("correct-password")}
    fake_db = make_fake_db(user, events)
    sessions = Collection([], events, "auth_sessions")
    sessions.insert_one = lambda row: sessions.rows.append(dict(row))

    def find_session(query, *_args):
        return next((row for row in sessions.rows if row.get("sessionId") == query.get("sessionId") and row.get("userId") == query.get("userId") and row.get("expiresAt") > query["expiresAt"]["$gt"]), None)

    sessions.find_one = find_session
    monkeypatch.setattr(auth_tokens, "get_settings", lambda: SimpleNamespace(
        auth_secret_key="test-only-random-secret-at-least-32-chars",
        access_token_minutes=15,
        refresh_token_days=7,
    ))
    monkeypatch.setattr(auth_tokens.db, "auth_sessions", sessions)
    monkeypatch.setattr(account_deletion_service, "db", fake_db)
    monkeypatch.setattr("app.services.export_service.delete_user_exports", lambda _user_id: None)
    monkeypatch.setattr("app.services.attachment_service.storage", SimpleNamespace(delete=lambda _key: None))

    _refresh, _lifetime, session_id = auth_tokens.issue_refresh_session(str(user_id))
    access, _ = auth_tokens.issue_access_token(str(user_id), session_id)
    response = TestClient(create_app()).post(
        "/api/account/delete",
        json={"password": "correct-password"},
        headers={"Authorization": f"Bearer {access}"},
    )

    assert response.status_code == 200
    assert events[-1] == ("users", "delete_one", {"_id": user_id})
