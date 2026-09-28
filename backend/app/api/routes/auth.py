"""用途：提供註冊與登入的 HTTP API 端點。"""

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.schemas import LoginRequest, RegisterRequest
from app.services.auth_service import login_user, refresh_user_session, register_user
from app.services.auth_tokens import revoke_refresh_session

router = APIRouter(tags=["authentication"])


class RefreshRequest(BaseModel):
    refreshToken: str = Field(min_length=20, max_length=512)


class LogoutRequest(BaseModel):
    refreshToken: str | None = Field(default=None, max_length=512)


@router.post("/register")
def register(data: RegisterRequest):
    result = register_user(data)
    return {"success": True, "message": result.get("message", "註冊成功"), "data": result}


@router.post("/login")
def login(data: LoginRequest):
    result = login_user(data)
    return {"success": True, "message": "登入成功", "data": result}


@router.post("/refresh")
def refresh(data: RefreshRequest):
    result = refresh_user_session(data.refreshToken)
    return {"success": True, "data": result}


@router.post("/logout")
def logout(data: LogoutRequest):
    revoke_refresh_session(data.refreshToken)
    return {"success": True, "message": "已登出"}
