"""用途：處理健康異常 CRUD、ownership、專屬摘要及時間軸一致性。"""
from datetime import datetime, timezone

from bson.errors import InvalidId
from bson.objectid import ObjectId
from fastapi import HTTPException

from app.db import db
from app.schemas.health_event import HealthEventCreateRequest, HealthEventUpdateRequest
from app.services.attachment_service import delete_source_attachments, source_attachments, sync_source_attachments, timeline_attachment_count
from app.services.timeline_service import add_timeline_item, delete_timeline_item


VOMIT_COUNT_LABELS = {
    "once": "1 次",
    "two_to_three": "2～3 次",
    "four_or_more": "4 次以上",
}
ENERGY_LABELS = {
    "normal": "正常",
    "slightly_low": "稍差",
    "very_low": "很差",
}
SEVERITY_LABELS = {
    "mild": "輕微",
    "moderate": "需要注意",
    "severe": "嚴重",
}
STOOL_CONSISTENCY_LABELS = {
    "soft": "排便偏軟",
    "watery": "水狀排便",
    "hard": "排便很硬",
    "other": "排便外觀其他",
}
STOOL_COLOR_LABELS = {
    "normal": "顏色一般",
    "yellow": "黃色",
    "green": "綠色",
    "black": "黑色",
    "red": "紅色",
    "other": "顏色其他",
}

APPETITE_LABELS = {"slightly_reduced": "少吃一些", "less_than_half": "吃不到一半", "not_eating": "完全不吃"}
APPETITE_DURATION_LABELS = {"one_meal": "這一餐", "within_half_day": "半天內", "one_day": "一天", "over_one_day": "超過一天"}
SYMPTOM_LABELS = {"vomiting": "嘔吐", "abnormal_stool": "排便異常", "reduced_drinking": "喝水減少", "low_energy": "精神下降"}
LOW_ENERGY_LABELS = {"slightly_low": "稍微沒精神", "clearly_low": "明顯沒精神", "barely_active": "幾乎不活動"}
MOVEMENT_LABELS = {"normal_movement": "仍會正常走動", "reduced_movement": "走動明顯減少", "reluctant_to_stand": "不太願意站立", "unknown": "不確定"}
RESPONSE_LABELS = {"normal_response": "反應正常", "slow_response": "反應較慢", "minimal_response": "幾乎沒有反應", "unknown": "不確定"}
DRINKING_LEVEL_LABELS = {"less_than_usual": "喝水量比平常少", "barely_drinking": "幾乎不喝水", "more_than_usual": "喝水量比平常多", "frequent_drinking": "頻繁喝水"}
DRINKING_DURATION_LABELS = {"few_hours": "幾小時", "half_day": "半天", "one_day": "一天", "over_one_day": "超過一天"}
DRINKING_ABILITY_LABELS = {"normal": "可以正常喝下", "vomits_after_drinking": "喝水後嘔吐", "unable_to_drink": "想喝但喝不下", "unknown": "不確定"}

def _id(value: str, label: str = "異常紀錄 ID ") -> ObjectId:
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


def _owned_event(event_id: str, user_id: str) -> dict:
    item = db.health_events.find_one({"_id": _id(event_id)})
    if not item:
        raise HTTPException(status_code=404, detail="找不到異常紀錄")
    _ensure_owned_pet(item["petId"], user_id)
    return item


def _serialize(item: dict) -> dict:
    return {
        "id": str(item["_id"]), "petId": item["petId"], "type": item["type"],
        "occurredAt": item["occurredAt"], "severity": item["severity"],
        "summary": item["summary"], "details": item.get("details", {}),
        "notes": item.get("notes", ""), "imageUrls": item.get("imageUrls", []),
        "attachmentIds": item.get("attachmentIds", []), "attachments": source_attachments(item, "health_event"),
        "createdAt": item.get("createdAt"), "updatedAt": item.get("updatedAt"),
    }


def _summary(data: HealthEventCreateRequest) -> str:
    details = data.details
    if data.type == "vomiting":
        return (
            f"嘔吐 {VOMIT_COUNT_LABELS[details['vomitCount']]}，"
            f"精神{ENERGY_LABELS[details['energyCondition']]}"
        )
    if data.type == "abnormal_stool":
        features = [
            details["suspectedBlood"] and "疑似有血",
            details["hasForeignObject"] and "有異物",
            details["suspectedParasite"] and "疑似蟲體",
            details["hasMucus"] and "有黏液",
        ]
        feature_text = [value for value in features if value][:2]
        parts = [
            STOOL_CONSISTENCY_LABELS[details["stoolConsistency"]],
            STOOL_COLOR_LABELS[details["stoolColor"]],
            *feature_text,
        ]
        return "，".join(parts)
    if data.type == "low_appetite":
        base = "完全不吃" if details["appetiteLevel"] == "not_eating" else f"食慾下降，{APPETITE_LABELS[details["appetiteLevel"]]}"
        parts = [base]
        if details.get("duration"):
            parts.append(f"已持續{APPETITE_DURATION_LABELS[details["duration"]]}")
        symptoms = [SYMPTOM_LABELS[value] for value in details.get("associatedSymptoms", [])[:2]]
        if symptoms:
            parts.append(f"伴隨{'、'.join(symptoms)}")
        return "，".join(parts)
    if data.type == "low_energy":
        parts = [LOW_ENERGY_LABELS[details["energyLevel"]]]
        response = details.get("responseCondition")
        movement = details.get("movementCondition")
        if response and response not in {"normal_response", "unknown"}:
            parts.append(RESPONSE_LABELS[response])
        elif movement and movement not in {"normal_movement", "unknown"}:
            parts.append(MOVEMENT_LABELS[movement])
        return "，".join(parts)
    if data.type == "abnormal_drinking":
        parts = [DRINKING_LEVEL_LABELS[details["drinkingLevel"]]]
        if details.get("duration"):
            parts.append(f"持續{DRINKING_DURATION_LABELS[details["duration"]]}")
        ability = details.get("drinkingAbility")
        if ability and ability not in {"normal", "unknown"}:
            parts.append(DRINKING_ABILITY_LABELS[ability])
        return "，".join(parts)
    return data.summary


def _values(data: HealthEventCreateRequest) -> dict:
    values = data.model_dump()
    # attachmentIds 由統一附件 service 綁定，不分散保存 URL。
    # 專屬摘要由後端根據已驗證 details 固定產生，避免各畫面文字不一致。
    values["summary"] = _summary(data)
    return values


def _timeline_description(severity: str) -> str:
    return f"嚴重程度：{SEVERITY_LABELS[severity]}"


def list_events(pet_id: str, user_id: str) -> list[dict]:
    _ensure_owned_pet(pet_id, user_id)
    return [_serialize(item) for item in db.health_events.find(
        {"petId": pet_id}
    ).sort([("occurredAt", -1), ("_id", -1)])]


def get_event(event_id: str, user_id: str) -> dict:
    return _serialize(_owned_event(event_id, user_id))


def create_event(
    pet_id: str,
    user_id: str,
    data: HealthEventCreateRequest,
) -> dict:
    _ensure_owned_pet(pet_id, user_id)
    now = datetime.now(timezone.utc)
    values = _values(data)
    attachment_ids = values.pop("attachmentIds", [])
    document = {"petId": pet_id, **values, "attachmentIds": attachment_ids, "createdAt": now, "updatedAt": now}
    result = db.health_events.insert_one(document)
    document["_id"] = result.inserted_id
    try:
        document["attachmentIds"] = sync_source_attachments(pet_id, "health_event", str(result.inserted_id), attachment_ids, user_id)
        db.health_events.update_one({"_id": result.inserted_id}, {"$set": {"attachmentIds": document["attachmentIds"]}})
    except Exception:
        db.health_events.delete_one({"_id": result.inserted_id})
        delete_source_attachments(pet_id, "health_event", str(result.inserted_id))
        raise
    add_timeline_item(
        pet_id,
        "health_event",
        data.occurredAt,
        document["summary"],
        str(result.inserted_id),
        _timeline_description(data.severity),
        timeline_attachment_count("health_event", str(result.inserted_id)),
    )
    return _serialize(document)


def update_event(
    event_id: str,
    user_id: str,
    data: HealthEventUpdateRequest,
) -> dict:
    existing = _owned_event(event_id, user_id)
    values = _values(data)
    attachment_ids = values.pop("attachmentIds", [])
    values["attachmentIds"] = sync_source_attachments(existing["petId"], "health_event", event_id, attachment_ids, user_id)
    values["updatedAt"] = datetime.now(timezone.utc)
    item = db.health_events.find_one_and_update(
        {"_id": existing["_id"]},
        {"$set": values},
        return_document=True,
    )
    add_timeline_item(existing["petId"], "health_event", data.occurredAt,
                      values["summary"], event_id,
                      _timeline_description(data.severity), timeline_attachment_count("health_event", event_id))
    return _serialize(item)


def update_vomiting_event(
    event_id: str,
    user_id: str,
    data: HealthEventUpdateRequest,
) -> dict:
    existing = _owned_event(event_id, user_id)
    if existing["type"] != "vomiting":
        raise HTTPException(status_code=404, detail="找不到嘔吐紀錄")
    return update_event(event_id, user_id, data)


def update_stool_event(
    event_id: str,
    user_id: str,
    data: HealthEventUpdateRequest,
) -> dict:
    existing = _owned_event(event_id, user_id)
    if existing["type"] != "abnormal_stool":
        raise HTTPException(status_code=404, detail="找不到排便異常紀錄")
    return update_event(event_id, user_id, data)


def update_observation_event(
    event_id: str, user_id: str, data: HealthEventUpdateRequest,
) -> dict:
    existing = _owned_event(event_id, user_id)
    allowed = {"low_appetite", "low_energy", "abnormal_drinking"}
    if existing["type"] not in allowed or existing["type"] != data.type:
        raise HTTPException(status_code=404, detail="找不到對應的健康異常紀錄")
    return update_event(event_id, user_id, data)


def delete_event(event_id: str, user_id: str) -> None:
    item = _owned_event(event_id, user_id)
    db.health_events.delete_one({"_id": item["_id"]})
    delete_source_attachments(item["petId"], "health_event", event_id)
    delete_timeline_item(item["petId"], "health_event", event_id)
