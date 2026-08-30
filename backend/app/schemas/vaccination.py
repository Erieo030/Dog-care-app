from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict, field_validator
from .date_utils import normalize_datetime
class VaccinationRequest(BaseModel):
 model_config=ConfigDict(extra="forbid")
 vaccineName:str=Field(min_length=1,max_length=150)
 administeredAt:datetime
 hospitalName:str=Field(default="",max_length=200)
 nextDueAt:datetime|None=None
 notes:str=Field(default="",max_length=1000)
 attachmentIds:list[str]=Field(default_factory=list,max_length=10)
 createReminder:bool=False

 @field_validator("administeredAt", "nextDueAt", mode="before")
 @classmethod
 def normalize_dates(cls, value): return normalize_datetime(value)
