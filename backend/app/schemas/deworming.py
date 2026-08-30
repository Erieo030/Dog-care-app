from datetime import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator
from .date_utils import normalize_datetime
DewormingType = Literal["internal", "external", "heartworm", "other"]
class DewormingRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: DewormingType
    productName: str = Field(min_length=1, max_length=150)
    administeredAt: datetime
    nextDueAt: datetime | None = None
    notes: str = Field(default="", max_length=1000)
    dosageText: str = Field(default="", max_length=300)
    attachmentIds: list[str] = Field(default_factory=list, max_length=10)
    createReminder: bool = False

    @field_validator("administeredAt", "nextDueAt", mode="before")
    @classmethod
    def normalize_dates(cls, value): return normalize_datetime(value)
