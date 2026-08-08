"""毛孩管理 HTTP 端點，負責參數接收並委派給 service。"""

from fastapi import APIRouter, Query

from app.schemas import PetCreateRequest, PetUpdateRequest
from app.services.pet_service import (
    create_pet,
    delete_pet,
    list_pets,
    update_pet,
)

router = APIRouter(tags=["pets"])


@router.get("/pets/{user_id}")
def get_pet_list(user_id: str):
    return {"success": True, "message": "取得毛孩資料成功", "data": {"pets": list_pets(user_id)}}


@router.post("/create-pet")
def create_pet_profile(data: PetCreateRequest):
    result = create_pet(data)
    return {"success": True, "message": result.get("message", "寵物資料已儲存"), "data": result}


@router.put("/pets/{pet_id}")
def update_pet_profile(
    pet_id: str,
    data: PetUpdateRequest,
    user_id: str = Query(alias="userId"),
):
    result = update_pet(pet_id, user_id, data)
    return {"success": True, "message": result.get("message", "寵物資料已更新"), "data": result}


@router.delete("/pets/{pet_id}")
def delete_pet_profile(
    pet_id: str,
    user_id: str = Query(alias="userId"),
):
    result = delete_pet(pet_id, user_id)
    return {"success": True, "message": result.get("message", "毛孩資料已刪除"), "data": result}
