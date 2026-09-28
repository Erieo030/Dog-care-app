from datetime import datetime

import pytest
from fastapi import HTTPException

from app.services import ai_data_consent_service as consent


class FakeUsers:
    def __init__(self):
        self.document = {"_id": consent.ObjectId("507f1f77bcf86cd799439011")}

    def find_one(self, query, projection):
        return self.document

    def update_one(self, query, update):
        self.document.update(update["$set"])

        class Result:
            matched_count = 1

        return Result()


def test_ai_consent_is_required_until_current_version_is_accepted(monkeypatch):
    users = FakeUsers()
    monkeypatch.setattr(consent, "_users_collection", lambda: users)
    user_id = "507f1f77bcf86cd799439011"

    with pytest.raises(HTTPException) as error:
        consent.require_current_consent(user_id)
    assert error.value.status_code == 403

    accepted = consent.accept_consent(user_id)
    assert accepted["accepted"] is True
    assert isinstance(accepted["acceptedAt"], datetime)
    assert consent.get_consent(user_id)["accepted"] is True
    consent.require_current_consent(user_id)


def test_accepting_an_older_policy_version_does_not_grant_current_consent(monkeypatch):
    users = FakeUsers()
    users.document["aiDataConsentVersion"] = "2026-01-01-v1"
    users.document["aiDataConsentAt"] = datetime(2026, 1, 1)
    monkeypatch.setattr(consent, "_users_collection", lambda: users)
    user_id = "507f1f77bcf86cd799439011"

    assert consent.get_consent(user_id)["accepted"] is False
    with pytest.raises(HTTPException) as error:
        consent.require_current_consent(user_id)
    assert error.value.status_code == 403
