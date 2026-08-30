from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, field_validator
class LostPetProfileRequest(BaseModel):
 model_config=ConfigDict(extra="forbid")
 enabled:bool=False
 contactName:str=Field(default="",max_length=100)
 contactEmail:str=Field(default="",max_length=320)
 contactPhone:str=Field(default="",max_length=50)
 alternatePhone:str=Field(default="",max_length=50)
 contactMessage:str=Field(default="",max_length=500)
 showBreed:bool=True
 showSex:bool=True
 showNeutered:bool=False
 showCoatColor:bool=True
 showDistinctiveFeatures:bool=True
 showAvatar:bool=True
 showContactName:bool=True
 showContactEmail:bool=False
 showContactPhone:bool=True
 showAlternatePhone:bool=False
 showContactMessage:bool=True
 lostMode:bool=False
 lostSince:datetime|None=None
 lostLocationText:str=Field(default="",max_length=300)
 lostMessage:str=Field(default="",max_length=1000)
 @field_validator("contactName","contactPhone")
 @classmethod
 def trim_required(cls,v):return v.strip()
class PublicLostPetResponse(BaseModel):
 name:str
 avatar:str|None=None
 breed:str|None=None
 sex:str|None=None
 isNeutered:bool|None=None
 coatColor:str|None=None
 distinctiveFeatures:str|None=None
 lostMode:bool
 lostSince:datetime|None=None
 lostLocationText:str|None=None
 lostMessage:str|None=None
 contactName:str
 contactEmail:str|None=None
 contactPhone:str
 alternatePhone:str|None=None
 contactMessage:str|None=None
