from fastapi import APIRouter, Query, Response, status
from app.schemas.deworming import DewormingRequest
from app.services import deworming_service
router=APIRouter(tags=["dewormings"])
@router.get("/pets/{pet_id}/dewormings")
def list_dewormings(pet_id:str,user_id:str=Query(alias="userId")):return {"success":True,"message":"取得驅蟲紀錄成功","data":deworming_service.list_records(pet_id,user_id)}
@router.get("/dewormings/{record_id}")
def get_deworming(record_id:str,user_id:str=Query(alias="userId")):return {"success":True,"message":"取得驅蟲紀錄成功","data":{"record":deworming_service.get_record(record_id,user_id)}}
@router.post("/pets/{pet_id}/dewormings",status_code=status.HTTP_201_CREATED)
def create_deworming(pet_id:str,data:DewormingRequest,user_id:str=Query(alias="userId")):return {"success":True,"message":"驅蟲紀錄已建立","data":{"record":deworming_service.create(pet_id,user_id,data)}}
@router.patch("/dewormings/{record_id}")
def update_deworming(record_id:str,data:DewormingRequest,user_id:str=Query(alias="userId")):return {"success":True,"message":"驅蟲紀錄已更新","data":{"record":deworming_service.update(record_id,user_id,data)}}
@router.delete("/dewormings/{record_id}",status_code=status.HTTP_204_NO_CONTENT)
def delete_deworming(record_id:str,user_id:str=Query(alias="userId")):deworming_service.delete(record_id,user_id);return Response(status_code=status.HTTP_204_NO_CONTENT)
