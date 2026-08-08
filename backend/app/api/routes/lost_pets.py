from fastapi import APIRouter, Query, Response
from fastapi.responses import HTMLResponse
from app.schemas.lost_pet import LostPetProfileRequest
from app.services import lost_pet_service
router=APIRouter(tags=['lost-pets'])
@router.get('/pets/{pet_id}/lost-profile')
def get_profile(pet_id:str,user_id:str=Query(alias='userId')):return {'success':True,'profile':lost_pet_service.serialize_private(lost_pet_service.private(pet_id,user_id)) if lost_pet_service.private(pet_id,user_id) else None}
@router.put('/pets/{pet_id}/lost-profile')
def save_profile(pet_id:str,data:LostPetProfileRequest,user_id:str=Query(alias='userId')):return {'success':True,'profile':lost_pet_service.save(pet_id,user_id,data)}
@router.post('/pets/{pet_id}/lost-profile/rotate-token')
def rotate(pet_id:str,user_id:str=Query(alias='userId')):return {'success':True,**lost_pet_service.rotate(pet_id,user_id)}
@router.delete('/pets/{pet_id}/lost-profile',status_code=204)
def disable(pet_id:str,user_id:str=Query(alias='userId')):lost_pet_service.disable(pet_id,user_id);return Response(status_code=204)
@router.get('/public/lost-pets/{public_token}')
def public_json(public_token:str):return lost_pet_service.public(public_token)
@router.get('/public/lost-pets/{public_token}/page',response_class=HTMLResponse)
def public_page(public_token:str):return HTMLResponse(lost_pet_service.public_html(public_token))
