"""毛孩資料的 CRUD 商業邏輯，隔離 MongoDB 細節與 HTTP 路由。"""

from bson.errors import InvalidId
from bson.objectid import ObjectId
from fastapi import HTTPException

from app.db import db
from app.schemas import PetCreateRequest, PetUpdateRequest
from app.services.attachment_service import _delete_document


def _object_id(value: str, label: str) -> ObjectId:
    """將字串轉為 MongoDB ID，並回傳可讀的 API 錯誤。"""
    try:
        return ObjectId(value)
    except InvalidId:
        raise HTTPException(status_code=400, detail=f"{label}格式錯誤")


def _ensure_user(user_id: str) -> None:
    """確認毛孩所屬帳號存在。"""
    if not db.users.find_one({"_id": _object_id(user_id, "使用者 ID ")}):
        raise HTTPException(status_code=404, detail="找不到使用者")


def serialize_pet(pet: dict) -> dict:
    """將 MongoDB 文件轉成前端穩定可用的 JSON，並補齊舊資料欄位。"""
    return {
        "_id": str(pet["_id"]),
        "userId": pet["userId"],
        "name": pet.get("name", ""),
        "gender": pet.get("gender", ""),
        "breed": pet.get("breed", ""),
        "avatarUri": pet.get("avatarUri", ""),
        "birthday": pet.get("birthday", ""),
        "arrivalDate": pet.get("arrivalDate", ""),
        "neutered": pet.get("neutered", False),
        "allergies": pet.get("allergies", ""),
        "chronicDiseases": pet.get("chronicDiseases", ""),
        "microchipNumber": pet.get("microchipNumber", ""),
        "coatColor": pet.get("coatColor", ""),
        "distinctiveFeatures": pet.get("distinctiveFeatures", ""),
        "latestWeightKg": pet.get("latestWeightKg"),
        "latestWeightAt": pet.get("latestWeightAt"),
    }


def list_pets(user_id: str) -> list[dict]:
    """取得指定使用者的全部毛孩，供登入與毛孩切換使用。"""
    _ensure_user(user_id)
    return [serialize_pet(pet) for pet in db.pets.find({"userId": user_id})]


def create_pet(data: PetCreateRequest) -> dict:
    """新增一隻毛孩；同一帳號可以建立多筆資料。"""
    _ensure_user(data.userId)
    document = data.model_dump()
    result = db.pets.insert_one(document)
    document["_id"] = result.inserted_id
    return {
        "success": True,
        "message": "寵物資料已儲存",
        "petData": serialize_pet(document),
    }


def update_pet(pet_id: str, user_id: str, data: PetUpdateRequest) -> dict:
    """更新屬於目前使用者的毛孩資料。"""
    result = db.pets.find_one_and_update(
        {"_id": _object_id(pet_id, "毛孩 ID "), "userId": user_id},
        {"$set": data.model_dump()},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="找不到毛孩資料")
    return {
        "success": True,
        "message": "毛孩資料已更新",
        "petData": serialize_pet(result),
    }


def delete_pet(pet_id: str, user_id: str) -> dict:
    """刪除屬於目前使用者的毛孩資料。"""
    pet_object_id = _object_id(pet_id, "毛孩 ID ")
    result = db.pets.delete_one(
        {"_id": pet_object_id, "userId": user_id}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="找不到毛孩資料")
    # 毛孩刪除時一併清理私有子資料，避免留下 orphan records。
    child_query = {"petId": pet_id}
    for collection in (db.daily_logs, db.weight_records, db.health_events, db.medical_visits,
                       db.vaccinations, db.dewormings, db.medications, db.reminders, db.timeline):
        collection.delete_many(child_query)
    for attachment in db.attachments.find(child_query):
        _delete_document(attachment)
    db.lost_pet_profiles.delete_many(child_query)
    return {"success": True, "message": "毛孩資料已刪除"}
