from app.timezone import now_taipei, TAIPEI
from datetime import datetime,timezone
from bson.errors import InvalidId
from bson.objectid import ObjectId
from fastapi import HTTPException
from app.db import db
from app.schemas.medication import MedicationRequest
from app.schemas.reminder import ReminderCreateRequest
from app.services.reminder_service import create_reminder,delete_reminder
from app.services.timeline_service import delete_timeline_item,upsert_timeline_item
def oid(v):
 try:return ObjectId(v)
 except InvalidId:raise HTTPException(400,"用藥紀錄 ID 格式錯誤")
def pet(pid,uid):
 try:o=ObjectId(pid)
 except InvalidId:raise HTTPException(400,"毛孩 ID 格式錯誤")
 if not db.pets.find_one({"_id":o,"userId":uid}):raise HTTPException(404,"找不到毛孩資料")
def ser(x):return {"id":str(x["_id"]),**{k:v for k,v in x.items() if k!="_id"}}
def source_visit(visit_id,pet_id,uid):
 if not visit_id:return
 visit=db.medical_visits.find_one({"_id":oid(visit_id),"petId":pet_id})
 if not visit:raise HTTPException(400,"來源就醫紀錄不存在或不屬於目前毛孩")
 pet(pet_id,uid)
def sync_timeline(x,event="start"):
 title={"start":f"開始{x['name']}用藥療程","completed":f"完成{x['name']}用藥療程","stopped":f"停止{x['name']}用藥療程"}[event]
 upsert_timeline_item(x["petId"],"medication",now_taipei(),title,str(x["_id"]),x.get("instructions", ""))
def reminder_date(item,time):
 return datetime.fromisoformat(f"{item['startDate']}T{time}:00").replace(tzinfo=TAIPEI)
def sync_reminders(item,uid):
 existing=list(db.reminders.find({"petId":item["petId"],"sourceType":"medication","sourceId":str(item["_id"])}))
 desired=set(item.get("reminderTimes",[])) if item.get("reminderEnabled") and item.get("status")=="active" else set()
 by_slot={r.get("sourceSlot"):r for r in existing}
 for slot in desired:
  payload={"type":"medication","title":f"{item['name']}服藥提醒","scheduledAt":reminder_date(item,slot),"recurrenceRule":"daily","notes":item.get("instructions", ""),"sourceType":"medication","sourceId":str(item["_id"]),"sourceSlot":slot}
  old=by_slot.get(slot)
  if old:
   db.reminders.update_one({"_id":old["_id"]},{"$set":payload})
  else:
   create_reminder(item["petId"],uid,ReminderCreateRequest(**payload))
 for slot,r in by_slot.items():
  if slot not in desired: db.reminders.delete_one({"_id":r["_id"]})
def list_records(pid,uid,status=None):
 pet(pid,uid);q={"petId":pid};
 if status:q["status"]=status
 return {"records":[ser(x) for x in db.medications.find(q).sort([("startDate",-1),("_id",-1)])]}
def get(rid,uid):
 x=db.medications.find_one({"_id":oid(rid)})
 if not x:raise HTTPException(404,"找不到用藥紀錄")
 pet(x["petId"],uid);return ser(x)
def create(pid,uid,d:MedicationRequest):
 pet(pid,uid);source_visit(d.medicalVisitId,pid,uid);now=now_taipei();x={"petId":pid,**d.model_dump(),"createdAt":now,"updatedAt":now};x["_id"]=db.medications.insert_one(x).inserted_id;sync_reminders(x,uid);sync_timeline(x);return ser(x)
def update(rid,uid,d:MedicationRequest):
 x=db.medications.find_one({"_id":oid(rid)})
 if not x:raise HTTPException(404,"找不到用藥紀錄")
 pet(x["petId"],uid);source_visit(d.medicalVisitId,x["petId"],uid);v=d.model_dump();v["updatedAt"]=now_taipei();db.medications.update_one({"_id":x["_id"]},{"$set":v});x=db.medications.find_one({"_id":x["_id"]});sync_reminders(x,uid);return ser(x)
def change_status(rid,uid,status):
 x=db.medications.find_one({"_id":oid(rid)})
 if not x:raise HTTPException(404,"找不到用藥紀錄")
 pet(x["petId"],uid);db.medications.update_one({"_id":x["_id"]},{"$set":{"status":status,"reminderEnabled":False,"updatedAt":now_taipei()}});x=db.medications.find_one({"_id":x["_id"]});sync_reminders(x,uid);sync_timeline(x,status);return ser(x)
def delete(rid,uid):
 x=db.medications.find_one({"_id":oid(rid)})
 if not x:raise HTTPException(404,"找不到用藥紀錄")
 pet(x["petId"],uid);db.medications.delete_one({"_id":x["_id"]});db.reminders.delete_many({"petId":x["petId"],"sourceType":"medication","sourceId":rid});delete_timeline_item(x["petId"],"medication",rid)
