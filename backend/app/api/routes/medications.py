from typing import Literal
from fastapi import APIRouter,Query,Response,status
from app.schemas.medication import MedicationRequest
from app.services import medication_service
router=APIRouter(tags=["medications"])
@router.get("/pets/{pet_id}/medications")
def ls(pet_id:str,user_id:str=Query(alias="userId"),status:Literal["active","completed","stopped"]|None=None):return {"success":True,**medication_service.list_records(pet_id,user_id,status)}
@router.get("/medications/{record_id}")
def get(record_id:str,user_id:str=Query(alias="userId")):return {"success":True,"record":medication_service.get(record_id,user_id)}
@router.post("/pets/{pet_id}/medications",status_code=status.HTTP_201_CREATED)
def create(pet_id:str,data:MedicationRequest,user_id:str=Query(alias="userId")):return {"success":True,"record":medication_service.create(pet_id,user_id,data)}
@router.patch("/medications/{record_id}")
def update(record_id:str,data:MedicationRequest,user_id:str=Query(alias="userId")):return {"success":True,"record":medication_service.update(record_id,user_id,data)}
@router.post("/medications/{record_id}/complete")
def complete(record_id:str,user_id:str=Query(alias="userId")):return {"success":True,"record":medication_service.change_status(record_id,user_id,"completed")}
@router.post("/medications/{record_id}/stop")
def stop(record_id:str,user_id:str=Query(alias="userId")):return {"success":True,"record":medication_service.change_status(record_id,user_id,"stopped")}
@router.delete("/medications/{record_id}",status_code=status.HTTP_204_NO_CONTENT)
def delete(record_id:str,user_id:str=Query(alias="userId")):medication_service.delete(record_id,user_id);return Response(status_code=status.HTTP_204_NO_CONTENT)
