"""用途：建立 FastAPI 應用程式、設定 CORS 並掛載所有 API 路由。"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import get_settings
from app.services.export_service import recover_jobs


def create_app() -> FastAPI:
    settings = get_settings()
    application = FastAPI(
        title=settings.app_title,
        description="FastAPI backend for React Native Pet App (MongoDB)",
        version=settings.app_version,
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @application.get("/", tags=["health"])
    def root():
        return {
            "message": "FastAPI + MongoDB backend is running",
            "docs": "/docs",
        }

    application.include_router(api_router)
    recover_jobs()
    return application
