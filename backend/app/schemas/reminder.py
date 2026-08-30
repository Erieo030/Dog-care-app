from app.timezone import now_taipei
"""用途：定義提醒建立、編輯、來源關聯與延後操作的 API 驗證模型。"""
from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field, field_validator, model_validator
from .date_utils import normalize_datetime

ReminderType = Literal["vaccine", "deworming", "medication", "follow_up", "other"]
ReminderStatus = Literal["pending", "completed", "skipped", "snoozed"]
RecurrenceRule = Literal["none", "daily", "weekly", "monthly", "quarterly", "half_yearly", "yearly"]

class ReminderCreateRequest(BaseModel):
    type: ReminderType
    title: str = Field(min_length=1, max_length=100)
    scheduledAt: datetime
    recurrenceRule: RecurrenceRule = "none"
    notes: str = Field(default="", max_length=1000)
    sourceType: Literal["medical_visit", "vaccination", "deworming", "medication"] | None = None
    sourceId: str | None = Field(default=None, max_length=24)
    sourceSlot: str | None = Field(default=None, max_length=5)
    clientRequestId: str | None = Field(default=None, min_length=8, max_length=64)

    @field_validator("scheduledAt", mode="before")
    @classmethod
    def normalize_scheduled_at(cls, value): return normalize_datetime(value)

    @model_validator(mode="after")
    def validate_future_time(self):
        if self.scheduledAt <= now_taipei():
            raise ValueError("提醒時間必須晚於目前台灣時間")
        return self

class ReminderUpdateRequest(ReminderCreateRequest):
    status: ReminderStatus = "pending"
class ReminderSnoozeRequest(BaseModel):
    scheduledAt: datetime

    @field_validator("scheduledAt", mode="before")
    @classmethod
    def normalize_scheduled_at(cls, value): return normalize_datetime(value)
