from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
class VaccinationRequest(BaseModel):
 model_config=ConfigDict(extra="forbid")
 vaccineName:str=Field(min_length=1,max_length=150)
 administeredAt:datetime
 hospitalName:str=Field(default="",max_length=200)
 veterinarianName:str=Field(default="",max_length=100)
 batchNumber:str=Field(default="",max_length=100)
 manufacturer:str=Field(default="",max_length=150)
 nextDueAt:datetime|None=None
 notes:str=Field(default="",max_length=1000)
 attachmentIds:list[str]=Field(default_factory=list,max_length=10)
 createReminder:bool=False
