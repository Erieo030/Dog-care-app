"""用途：提供註冊與登入的 HTTP API 端點。"""

from fastapi import APIRouter

from app.schemas import LoginRequest, RegisterRequest
from app.services.auth_service import login_user, register_user

router = APIRouter(tags=["authentication"])


@router.post("/register")
def register(data: RegisterRequest):
    return register_user(data)


@router.post("/login")
def login(data: LoginRequest):
    return login_user(data)
