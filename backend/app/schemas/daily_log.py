from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field
WaterLevel=Literal["low","normal","high"]
EnergyLevel=Literal["normal","low"]
class DailyLogCreateRequest(BaseModel):
 loggedAt:datetime
 localDate:str=Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
 waterLevel:WaterLevel|None=None
 foodLevel:WaterLevel|None=None
 energyLevel:EnergyLevel|None=None
 stoolLevel:int|None=Field(default=None,ge=2,le=5)
 notes:str=Field(default="",max_length=1000)
class DailyLogUpdateRequest(BaseModel):
 loggedAt:datetime|None=None
 localDate:str|None=Field(default=None,pattern=r"^\d{4}-\d{2}-\d{2}$")
 waterLevel:WaterLevel|None=None
 foodLevel:WaterLevel|None=None
 energyLevel:EnergyLevel|None=None
 stoolLevel:int|None=Field(default=None,ge=2,le=5)
 notes:str|None=Field(default=None,max_length=1000)
