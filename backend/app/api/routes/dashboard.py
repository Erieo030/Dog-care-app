"""用途：提供首頁健康儀表板單一聚合 API。"""
from fastapi import APIRouter, Query
from app.services.dashboard_service import get_dashboard

router = APIRouter(tags=["dashboard"])

@router.get("/pets/{pet_id}/dashboard")
def dashboard(
    pet_id: str,
    user_id: str = Query(alias="userId"),
    timezone_offset_minutes: int = Query(default=0, ge=-840, le=840, alias="timezoneOffsetMinutes"),
):
    return {"success": True, "message": "健康儀表板已載入", "data": get_dashboard(pet_id, user_id, timezone_offset_minutes)}
