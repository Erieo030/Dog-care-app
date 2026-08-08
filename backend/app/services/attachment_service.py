"""用途：管理統一健康附件 metadata、local storage、ownership 與來源生命週期。"""
from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import uuid4

from bson.errors import InvalidId
from bson.objectid import ObjectId
from fastapi import HTTPException, UploadFile

from app.db import db

MAX_FILE_BYTES = 10 * 1024 * 1024
SOURCE_LIMITS = {"weight": 3, "health_event": 5, "medical_visit": 10}
SOURCE_COLLECTIONS = {
    "weight": db.weight_records,
    "health_event": db.health_events,
    "medical_visit": db.medical_visits,
}
ALLOWED_MIME = {"image/jpeg": ".jpg", "image/png": ".png"}
UPLOAD_ROOT = Path(__file__).resolve().parents[2] / "uploads"


class AttachmentStorage(ABC):
    @abstractmethod
    def save(self, key: str, content: bytes) -> None: ...

    @abstractmethod
    def delete(self, key: str) -> None: ...

    @abstractmethod
    def path(self, key: str) -> Path: ...


class LocalAttachmentStorage(AttachmentStorage):
    def __init__(self, root: Path):
        self.root = root
        self.root.mkdir(parents=True, exist_ok=True)

    def _safe_path(self, key: str) -> Path:
        path = (self.root / key).resolve()
        if self.root.resolve() not in path.parents:
            raise HTTPException(status_code=400, detail="附件儲存路徑無效")
        return path

    def save(self, key: str, content: bytes) -> None:
        path = self._safe_path(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)

    def delete(self, key: str) -> None:
        path = self._safe_path(key)
        try:
            path.unlink()
        except FileNotFoundError:
            pass

    def path(self, key: str) -> Path:
        return self._safe_path(key)


storage: AttachmentStorage = LocalAttachmentStorage(UPLOAD_ROOT)


def _object_id(value: str, label: str) -> ObjectId:
    try:
        return ObjectId(value)
    except InvalidId:
        raise HTTPException(status_code=400, detail=f"{label}格式錯誤")


def ensure_owned_pet(pet_id: str, user_id: str) -> None:
    if not db.pets.find_one({"_id": _object_id(pet_id, "毛孩 ID "), "userId": user_id}):
        raise HTTPException(status_code=404, detail="找不到毛孩資料")


def _detect_mime(content: bytes) -> str | None:
    if content.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    return None


def _serialize(item: dict) -> dict:
    return {
        "id": str(item["_id"]), "petId": item["petId"],
        "sourceType": item.get("sourceType"), "sourceId": item.get("sourceId"),
        "storageProvider": item.get("storageProvider", "local"),
        "fileName": item.get("originalName", "photo"), "mimeType": item["mimeType"],
        "sizeBytes": item["sizeBytes"], "width": item.get("width"), "height": item.get("height"),
        "contentPath": f"/api/attachments/{item['_id']}/content",
        "createdAt": item.get("createdAt"), "updatedAt": item.get("updatedAt"),
    }


def _cleanup_pending() -> None:
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
    for item in db.attachments.find({"sourceId": None, "createdAt": {"$lt": cutoff}}):
        storage.delete(item["storageKey"])
        db.attachments.delete_one({"_id": item["_id"]})


async def upload_attachment(
    pet_id: str, user_id: str, file: UploadFile,
    width: int | None = None, height: int | None = None,
) -> dict:
    ensure_owned_pet(pet_id, user_id)
    _cleanup_pending()
    content = await file.read(MAX_FILE_BYTES + 1)
    if not content:
        raise HTTPException(status_code=422, detail="附件不可為空")
    if len(content) > MAX_FILE_BYTES:
        raise HTTPException(status_code=413, detail="圖片不可超過 10 MB")
    detected = _detect_mime(content)
    declared = (file.content_type or "").lower()
    if detected not in ALLOWED_MIME or declared not in ALLOWED_MIME or detected != declared:
        raise HTTPException(status_code=415, detail="只支援 JPG、JPEG、PNG 圖片")
    now = datetime.now(timezone.utc)
    key = f"{now:%Y/%m}/{uuid4().hex}{ALLOWED_MIME[detected]}"
    storage.save(key, content)
    document = {
        "petId": pet_id, "sourceType": None, "sourceId": None,
        "storageProvider": "local", "storageKey": key,
        "originalName": (file.filename or "photo")[:200], "mimeType": detected,
        "sizeBytes": len(content), "width": width, "height": height,
        "createdAt": now, "updatedAt": now,
    }
    result = db.attachments.insert_one(document)
    document["_id"] = result.inserted_id
    return _serialize(document)


def _owned_attachment(attachment_id: str, user_id: str) -> dict:
    item = db.attachments.find_one({"_id": _object_id(attachment_id, "附件 ID ")})
    if not item:
        raise HTTPException(status_code=404, detail="找不到附件")
    ensure_owned_pet(item["petId"], user_id)
    return item


def attachment_content(attachment_id: str, user_id: str) -> tuple[Path, str]:
    item = _owned_attachment(attachment_id, user_id)
    path = storage.path(item["storageKey"])
    if not path.is_file():
        raise HTTPException(status_code=404, detail="附件檔案不存在")
    return path, item["mimeType"]


def _delete_document(item: dict) -> None:
    storage.delete(item["storageKey"])
    db.attachments.delete_one({"_id": item["_id"]})


def delete_attachment(attachment_id: str, user_id: str) -> None:
    item = _owned_attachment(attachment_id, user_id)
    source_type, source_id = item.get("sourceType"), item.get("sourceId")
    collection = SOURCE_COLLECTIONS.get(source_type)
    if collection is not None and source_id:
        collection.update_one(
            {"_id": _object_id(source_id, "來源 ID "), "petId": item["petId"]},
            {"$pull": {"attachmentIds": str(item["_id"])}},
        )
    _delete_document(item)
    if collection is not None and source_id:
        count = timeline_attachment_count(source_type, source_id)
        timeline_source_type = "weight_record" if source_type == "weight" else source_type
        db.timeline.update_many(
            {"petId": item["petId"], "sourceType": timeline_source_type, "sourceId": source_id},
            {"$set": {"attachmentCount": count, "updatedAt": datetime.now(timezone.utc)}},
        )


def sync_source_attachments(
    pet_id: str, source_type: str, source_id: str,
    attachment_ids: list[str], user_id: str,
) -> list[str]:
    ensure_owned_pet(pet_id, user_id)
    limit = SOURCE_LIMITS[source_type]
    unique_ids = list(dict.fromkeys(attachment_ids))
    if len(unique_ids) != len(attachment_ids):
        raise HTTPException(status_code=422, detail="附件不可重複")
    if len(unique_ids) > limit:
        raise HTTPException(status_code=422, detail=f"此紀錄最多可有 {limit} 張照片")
    object_ids = [_object_id(value, "附件 ID ") for value in unique_ids]
    items = list(db.attachments.find({"_id": {"$in": object_ids}, "petId": pet_id}))
    if len(items) != len(object_ids):
        raise HTTPException(status_code=422, detail="附件不存在或不屬於目前毛孩")
    for item in items:
        if item.get("sourceId") not in {None, source_id} or item.get("sourceType") not in {None, source_type}:
            raise HTTPException(status_code=409, detail="附件已綁定其他紀錄")
    current = list(db.attachments.find({"petId": pet_id, "sourceType": source_type, "sourceId": source_id}))
    keep = set(object_ids)
    for item in current:
        if item["_id"] not in keep:
            _delete_document(item)
    if object_ids:
        db.attachments.update_many(
            {"_id": {"$in": object_ids}},
            {"$set": {"sourceType": source_type, "sourceId": source_id, "updatedAt": datetime.now(timezone.utc)}},
        )
    return unique_ids


def source_attachments(item: dict, source_type: str) -> list[dict]:
    ids = item.get("attachmentIds", [])
    parsed = [ObjectId(value) for value in ids if ObjectId.is_valid(value)]
    indexed = {str(doc["_id"]): doc for doc in db.attachments.find({"_id": {"$in": parsed}})}
    return [_serialize(indexed[value]) for value in ids if value in indexed]


def delete_source_attachments(pet_id: str, source_type: str, source_id: str) -> None:
    for item in db.attachments.find({"petId": pet_id, "sourceType": source_type, "sourceId": source_id}):
        _delete_document(item)


def timeline_attachment_count(source_type: str, source_id: str) -> int:
    return db.attachments.count_documents({"sourceType": source_type, "sourceId": source_id})
