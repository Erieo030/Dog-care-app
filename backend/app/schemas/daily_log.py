from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field
WaterLevel=Literal["very_low","low","normal","high","very_high"]
EnergyLevel=Literal["very_energetic","normal","slightly_low","clearly_low","very_low"]
PhysicalStatus=Literal["normal","heat","period","post_surgery","pregnant","other"]
class DailyLogCreateRequest(BaseModel):
 loggedAt:datetime
 localDate:str=Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
 waterLevel:WaterLevel|None=None
 foodLevel:WaterLevel|None=None
 snack:bool|None=None
 snackName:str=Field(default="",max_length=100)
 snackNotes:str=Field(default="",max_length=300)
 energyLevel:EnergyLevel|None=None
 physicalStatus:PhysicalStatus|None=None
 physicalStatusNote:str=Field(default="",max_length=300)
 stoolLevel:int|None=Field(default=None,ge=1,le=5)
 notes:str=Field(default="",max_length=1000)
class DailyLogUpdateRequest(BaseModel):
 loggedAt:datetime|None=None
 localDate:str|None=Field(default=None,pattern=r"^\d{4}-\d{2}-\d{2}$")
 waterLevel:WaterLevel|None=None
 foodLevel:WaterLevel|None=None
 snack:bool|None=None
 snackName:str|None=Field(default=None,max_length=100)
 snackNotes:str|None=Field(default=None,max_length=300)
 energyLevel:EnergyLevel|None=None
 physicalStatus:PhysicalStatus|None=None
 physicalStatusNote:str|None=Field(default=None,max_length=300)
 stoolLevel:int|None=Field(default=None,ge=1,le=5)
 notes:str|None=Field(default=None,max_length=1000)
