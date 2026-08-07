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
    return {"success": True, "pets": list_pets(user_id)}


@router.post("/create-pet")
def create_pet_profile(data: PetCreateRequest):
    return create_pet(data)


@router.put("/pets/{pet_id}")
def update_pet_profile(
    pet_id: str,
    data: PetUpdateRequest,
    user_id: str = Query(alias="userId"),
):
    return update_pet(pet_id, user_id, data)


@router.delete("/pets/{pet_id}")
def delete_pet_profile(
    pet_id: str,
    user_id: str = Query(alias="userId"),
):
    return delete_pet(pet_id, user_id)
