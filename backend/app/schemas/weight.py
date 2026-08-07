"""用途：驗證體重數值、測量日期與選填備註。"""
from datetime import datetime
from math import isclose

from pydantic import BaseModel, Field, field_validator


class WeightRecordRequest(BaseModel):
    weightKg: float = Field(gt=0, le=300)
    measuredAt: datetime
    notes: str = Field(default="", max_length=1000)
    attachmentIds: list[str] = Field(default_factory=list, max_length=3)

    @field_validator("weightKg")
    @classmethod
    def validate_decimal_places(cls, value: float) -> float:
        """體重最多保留兩位小數，避免其他呼叫端繞過前端驗證。"""
        if not isclose(value * 100, round(value * 100), abs_tol=1e-9):
            raise ValueError("體重最多只能有兩位小數")
        return value
