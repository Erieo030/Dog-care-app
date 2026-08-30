"""用途：驗證就醫紀錄、附件、藥物與回診資料。"""
from datetime import date, datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from .date_utils import normalize_datetime

class Medication(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=1, max_length=100)
    instructions: str = Field(default="", max_length=500)
    timesPerDay: int = Field(default=1, ge=1, le=10)
    startDate: str = ""
    endDate: str = ""
    mealTiming: Literal["before", "after", "any"] = "any"
    notes: str = Field(default="", max_length=500)

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("藥品名稱不可空白")
        return value

    @model_validator(mode="after")
    def validate_dates(self):
        try:
            start = date.fromisoformat(self.startDate) if self.startDate else None
            end = date.fromisoformat(self.endDate) if self.endDate else None
        except ValueError:
            raise ValueError("藥物日期必須為有效的 YYYY-MM-DD")
        if (start and start.year < 2000) or (end and end.year < 2000):
            raise ValueError("藥物日期不可早於 2000 年")
        if start and end and end < start:
            raise ValueError("藥物結束日期不可早於開始日期")
        return self

class MedicalVisitRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    visitedAt: datetime
    reason: str = Field(min_length=1, max_length=500)
    clinicName: str = Field(default="", max_length=200)
    veterinarianName: str = Field(default="", max_length=100)
    veterinarianNotes: str = Field(default="", max_length=2000)
    treatmentNotes: str = Field(default="", max_length=2000)
    followUpAt: datetime | None = None
    cost: float | None = Field(default=None, ge=0, le=10000000)
    notes: str = Field(default="", max_length=2000)
    attachmentIds: list[str] = Field(default_factory=list, max_length=10)
    medications: list[Medication] = Field(default_factory=list, max_length=20)
    clientRequestId: str | None = Field(default=None, min_length=8, max_length=80)
    createFollowUpReminder: bool = False

    @field_validator("visitedAt", "followUpAt", mode="before")
    @classmethod
    def normalize_dates(cls, value): return normalize_datetime(value)

    @field_validator("reason")
    @classmethod
    def reason_not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("看診原因不可空白")
        return value

    @model_validator(mode="after")
    def validate_follow_up(self):
        if self.followUpAt and self.followUpAt < self.visitedAt:
            raise ValueError("回診日期不可早於就醫日期")
        if self.createFollowUpReminder and not self.followUpAt:
            raise ValueError("建立回診提醒前請先選擇回診日期")
        return self
