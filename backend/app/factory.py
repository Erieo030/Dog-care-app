"""用途：建立 FastAPI 應用程式、設定 CORS 並掛載所有 API 路由。"""

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import json
import logging
import re
import time
import traceback
from uuid import uuid4

from app.api.router import api_router
from app.core.config import get_settings
from app.services.export_service import recover_jobs, shutdown as shutdown_exports
from app.db import close as close_mongodb
from app.services.auth_tokens import authenticate_request_token
from app.services.stool_classifier_service import load_classifier

logger = logging.getLogger("mego.api")
SLOW_REQUEST_THRESHOLD_MS = 1000

def _error_message(detail):
    if isinstance(detail, str):
        return detail
    if isinstance(detail, list) and detail:
        first = detail[0]
        return first.get("msg", "請檢查輸入資料") if isinstance(first, dict) else str(first)
    return "請求無法處理"


def _route_template(request: Request) -> str:
    route = request.scope.get("route")
    return getattr(route, "path", "unmatched")



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
    async def unexpected_error(request: Request, exc: Exception):
        # 對外只回傳可理解訊息，避免洩漏 stack trace、資料庫 URI 或內部路徑。
        request_id = getattr(request.state, "request_id", "unavailable")
        event = {
            "event": "request_failed",
            "request_id": request_id,
            "method": request.method,
            "route": _route_template(request),
            "status_code": 500,
            "error_type": type(exc).__name__,
        }
        # Keep the traceback locations for debugging, but omit exception text,
        # which can accidentally contain a token, provider response, or user data.
        logger.error("%s\n%s", json.dumps(event, ensure_ascii=False), "".join(traceback.format_tb(exc.__traceback__)))
        return JSONResponse(
            status_code=500,
            headers={"X-Request-ID": request_id},
            content={"success": False, "message": "伺服器暫時無法處理，請稍後再試", "detail": "internal_server_error"},
        )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=[origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @application.middleware("http")
    async def attach_request_id(request: Request, call_next):
        request_id = uuid4().hex
        request.state.request_id = request_id
        started_at = time.perf_counter()
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        duration_ms = (time.perf_counter() - started_at) * 1000
        if duration_ms >= SLOW_REQUEST_THRESHOLD_MS:
            logger.warning("%s", json.dumps({
                "event": "slow_request",
                "request_id": request_id,
                "method": request.method,
                "route": _route_template(request),
                "status_code": response.status_code,
                "duration_ms": round(duration_ms, 1),
            }, ensure_ascii=False))
        return response

    @application.middleware("http")
    async def require_authenticated_owner(request: Request, call_next):
        path = request.url.path
        if request.method == "OPTIONS" or not path.startswith("/api/"):
            return await call_next(request)
        if path in {"/api/login", "/api/register", "/api/refresh", "/api/logout"} or path.startswith("/api/public/lost-pets/"):
            return await call_next(request)

        try:
            user_id = authenticate_request_token(request.headers.get("authorization"))
            submitted_ids = [value for value in request.query_params.getlist("userId") if value]
            submitted_ids += [value for value in request.query_params.getlist("user_id") if value]
            # The pet-list endpoint historically places owner id in its path.
            match = re.fullmatch(r"/api/pets/([^/]+)", path)
            if request.method == "GET" and match:
                submitted_ids.append(match.group(1))

            if request.method in {"POST", "PUT", "PATCH"} and "application/json" in request.headers.get("content-type", ""):
                body = await request.body()
                if body:
                    try:
                        payload = json.loads(body)
                    except (json.JSONDecodeError, UnicodeDecodeError):
                        payload = None
                    if isinstance(payload, dict):
                        for key in ("userId", "user_id"):
                            if payload.get(key):
                                submitted_ids.append(str(payload[key]))
                async def receive_body():
                    return {"type": "http.request", "body": body, "more_body": False}
                request._receive = receive_body

            identity_only_endpoint = request.method == "POST" and path == "/api/account/delete"
            if any(candidate != user_id for candidate in submitted_ids) or (not submitted_ids and not identity_only_endpoint):
                return JSONResponse(
                    status_code=403 if submitted_ids else 401,
                    content={"success": False, "message": "無法驗證此帳號的資料存取權限" if submitted_ids else "請重新登入"},
                )
        except HTTPException as exc:
            return JSONResponse(status_code=exc.status_code, content={"success": False, "message": _error_message(exc.detail)})
        return await call_next(request)

    @application.get("/", tags=["health"])
    def root():
        return {
            "message": "FastAPI + MongoDB backend is running",
            "docs": "/docs",
        }

    application.include_router(api_router)
    recover_jobs()
    application.router.add_event_handler("startup", load_classifier)
    application.router.add_event_handler("shutdown", shutdown_exports)
    application.router.add_event_handler("shutdown", close_mongodb)
    return application
