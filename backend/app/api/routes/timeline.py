"""用途：提供具 ownership、類型篩選及簡單分頁的毛孩統一時間軸 API。"""
from datetime import datetime
from typing import Literal
from fastapi import APIRouter, Query
from app.services.timeline_service import get_timeline_calendar, list_timeline

router = APIRouter(tags=["timeline"])


@router.get("/pets/{pet_id}/timeline/calendar")
def get_timeline_calendar_summary(
    pet_id: str,
    user_id: str = Query(alias="userId"),
    start_at: datetime = Query(alias="startAt"),
    end_at: datetime = Query(alias="endAt"),
    timezone_name: str = Query(default="Asia/Taipei", alias="timeZone", max_length=64),
):
    return {
        "success": True,
        "message": "取得月曆標記成功",
        "data": get_timeline_calendar(pet_id, user_id, start_at, end_at, timezone_name),
    }

@router.get("/pets/{pet_id}/timeline")
def get_timeline(
    pet_id: str,
    user_id: str = Query(alias="userId"),
    limit: int = Query(default=20, ge=1, le=50),
    skip: int = Query(default=0, ge=0),
    item_type: Literal["reminder_completed", "health_event", "weight", "medical_visit", "daily_log", "vaccination", "deworming", "medication"] | None = Query(default=None, alias="type"),
    start_at: datetime | None = Query(default=None, alias="startAt"),
    end_at: datetime | None = Query(default=None, alias="endAt"),
):
    return {
        "success": True,
        "message": "取得時間軸成功",
        "data": list_timeline(pet_id, user_id, limit, skip, item_type, start_at, end_at),
    }
