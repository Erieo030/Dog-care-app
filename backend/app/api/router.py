"""用途：集中組合各功能路由並加上統一的 API 前綴。"""
from fastapi import APIRouter
from app.api.routes import (
    attachments, auth, dashboard, exports, settings, search, health_events, medical_visits, pets, reminders, timeline, weights,
)

api_router = APIRouter(prefix="/api")
for router in [
    auth.router, pets.router, dashboard.router, search.router, exports.router, settings.router, attachments.router, reminders.router, health_events.router,
    weights.router, medical_visits.router, timeline.router,
]:
    api_router.include_router(router)
