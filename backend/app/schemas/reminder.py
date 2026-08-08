"""用途：定義提醒建立、編輯、來源關聯與延後操作的 API 驗證模型。"""
from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field

ReminderType = Literal["vaccine", "deworming_internal", "deworming_external", "heartworm", "medication", "follow_up", "bath", "grooming", "restock", "other"]
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

class ReminderUpdateRequest(ReminderCreateRequest):
    status: ReminderStatus = "pending"
class ReminderSnoozeRequest(BaseModel):
    scheduledAt: datetime
