from fastapi import APIRouter,Query,Response,status
from app.schemas.vaccination import VaccinationRequest
from app.services import vaccination_service
router=APIRouter(tags=["vaccinations"])
@router.get("/pets/{pet_id}/vaccinations")
def ls(pet_id:str,user_id:str=Query(alias="userId")):return {"success":True,"message":"取得疫苗紀錄成功","data":vaccination_service.list_records(pet_id,user_id)}
@router.get("/vaccinations/{record_id}")
def get(record_id:str,user_id:str=Query(alias="userId")):return {"success":True,"message":"取得疫苗紀錄成功","data":{"record":vaccination_service.get(record_id,user_id)}}
@router.post("/pets/{pet_id}/vaccinations",status_code=status.HTTP_201_CREATED)
def create(pet_id:str,data:VaccinationRequest,user_id:str=Query(alias="userId")):return {"success":True,"message":"疫苗紀錄已建立","data":{"record":vaccination_service.create(pet_id,user_id,data)}}
@router.patch("/vaccinations/{record_id}")
def update(record_id:str,data:VaccinationRequest,user_id:str=Query(alias="userId")):return {"success":True,"message":"疫苗紀錄已更新","data":{"record":vaccination_service.update(record_id,user_id,data)}}
@router.delete("/vaccinations/{record_id}",status_code=status.HTTP_204_NO_CONTENT)
def delete(record_id:str,user_id:str=Query(alias="userId")):vaccination_service.delete(record_id,user_id);return Response(status_code=status.HTTP_204_NO_CONTENT)
