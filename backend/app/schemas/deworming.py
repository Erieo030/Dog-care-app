from datetime import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field
DewormingType = Literal["internal", "external", "heartworm", "other"]
class DewormingRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: DewormingType
    productName: str = Field(min_length=1, max_length=150)
    administeredAt: datetime
    nextDueAt: datetime | None = None
    notes: str = Field(default="", max_length=1000)
    manufacturer: str = Field(default="", max_length=150)
    dosageText: str = Field(default="", max_length=300)
    administrationMethod: str = Field(default="", max_length=300)
    hospitalName: str = Field(default="", max_length=200)
    veterinarianName: str = Field(default="", max_length=100)
    attachmentIds: list[str] = Field(default_factory=list, max_length=10)
    createReminder: bool = False
