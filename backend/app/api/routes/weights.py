"""用途：提供具毛孩所有權檢查的體重列表、新增、編輯與刪除 API。"""
from fastapi import APIRouter, Query, Response, status

from app.schemas.weight import WeightRecordRequest
from app.services import weight_service

router = APIRouter(tags=["weights"])


@router.get("/pets/{pet_id}/weights")
def list_weights(pet_id: str, user_id: str = Query(alias="userId")):
    result = weight_service.list_records(pet_id, user_id)
    return {"success": True, **result}


@router.post("/pets/{pet_id}/weights", status_code=status.HTTP_201_CREATED)
def create_weight(
    pet_id: str,
    data: WeightRecordRequest,
    user_id: str = Query(alias="userId"),
):
    return {
        "success": True,
        "record": weight_service.create_record(pet_id, user_id, data),
    }


@router.patch("/weights/{record_id}")
def update_weight(
    record_id: str,
    data: WeightRecordRequest,
    user_id: str = Query(alias="userId"),
):
    return {
        "success": True,
        "record": weight_service.update_record(record_id, user_id, data),
    }


@router.delete("/weights/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_weight(record_id: str, user_id: str = Query(alias="userId")):
    weight_service.delete_record(record_id, user_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
