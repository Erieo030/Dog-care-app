"""帳號註冊與登入邏輯，登入時一併載入可切換的毛孩清單。"""

from fastapi import HTTPException

from app.db import db
from app.schemas import LoginRequest, RegisterRequest
from app.services.pet_service import serialize_pet


def register_user(data: RegisterRequest) -> dict:
    """建立帳號並維持既有註冊回應格式。"""
    if db.users.find_one({"email": data.email}):
        raise HTTPException(status_code=400, detail="帳號已存在")
    result = db.users.insert_one({"email": data.email, "password": data.password})
    return {
        "success": True,
        "message": "註冊成功",
        "userId": str(result.inserted_id),
        "hasPet": False,
        "petData": None,
        "pets": [],
    }


def login_user(data: LoginRequest) -> dict:
    """驗證帳密並回傳全部毛孩；petData 保留為第一隻毛孩以相容舊前端。"""
    user = db.users.find_one({"email": data.email, "password": data.password})
    if not user:
        raise HTTPException(status_code=401, detail="帳號或密碼錯誤")
    user_id = str(user["_id"])
    pets = [serialize_pet(pet) for pet in db.pets.find({"userId": user_id})]
    return {
        "success": True,
        "userId": user_id,
        "hasPet": bool(pets),
        "petData": pets[0] if pets else None,
        "pets": pets,
    }
