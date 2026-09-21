from datetime import datetime
from typing import Any, Literal
from pydantic import BaseModel, Field

RangeDays = Literal[7, 15, 30, 90]
class AIPeriod(BaseModel):
    days: RangeDays
    startAt: datetime
    endAt: datetime
class AIAlert(BaseModel):
    id: str
    type: str
    severity: Literal["info", "attention", "urgent"]
    title: str
    message: str
    evidence: dict[str, Any] = Field(default_factory=dict)
    firstObservedAt: datetime | None = None
    lastObservedAt: datetime | None = None
class AIContext(BaseModel):
    pet: dict[str, Any]
    period: AIPeriod
    weight: dict[str, Any]
    dailyLogs: dict[str, Any]
    healthEvents: dict[str, Any]
    medical: dict[str, Any]
    medications: dict[str, Any]
    vaccinations: dict[str, Any]
    dewormings: dict[str, Any]
    reminders: dict[str, Any]
class HealthMonitorResult(BaseModel):
    period: AIPeriod
    alerts: list[AIAlert]
    summary: dict[str, int]

class HealthSummaryResponse(BaseModel):
    periodDays: RangeDays
    headline: str
    summary: str
    highlights: list[str] = Field(default_factory=list)
    attentionItems: list[str] = Field(default_factory=list)
    upcomingCare: list[str] = Field(default_factory=list)
    dataCoverage: str
    disclaimer: str
    provider: str
    model: str | None = None
    actualModel: str | None = None
    generatedAt: datetime
    fallbackUsed: bool = True
