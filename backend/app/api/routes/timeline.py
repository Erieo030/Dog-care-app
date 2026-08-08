"""用途：提供具 ownership、類型篩選及簡單分頁的毛孩統一時間軸 API。"""
from typing import Literal
from fastapi import APIRouter, Query
from app.services.timeline_service import list_timeline

router = APIRouter(tags=["timeline"])

@router.get("/pets/{pet_id}/timeline")
def get_timeline(
    pet_id: str,
    user_id: str = Query(alias="userId"),
    limit: int = Query(default=20, ge=1, le=50),
    skip: int = Query(default=0, ge=0),
    item_type: Literal["reminder_completed", "health_event", "weight", "medical_visit", "daily_log", "vaccination", "deworming", "medication"] | None = Query(default=None, alias="type"),
):
    return {"success": True, **list_timeline(pet_id, user_id, limit, skip, item_type)}
