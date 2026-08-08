"""用途：提供註冊與登入的 HTTP API 端點。"""

from fastapi import APIRouter

from app.schemas import LoginRequest, RegisterRequest
from app.services.auth_service import login_user, register_user

router = APIRouter(tags=["authentication"])


@router.post("/register")
def register(data: RegisterRequest):
    result = register_user(data)
    return {"success": True, "message": result.get("message", "註冊成功"), "data": result}


@router.post("/login")
def login(data: LoginRequest):
    result = login_user(data)
    return {"success": True, "message": "登入成功", "data": result}
