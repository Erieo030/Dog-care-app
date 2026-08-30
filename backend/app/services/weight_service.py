from app.timezone import now_taipei, TAIPEI
"""用途：處理體重 CRUD、摘要同步、資料所有權與時間軸一致性。"""
from datetime import datetime, timezone

from bson.errors import InvalidId
from bson.objectid import ObjectId
from fastapi import HTTPException

from app.db import db
from app.schemas.weight import WeightRecordRequest
from app.services.attachment_service import delete_source_attachments, source_attachments, sync_source_attachments, timeline_attachment_count
from app.services.timeline_service import add_timeline_item, delete_timeline_item


def _id(value: str, label: str) -> ObjectId:
    try:
        return ObjectId(value)
    except InvalidId:
        raise HTTPException(status_code=400, detail=f"{label}格式錯誤")


def _ensure_owned_pet(pet_id: str, user_id: str) -> None:
    pet = db.pets.find_one({
        "_id": _id(pet_id, "毛孩 ID "),
        "userId": user_id,
    })
    if not pet:
        raise HTTPException(status_code=404, detail="找不到毛孩資料")


def _serialize(item: dict) -> dict:
    return {
        "id": str(item["_id"]),
        "petId": item["petId"],
        "weightKg": item["weightKg"],
        "measuredAt": item["measuredAt"],
        "notes": item.get("notes", ""),
        "createdAt": item.get("createdAt"),
        "updatedAt": item.get("updatedAt"),
        "attachmentIds": item.get("attachmentIds", []),
        "attachments": source_attachments(item, "weight"),
    }


def _latest_records(pet_id: str, limit: int = 2) -> list[dict]:
    return list(
        db.weight_records.find({"petId": pet_id})
        .sort([("measuredAt", -1), ("_id", -1)])
        .limit(limit)
    )


def _summary(pet_id: str) -> dict:
    latest = _latest_records(pet_id)
    if not latest:
        return {
            "latestWeightKg": None,
            "latestMeasuredAt": None,
            "differenceKg": None,
            "change": None,
        }

    difference = None
    change = None
    if len(latest) > 1:
        difference = round(latest[0]["weightKg"] - latest[1]["weightKg"], 2)
        change = (
            "increased" if difference > 0
            else "decreased" if difference < 0
            else "unchanged"
        )

    return {
        "latestWeightKg": latest[0]["weightKg"],
        "latestMeasuredAt": latest[0]["measuredAt"],
        "differenceKg": difference,
        "change": change,
    }


def list_records(pet_id: str, user_id: str) -> dict:
    _ensure_owned_pet(pet_id, user_id)
    records = db.weight_records.find({"petId": pet_id}).sort(
        [("measuredAt", -1), ("_id", -1)]
    )
    return {
        "records": [_serialize(record) for record in records],
        "summary": _summary(pet_id),
    }


def _sync_pet(pet_id: str) -> None:
    summary = _summary(pet_id)
    db.pets.update_one(
        {"_id": _id(pet_id, "毛孩 ID ")},
        {"$set": {
            "latestWeightKg": summary["latestWeightKg"],
            "latestWeightAt": summary["latestMeasuredAt"],
        }},
    )


def _owned_record(record_id: str, user_id: str) -> dict:
    item = db.weight_records.find_one({"_id": _id(record_id, "體重紀錄 ID ")})
    if not item:
        raise HTTPException(status_code=404, detail="找不到體重紀錄")
    _ensure_owned_pet(item["petId"], user_id)
    return item


def _sync_weight_timelines(pet_id: str) -> None:
    records = list(db.weight_records.find({"petId": pet_id}).sort([("measuredAt", 1), ("_id", 1)]))
    previous = None
    for record in records:
        if previous is None:
            description = f"第一次記錄體重 {record['weightKg']:g} kg"
        else:
            difference = round(record["weightKg"] - previous["weightKg"], 2)
            if difference == 0:
                description = "與前一次相比無變化"
            else:
                direction = "增加" if difference > 0 else "減少"
                description = f"比前一次{direction} {abs(difference):g} kg"
        add_timeline_item(pet_id, "weight", record["measuredAt"],
                          f"體重更新為 {record['weightKg']:g} kg",
                          str(record["_id"]), description, timeline_attachment_count("weight", str(record["_id"])))
        previous = record


def create_record(pet_id: str, user_id: str, data: WeightRecordRequest) -> dict:
    _ensure_owned_pet(pet_id, user_id)
    now = now_taipei()
    values = data.model_dump()
    attachment_ids = values.pop("attachmentIds", [])
    document = {"petId": pet_id, **values, "attachmentIds": attachment_ids, "createdAt": now, "updatedAt": now}
    result = db.weight_records.insert_one(document)
    document["_id"] = result.inserted_id
    try:
        document["attachmentIds"] = sync_source_attachments(pet_id, "weight", str(result.inserted_id), attachment_ids, user_id)
        db.weight_records.update_one({"_id": result.inserted_id}, {"$set": {"attachmentIds": document["attachmentIds"]}})
    except Exception:
        db.weight_records.delete_one({"_id": result.inserted_id})
        delete_source_attachments(pet_id, "weight", str(result.inserted_id))
        raise
    _sync_pet(pet_id)
    _sync_weight_timelines(pet_id)
    return _serialize(document)


def update_record(
    record_id: str,
    user_id: str,
    data: WeightRecordRequest,
) -> dict:
    existing = _owned_record(record_id, user_id)
    values = data.model_dump()
    attachment_ids = values.pop("attachmentIds", [])
    values["attachmentIds"] = sync_source_attachments(existing["petId"], "weight", record_id, attachment_ids, user_id)
    values["updatedAt"] = now_taipei()
    item = db.weight_records.find_one_and_update(
        {"_id": existing["_id"]},
        {"$set": values},
        return_document=True,
    )
    _sync_pet(existing["petId"])
    _sync_weight_timelines(existing["petId"])
    return _serialize(item)


def delete_record(record_id: str, user_id: str) -> None:
    item = _owned_record(record_id, user_id)
    db.weight_records.delete_one({"_id": item["_id"]})
    delete_source_attachments(item["petId"], "weight", record_id)
    _sync_pet(item["petId"])
    delete_timeline_item(item["petId"], "weight", record_id)
    _sync_weight_timelines(item["petId"])
