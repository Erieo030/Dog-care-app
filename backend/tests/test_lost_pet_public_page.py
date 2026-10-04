from datetime import datetime
from bson import ObjectId
from types import SimpleNamespace
import pytest
from fastapi import HTTPException

from app.schemas.lost_pet import LostPetProfileRequest
from app.services import lost_pet_service
from app.timezone import TAIPEI


def test_public_contact_requires_one_enabled_and_filled_channel():
    no_contact = LostPetProfileRequest(contactName="", contactPhone="")
    assert not lost_pet_service.has_public_contact(no_contact)

    hidden_phone = LostPetProfileRequest(contactName="", contactPhone="0912-345-678", showContactPhone=False)
    assert not lost_pet_service.has_public_contact(hidden_phone)

    public_email = LostPetProfileRequest(
        contactName="", contactPhone="", contactEmail="owner@example.com", showContactEmail=True
    )
    assert lost_pet_service.has_public_contact(public_email)

    public_alternate_phone = LostPetProfileRequest(
        contactName="", contactPhone="", alternatePhone="0987-654-321", showAlternatePhone=True
    )
    assert lost_pet_service.has_public_contact(public_alternate_phone)


def test_public_page_uses_safe_clickable_contact_and_localized_pet_details(monkeypatch):
    monkeypatch.setattr(
        lost_pet_service,
        "public",
        lambda _token: {
            "name": "Kuro <script>",
            "sex": "male",
            "isNeutered": False,
            "contactName": "Erie",
            "contactPhone": "+886 912-345-678",
            "contactEmail": "owner@example.com",
            "updatedAt": datetime(2026, 9, 28, 9, 30, tzinfo=TAIPEI),
            "lostMode": False,
        },
    )

    html = lost_pet_service.public_html("test-token")

    assert "Kuro &lt;script&gt;" in html
    assert "性別</span><strong>公</strong>" in html
    assert "結紮狀態</span><strong>未結紮</strong>" in html
    assert 'href="tel:+886912345678"' in html
    assert 'href="mailto:owner@example.com"' in html
    assert "資料更新於 2026/09/28 09:30" in html
    assert "最後更新時間會隨 App 同步" not in html


def test_public_profile_exposes_avatar_only_when_owner_enabled_it(monkeypatch):
    pet_id = ObjectId("6ab7749e0aef629ddd74d935")
    profile = {
        "petId": str(pet_id),
        "publicToken": "test-token",
        "enabled": True,
        "showAvatar": True,
        "showContactPhone": True,
        "contactPhone": "0912-345-678",
    }
    pet = {"_id": pet_id, "name": "Kuro", "avatarAttachmentId": "6aba06ef04d28475e4f2553c"}

    class Collection:
        def __init__(self, item):
            self.item = item

        def find_one(self, query):
            if query.get("publicToken") == "test-token" and self.item.get("enabled"):
                return self.item
            if query.get("_id") == pet_id:
                return pet
            return None

    monkeypatch.setattr(lost_pet_service.db, "lost_pet_profiles", Collection(profile))
    monkeypatch.setattr(lost_pet_service.db, "pets", Collection(pet))

    assert lost_pet_service.public("test-token")["avatarUrl"] == "/api/public/lost-pets/test-token/avatar"

    profile["showAvatar"] = False
    assert "avatarUrl" not in lost_pet_service.public("test-token")


def test_saving_disabled_public_profile_keeps_it_private(monkeypatch):
    pet_id = ObjectId("6ab7749e0aef629ddd74d935")
    pet = {"_id": pet_id, "userId": "user-1", "name": "Kuro"}

    class Pets:
        def find_one(self, query):
            return pet if query == {"_id": pet_id, "userId": "user-1"} else None

    class Profiles:
        def __init__(self):
            self.item = None

        def find_one(self, query):
            if "publicToken" in query:
                return self.item if self.item and self.item.get("publicToken") == query["publicToken"] and self.item.get("enabled") else None
            return self.item if self.item and self.item.get("petId") == query.get("petId") else None

        def insert_one(self, values):
            self.item = {"_id": ObjectId(), **values}
            return SimpleNamespace(inserted_id=self.item["_id"])

    profiles = Profiles()
    monkeypatch.setattr(lost_pet_service.db, "pets", Pets())
    monkeypatch.setattr(lost_pet_service.db, "lost_pet_profiles", profiles)

    saved = lost_pet_service.save(str(pet_id), "user-1", LostPetProfileRequest(enabled=False))

    assert saved["enabled"] is False
    with pytest.raises(HTTPException) as error:
        lost_pet_service.public(saved["publicToken"])
    assert error.value.status_code == 404


def test_cannot_change_another_users_public_profile(monkeypatch):
    pet_id = ObjectId("6ab7749e0aef629ddd74d935")

    class Pets:
        def find_one(self, _query):
            return None

    monkeypatch.setattr(lost_pet_service.db, "pets", Pets())

    with pytest.raises(HTTPException) as error:
        lost_pet_service.save(str(pet_id), "user-2", LostPetProfileRequest(enabled=True, contactPhone="0912345678"))
    assert error.value.status_code == 404
