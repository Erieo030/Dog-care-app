from datetime import date
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
MedicationStatus=Literal["active","completed","stopped"]
MealTiming=Literal["before_meal","after_meal","anytime"]
class MedicationRequest(BaseModel):
    model_config=ConfigDict(extra="forbid")
    name:str=Field(min_length=1,max_length=150)
    instructions:str=Field(default="",max_length=500)
    timesPerDay:int=Field(default=1,ge=1,le=6)
    startDate:str
    endDate:str=""
    mealTiming:MealTiming="anytime"
    notes:str=Field(default="",max_length=1000)
    status:MedicationStatus="active"
    reminderTimes:list[str]=Field(default_factory=list,max_length=6)
    reminderEnabled:bool=False
    medicalVisitId:str|None=None
    @field_validator("name")
    @classmethod
    def non_blank(cls,v):
        if not v.strip(): raise ValueError("藥名不可空白")
        return v.strip()
    @field_validator("startDate","endDate")
    @classmethod
    def valid_date(cls,v):
        if v:
            try: date.fromisoformat(v)
            except ValueError: raise ValueError("日期必須為 YYYY-MM-DD")
        return v
    @field_validator("reminderTimes")
    @classmethod
    def valid_times(cls,values):
        for value in values:
            try:
                h,m=map(int,value.split(":")); assert 0<=h<=23 and 0<=m<=59
            except Exception: raise ValueError("提醒時間必須為 HH:MM")
        if len(set(values))!=len(values): raise ValueError("提醒時間不可重複")
        return values
    @model_validator(mode="after")
    def dates(self):
        if self.endDate and self.endDate<self.startDate: raise ValueError("結束日期不可早於開始日期")
        if self.reminderEnabled and not self.reminderTimes: raise ValueError("啟用提醒前請先設定提醒時間")
        return self
