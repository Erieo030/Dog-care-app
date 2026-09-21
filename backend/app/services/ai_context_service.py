from datetime import datetime, timedelta

from bson.errors import InvalidId
from bson.objectid import ObjectId
from fastapi import HTTPException

from app.db import db
from app.timezone import TAIPEI, now_taipei


RANGES = {7, 15, 30, 90}


def _owned(pet_id: str, user_id: str) -> dict:
    try:
        object_id = ObjectId(pet_id)
    except InvalidId as exc:
        raise HTTPException(400, "毛孩 ID 格式錯誤") from exc
    pet = db.pets.find_one({"_id": object_id, "userId": user_id})
    if not pet:
        raise HTTPException(404, "找不到毛孩資料")
    return pet


def _clean(value):
    if isinstance(value, dict):
        return {key: _clean(item) for key, item in value.items() if key not in {"password", "userId", "publicToken", "token", "apiKey", "contentPath"}}
    if isinstance(value, list):
        return [_clean(item) for item in value]
    return value


def _aware(value):
    if isinstance(value, datetime) and value.tzinfo is None:
        return value.replace(tzinfo=TAIPEI)
    return value


def _summary(items: list[dict], key: str) -> dict:
    values = [item.get(key) for item in items if item.get(key) is not None]
    return {"recordCount": len(values), "latest": values[-1] if values else None, "recent": values[-14:], "counts": {value: values.count(value) for value in dict.fromkeys(values)}}


def build_context(pet_id: str, user_id: str, days: int) -> dict:
    if days not in RANGES:
        raise HTTPException(422, "range 僅支援 7、15、30 或 90")
    pet = _owned(pet_id, user_id)
    end = now_taipei()
    start = end - timedelta(days=days)
    weights = list(db.weight_records.find({"petId": pet_id, "measuredAt": {"$gte": start, "$lte": end}}, {"measuredAt": 1, "weightKg": 1}).sort("measuredAt", 1))
    logs = list(db.daily_logs.find({"petId": pet_id, "loggedAt": {"$gte": start, "$lte": end}}, {"loggedAt": 1, "waterLevel": 1, "foodLevel": 1, "energyLevel": 1, "stoolLevel": 1}).sort("loggedAt", 1).limit(30))
    events = list(db.health_events.find({"petId": pet_id, "occurredAt": {"$gte": start, "$lte": end}}, {"type": 1, "occurredAt": 1, "severity": 1, "summary": 1, "notes": 1, "details": 1}).sort("occurredAt", 1).limit(30))
    visits = list(db.medical_visits.find({"petId": pet_id}, {"visitedAt": 1, "followUpAt": 1, "clinicName": 1, "reason": 1, "treatmentNotes": 1}).sort("visitedAt", -1).limit(5))
    medications = list(db.medications.find({"petId": pet_id, "status": "active"}, {"name": 1, "startDate": 1, "endDate": 1, "instructions": 1, "timesPerDay": 1, "mealTiming": 1}).limit(10))
    completed_medications = db.medications.count_documents({"petId": pet_id, "status": "completed"})
    vaccinations = list(db.vaccinations.find({"petId": pet_id}, {"vaccineName": 1, "administeredAt": 1, "nextDueAt": 1}).sort("administeredAt", -1).limit(5))
    dewormings = list(db.dewormings.find({"petId": pet_id}, {"type": 1, "productName": 1, "administeredAt": 1, "nextDueAt": 1}).sort("administeredAt", -1).limit(5))
    reminders = list(db.reminders.find({"petId": pet_id, "status": "pending"}, {"title": 1, "scheduledAt": 1}).sort("scheduledAt", 1).limit(10))

    weight_series = [{"measuredAt": item.get("measuredAt"), "weightKg": item.get("weightKg")} for item in weights if isinstance(item.get("weightKg"), (int, float))]
    latest = weight_series[-1] if weight_series else None
    previous = weight_series[-2] if len(weight_series) > 1 else None
    logs_clean = [{"id": str(item["_id"]), "loggedAt": item.get("loggedAt"), **{key: item.get(key) for key in ("waterLevel", "foodLevel", "energyLevel", "stoolLevel") if item.get(key) is not None}} for item in logs]

    return _clean({
        "pet": {"petId": pet_id, "name": pet.get("name", ""), "breed": pet.get("breed", ""), "sex": pet.get("gender", ""), "birthDate": pet.get("birthday"), "isNeutered": pet.get("neutered"), "allergies": pet.get("allergies", ""), "chronicDiseases": pet.get("chronicDiseases", "")},
        "period": {"days": days, "startAt": start, "endAt": end},
        "weight": {"latestWeightKg": latest["weightKg"] if latest else None, "previousWeightKg": previous["weightKg"] if previous else None, "differenceKg": latest["weightKg"] - previous["weightKg"] if latest and previous else None, "recordCount": len(weight_series), "series": weight_series},
        "dailyLogs": {"recordCount": len(logs_clean), "water": _summary(logs_clean, "waterLevel"), "food": _summary(logs_clean, "foodLevel"), "energy": _summary(logs_clean, "energyLevel"), "stool": _summary(logs_clean, "stoolLevel"), "recent": logs_clean[-30:]},
        "healthEvents": {"totalCount": len(events), "severityCounts": {level: sum(1 for item in events if item.get("severity") == level) for level in ("mild", "moderate", "severe")}, "recentEvents": [{"id": str(item["_id"]), "type": item.get("type"), "occurredAt": item.get("occurredAt"), "severity": item.get("severity"), "summary": item.get("summary", ""), "notes": item.get("notes", ""), "details": item.get("details", {})} for item in events[-14:]]},
        "medical": {"visitCount": len(visits), "recentVisits": [{"id": str(item["_id"]), "visitedAt": item.get("visitedAt"), "followUpAt": item.get("followUpAt"), "clinicName": item.get("clinicName", ""), "reason": item.get("reason", ""), "treatmentNotes": item.get("treatmentNotes", "")} for item in visits]},
        "medications": {"active": [{key: item.get(key) for key in ("name", "startDate", "endDate", "instructions", "timesPerDay", "mealTiming")} for item in medications], "completedCount": completed_medications},
        "vaccinations": {"latest": ({key: vaccinations[0].get(key) for key in ("vaccineName", "administeredAt", "nextDueAt")} if vaccinations else None), "upcomingCount": sum(1 for item in vaccinations if item.get("nextDueAt") and _aware(item["nextDueAt"]) >= end)},
        "dewormings": {"latest": ({key: dewormings[0].get(key) for key in ("type", "productName", "administeredAt", "nextDueAt")} if dewormings else None)},
        "reminders": {"pendingCount": len(reminders), "todayCount": sum(1 for item in reminders if item.get("scheduledAt") and _aware(item["scheduledAt"]).date() == end.date()), "upcomingCount": len(reminders), "overdueCount": sum(1 for item in reminders if item.get("scheduledAt") and _aware(item["scheduledAt"]) < end), "upcoming": [{"title": item.get("title", ""), "scheduledAt": item.get("scheduledAt")} for item in reminders[:5]]},
    })
