"""用途：提供首頁健康儀表板單一聚合 API。"""
from fastapi import APIRouter, Query
from app.services.dashboard_service import get_dashboard

router = APIRouter(tags=["dashboard"])

@router.get("/pets/{pet_id}/dashboard")
def dashboard(
    pet_id: str,
    user_id: str = Query(alias="userId"),
    timezone_offset_minutes: int = Query(default=0, ge=-840, le=840, alias="timezoneOffsetMinutes"),
    range_days: int = Query(default=30, ge=7, le=90, alias="range"),
):
    if range_days not in {7, 30, 90}:
        from fastapi import HTTPException
        raise HTTPException(status_code=422, detail="range 僅支援 7、30 或 90")
    return {"success": True, "message": "健康儀表板已載入", "data": get_dashboard(pet_id, user_id, timezone_offset_minutes, range_days)}
