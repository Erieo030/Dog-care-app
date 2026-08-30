from app.timezone import now_taipei, TAIPEI
"""用途：以獨立 collection 提供具 ownership、去重與分頁的統一時間軸。"""
from datetime import datetime, timezone
from bson.errors import InvalidId
from bson.objectid import ObjectId
from fastapi import HTTPException
from app.db import db

SOURCE_TYPES = {
    "reminder_completed": "reminder",
    "health_event": "health_event",
    "weight": "weight_record",
    "medical_visit": "medical_visit",
    "daily_log": "daily_log",
    "vaccination": "vaccination",
    "deworming": "deworming",
    "medication": "medication",
    "life_event": "life_event",
}
SOURCE_COLLECTIONS = {
    "reminder": db.reminders,
    "health_event": db.health_events,
    "weight_record": db.weight_records,
    "medical_visit": db.medical_visits,
    "daily_log": db.daily_logs,
    "vaccination": db.vaccinations,
    "deworming": db.dewormings,
    "medication": db.medications,
}

def _pet_id(value: str) -> ObjectId:
    try:
        return ObjectId(value)
    except InvalidId:
        raise HTTPException(status_code=400, detail="毛孩 ID 格式錯誤")

def _ensure_owned_pet(pet_id: str, user_id: str) -> None:
    if not db.pets.find_one({"_id": _pet_id(pet_id), "userId": user_id}):
        raise HTTPException(status_code=404, detail="找不到毛孩資料")

def _source_belongs_to_pet(item: dict, pet_id: str) -> bool:
    source_type = item.get("sourceType") or SOURCE_TYPES.get(item.get("type"))
    collection = SOURCE_COLLECTIONS.get(source_type)
    if collection is None:
        return item.get("type") == "life_event"
    try:
        source_id = ObjectId(item.get("sourceId", ""))
    except InvalidId:
        return False
    return collection.find_one({"_id": source_id, "petId": pet_id}, {"_id": 1}) is not None

def upsert_timeline_item(
    pet_id: str, item_type: str, occurred_at: datetime,
    title: str, source_id: str, description: str = "", attachment_count: int = 0,
) -> None:
    now = now_taipei()
    source_type = SOURCE_TYPES[item_type]
    db.timeline.update_one(
        {"petId": pet_id, "type": item_type, "sourceId": source_id},
        {"$set": {
            "petId": pet_id, "type": item_type, "sourceType": source_type,
            "sourceId": source_id, "occurredAt": occurred_at,
            "title": title, "description": description, "attachmentCount": attachment_count, "updatedAt": now,
        }, "$setOnInsert": {"createdAt": now}},
        upsert=True,
    )

def add_timeline_item(
    pet_id: str, item_type: str, occurred_at: datetime,
    title: str, source_id: str, description: str = "", attachment_count: int = 0,
) -> None:
    upsert_timeline_item(pet_id, item_type, occurred_at, title, source_id, description, attachment_count)

def delete_timeline_item(pet_id: str, item_type: str, source_id: str) -> None:
    db.timeline.delete_many({"petId": pet_id, "type": item_type, "sourceId": source_id})

def _serialize(item: dict) -> dict:
    created_at = item.get("createdAt") or item.get("occurredAt")
    return {
        "id": str(item["_id"]), "petId": item["petId"], "type": item["type"],
        "occurredAt": item["occurredAt"], "title": item["title"],
        "description": item.get("description", ""),
        "sourceId": item.get("sourceId", ""),
        "sourceType": item.get("sourceType") or SOURCE_TYPES.get(item["type"], "life_event"),
        "createdAt": created_at,
        "updatedAt": item.get("updatedAt") or created_at,
        "attachmentCount": max(0, item.get("attachmentCount", 0)),
    }

def list_timeline(
    pet_id: str, user_id: str, limit: int = 20, skip: int = 0,
    item_type: str | None = None,
) -> dict:
    _ensure_owned_pet(pet_id, user_id)
    match: dict = {"petId": pet_id}
    if item_type:
        match["type"] = item_type
    pipeline = [
        {"$match": match},
        {"$sort": {"occurredAt": -1, "createdAt": -1, "_id": -1}},
        {"$group": {"_id": {"type": "$type", "sourceId": "$sourceId"}, "item": {"$first": "$$ROOT"}}},
        {"$replaceRoot": {"newRoot": "$item"}},
        {"$sort": {"occurredAt": -1, "createdAt": -1, "_id": -1}},
    ]
    valid_items = [item for item in db.timeline.aggregate(pipeline) if _source_belongs_to_pet(item, pet_id)]
    # 提醒頁是「已排程」清單；未完成提醒尚未寫入完成時間軸，需在此補成可點擊的時間軸項目。
    if item_type == "reminder_completed":
        existing_sources = {item.get("sourceId") for item in valid_items}
        for reminder in db.reminders.find({"petId": pet_id}):
            source_id = str(reminder["_id"])
            if source_id in existing_sources or not reminder.get("scheduledAt"):
                continue
            valid_items.append({
                "_id": reminder["_id"], "petId": pet_id, "type": "reminder_completed",
                "sourceType": "reminder", "sourceId": source_id,
                "occurredAt": reminder["scheduledAt"], "title": reminder.get("title", "照護提醒"),
                "description": "已完成" if reminder.get("status") == "completed" else "待完成",
                "attachmentCount": 0, "createdAt": reminder.get("createdAt"),
                "updatedAt": reminder.get("updatedAt"),
            })
        valid_items.sort(key=lambda item: (item.get("occurredAt"), item.get("createdAt"), item.get("_id")), reverse=True)
    page = valid_items[skip:skip + limit]
    next_skip = skip + len(page)
    return {
        "items": [_serialize(item) for item in page],
        "hasMore": next_skip < len(valid_items),
        "nextSkip": next_skip,
    }
