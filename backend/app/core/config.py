"""用途：讀取並驗證環境變數，提供全應用程式共用設定。"""

import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parents[3]
load_dotenv(dotenv_path=PROJECT_ROOT / ".env")

DEFAULT_UPLOAD_MAX_MB = 10
MIN_UPLOAD_MAX_MB = 1
MAX_UPLOAD_MAX_MB = 50


def _bounded_upload_max_mb() -> int:
    try:
        value = int(os.getenv("MEGO_UPLOAD_MAX_MB", str(DEFAULT_UPLOAD_MAX_MB)))
    except ValueError:
        return DEFAULT_UPLOAD_MAX_MB
    return min(MAX_UPLOAD_MAX_MB, max(MIN_UPLOAD_MAX_MB, value))


def _attachment_storage_dir() -> Path:
    configured = os.getenv("ATTACHMENT_STORAGE_DIR", "").strip() or "backend/uploads"
    path = Path(configured).expanduser()
    if not path.is_absolute():
        path = PROJECT_ROOT / path
    return path.resolve()


@dataclass(frozen=True)
class Settings:
    mongo_uri: str
    mongo_db: str
    public_app_url: str = ""
    cors_origins: str = "*"
    app_title: str = "MEGO Backend"
    app_version: str = "2.0.0"
    auth_secret_key: str = ""
    access_token_minutes: int = 15
    refresh_token_days: int = 7
    attachment_storage_dir: Path = PROJECT_ROOT / "backend" / "uploads"
    upload_max_mb: int = DEFAULT_UPLOAD_MAX_MB


@lru_cache
def get_settings() -> Settings:
    mongo_uri = os.getenv("MONGO_URI")
    mongo_db = os.getenv("MONGO_DB")
    if not mongo_uri:
        raise RuntimeError("MONGO_URI is not set")
    if not mongo_db:
        raise RuntimeError("MONGO_DB is not set")
    auth_secret_key = os.getenv("AUTH_SECRET_KEY", "")
    if len(auth_secret_key) < 32:
        raise RuntimeError("AUTH_SECRET_KEY must be set to a random value of at least 32 characters")
    return Settings(
        mongo_uri=mongo_uri,
        mongo_db=mongo_db,
        public_app_url=os.getenv("PUBLIC_APP_URL", "").rstrip("/"),
        cors_origins=os.getenv("CORS_ORIGINS", "*"),
        app_title=os.getenv("APP_TITLE", "MEGO Backend"),
        app_version=os.getenv("APP_VERSION", "2.0.0"),
        auth_secret_key=auth_secret_key,
        access_token_minutes=max(1, int(os.getenv("AUTH_ACCESS_TOKEN_MINUTES", "15"))),
        # Persistent login is intentionally capped at one week. Environment
        # configuration may shorten it, but must not extend it beyond 7 days.
        refresh_token_days=min(7, max(1, int(os.getenv("AUTH_REFRESH_TOKEN_DAYS", "7")))),
        attachment_storage_dir=_attachment_storage_dir(),
        upload_max_mb=_bounded_upload_max_mb(),
    )
