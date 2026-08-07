"""用途：聚合單一毛孩首頁健康摘要，避免前端平行下載完整 collection。"""
from datetime import datetime, timedelta, timezone

from bson.errors import InvalidId
from bson.objectid import ObjectId
from fastapi import HTTPException

from app.db import db
from app.services.timeline_service import list_timeline

_INDEXES_READY = False
DIGESTIVE_TYPES = {"vomiting", "abnormal_stool", "low_appetite", "abnormal_drinking"}


def _ensure_owned_pet(pet_id: str, user_id: str) -> dict:
    try:
        object_id = ObjectId(pet_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="毛孩 ID 格式錯誤")
    pet = db.pets.find_one({"_id": object_id, "userId": user_id})
    if not pet:
        raise HTTPException(status_code=404, detail="找不到毛孩資料")
    return pet


def _ensure_indexes() -> None:
    global _INDEXES_READY
    if _INDEXES_READY:
        return
    db.weight_records.create_index([("petId", 1), ("measuredAt", -1)], name="dashboard_weight_date")
    db.health_events.create_index([("petId", 1), ("occurredAt", -1)], name="dashboard_health_date")
    db.medical_visits.create_index([("petId", 1), ("visitedAt", -1)], name="dashboard_medical_date")
    db.reminders.create_index([("petId", 1), ("scheduledAt", -1), ("status", 1)], name="dashboard_reminder_date_status")
    db.timeline.create_index([("petId", 1), ("occurredAt", -1)], name="dashboard_timeline_date")
    _INDEXES_READY = True


def _serialize_weight(item: dict) -> dict:
    return {"id": str(item["_id"]), "weightKg": item["weightKg"], "measuredAt": item["measuredAt"]}


def _weight_data(pet_id: str, now: datetime) -> dict:
    latest = list(db.weight_records.find(
        {"petId": pet_id}, {"weightKg": 1, "measuredAt": 1}
    ).sort([("measuredAt", -1), ("_id", -1)]).limit(2))
    difference = round(latest[0]["weightKg"] - latest[1]["weightKg"], 2) if len(latest) > 1 else None
    change = None if difference is None else "increased" if difference > 0 else "decreased" if difference < 0 else "unchanged"
    trend = list(db.weight_records.find(
        {"petId": pet_id, "measuredAt": {"$gte": now - timedelta(days=90)}},
        {"weightKg": 1, "measuredAt": 1},
    ).sort([("measuredAt", 1), ("_id", 1)]))
    return {
        "latest": _serialize_weight(latest[0]) if latest else None,
        "previous": _serialize_weight(latest[1]) if len(latest) > 1 else None,
        "differenceKg": difference,
        "change": change,
        "trend": [_serialize_weight(item) for item in trend],
    }


def _health_category(event_type: str) -> str:
    if event_type in DIGESTIVE_TYPES:
        return "digestive"
    if event_type == "skin_issue":
        return "skin"
    if event_type == "eye_ear_issue":
        return "eye_ear"
    if event_type in {"injury", "possible_ingestion"}:
        return "injury"
    return "other"


def get_dashboard(pet_id: str, user_id: str, timezone_offset_minutes: int = 0) -> dict:
    pet = _ensure_owned_pet(pet_id, user_id)
    _ensure_indexes()
    now = datetime.now(timezone.utc)
    # JS getTimezoneOffset 是 UTC 減本地時間；用它把本地午夜換算成 UTC。
    local_now = now - timedelta(minutes=timezone_offset_minutes)
    local_start = local_now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_start = local_start + timedelta(minutes=timezone_offset_minutes)
    today_end = today_start + timedelta(days=1)
    thirty_days_ago = now - timedelta(days=30)

    today_query = {
        "petId": pet_id,
        "scheduledAt": {"$gte": today_start, "$lt": today_end},
        "status": {"$in": ["pending", "snoozed", "completed"]},
    }
    today_items = list(db.reminders.find(today_query).sort([("scheduledAt", 1), ("_id", 1)]))
    reminder_items = [{
        "id": str(item["_id"]), "petId": item["petId"], "type": item["type"],
        "title": item["title"], "scheduledAt": item["scheduledAt"],
        "recurrenceRule": item.get("recurrenceRule", "none"),
        "status": item.get("status", "pending"), "notes": item.get("notes", ""),
        "completedAt": item.get("completedAt"), "sourceType": item.get("sourceType"),
        "sourceId": item.get("sourceId"), "createdAt": item.get("createdAt"),
        "updatedAt": item.get("updatedAt"),
    } for item in today_items]
    completed_today = sum(item["status"] == "completed" for item in today_items)

    recent_health = [{
        "id": str(item["_id"]), "type": item["type"], "summary": item["summary"],
        "severity": item["severity"], "occurredAt": item["occurredAt"],
    } for item in db.health_events.find(
        {"petId": pet_id}, {"type": 1, "summary": 1, "severity": 1, "occurredAt": 1}
    ).sort([("occurredAt", -1), ("_id", -1)]).limit(5)]

    medical = db.medical_visits.find_one(
        {"petId": pet_id},
        {"visitedAt": 1, "clinicName": 1, "veterinarianName": 1, "reason": 1},
        sort=[("visitedAt", -1), ("_id", -1)],
    )
    recent_medical = None if not medical else {
        "id": str(medical["_id"]), "visitedAt": medical["visitedAt"],
        "clinicName": medical.get("clinicName", ""),
        "veterinarianName": medical.get("veterinarianName", ""),
        "reason": medical.get("reason", ""),
    }

    health_30 = list(db.health_events.find(
        {"petId": pet_id, "occurredAt": {"$gte": thirty_days_ago}}, {"type": 1}
    ))
    category_counts = {key: 0 for key in ["digestive", "skin", "eye_ear", "injury", "other"]}
    for item in health_30:
        category_counts[_health_category(item.get("type", "other"))] += 1
    reminder_30_query = {"petId": pet_id, "scheduledAt": {"$gte": thirty_days_ago, "$lte": now}}
    reminder_count = db.reminders.count_documents(reminder_30_query)
    reminder_completed = db.reminders.count_documents({**reminder_30_query, "status": "completed"})

    return {
        "pet": {
            "id": str(pet["_id"]), "name": pet.get("name", ""),
            "breed": pet.get("breed", ""), "gender": pet.get("gender", ""),
            "birthDate": pet.get("birthday", ""), "avatarUrl": pet.get("avatarUri", ""),
        },
        "todayReminders": {
            "items": reminder_items, "total": len(today_items),
            "completed": completed_today, "pending": len(today_items) - completed_today,
        },
        "weight": _weight_data(pet_id, now),
        "recentHealthEvents": recent_health,
        "recentMedicalVisit": recent_medical,
        "statistics30Days": {
            "healthEventCount": len(health_30),
            "medicalVisitCount": db.medical_visits.count_documents({"petId": pet_id, "visitedAt": {"$gte": thirty_days_ago}}),
            "reminderCount": reminder_count,
            "reminderCompletedCount": reminder_completed,
            "reminderCompletionRate": round(reminder_completed / reminder_count * 100) if reminder_count else 0,
        },
        "healthEventCategories30Days": category_counts,
        "timeline": list_timeline(pet_id, user_id, limit=5)["items"],
        "generatedAt": now,
    }
