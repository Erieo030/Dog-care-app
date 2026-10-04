from copy import deepcopy

import pytest
from bson import ObjectId
from fastapi import HTTPException

from app.services import attachment_service


class FakeCollection:
    def __init__(self, items):
        self.items = items

    def find_one(self, query):
        return next(
            (item for item in self.items if all(item.get(key) == value for key, value in query.items())),
            None,
        )

    def update_one(self, query, update):
        item = self.find_one(query)
        if not item:
            return None
        item.update(deepcopy(update.get("$set", {})))
        for key in update.get("$unset", {}):
            item.pop(key, None)
        return None

    def find_one_and_update(self, query, update, return_document=True):
        item = self.find_one(query)
        if not item:
            return None
        item.update(deepcopy(update.get("$set", {})))
        for key in update.get("$unset", {}):
            item.pop(key, None)
        return deepcopy(item)


def test_avatar_attachment_is_bound_to_pet_and_uri_field_is_removed(monkeypatch):
    pet_id = ObjectId("6ab7749e0aef629ddd74d935")
    attachment_id = ObjectId("6aba06ef04d28475e4f2553c")
    pet = {"_id": pet_id, "userId": "user-1", "avatarUri": "file:///old/avatar.jpg"}
    attachment = {"_id": attachment_id, "petId": str(pet_id), "sourceType": None, "sourceId": None}
    monkeypatch.setattr(attachment_service.db, "pets", FakeCollection([pet]))
    monkeypatch.setattr(attachment_service.db, "attachments", FakeCollection([attachment]))

    updated = attachment_service.replace_pet_avatar(
        str(pet_id), "user-1", str(attachment_id), current_pet=pet, values={"name": "Kuro"}
    )

    assert updated["avatarAttachmentId"] == str(attachment_id)
    assert "avatarUri" not in updated
    assert attachment["sourceType"] == "avatar"
    assert attachment["sourceId"] == str(pet_id)


def test_avatar_attachment_from_another_pet_is_rejected(monkeypatch):
    pet_id = ObjectId("6ab7749e0aef629ddd74d935")
    other_pet_id = ObjectId("6ab7749e0aef629ddd74d936")
    attachment_id = ObjectId("6aba06ef04d28475e4f2553c")
    pet = {"_id": pet_id, "userId": "user-1"}
    attachment = {"_id": attachment_id, "petId": str(other_pet_id), "sourceType": None, "sourceId": None}
    monkeypatch.setattr(attachment_service.db, "pets", FakeCollection([pet]))
    monkeypatch.setattr(attachment_service.db, "attachments", FakeCollection([attachment]))

    with pytest.raises(HTTPException) as error:
        attachment_service.replace_pet_avatar(
            str(pet_id), "user-1", str(attachment_id), current_pet=pet, values={}
        )

    assert error.value.status_code == 422
