"""用途：提供具使用者所有權檢查的就醫紀錄 CRUD API。"""
from fastapi import APIRouter, Query, Response, status
from app.schemas.medical_visit import MedicalVisitRequest
from app.services import medical_visit_service

router = APIRouter(tags=["medical-visits"])

@router.get("/pets/{pet_id}/medical-visits")
def list_medical_visits(pet_id: str, user_id: str = Query(alias="userId")):
    return {"success": True, "visits": medical_visit_service.list_visits(pet_id, user_id)}

@router.post("/pets/{pet_id}/medical-visits", status_code=status.HTTP_201_CREATED)
def create_medical_visit(pet_id: str, data: MedicalVisitRequest, user_id: str = Query(alias="userId")):
    return {"success": True, "visit": medical_visit_service.create_visit(pet_id, user_id, data)}

@router.get("/medical-visits/{visit_id}")
def get_medical_visit(visit_id: str, user_id: str = Query(alias="userId")):
    return {"success": True, "visit": medical_visit_service.get_visit(visit_id, user_id)}

@router.patch("/medical-visits/{visit_id}")
def update_medical_visit(visit_id: str, data: MedicalVisitRequest, user_id: str = Query(alias="userId")):
    return {"success": True, "visit": medical_visit_service.update_visit(visit_id, user_id, data)}

@router.delete("/medical-visits/{visit_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_medical_visit(visit_id: str, user_id: str = Query(alias="userId")):
    medical_visit_service.delete_visit(visit_id, user_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
