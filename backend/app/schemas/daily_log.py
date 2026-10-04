from datetime import date, datetime
from typing import Literal
from pydantic import BaseModel, Field, field_validator
from .date_utils import normalize_datetime
WaterLevel=Literal["low","normal","high"]
EnergyLevel=Literal["normal","slightly_low"]
StoolLevel=Literal["hard","normal","soft","watery"]
class DailyLogCreateRequest(BaseModel):
 loggedAt:datetime
 localDate:str=Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
 waterLevel:WaterLevel|None=None
 foodLevel:WaterLevel|None=None
 energyLevel:EnergyLevel|None=None
 stoolLevel:StoolLevel|None=None
 notes:str=Field(default="",max_length=1000)

 @field_validator("loggedAt", mode="before")
 @classmethod
 def normalize_logged_at(cls, value): return normalize_datetime(value)

 @field_validator("localDate")
 @classmethod
 def validate_local_date(cls, value):
  date.fromisoformat(value)
  return value

class DailyLogUpdateRequest(BaseModel):
 loggedAt:datetime|None=None
 localDate:str|None=Field(default=None,pattern=r"^\d{4}-\d{2}-\d{2}$")
 waterLevel:WaterLevel|None=None
 foodLevel:WaterLevel|None=None
 energyLevel:EnergyLevel|None=None
 stoolLevel:StoolLevel|None=None
 notes:str|None=Field(default=None,max_length=1000)

 @field_validator("loggedAt", mode="before")
 @classmethod
 def normalize_logged_at(cls, value): return normalize_datetime(value)

 @field_validator("localDate")
 @classmethod
 def validate_local_date(cls, value):
  if value is not None:
   date.fromisoformat(value)
  return value
