"""用途：提供具 ownership、篩選、排序及分頁的全域搜尋 API。"""
from datetime import datetime
from fastapi import APIRouter, Query, HTTPException
from pydantic import ValidationError
from app.schemas.search import SearchRequest
from app.services.search_service import search
router=APIRouter(tags=["search"])

def _set(value:str)->set[str]: return {item for item in value.split(",") if item}

@router.get("/pets/{pet_id}/search")
def global_search(
 pet_id:str,user_id:str=Query(alias="userId"),query:str="",timezone_offset_minutes:int=Query(default=0,ge=-840,le=840,alias="timezoneOffsetMinutes"),start_at:datetime|None=Query(default=None,alias="startAt"),end_at:datetime|None=Query(default=None,alias="endAt"),
 types:str="",health_categories:str=Query(default="",alias="healthCategories"),clinic:str="",veterinarian:str="",min_weight:float|None=Query(default=None,alias="minWeight"),max_weight:float|None=Query(default=None,alias="maxWeight"),
 attachment:str="any",reminder_status:str=Query(default="any",alias="reminderStatus"),sort:str="newest",page:int=1,page_size:int=Query(default=20,alias="pageSize"),
):
 try:
  request=SearchRequest(query=query,timezone_offset_minutes=timezone_offset_minutes,start_at=start_at,end_at=end_at,types=_set(types),health_categories=_set(health_categories),clinic=clinic,veterinarian=veterinarian,min_weight=min_weight,max_weight=max_weight,attachment=attachment,reminder_status=reminder_status,sort=sort,page=page,page_size=page_size)
 except ValidationError as error:
  raise HTTPException(status_code=422,detail=error.errors(include_url=False))
 return {"success":True,"message":"搜尋完成","data":search(pet_id,user_id,request)}
