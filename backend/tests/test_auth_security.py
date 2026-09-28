from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.factory import create_app
from app.services import auth_service, auth_tokens


class FakeSessions:
    def __init__(self):
        self.rows = {}

    def insert_one(self, row):
        self.rows[row["tokenHash"]] = dict(row)

    def find_one(self, query, *_args):
        for row in self.rows.values():
            if (
                row["sessionId"] == query["sessionId"]
                and row["userId"] == query["userId"]
                and row["expiresAt"] > query["expiresAt"]["$gt"]
            ):
                return row
        return None

    def find_one_and_update(self, query, update, return_document=None):
        row = self.rows.pop(query["tokenHash"], None)
        if not row or row["expiresAt"] <= query["expiresAt"]["$gt"]:
            return None
        row.update(update["$set"])
        self.rows[row["tokenHash"]] = row
        return row

    def delete_one(self, query):
        self.rows.pop(query["tokenHash"], None)


def test_password_hash_is_salted_and_verifiable():
    first = auth_service._hash_password("safe-password")
    second = auth_service._hash_password("safe-password")
    assert first.startswith("pbkdf2_sha256$")
    assert first != second
    assert auth_service._verify_password("safe-password", first)
    assert not auth_service._verify_password("wrong-password", first)


def test_refresh_rotation_and_logout_revoke_access(monkeypatch):
    sessions = FakeSessions()
    monkeypatch.setattr(auth_tokens, "get_settings", lambda: SimpleNamespace(
        auth_secret_key="test-only-random-secret-at-least-32-chars",
        access_token_minutes=15,
        refresh_token_days=7,
    ))
    monkeypatch.setattr(auth_tokens.db, "auth_sessions", sessions)

    refresh, _lifetime, session_id = auth_tokens.issue_refresh_session("user-1")
    original_expiry = next(iter(sessions.rows.values()))["expiresAt"]
    access, _ = auth_tokens.issue_access_token("user-1", session_id)
    assert auth_tokens.authenticate_request_token(f"Bearer {access}") == "user-1"

    user_id, next_access, next_refresh, _access_lifetime, _refresh_lifetime = auth_tokens.rotate_refresh_session(refresh)
    assert user_id == "user-1"
    assert next(iter(sessions.rows.values()))["expiresAt"] > original_expiry
    assert auth_tokens.authenticate_request_token(f"Bearer {next_access}") == "user-1"
    with pytest.raises(HTTPException):
        auth_tokens.rotate_refresh_session(refresh)

    auth_tokens.revoke_refresh_session(next_refresh)
    with pytest.raises(HTTPException):
        auth_tokens.verify_access_token(next_access)


def test_api_requires_auth_and_rejects_user_id_spoofing(monkeypatch):
    sessions = FakeSessions()
    monkeypatch.setattr(auth_tokens, "get_settings", lambda: SimpleNamespace(
        auth_secret_key="test-only-random-secret-at-least-32-chars",
        access_token_minutes=15,
        refresh_token_days=7,
    ))
    monkeypatch.setattr(auth_tokens.db, "auth_sessions", sessions)
    client = TestClient(create_app())
    missing = client.get("/api/ai/usage?userId=user-1")
    assert missing.status_code == 401

    _refresh, _lifetime, session_id = auth_tokens.issue_refresh_session("user-1")
    access, _ = auth_tokens.issue_access_token("user-1", session_id)
    spoofed = client.get(
        "/api/ai/usage?userId=somebody-else",
        headers={"Authorization": f"Bearer {access}"},
    )
    assert spoofed.status_code == 403
