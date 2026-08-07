"""用途：驗證全域搜尋與篩選參數。"""
from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field, model_validator

class SearchRequest(BaseModel):
    query: str = Field(default="", max_length=100)
    timezone_offset_minutes: int = Field(default=0, ge=-840, le=840)
    start_at: datetime | None = None
    end_at: datetime | None = None
    types: set[Literal["weight", "health_event", "medical_visit", "reminder"]] = Field(default_factory=set)
    health_categories: set[Literal["digestive", "skin", "respiratory", "eye", "injury", "other"]] = Field(default_factory=set)
    clinic: str = Field(default="", max_length=100)
    veterinarian: str = Field(default="", max_length=100)
    min_weight: float | None = Field(default=None, ge=0, le=300)
    max_weight: float | None = Field(default=None, ge=0, le=300)
    attachment: Literal["any", "with", "without"] = "any"
    reminder_status: Literal["any", "completed", "pending", "overdue"] = "any"
    sort: Literal["newest", "oldest", "az", "za"] = "newest"
    page: int = Field(default=1, ge=1, le=10000)
    page_size: int = Field(default=20, ge=1, le=50)

    @model_validator(mode="after")
    def validate_ranges(self):
        if self.start_at and self.end_at and self.end_at < self.start_at:
            raise ValueError("結束日期不可早於開始日期")
        if self.min_weight is not None and self.max_weight is not None and self.max_weight < self.min_weight:
            raise ValueError("體重上限不可小於下限")
        return self
