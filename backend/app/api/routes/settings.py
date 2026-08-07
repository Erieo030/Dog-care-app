"""用途：提供設定中心可驗證的帳號儲存量。"""
from fastapi import APIRouter, Query
from app.services.settings_service import storage_usage
router=APIRouter(prefix='/settings',tags=['settings'])
@router.get('/storage')
def get_storage(user_id:str=Query(alias='userId')):
    return {'success':True,'message':'已取得儲存空間資訊','data':storage_usage(user_id)}
