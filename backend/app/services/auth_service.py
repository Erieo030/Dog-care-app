"""帳號註冊與登入邏輯，登入時一併載入可切換的毛孩清單。"""

import base64
import hashlib
import hmac
import secrets

from fastapi import HTTPException

from app.db import db
from app.schemas import LoginRequest, RegisterRequest
from app.services.pet_service import serialize_pet
from app.services.auth_tokens import (
    issue_access_token,
    issue_refresh_session,
    revoke_refresh_session,
    rotate_refresh_session,
)
from bson import ObjectId

PASSWORD_ITERATIONS = 600_000


def _hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, PASSWORD_ITERATIONS)
    encode = lambda value: base64.urlsafe_b64encode(value).decode().rstrip("=")
    return f"pbkdf2_sha256${PASSWORD_ITERATIONS}${encode(salt)}${encode(digest)}"


def _verify_password(password: str, encoded: str) -> bool:
    try:
        algorithm, iterations, salt_text, digest_text = encoded.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        decode = lambda value: base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))
        expected = decode(digest_text)
        actual = hashlib.pbkdf2_hmac("sha256", password.encode(), decode(salt_text), int(iterations))
        return hmac.compare_digest(actual, expected)
    except (ValueError, TypeError):
        return False


def _session_payload(user_id: str, email: str) -> dict:
    refresh_token, refresh_expires_in, session_id = issue_refresh_session(user_id)
    access_token, access_expires_in = issue_access_token(user_id, session_id)
    pets = [serialize_pet(pet) for pet in db.pets.find({"userId": user_id})]
    return {
        "success": True,
        "userId": user_id,
        "email": email,
        "hasPet": bool(pets),
        "pets": pets,
        "accessToken": access_token,
        "refreshToken": refresh_token,
        "tokenType": "Bearer",
        "expiresIn": access_expires_in,
        "refreshExpiresIn": refresh_expires_in,
    }


def refresh_user_session(refresh_token: str) -> dict:
    user_id, access_token, next_refresh_token, access_expires_in, refresh_expires_in = rotate_refresh_session(refresh_token)
    user = db.users.find_one({"_id": ObjectId(user_id)}, {"email": 1})
    if not user:
        revoke_refresh_session(next_refresh_token)
        raise HTTPException(status_code=401, detail="登入狀態已失效，請重新登入")
    pets = [serialize_pet(pet) for pet in db.pets.find({"userId": user_id})]
    return {
        "success": True,
        "userId": user_id,
        "email": str(user["email"]),
        "hasPet": bool(pets),
        "pets": pets,
        "accessToken": access_token,
        "refreshToken": next_refresh_token,
        "tokenType": "Bearer",
        "expiresIn": access_expires_in,
        "refreshExpiresIn": refresh_expires_in,
    }


def register_user(data: RegisterRequest) -> dict:
    """建立帳號並維持既有註冊回應格式。"""
    if db.users.find_one({"email": data.email}):
        raise HTTPException(status_code=400, detail="帳號已存在")
    result = db.users.insert_one({"email": data.email, "passwordHash": _hash_password(data.password)})
    user_id = str(result.inserted_id)
    return {**_session_payload(user_id, data.email), "message": "註冊成功"}


def login_user(data: LoginRequest) -> dict:
    """驗證帳密並回傳全部毛孩。"""
    user = db.users.find_one({"email": data.email})
    if not user:
        raise HTTPException(status_code=401, detail="帳號或密碼錯誤")
    password_hash = user.get("passwordHash")
    if not password_hash or not _verify_password(data.password, password_hash):
        raise HTTPException(status_code=401, detail="帳號或密碼錯誤")
    user_id = str(user["_id"])
    return _session_payload(user_id, data.email)
