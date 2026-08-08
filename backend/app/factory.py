"""用途：建立 FastAPI 應用程式、設定 CORS 並掛載所有 API 路由。"""

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import get_settings
from app.services.export_service import recover_jobs

def _error_message(detail):
    if isinstance(detail, str):
        return detail
    if isinstance(detail, list) and detail:
        first = detail[0]
        return first.get("msg", "請檢查輸入資料") if isinstance(first, dict) else str(first)
    return "請求無法處理"



def create_app() -> FastAPI:
    settings = get_settings()
    application = FastAPI(
        title=settings.app_title,
        description="FastAPI backend for React Native Pet App (MongoDB)",
        version=settings.app_version,
    )
    @application.exception_handler(HTTPException)
    async def http_error(_: Request, exc: HTTPException):
        message = _error_message(exc.detail)
        return JSONResponse(status_code=exc.status_code, content={"success": False, "message": message, "detail": exc.detail})

    @application.exception_handler(RequestValidationError)
    async def validation_error(_: Request, exc: RequestValidationError):
        return JSONResponse(status_code=422, content={"success": False, "message": _error_message(exc.errors()), "detail": exc.errors()})

    @application.exception_handler(Exception)
    async def unexpected_error(_: Request, __: Exception):
        # 對外只回傳可理解訊息，避免洩漏 stack trace、資料庫 URI 或內部路徑。
        return JSONResponse(status_code=500, content={"success": False, "message": "伺服器暫時無法處理，請稍後再試", "detail": "internal_server_error"})

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
