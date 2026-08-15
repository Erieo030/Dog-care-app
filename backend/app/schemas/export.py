"""用途：定義匯出工作的格式、範圍與日期驗證。"""
from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field, model_validator

class ExportCreateRequest(BaseModel):
    format: Literal["pdf", "csv", "json"]
    scope: Literal["current_pet", "all_pets"] = "current_pet"
    pet_id: str | None = Field(default=None, alias="petId")
    period: Literal["30_days", "90_days", "all", "custom"] = "all"
    start_at: datetime | None = Field(default=None, alias="startAt")
    end_at: datetime | None = Field(default=None, alias="endAt")
    csv_type: Literal["weight", "health_event", "medical_visit", "reminder"] | None = Field(default=None, alias="csvType")
    include_images: bool = Field(default=False, alias="includeImages")
    include_ai_summary: bool = Field(default=True, alias="includeAiSummary")

    @model_validator(mode="after")
    def validate_options(self):
        if self.scope == "current_pet" and not self.pet_id:
            raise ValueError("匯出目前毛孩時必須提供 petId")
        if self.period == "custom" and (not self.start_at or not self.end_at):
            raise ValueError("自訂日期必須提供開始與結束時間")
        if self.start_at and self.end_at and self.start_at > self.end_at:
            raise ValueError("開始日期不可晚於結束日期")
        if self.format == "csv" and not self.csv_type:
            raise ValueError("CSV 匯出必須選擇資料類型")
        return self
