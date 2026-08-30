"""用途：讀取並驗證環境變數，提供全應用程式共用設定。"""

import os
from dataclasses import dataclass
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Settings:
    mongo_uri: str
    mongo_db: str
    public_app_url: str = ""
    cors_origins: str = "*"
    app_title: str = "MEGO Backend"
    app_version: str = "2.0.0"


@lru_cache
def get_settings() -> Settings:
    mongo_uri = os.getenv("MONGO_URI")
    mongo_db = os.getenv("MONGO_DB")
    if not mongo_uri:
        raise RuntimeError("MONGO_URI is not set")
    if not mongo_db:
        raise RuntimeError("MONGO_DB is not set")
    return Settings(mongo_uri=mongo_uri, mongo_db=mongo_db, public_app_url=os.getenv("PUBLIC_APP_URL", "").rstrip("/"), cors_origins=os.getenv("CORS_ORIGINS", "*"), app_title=os.getenv("APP_TITLE", "MEGO Backend"), app_version=os.getenv("APP_VERSION", "2.0.0"))
