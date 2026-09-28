"""用途：疫苗、驅蟲、用藥共用的資料庫 ID、所有權與序列化規則。

各領域 service 仍負責自己的錯誤訊息、提醒與時間軸；本檔不含業務規則。
"""

from bson.errors import InvalidId
from bson.objectid import ObjectId
from fastapi import HTTPException

from app.db import db


def require_object_id(value: str, subject: str) -> ObjectId:
    """轉換 MongoDB ID，維持領域端可理解的 400 訊息。"""
    try:
        return ObjectId(value)
    except InvalidId as error:
        raise HTTPException(400, f"{subject} ID 格式錯誤") from error


def require_owned_pet(pet_id: str, user_id: str) -> None:
    """確認毛孩存在且屬於目前帳號。"""
    pet_object_id = require_object_id(pet_id, '毛孩')
    if not db.pets.find_one({'_id': pet_object_id, 'userId': user_id}):
        raise HTTPException(404, '找不到毛孩資料')


def serialize_record(document: dict) -> dict:
    """將 MongoDB `_id` 轉成前端使用的 `id`。"""
    return {'id': str(document['_id']), **{key: value for key, value in document.items() if key != '_id'}}
