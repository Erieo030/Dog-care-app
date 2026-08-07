"""用途：集中匯出 API 請求驗證模型。"""
"""集中匯出 API schema，讓路由與服務使用一致的資料模型。"""

from app.schemas.auth import LoginRequest, RegisterRequest
from app.schemas.pet import PetCreateRequest, PetUpdateRequest

__all__ = [
    "LoginRequest",
    "RegisterRequest",
    "PetCreateRequest",
    "PetUpdateRequest",
]
