"""用途：舊資料庫匯入路徑的相容入口。"""

"""Backward-compatible database import; new code uses ``app.db``."""

from app.db import db

__all__ = ["db"]
