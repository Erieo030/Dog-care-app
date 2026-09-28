from typing import Any, Literal
from pydantic import BaseModel, Field
from app.schemas.ai import AIPeriod


class VetNarrative(BaseModel):
    """Concise, source-grounded narrative for discussing recorded care with a veterinarian."""
    overview: str
    timeline: list[str] = Field(default_factory=list)
    questions: list[str] = Field(default_factory=list)
    dataGaps: list[str] = Field(default_factory=list)


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
    aiNarrative: VetNarrative | None = None
    disclaimer: str
    generatedAt: Any
    generationMode: Literal["deterministic", "llm", "fallback"]
    sources: list[dict[str, Any]]
    scopeNotes: list[str] = Field(default_factory=list)
    vetQuestions: list[str] = Field(default_factory=list)
    upcomingReminders: list[dict[str, Any]] = Field(default_factory=list)
