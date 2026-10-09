from datetime import datetime, timezone
from io import BytesIO
from types import SimpleNamespace

import pytest
from bson import ObjectId
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from PIL import Image

from app.api.routes.attachments import router
from app.services import attachment_service, care_photo_service as service


class Collection:
    def __init__(self, records=()):
        self.records = list(records)

    def find(self, query, *_args):
        def matches(record):
            for key, expected in query.items():
                value = record.get(key)
                if isinstance(expected, dict):
                    if "$in" in expected and value not in expected["$in"]:
                        return False
                    if "$gte" in expected:
                        aware = value if value.tzinfo else value.replace(tzinfo=timezone.utc)
                        if not expected["$gte"] <= aware < expected["$lt"]:
                            return False
                elif value != expected:
                    return False
            return True
        return [row for row in self.records if matches(row)]


@pytest.fixture
def album(monkeypatch):
    pet_id = str(ObjectId())
    health_id, weight_id, visit_id = ObjectId(), ObjectId(), ObjectId()
    photos = [ObjectId() for _ in range(3)]
    at = datetime(2026, 9, 30, 16)  # naive UTC = 10/1 台灣零點
    records = {
        "health_events": [{"_id": health_id, "petId": pet_id, "occurredAt": at,
                           "summary": "皮膚觀察", "notes": "確認變化", "attachmentIds": [str(photos[0])]}],
        "weight_records": [{"_id": weight_id, "petId": pet_id, "measuredAt": at,
                            "weightKg": 8.1, "attachmentIds": [str(photos[1])]}],
        "medical_visits": [{"_id": visit_id, "petId": pet_id, "visitedAt": at,
                            "reason": "回診", "attachmentIds": [str(photos[2])]}],
    }
    attachments = [{"_id": photo_id, "petId": pet_id, "sourceType": source,
                    "sourceId": str(record_id), "createdAt": datetime(2026, 11, 1),
                    "mimeType": "image/jpeg", "sizeBytes": 10}
                   for photo_id, source, record_id in zip(
                       photos, ["health_event", "weight", "medical_visit"],
                       [health_id, weight_id, visit_id], strict=True)]
    db = SimpleNamespace(**{name: Collection(values) for name, values in records.items()},
                         attachments=Collection(attachments))
    monkeypatch.setattr(service, "db", db)
    monkeypatch.setattr(attachment_service, "ensure_owned_pet", lambda pid, uid: None)
    return pet_id, db


def test_album_uses_record_date_not_upload_date_and_normalizes_naive_utc(album):
    pet_id, _db = album
    result = service.list_care_photos(pet_id, "u1", "2026-10")
    assert result["total"] == 3
    assert all(photo["recordDate"] == "2026-10-01" for photo in result["items"])
    assert all(photo["recordAt"].endswith("+08:00") for photo in result["items"])
    assert all(photo["createdAt"].startswith("2026-11-01") for photo in result["items"])
    assert service.list_care_photos(pet_id, "u1", "2026-11")["items"] == []


def test_month_boundaries_are_exclusive_and_use_taipei(album):
    pet_id, db = album
    record = db.health_events.records[0]
    record["occurredAt"] = datetime(2026, 9, 30, 15, 59, 59)
    assert service.list_care_photos(pet_id, "u1", "2026-10", "health")["total"] == 0
    record["occurredAt"] = datetime(2026, 10, 31, 16)
    assert service.list_care_photos(pet_id, "u1", "2026-10", "health")["total"] == 0
    assert service.list_care_photos(pet_id, "u1", "2026-11", "health")["total"] == 1


@pytest.mark.parametrize("category", ["health", "weight", "medical"])
def test_category_filter_and_sensitive_flag(album, category):
    pet_id, _db = album
    photo = service.list_care_photos(pet_id, "u1", "2026-10", category)["items"][0]
    assert photo["category"] == category
    assert photo["sensitive"] == (category == "health")


def test_album_excludes_other_pets_pending_avatars_and_unlinked_photos(album):
    pet_id, db = album
    template = db.attachments.records[0]
    db.attachments.records.extend([
        {**template, "_id": ObjectId(), "petId": "other-pet"},
        {**template, "_id": ObjectId(), "sourceType": None, "sourceId": None},
        {**template, "_id": ObjectId(), "sourceType": "avatar", "sourceId": pet_id},
        {**template, "_id": ObjectId()},  # 不在來源的 attachmentIds 中
        {**template, "_id": ObjectId(), "sourceId": str(ObjectId())},
    ])
    assert service.list_care_photos(pet_id, "u1", "2026-10")["total"] == 3
    db.health_events.records.clear()
    assert service.list_care_photos(pet_id, "u1", "2026-10")["total"] == 2


def test_album_paginates_without_duplicate_photos(album):
    pet_id, _db = album
    first = service.list_care_photos(pet_id, "u1", "2026-10", limit=2)
    second = service.list_care_photos(pet_id, "u1", "2026-10", limit=2, skip=2)
    assert first["hasMore"] is True and second["hasMore"] is False
    assert len({photo["id"] for photo in first["items"] + second["items"]}) == 3


def test_album_checks_ownership_before_reading_any_records(monkeypatch):
    def deny(*_args):
        raise HTTPException(404, "找不到毛孩資料")
    monkeypatch.setattr(attachment_service, "ensure_owned_pet", deny)
    with pytest.raises(HTTPException) as error:
        service.list_care_photos("other-pet", "u2", "2026-10")
    assert error.value.status_code == 404


@pytest.mark.parametrize("month", ["2026-13", "2026-00", "1999-12", "2026-1", "not-a-month"])
def test_invalid_month_rejected(month):
    with pytest.raises(HTTPException) as error:
        service.month_bounds(month)
    assert error.value.status_code == 422


def test_album_endpoint_validates_filters_and_pagination(monkeypatch):
    monkeypatch.setattr(service, "list_care_photos", lambda *_args: {"items": [], "total": 0, "hasMore": False})
    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)
    assert client.get("/pets/p1/care-photos?userId=u1&month=2026-10").json()["data"]["total"] == 0
    for suffix in ["category=unknown", "skip=-1", "limit=101"]:
        assert client.get(f"/pets/p1/care-photos?userId=u1&month=2026-10&{suffix}").status_code == 422


def test_thumbnail_is_small_jpeg_and_uses_owned_content_lookup(tmp_path, monkeypatch):
    path = tmp_path / "photo.png"
    Image.new("RGBA", (1200, 600), (120, 80, 40, 100)).save(path)
    calls = []
    def owned_content(aid, uid):
        calls.append((aid, uid))
        return path, "image/png"
    monkeypatch.setattr(attachment_service, "attachment_content", owned_content)
    content = attachment_service.attachment_thumbnail("a1", "u1")
    with Image.open(BytesIO(content)) as thumbnail:
        assert thumbnail.size == (360, 180)
        assert thumbnail.format == "JPEG"
        assert not thumbnail.getexif()
    assert calls == [("a1", "u1")]


def test_thumbnail_corrects_camera_orientation_without_changing_original(tmp_path, monkeypatch):
    path = tmp_path / "camera.jpg"
    exif = Image.Exif()
    exif[274] = 6  # 相機直拍、像素橫放：順時針轉 90 度
    Image.new("RGB", (1200, 600), (120, 80, 40)).save(path, exif=exif)
    original = path.read_bytes()
    monkeypatch.setattr(attachment_service, "attachment_content", lambda *_args: (path, "image/jpeg"))
    with Image.open(BytesIO(attachment_service.attachment_thumbnail("a1", "u1"))) as thumbnail:
        assert thumbnail.size == (180, 360)
        assert not thumbnail.getexif()
    assert path.read_bytes() == original


def test_thumbnail_does_not_enlarge_small_images(tmp_path, monkeypatch):
    path = tmp_path / "small.png"
    Image.new("RGB", (80, 40)).save(path)
    monkeypatch.setattr(attachment_service, "attachment_content", lambda *_args: (path, "image/png"))
    with Image.open(BytesIO(attachment_service.attachment_thumbnail("a1", "u1"))) as thumbnail:
        assert thumbnail.size == (80, 40)


def test_corrupt_thumbnail_returns_clear_error(tmp_path, monkeypatch):
    path = tmp_path / "broken.jpg"
    path.write_bytes(b"not an image")
    monkeypatch.setattr(attachment_service, "attachment_content", lambda *_args: (path, "image/jpeg"))
    with pytest.raises(HTTPException) as error:
        attachment_service.attachment_thumbnail("a1", "u1")
    assert error.value.status_code == 415


def test_thumbnail_endpoint_preserves_access_control_and_private_cache(monkeypatch):
    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)
    def owned_thumbnail(aid, uid):
        if uid != "u1":
            raise HTTPException(404, "找不到附件")
        return b"image"
    monkeypatch.setattr(attachment_service, "attachment_thumbnail", owned_thumbnail)
    response = client.get("/attachments/a1/thumbnail?userId=u1")
    assert response.status_code == 200
    assert response.headers["content-type"] == "image/jpeg"
    assert response.headers["cache-control"] == "private, max-age=3600"
    assert client.get("/attachments/a1/thumbnail?userId=u2").status_code == 404
