"""用途：集中組合各功能路由並加上統一的 API 前綴。"""
from fastapi import APIRouter
from app.api.routes import (
    attachments, ai, auth, dashboard, exports, settings, health_events, medical_visits, pets, reminders, timeline, weights, daily_logs, vaccinations, dewormings, medications, lost_pets,
)

api_router = APIRouter(prefix="/api")
for router in [
    ai.router, auth.router, pets.router, dashboard.router, exports.router, settings.router, attachments.router, reminders.router, health_events.router,
    weights.router, medical_visits.router, timeline.router, daily_logs.router, vaccinations.router, dewormings.router, medications.router, lost_pets.router,
]:
    api_router.include_router(router)
