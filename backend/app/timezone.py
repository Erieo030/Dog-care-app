"""MEGO 統一使用台灣時區產生使用者可見的時間。"""
from datetime import datetime, timedelta, timezone

TAIPEI = timezone(timedelta(hours=8), name="Asia/Taipei")

def now_taipei() -> datetime:
    return datetime.now(TAIPEI)
