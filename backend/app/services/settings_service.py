"""用途：計算目前帳號可驗證的附件儲存量。"""
from app.db import db

def storage_usage(user_id: str) -> dict:
    pet_ids=[str(item['_id']) for item in db.pets.find({'userId':user_id},{'_id':1})]
    pipeline=[{'$match':{'petId':{'$in':pet_ids}}},{'$group':{'_id':None,'count':{'$sum':1},'bytes':{'$sum':{'$ifNull':['$sizeBytes',0]}}}}]
    result=next(db.attachments.aggregate(pipeline),None) if pet_ids else None
    return {'attachmentCount':int((result or {}).get('count',0)),'attachmentBytes':int((result or {}).get('bytes',0)),'imageCacheBytes':None}
