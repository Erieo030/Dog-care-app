from app.timezone import now_taipei, TAIPEI
from datetime import datetime
from fastapi import APIRouter,Query,Response,status
from app.schemas.daily_log import DailyLogCreateRequest,DailyLogUpdateRequest
from app.services import daily_log_service
router=APIRouter(tags=["daily-logs"])
@router.get("/pets/{pet_id}/daily-logs")
def ls(pet_id:str,user_id:str=Query(alias="userId"),limit:int=Query(50,ge=1,le=100)):return {"success":True,"message":"取得日常紀錄成功","data":daily_log_service.list_records(pet_id,user_id,limit)}
@router.get("/pets/{pet_id}/daily-logs/today")
def today(pet_id:str,user_id:str=Query(alias="userId"),local_date:str|None=Query(default=None,alias="localDate")):return {"success":True,"message":"取得今日紀錄成功","data":daily_log_service.get_today(pet_id,user_id,local_date or now_taipei().date().isoformat())}
@router.get("/daily-logs/{record_id}")
def get_one(record_id:str,user_id:str=Query(alias="userId")):return {"success":True,"message":"取得日常紀錄成功","data":{"record":daily_log_service.get_record(record_id,user_id)}}
@router.post("/pets/{pet_id}/daily-logs",status_code=status.HTTP_201_CREATED)
def create(pet_id:str,data:DailyLogCreateRequest,user_id:str=Query(alias="userId")):return {"success":True,"message":"日常紀錄已建立","data":{"record":daily_log_service.create(pet_id,user_id,data)}}
@router.patch("/daily-logs/{record_id}")
def update(record_id:str,data:DailyLogUpdateRequest,user_id:str=Query(alias="userId")):return {"success":True,"message":"日常紀錄已更新","data":{"record":daily_log_service.update(record_id,user_id,data)}}
@router.delete("/daily-logs/{record_id}",status_code=status.HTTP_204_NO_CONTENT)
def delete(record_id:str,user_id:str=Query(alias="userId")):daily_log_service.delete(record_id,user_id);return Response(status_code=status.HTTP_204_NO_CONTENT)
