"""用途：處理具 ownership 的提醒 CRUD、完成／略過冪等、延後與重複提醒。"""
from calendar import monthrange
from datetime import datetime, timedelta, timezone

from bson.errors import InvalidId
from bson.objectid import ObjectId
from fastapi import HTTPException
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

from app.db import db
from app.schemas.reminder import ReminderCreateRequest, ReminderSnoozeRequest, ReminderUpdateRequest
from app.services.timeline_service import add_timeline_item, delete_timeline_item

TERMINAL_STATUSES = ["completed", "skipped"]


def _id(value: str) -> ObjectId:
    try:
        return ObjectId(value)
    except InvalidId:
        raise HTTPException(status_code=400, detail="提醒 ID 格式錯誤")


def _ensure_owned_pet(pet_id: str, user_id: str) -> None:
    try:
        found = db.pets.find_one({"_id": ObjectId(pet_id), "userId": user_id})
    except InvalidId:
        found = None
    if not found:
        raise HTTPException(status_code=404, detail="找不到毛孩資料")


def _owned_reminder(reminder_id: str, user_id: str) -> dict:
    item = db.reminders.find_one({"_id": _id(reminder_id)})
    if not item:
        raise HTTPException(status_code=404, detail="找不到提醒")
    _ensure_owned_pet(item["petId"], user_id)
    return item


def _serialize(item: dict | None) -> dict | None:
    if not item:
        return None
    return {
        "id": str(item["_id"]), "petId": item["petId"], "type": item["type"],
        "title": item["title"], "scheduledAt": item["scheduledAt"],
        "recurrenceRule": item.get("recurrenceRule", "none"),
        "status": item.get("status", "pending"), "notes": item.get("notes", ""),
        "completedAt": item.get("completedAt"), "sourceType": item.get("sourceType"),
        "sourceId": item.get("sourceId"), "createdAt": item.get("createdAt"),
        "updatedAt": item.get("updatedAt"),
    }


def list_reminders(pet_id: str, user_id: str, today: bool = False) -> list[dict]:
    _ensure_owned_pet(pet_id, user_id)
    query: dict = {"petId": pet_id}
    if today:
        now = datetime.now().astimezone()
        start = now.replace(hour=0, minute=0, second=0, microsecond=0).astimezone(timezone.utc)
        query.update({
            "scheduledAt": {"$gte": start, "$lt": start + timedelta(days=1)},
            "status": {"$in": ["pending", "snoozed"]},
        })
    return [_serialize(item) for item in db.reminders.find(query).sort([("scheduledAt", 1), ("_id", 1)])]


def create_reminder(pet_id: str, user_id: str, data: ReminderCreateRequest) -> dict:
    _ensure_owned_pet(pet_id, user_id)
    values = data.model_dump()
    client_request_id = values.pop("clientRequestId", None)
    if client_request_id:
        db.reminders.create_index(
            [("petId", 1), ("clientRequestId", 1)], unique=True,
            partialFilterExpression={"clientRequestId": {"$type": "string"}},
            name="unique_reminder_request",
        )
        existing = db.reminders.find_one({"petId": pet_id, "clientRequestId": client_request_id})
        if existing:
            return _serialize(existing)
    now = datetime.now(timezone.utc)
    document = {
        "petId": pet_id, **values, "status": "pending", "completedAt": None,
        "createdAt": now, "updatedAt": now,
    }
    if client_request_id:
        document["clientRequestId"] = client_request_id
    try:
        result = db.reminders.insert_one(document)
    except DuplicateKeyError:
        existing = db.reminders.find_one({"petId": pet_id, "clientRequestId": client_request_id})
        if existing:
            return _serialize(existing)
        raise
    document["_id"] = result.inserted_id
    return _serialize(document)


def update_reminder(reminder_id: str, user_id: str, data: ReminderUpdateRequest) -> dict:
    existing = _owned_reminder(reminder_id, user_id)
    values = data.model_dump(exclude={"clientRequestId"})
    values["updatedAt"] = datetime.now(timezone.utc)
    item = db.reminders.find_one_and_update(
        {"_id": existing["_id"]}, {"$set": values}, return_document=ReturnDocument.AFTER,
    )
    return _serialize(item)


def _add_months(value: datetime, months: int) -> datetime:
    total = value.year * 12 + value.month - 1 + months
    year, month_index = divmod(total, 12)
    month = month_index + 1
    return value.replace(year=year, month=month, day=min(value.day, monthrange(year, month)[1]))


def _next_date(value: datetime, rule: str) -> datetime | None:
    if rule == "daily":
        return value + timedelta(days=1)
    if rule == "weekly":
        return value + timedelta(days=7)
    months = {"monthly": 1, "quarterly": 3, "half_yearly": 6, "yearly": 12}
    return _add_months(value, months[rule]) if rule in months else None


def _next_occurrence(item: dict, previous_id: str, now: datetime) -> dict | None:
    next_at = _next_date(item["scheduledAt"], item.get("recurrenceRule", "none"))
    if not next_at:
        return None
    db.reminders.create_index(
        [("previousReminderId", 1)], unique=True,
        partialFilterExpression={"previousReminderId": {"$type": "string"}},
        name="unique_next_reminder_occurrence",
    )
    document = {
        "petId": item["petId"], "type": item["type"], "title": item["title"],
        "scheduledAt": next_at, "recurrenceRule": item.get("recurrenceRule", "none"),
        "status": "pending", "notes": item.get("notes", ""), "completedAt": None,
        "sourceType": item.get("sourceType"), "sourceId": item.get("sourceId"),
        "previousReminderId": previous_id, "createdAt": now, "updatedAt": now,
    }
    return db.reminders.find_one_and_update(
        {"previousReminderId": previous_id}, {"$setOnInsert": document}, upsert=True,
        return_document=ReturnDocument.AFTER,
    )


def _finish_reminder(reminder_id: str, user_id: str, status: str) -> tuple[dict, dict | None, bool]:
    existing = _owned_reminder(reminder_id, user_id)
    if existing.get("status") in TERMINAL_STATUSES:
        next_item = db.reminders.find_one({"previousReminderId": reminder_id})
        return _serialize(existing), _serialize(next_item), False
    now = datetime.now(timezone.utc)
    values = {"status": status, "completedAt": now if status == "completed" else None, "updatedAt": now}
    item = db.reminders.find_one_and_update(
        {"_id": existing["_id"], "status": {"$nin": TERMINAL_STATUSES}},
        {"$set": values}, return_document=ReturnDocument.AFTER,
    )
    if not item:
        current = _owned_reminder(reminder_id, user_id)
        next_item = db.reminders.find_one({"previousReminderId": reminder_id})
        return _serialize(current), _serialize(next_item), False
    if status == "completed":
        add_timeline_item(item["petId"], "reminder_completed", now, f"已完成{item['title']}", reminder_id)
    next_item = _next_occurrence(item, reminder_id, now)
    return _serialize(item), _serialize(next_item), True


def complete_reminder(reminder_id: str, user_id: str) -> tuple[dict, dict | None, bool]:
    return _finish_reminder(reminder_id, user_id, "completed")


def skip_reminder(reminder_id: str, user_id: str) -> tuple[dict, dict | None, bool]:
    return _finish_reminder(reminder_id, user_id, "skipped")


def snooze_reminder(reminder_id: str, user_id: str, data: ReminderSnoozeRequest) -> dict:
    existing = _owned_reminder(reminder_id, user_id)
    if data.scheduledAt <= datetime.now(timezone.utc):
        raise HTTPException(status_code=422, detail="延後時間必須晚於目前時間")
    if existing.get("status") in TERMINAL_STATUSES:
        raise HTTPException(status_code=409, detail="已完成或略過的提醒不能延後")
    item = db.reminders.find_one_and_update(
        {"_id": existing["_id"]},
        {"$set": {"scheduledAt": data.scheduledAt, "status": "snoozed", "updatedAt": datetime.now(timezone.utc)}},
        return_document=ReturnDocument.AFTER,
    )
    return _serialize(item)


def delete_reminder(reminder_id: str, user_id: str) -> None:
    item = _owned_reminder(reminder_id, user_id)
    db.reminders.delete_one({"_id": item["_id"]})
    delete_timeline_item(item["petId"], "reminder_completed", reminder_id)
