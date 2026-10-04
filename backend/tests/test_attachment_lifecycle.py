import asyncio
from copy import deepcopy
from datetime import timedelta
from io import BytesIO
from types import SimpleNamespace

import pytest
from bson import ObjectId
from fastapi import HTTPException, UploadFile
from fastapi.datastructures import Headers
from PIL import Image

from app.services import attachment_service as service
from app.timezone import now_taipei


class MemoryCollection:
    def __init__(self, records=(), insert_error=None):
        self.records = list(records)
        self.insert_error = insert_error

    @staticmethod
    def matches(record, query):
        for key, expected in query.items():
            value = record.get(key)
            if isinstance(expected, dict):
                if "$in" in expected and value not in expected["$in"]:
                    return False
                if "$lt" in expected and (value is None or value >= expected["$lt"]):
                    return False
            elif value != expected:
                return False
        return True

    def find_one(self, query):
        return next((item for item in self.records if self.matches(item, query)), None)

    def find(self, query, *_args):
        return [item for item in self.records if self.matches(item, query)]

    def insert_one(self, item):
        if self.insert_error:
            raise self.insert_error
        record = deepcopy(item)
        record["_id"] = ObjectId()
        self.records.append(record)
        return SimpleNamespace(inserted_id=record["_id"])

    def delete_one(self, query):
        self.records = [item for item in self.records if not self.matches(item, query)]


class MemoryStorage:
    def __init__(self):
        self.files = {}
        self.deleted = []

    def save(self, key, content):
        self.files[key] = content

    def delete(self, key):
        self.deleted.append(key)
        self.files.pop(key, None)

    def path(self, key):
        raise AssertionError("path is not used in this test")


def make_png(width=4, height=3):
    output = BytesIO()
    Image.new("RGB", (width, height), (120, 80, 40)).save(output, format="PNG")
    return output.getvalue()


def upload_file(content, mime="image/png", name="photo.png"):
    return UploadFile(
        file=BytesIO(content), filename=name,
        headers=Headers({"content-type": mime}),
    )


def setup_upload(monkeypatch, *, insert_error=None, owner=True):
    pet_id = ObjectId("6ab7749e0aef629ddd74d935")
    pet = {"_id": pet_id, "userId": "user-1"} if owner else None
    pets = MemoryCollection([pet] if pet else [])
    attachments = MemoryCollection(insert_error=insert_error)
    db = SimpleNamespace(pets=pets, attachments=attachments)
    storage = MemoryStorage()
    monkeypatch.setattr(service, "db", db)
    monkeypatch.setattr(service, "storage", storage)
    return str(pet_id), db, storage


def test_upload_stores_decoded_dimensions_not_client_supplied_values(monkeypatch):
    pet_id, db, storage = setup_upload(monkeypatch)

    result = asyncio.run(service.upload_attachment(
        pet_id, "user-1", upload_file(make_png(4, 3)), width=9999, height=9999,
    ))

    assert result["width"] == 4
    assert result["height"] == 3
    assert result["mimeType"] == "image/png"
    assert len(db.attachments.records) == 1
    assert len(storage.files) == 1


@pytest.mark.parametrize(
    "content,mime,status",
    [
        (b"not an image", "image/png", 415),
        (b"\x89PNG\r\n\x1a\ntruncated", "image/png", 415),
        (make_png(), "image/jpeg", 415),
    ],
)
def test_upload_rejects_invalid_or_mismatched_image_content(monkeypatch, content, mime, status):
    pet_id, db, storage = setup_upload(monkeypatch)

    with pytest.raises(HTTPException) as error:
        asyncio.run(service.upload_attachment(pet_id, "user-1", upload_file(content, mime)))

    assert error.value.status_code == status
    assert db.attachments.records == []
    assert storage.files == {}


def test_upload_rejects_oversize_before_storage(monkeypatch):
    pet_id, db, storage = setup_upload(monkeypatch)
    monkeypatch.setattr(service, "MAX_FILE_BYTES", 10)

    with pytest.raises(HTTPException) as error:
        asyncio.run(service.upload_attachment(pet_id, "user-1", upload_file(make_png())))

    assert error.value.status_code == 413
    assert db.attachments.records == []
    assert storage.files == {}


def test_upload_removes_file_if_metadata_insert_fails(monkeypatch):
    pet_id, db, storage = setup_upload(monkeypatch, insert_error=RuntimeError("db unavailable"))

    with pytest.raises(RuntimeError, match="db unavailable"):
        asyncio.run(service.upload_attachment(pet_id, "user-1", upload_file(make_png())))

    assert db.attachments.records == []
    assert storage.files == {}
    assert len(storage.deleted) == 1


def test_upload_rejects_pet_owned_by_another_user_before_reading_file(monkeypatch):
    pet_id, _db, _storage = setup_upload(monkeypatch, owner=False)
    file = upload_file(make_png())

    with pytest.raises(HTTPException) as error:
        asyncio.run(service.upload_attachment(pet_id, "user-1", file))

    assert error.value.status_code == 404
    assert file.file.tell() == 0


def test_source_attachment_serialization_is_scoped_to_record_and_pet(monkeypatch):
    pet_id = "6ab7749e0aef629ddd74d935"
    other_pet_id = "6ab7749e0aef629ddd74d936"
    record_id = ObjectId("6ab7749e0aef629ddd74d937")
    valid_id, other_pet_attachment_id, other_record_attachment_id = ObjectId(), ObjectId(), ObjectId()
    def attachment(attachment_id, record_pet_id, source_id):
        return {
            "_id": attachment_id, "petId": record_pet_id, "sourceType": "health_event",
            "sourceId": source_id, "mimeType": "image/png", "sizeBytes": 4,
        }

    db = SimpleNamespace(attachments=MemoryCollection([
        attachment(valid_id, pet_id, str(record_id)),
        attachment(other_pet_attachment_id, other_pet_id, str(record_id)),
        attachment(other_record_attachment_id, pet_id, str(ObjectId())),
    ]))
    monkeypatch.setattr(service, "db", db)
    record = {
        "_id": record_id, "petId": pet_id,
        "attachmentIds": [str(valid_id), str(other_pet_attachment_id), str(other_record_attachment_id)],
    }

    result = service.source_attachments(record, "health_event")

    assert [item["id"] for item in result] == [str(valid_id)]


def test_attachment_access_rejects_a_different_account(monkeypatch):
    attachment_id = ObjectId("6ab7749e0aef629ddd74d938")
    db = SimpleNamespace(attachments=MemoryCollection([{
        "_id": attachment_id, "petId": "6ab7749e0aef629ddd74d935", "storageKey": "private.png",
    }]))
    monkeypatch.setattr(service, "db", db)

    def reject_owner(_pet_id, _user_id):
        raise HTTPException(status_code=404, detail="找不到毛孩資料")

    monkeypatch.setattr(service, "ensure_owned_pet", reject_owner)

    with pytest.raises(HTTPException) as error:
        service._owned_attachment(str(attachment_id), "user-2")

    assert error.value.status_code == 404


def test_deleting_record_attachments_preserves_other_sources(monkeypatch):
    pet_id = "6ab7749e0aef629ddd74d935"
    attachments = MemoryCollection([
        {"_id": ObjectId(), "petId": pet_id, "sourceType": "health_event", "sourceId": "event-1", "storageKey": "event.png"},
        {"_id": ObjectId(), "petId": pet_id, "sourceType": "health_event", "sourceId": "event-2", "storageKey": "other-event.png"},
        {"_id": ObjectId(), "petId": "6ab7749e0aef629ddd74d936", "sourceType": "health_event", "sourceId": "event-1", "storageKey": "other-pet.png"},
    ])
    storage = MemoryStorage()
    storage.files = {item["storageKey"]: b"test" for item in attachments.records}
    monkeypatch.setattr(service, "db", SimpleNamespace(attachments=attachments))
    monkeypatch.setattr(service, "storage", storage)

    service.delete_source_attachments(pet_id, "health_event", "event-1")

    assert {item["storageKey"] for item in attachments.records} == {"other-event.png", "other-pet.png"}
    assert set(storage.files) == {"other-event.png", "other-pet.png"}


def test_pending_cleanup_only_removes_expired_unbound_files(monkeypatch):
    now = now_taipei()
    old_id, fresh_id, bound_id = ObjectId(), ObjectId(), ObjectId()
    old = {"_id": old_id, "sourceId": None, "storageKey": "old.png", "createdAt": now - timedelta(hours=25)}
    fresh = {"_id": fresh_id, "sourceId": None, "storageKey": "fresh.png", "createdAt": now}
    bound = {"_id": bound_id, "sourceId": "record-1", "storageKey": "bound.png", "createdAt": now - timedelta(days=3)}
    attachments = MemoryCollection([old, fresh, bound])
    storage = MemoryStorage()
    storage.files = {row["storageKey"]: b"test" for row in attachments.records}
    monkeypatch.setattr(service, "db", SimpleNamespace(attachments=attachments))
    monkeypatch.setattr(service, "storage", storage)
    monkeypatch.setattr(service, "now_taipei", lambda: now)

    service._cleanup_pending()

    assert [row["storageKey"] for row in attachments.records] == ["fresh.png", "bound.png"]
    assert storage.deleted == ["old.png"]
