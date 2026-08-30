from app.timezone import now_taipei
from bson.errors import InvalidId
from bson.objectid import ObjectId
from fastapi import HTTPException
from app.db import db
from app.schemas.deworming import DewormingRequest
from app.schemas.reminder import ReminderCreateRequest, ReminderUpdateRequest
from app.services.reminder_service import create_reminder, update_reminder
from app.services.timeline_service import delete_timeline_item, upsert_timeline_item
TYPE_LABELS={"internal":"體內驅蟲","external":"體外驅蟲","heartworm":"心絲蟲預防","other":"其他"}
def oid(value):
    try:return ObjectId(value)
    except InvalidId:raise HTTPException(400,"驅蟲紀錄 ID 格式錯誤")
def pet(pet_id,user_id):
    try: object_id=ObjectId(pet_id)
    except InvalidId: raise HTTPException(400,"毛孩 ID 格式錯誤")
    if not db.pets.find_one({"_id":object_id,"userId":user_id}): raise HTTPException(404,"找不到毛孩資料")
def serialize(item): return {"id":str(item["_id"]),**{k:v for k,v in item.items() if k!="_id"}}
def sync_timeline(item):
    upsert_timeline_item(item["petId"],"deworming",item["administeredAt"],f"完成{TYPE_LABELS[item['type']]}",str(item["_id"]),item.get("productName", ""))
def sync_reminder(item,user_id):
    reminder_id=item.get("reminderId")
    if not item.get("nextDueAt") or not item.get("createReminder"):
        if reminder_id: db.reminders.delete_one({"_id":oid(reminder_id),"petId":item["petId"],"sourceType":"deworming","sourceId":str(item["_id"])})
        return
    title=f"{TYPE_LABELS[item['type']]}：{item['productName']}"
    if reminder_id:
        existing=db.reminders.find_one({"_id":oid(reminder_id),"petId":item["petId"],"sourceType":"deworming","sourceId":str(item["_id"])})
        if existing:
            update_reminder(reminder_id,user_id,ReminderUpdateRequest(type="deworming",title=title,scheduledAt=item["nextDueAt"],recurrenceRule=existing.get("recurrenceRule","none"),notes=existing.get("notes",""),sourceType="deworming",sourceId=str(item["_id"]),status=existing.get("status","pending")))
            return
    reminder=create_reminder(item["petId"],user_id,ReminderCreateRequest(type="deworming",title=title,scheduledAt=item["nextDueAt"],sourceType="deworming",sourceId=str(item["_id"])))
    db.dewormings.update_one({"_id":item["_id"]},{"$set":{"reminderId":reminder["id"]}})
def list_records(pet_id,user_id):
    pet(pet_id,user_id);return {"records":[serialize(x) for x in db.dewormings.find({"petId":pet_id}).sort([("administeredAt",-1),("_id",-1)])]}
def get_record(record_id,user_id):
    item=db.dewormings.find_one({"_id":oid(record_id)})
    if not item:raise HTTPException(404,"找不到驅蟲紀錄")
    pet(item["petId"],user_id);return serialize(item)
def create(pet_id,user_id,data:DewormingRequest):
    pet(pet_id,user_id)
    if data.nextDueAt and data.nextDueAt < data.administeredAt: raise HTTPException(422,"下次日期不可早於使用日期")
    now=now_taipei();values=data.model_dump();values["createReminder"]=data.createReminder
    item={"petId":pet_id,**values,"createdAt":now,"updatedAt":now};item["_id"]=db.dewormings.insert_one(item).inserted_id;sync_timeline(item);sync_reminder(item,user_id);return serialize(db.dewormings.find_one({"_id":item["_id"]}))
def update(record_id,user_id,data:DewormingRequest):
    item=db.dewormings.find_one({"_id":oid(record_id)})
    if not item:raise HTTPException(404,"找不到驅蟲紀錄")
    pet(item["petId"],user_id)
    if data.nextDueAt and data.nextDueAt < data.administeredAt: raise HTTPException(422,"下次日期不可早於使用日期")
    values=data.model_dump();values["updatedAt"]=now_taipei();db.dewormings.update_one({"_id":item["_id"]},{"$set":values});item=db.dewormings.find_one({"_id":item["_id"]});sync_timeline(item);sync_reminder(item,user_id);return serialize(item)
def delete(record_id,user_id):
    item=db.dewormings.find_one({"_id":oid(record_id)})
    if not item:raise HTTPException(404,"找不到驅蟲紀錄")
    pet(item["petId"],user_id);db.dewormings.delete_one({"_id":item["_id"]});delete_timeline_item(item["petId"],"deworming",record_id);db.reminders.delete_many({"petId":item["petId"],"sourceType":"deworming","sourceId":record_id})
