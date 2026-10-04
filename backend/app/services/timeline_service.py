from app.timezone import now_taipei
"""用途：以獨立 collection 提供具 ownership、去重與分頁的統一時間軸。"""
from datetime import datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
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

def _valid_items_for_pet(items: list[dict], pet_id: str) -> list[dict]:
    """驗證一批時間軸來源，避免每筆資料各自查詢一次 MongoDB。"""
    ids_by_source: dict[str, set[ObjectId]] = {}
    for item in items:
        source_type = item.get("sourceType") or SOURCE_TYPES.get(item.get("type"))
        if source_type not in SOURCE_COLLECTIONS:
            continue
        try:
            source_id = ObjectId(item.get("sourceId", ""))
        except InvalidId:
            continue
        ids_by_source.setdefault(source_type, set()).add(source_id)

    valid_ids_by_source: dict[str, set[str]] = {}
    for source_type, source_ids in ids_by_source.items():
        documents = SOURCE_COLLECTIONS[source_type].find(
            {"_id": {"$in": list(source_ids)}, "petId": pet_id}, {"_id": 1}
        )
        valid_ids_by_source[source_type] = {str(document["_id"]) for document in documents}

    valid: list[dict] = []
    for item in items:
        source_type = item.get("sourceType") or SOURCE_TYPES.get(item.get("type"))
        if source_type in valid_ids_by_source:
            if item.get("sourceId") in valid_ids_by_source[source_type]:
                valid.append(item)
        elif source_type not in SOURCE_COLLECTIONS and item.get("type") == "life_event":
            valid.append(item)
    return valid


def _iter_valid_timeline_items(pet_id: str, match: dict, batch_size: int = 100):
    """串流讀取時間軸，並以每批每種類型一次查詢驗證來源仍存在。"""
    pipeline = [
        {"$match": match},
        {"$sort": {"occurredAt": -1, "createdAt": -1, "_id": -1}},
        {"$group": {"_id": {"type": "$type", "sourceId": "$sourceId"}, "item": {"$first": "$$ROOT"}}},
        {"$replaceRoot": {"newRoot": "$item"}},
        {"$sort": {"occurredAt": -1, "createdAt": -1, "_id": -1}},
        {"$project": {
            "_id": 1, "petId": 1, "type": 1, "sourceType": 1, "sourceId": 1,
            "occurredAt": 1, "title": 1, "description": 1, "attachmentCount": 1,
            "createdAt": 1, "updatedAt": 1,
        }},
    ]
    batch: list[dict] = []
    for item in db.timeline.aggregate(pipeline):
        batch.append(item)
        if len(batch) >= batch_size:
            yield from _valid_items_for_pet(batch, pet_id)
            batch.clear()
    if batch:
        yield from _valid_items_for_pet(batch, pet_id)

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


def get_timeline_calendar(
    pet_id: str,
    user_id: str,
    start_at: datetime,
    end_at: datetime,
    timezone_name: str = "Asia/Taipei",
) -> dict:
    """只回傳月份日期標記，將明細留給選定日期的時間軸查詢。"""
    _ensure_owned_pet(pet_id, user_id)
    if end_at <= start_at:
        raise HTTPException(status_code=400, detail="日期範圍錯誤")
    try:
        timezone_name = ZoneInfo(timezone_name).key
    except (ZoneInfoNotFoundError, ValueError):
        raise HTTPException(status_code=400, detail="時區格式錯誤")

    source_type_branches = [
        {"case": {"$eq": ["$type", item_type]}, "then": source_type}
        for item_type, source_type in SOURCE_TYPES.items()
    ]
    timeline_pipeline = [
        {"$match": {"petId": pet_id, "occurredAt": {"$gte": start_at, "$lt": end_at}}},
        {"$sort": {"occurredAt": -1, "createdAt": -1, "_id": -1}},
        {"$group": {"_id": {"type": "$type", "sourceId": "$sourceId"}, "item": {"$first": "$$ROOT"}}},
        {"$replaceRoot": {"newRoot": "$item"}},
        {"$addFields": {
            "calendarDate": {"$dateToString": {"format": "%Y-%m-%d", "date": "$occurredAt", "timezone": timezone_name}},
            "resolvedSourceType": {
                "$ifNull": ["$sourceType", {"$switch": {"branches": source_type_branches, "default": "life_event"}}]
            },
        }},
        {"$group": {
            "_id": {"date": "$calendarDate", "type": "$type", "sourceType": "$resolvedSourceType"},
            "sourceIds": {"$addToSet": "$sourceId"},
        }},
    ]
    grouped_rows = list(db.timeline.aggregate(timeline_pipeline))

    source_ids_by_type: dict[str, set[ObjectId]] = {}
    row_source_ids: list[tuple[dict, set[str]]] = []
    for row in grouped_rows:
        group = row["_id"]
        source_type = group["sourceType"]
        string_ids: set[str] = set()
        if source_type in SOURCE_COLLECTIONS:
            for value in row.get("sourceIds", []):
                try:
                    object_id = ObjectId(value)
                except (InvalidId, TypeError):
                    continue
                source_ids_by_type.setdefault(source_type, set()).add(object_id)
                string_ids.add(str(object_id))
        row_source_ids.append((row, string_ids))

    valid_ids_by_type: dict[str, set[str]] = {}
    for source_type, source_ids in source_ids_by_type.items():
        documents = SOURCE_COLLECTIONS[source_type].find(
            {"_id": {"$in": list(source_ids)}, "petId": pet_id}, {"_id": 1}
        )
        valid_ids_by_type[source_type] = {str(document["_id"]) for document in documents}

    day_types: dict[str, set[str]] = {}
    for row, source_ids in row_source_ids:
        group = row["_id"]
        source_type = group["sourceType"]
        if source_type in SOURCE_COLLECTIONS:
            if source_ids.isdisjoint(valid_ids_by_type.get(source_type, set())):
                continue
        elif group["type"] != "life_event":
            continue
        day_types.setdefault(group["date"], set()).add(group["type"])

    reminder_pipeline = [
        {"$match": {
            "petId": pet_id,
            "scheduledAt": {"$gte": start_at, "$lt": end_at},
            "status": {"$in": ["pending", "snoozed"]},
        }},
        {"$project": {"scheduledAt": 1}},
        {"$addFields": {
            "calendarDate": {"$dateToString": {"format": "%Y-%m-%d", "date": "$scheduledAt", "timezone": timezone_name}}
        }},
        {"$group": {"_id": "$calendarDate"}},
    ]
    for row in db.reminders.aggregate(reminder_pipeline):
        day_types.setdefault(row["_id"], set()).add("reminder_completed")

    return {
        "days": [
            {"date": date, "types": sorted(types)}
            for date, types in sorted(day_types.items())
        ]
    }

def list_timeline(
    pet_id: str, user_id: str, limit: int = 20, skip: int = 0,
    item_type: str | None = None, start_at: datetime | None = None,
    end_at: datetime | None = None,
) -> dict:
    _ensure_owned_pet(pet_id, user_id)
    match: dict = {"petId": pet_id}
    if item_type:
        match["type"] = item_type
    occurred_at: dict = {}
    if start_at is not None:
        occurred_at["$gte"] = start_at
    if end_at is not None:
        occurred_at["$lt"] = end_at
    if occurred_at:
        match["occurredAt"] = occurred_at
    # 提醒頁是「已排程」清單；未完成提醒尚未寫入完成時間軸，需在此補成可點擊的時間軸項目。
    include_scheduled_reminders = item_type == "reminder_completed" or (
        item_type is None and start_at is not None and end_at is not None
    )

    if include_scheduled_reminders:
        # 排程提醒需要與時間軸項目合併排序；此分支保留完整候選集，避免頁面順序改變。
        valid_items = list(_iter_valid_timeline_items(pet_id, match))
    else:
        # 一般列表（含首頁最近 5 筆）只讀到足夠填滿本頁及確認 hasMore 的有效項目。
        page: list[dict] = []
        valid_index = 0
        has_more = False
        for item in _iter_valid_timeline_items(pet_id, match, batch_size=max(2, min(100, limit + 1))):
            if valid_index < skip:
                valid_index += 1
                continue
            if len(page) == limit:
                has_more = True
                break
            page.append(item)
            valid_index += 1
        next_skip = skip + len(page)
        return {
            "items": [_serialize(item) for item in page],
            "hasMore": has_more,
            "nextSkip": next_skip,
        }

    if include_scheduled_reminders:
        existing_sources = {item.get("sourceId") for item in valid_items}
        reminder_query: dict = {"petId": pet_id}
        scheduled_at: dict = {}
        if start_at is not None:
            scheduled_at["$gte"] = start_at
        if end_at is not None:
            scheduled_at["$lt"] = end_at
        if scheduled_at:
            reminder_query["scheduledAt"] = scheduled_at
            reminder_query["status"] = {"$in": ["pending", "snoozed"]}
        for reminder in db.reminders.find(reminder_query):
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
