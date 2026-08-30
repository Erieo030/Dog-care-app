from app.timezone import now_taipei, TAIPEI
from datetime import datetime, timezone
from typing import Any

def normalize_datetime(value: Any) -> Any:
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        seconds = value / 1000 if abs(value) >= 100_000_000_000 else value
        result = datetime.fromtimestamp(seconds, timezone.utc)
    elif isinstance(value, str) and value.strip():
        result = datetime.fromisoformat(value.replace("Z", "+00:00"))
    else:
        return value
    if result.year < 2000:
        raise ValueError("日期不可早於 2000 年")
    return result if result.tzinfo else result.replace(tzinfo=TAIPEI)
