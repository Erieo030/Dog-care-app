from typing import Any, Literal
from pydantic import BaseModel, Field
from app.schemas.ai import AIPeriod, HealthSummaryResponse
class VetVisitBrief(BaseModel):
    pet: dict[str, Any]
    period: AIPeriod
    keyObservations: list[str]
    weightSummary: dict[str, Any]
    dailyLogSummary: dict[str, Any]
    recentHealthEvents: list[dict[str, Any]]
    activeMedications: list[dict[str, Any]]
    recentMedicalVisits: list[dict[str, Any]]
    vaccination: dict[str, Any]
    deworming: dict[str, Any]
    monitorAlerts: list[dict[str, Any]]
    dataCoverage: dict[str, int]
    generatedSummary: str
    disclaimer: str
    generatedAt: Any
    generationMode: Literal["deterministic", "llm", "fallback"]
    sources: list[dict[str, Any]]
    scopeNotes: list[str] = Field(default_factory=list)
    vetQuestions: list[str] = Field(default_factory=list)
    upcomingReminders: list[dict[str, Any]] = Field(default_factory=list)
