"""舊匯入路徑的相容層；新程式請從 app.schemas 匯入。"""

from app.schemas import (
    LoginRequest,
    PetCreateRequest,
    PetUpdateRequest,
    RegisterRequest,
)

__all__ = [
    "LoginRequest",
    "RegisterRequest",
    "PetCreateRequest",
    "PetUpdateRequest",
]
