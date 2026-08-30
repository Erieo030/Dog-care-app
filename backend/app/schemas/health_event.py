from app.timezone import now_taipei, TAIPEI
"""用途：定義健康異常共用欄位，並驗證各專屬快速紀錄 details。"""
from datetime import datetime, timezone
from typing import Any, Literal
from pydantic import BaseModel, ConfigDict, Field, StrictBool, field_validator, model_validator

class VomitingDetails(BaseModel):
    model_config = ConfigDict(extra="forbid")
    vomitCount: Literal["once", "two_to_three", "four_or_more"]
    energyCondition: Literal["normal", "slightly_low", "very_low"]
    color: Literal["transparent", "white", "yellow", "green", "brown", "red_or_blood", "other"] | None = None
    hasFoam: StrictBool = False
    hasFood: StrictBool = False
    suspectedBlood: StrictBool = False
    suspectedForeignObject: StrictBool = False
    drinkingCondition: Literal["normal", "vomits_after_drinking", "refuses", "unknown"] | None = None

class StoolDetails(BaseModel):
    model_config = ConfigDict(extra="forbid")
    stoolConsistency: Literal["soft", "watery", "hard", "other"]
    stoolColor: Literal["normal", "yellow", "green", "black", "red", "other"]
    hasMucus: StrictBool = False
    suspectedBlood: StrictBool = False
    hasForeignObject: StrictBool = False
    suspectedParasite: StrictBool = False

class AppetiteDetails(BaseModel):
    model_config = ConfigDict(extra="forbid")
    appetiteLevel: Literal["slightly_reduced", "less_than_half", "not_eating"]
    duration: Literal["one_meal", "within_half_day", "one_day", "over_one_day"] | None = None
    associatedSymptoms: list[Literal["vomiting", "abnormal_stool", "reduced_drinking", "low_energy"]] = Field(default_factory=list, max_length=4)
    @field_validator("associatedSymptoms")
    @classmethod
    def unique_symptoms(cls, value):
        if len(value) != len(set(value)):
            raise ValueError("伴隨狀況不可重複")
        return value

class LowEnergyDetails(BaseModel):
    model_config = ConfigDict(extra="forbid")
    energyLevel: Literal["slightly_low", "clearly_low", "barely_active"]
    movementCondition: Literal["normal_movement", "reduced_movement", "reluctant_to_stand", "unknown"] | None = None
    responseCondition: Literal["normal_response", "slow_response", "minimal_response", "unknown"] | None = None

class AbnormalDrinkingDetails(BaseModel):
    model_config = ConfigDict(extra="forbid")
    drinkingLevel: Literal["less_than_usual", "barely_drinking", "more_than_usual", "frequent_drinking"]
    duration: Literal["few_hours", "half_day", "one_day", "over_one_day"] | None = None
    drinkingAbility: Literal["normal", "vomits_after_drinking", "unable_to_drink", "unknown"] | None = None

SPECIAL_DETAIL_MODELS = {
    "vomiting": VomitingDetails,
    "abnormal_stool": StoolDetails,
    "low_appetite": AppetiteDetails,
    "low_energy": LowEnergyDetails,
    "abnormal_drinking": AbnormalDrinkingDetails,
}

class HealthEventCreateRequest(BaseModel):
    type: Literal["vomiting", "abnormal_stool", "low_appetite", "abnormal_drinking", "low_energy", "injury", "skin_issue", "eye_ear_issue", "possible_ingestion", "other"]
    occurredAt: datetime
    severity: Literal["mild", "moderate", "severe"]
    summary: str = Field(min_length=1, max_length=200)
    details: dict[str, Any] = Field(default_factory=dict)
    notes: str = Field(default="", max_length=2000)
    attachmentIds: list[str] = Field(default_factory=list, max_length=5)

    @model_validator(mode="after")
    def validate_specialized_event(self):
        details_model = SPECIAL_DETAIL_MODELS.get(self.type)
        if not details_model:
            return self
        if len(self.notes) > 500:
            raise ValueError("快速異常紀錄備註不可超過 500 字")
        occurred_at = self.occurredAt if self.occurredAt.tzinfo else self.occurredAt.replace(tzinfo=TAIPEI)
        if occurred_at.astimezone(timezone.utc) > now_taipei():
            raise ValueError("異常發生時間不可晚於現在")
        # 專屬 details 採白名單模型，避免任意巢狀資料進入 MongoDB。
        self.details = details_model.model_validate(self.details).model_dump(exclude_none=True)
        return self

class VomitingHealthEventRequest(HealthEventCreateRequest):
    type: Literal["vomiting"]
class StoolHealthEventRequest(HealthEventCreateRequest):
    type: Literal["abnormal_stool"]
class ObservationHealthEventRequest(HealthEventCreateRequest):
    type: Literal["low_appetite", "low_energy", "abnormal_drinking"]
class HealthEventUpdateRequest(HealthEventCreateRequest):
    pass
