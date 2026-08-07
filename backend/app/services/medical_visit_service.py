"""用途：處理具 ownership 的就醫 CRUD、附件、回診提醒與時間軸一致性。"""
from datetime import datetime, timezone
from bson.errors import InvalidId
from pymongo.errors import DuplicateKeyError
from bson.objectid import ObjectId
from fastapi import HTTPException
from app.db import db
from app.schemas.medical_visit import MedicalVisitRequest
from app.services.attachment_service import delete_source_attachments, source_attachments, sync_source_attachments, timeline_attachment_count
from app.services.timeline_service import delete_timeline_item, upsert_timeline_item

SOURCE_TYPE = "medical_visit"
def _id(value: str, label: str = "就醫紀錄 ID ") -> ObjectId:
    try: return ObjectId(value)
    except InvalidId: raise HTTPException(status_code=400, detail=f"{label}格式錯誤")
def _ensure_owned_pet(pet_id: str, user_id: str) -> None:
    if not db.pets.find_one({"_id": _id(pet_id, "毛孩 ID "), "userId": user_id}): raise HTTPException(status_code=404, detail="找不到毛孩資料")
def _owned_visit(visit_id: str, user_id: str) -> dict:
    item=db.medical_visits.find_one({"_id":_id(visit_id)})
    if not item: raise HTTPException(status_code=404, detail="找不到就醫紀錄")
    _ensure_owned_pet(item["petId"],user_id); return item
def _reminder_query(pet_id:str,visit_id:str)->dict: return {"petId":pet_id,"type":"follow_up","sourceType":SOURCE_TYPE,"sourceId":visit_id}
def _reminder_state(pet_id:str,visit_id:str)->dict:
    r=db.reminders.find_one(_reminder_query(pet_id,visit_id)); return {"followUpReminderId":str(r["_id"]) if r else None,"followUpReminderStatus":r.get("status") if r else None}
def _serialize(item:dict)->dict:
    visit_id=str(item["_id"])
    fields=["visitedAt","reason","clinicName","veterinarianName","veterinarianNotes","treatmentNotes","medicationNotes","followUpAt","cost","notes","medications","createdAt","updatedAt","clientRequestId"]
    return {"id":visit_id,"petId":item["petId"],**{k:item.get(k) for k in fields},"attachmentIds":item.get("attachmentIds",[]),"attachments":source_attachments(item,SOURCE_TYPE),**_reminder_state(item["petId"],visit_id)}
def _timeline_values(data:MedicalVisitRequest)->dict:
    clinic=data.clinicName.strip(); title=f"前往{clinic}：{data.reason}" if clinic else f"就醫紀錄：{data.reason}"; description=f"回診日期：{data.followUpAt.strftime('%Y/%m/%d')}" if data.followUpAt else ""; return {"occurredAt":data.visitedAt,"title":title,"description":description}
def _sync_timeline(pet_id:str,visit_id:str,data:MedicalVisitRequest)->None:
    v=_timeline_values(data); upsert_timeline_item(pet_id,SOURCE_TYPE,v["occurredAt"],v["title"],visit_id,v["description"],timeline_attachment_count(SOURCE_TYPE,visit_id))
def _sync_follow_up_reminder(pet_id:str,visit_id:str,data:MedicalVisitRequest)->None:
    query=_reminder_query(pet_id,visit_id)
    if not data.createFollowUpReminder or not data.followUpAt: db.reminders.delete_many(query); return
    db.reminders.create_index([("petId",1),("sourceType",1),("sourceId",1)],unique=True,partialFilterExpression={"sourceType":SOURCE_TYPE},name="unique_medical_visit_reminder")
    now=datetime.now(timezone.utc); title_basis=data.clinicName.strip() or data.reason.strip()
    db.reminders.update_one(query,{"$set":{**query,"title":f"回診：{title_basis}","scheduledAt":data.followUpAt,"recurrenceRule":"none","notes":data.reason,"status":"pending","completedAt":None,"updatedAt":now},"$setOnInsert":{"createdAt":now}},upsert=True)
def list_visits(pet_id:str,user_id:str)->list[dict]:
    _ensure_owned_pet(pet_id,user_id); return [_serialize(x) for x in db.medical_visits.find({"petId":pet_id}).sort([("visitedAt",-1),("_id",-1)])]
def get_visit(visit_id:str,user_id:str)->dict: return _serialize(_owned_visit(visit_id,user_id))
def create_visit(pet_id:str,user_id:str,data:MedicalVisitRequest)->dict:
    _ensure_owned_pet(pet_id,user_id)
    if data.clientRequestId:
        db.medical_visits.create_index([("petId",1),("clientRequestId",1)],unique=True,partialFilterExpression={"clientRequestId":{"$type":"string"}},name="unique_medical_visit_request")
        existing=db.medical_visits.find_one({"petId":pet_id,"clientRequestId":data.clientRequestId})
        if existing:return _serialize(existing)
    now=datetime.now(timezone.utc); values=data.model_dump(exclude={"createFollowUpReminder"}); attachment_ids=values.pop("attachmentIds",[]); document={"petId":pet_id,**values,"attachmentIds":attachment_ids,"createdAt":now,"updatedAt":now}
    try: result=db.medical_visits.insert_one(document)
    except DuplicateKeyError:
        existing=db.medical_visits.find_one({"petId":pet_id,"clientRequestId":data.clientRequestId})
        if existing:return _serialize(existing)
        raise
    document["_id"]=result.inserted_id; visit_id=str(result.inserted_id)
    try:
        document["attachmentIds"]=sync_source_attachments(pet_id,SOURCE_TYPE,visit_id,attachment_ids,user_id); db.medical_visits.update_one({"_id":result.inserted_id},{"$set":{"attachmentIds":document["attachmentIds"]}}); _sync_timeline(pet_id,visit_id,data); _sync_follow_up_reminder(pet_id,visit_id,data)
    except Exception:
        db.medical_visits.delete_one({"_id":result.inserted_id}); delete_source_attachments(pet_id,SOURCE_TYPE,visit_id); delete_timeline_item(pet_id,SOURCE_TYPE,visit_id); db.reminders.delete_many(_reminder_query(pet_id,visit_id)); raise
    return _serialize(document)
def update_visit(visit_id:str,user_id:str,data:MedicalVisitRequest)->dict:
    existing=_owned_visit(visit_id,user_id); values=data.model_dump(exclude={"createFollowUpReminder","clientRequestId"}); attachment_ids=values.pop("attachmentIds",[]); values["attachmentIds"]=sync_source_attachments(existing["petId"],SOURCE_TYPE,visit_id,attachment_ids,user_id); values["updatedAt"]=datetime.now(timezone.utc); item=db.medical_visits.find_one_and_update({"_id":existing["_id"]},{"$set":values},return_document=True); _sync_timeline(existing["petId"],visit_id,data); _sync_follow_up_reminder(existing["petId"],visit_id,data); return _serialize(item)
def delete_visit(visit_id:str,user_id:str)->None:
    item=_owned_visit(visit_id,user_id); db.medical_visits.delete_one({"_id":item["_id"]}); delete_source_attachments(item["petId"],SOURCE_TYPE,visit_id); delete_timeline_item(item["petId"],SOURCE_TYPE,visit_id); db.reminders.delete_many(_reminder_query(item["petId"],visit_id))
