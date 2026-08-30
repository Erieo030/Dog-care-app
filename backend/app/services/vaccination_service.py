from app.timezone import now_taipei, TAIPEI
from datetime import datetime,timezone
from bson.errors import InvalidId
from bson.objectid import ObjectId
from fastapi import HTTPException
from pymongo import ReturnDocument
from app.db import db
from app.schemas.vaccination import VaccinationRequest
from app.services.timeline_service import delete_timeline_item,upsert_timeline_item
from app.services.reminder_service import create_reminder,update_reminder
from app.schemas.reminder import ReminderCreateRequest,ReminderUpdateRequest
def oid(v):
 try:return ObjectId(v)
 except InvalidId:raise HTTPException(400,"疫苗紀錄 ID 格式錯誤")
def pet(pid,uid):
 try:o=ObjectId(pid)
 except InvalidId:raise HTTPException(400,"毛孩 ID 格式錯誤")
 if not db.pets.find_one({"_id":o,"userId":uid}):raise HTTPException(404,"找不到毛孩資料")
def ser(x):return {"id":str(x["_id"]),**{k:v for k,v in x.items() if k!="_id"}}
def sync_timeline(x):upsert_timeline_item(x["petId"],"vaccination",x["administeredAt"],f"完成 {x['vaccineName']} 疫苗接種",str(x["_id"]),x.get("hospitalName", ""))
def sync_reminder(x,uid):
 rid=x.get("reminderId");
 if not x.get("nextDueAt") or not x.get("createReminder"):
  if rid: db.reminders.delete_one({"_id":oid(rid),"petId":x["petId"],"sourceType":"vaccination","sourceId":str(x["_id"])})
  return
 title=f"{x['vaccineName']}疫苗接種"
 if rid:
  old=db.reminders.find_one({"_id":oid(rid),"petId":x["petId"],"sourceType":"vaccination","sourceId":str(x["_id"])})
  if old:
   update_reminder(rid,uid,ReminderUpdateRequest(type="vaccine",title=title,scheduledAt=x["nextDueAt"],recurrenceRule="none",notes="",sourceType="vaccination",sourceId=str(x["_id"]),status=old.get("status","pending")));return
 r=create_reminder(x["petId"],uid,ReminderCreateRequest(type="vaccine",title=title,scheduledAt=x["nextDueAt"],sourceType="vaccination",sourceId=str(x["_id"])))
 db.vaccinations.update_one({"_id":x["_id"]},{"$set":{"reminderId":r["id"]}})
def list_records(pid,uid):pet(pid,uid);return {"records":[ser(x) for x in db.vaccinations.find({"petId":pid}).sort([("administeredAt",-1),("_id",-1)])]}
def get(rid,uid):
 x=db.vaccinations.find_one({"_id":oid(rid)})
 if not x:raise HTTPException(404,"找不到疫苗紀錄")
 pet(x["petId"],uid);return ser(x)
def create(pid,uid,d):
 pet(pid,uid);now=now_taipei();v=d.model_dump();v.pop("createReminder",None);x={"petId":pid,**v,"createdAt":now,"updatedAt":now,"createReminder":d.createReminder};x["_id"]=db.vaccinations.insert_one(x).inserted_id;sync_timeline(x);sync_reminder(x,uid);return ser(db.vaccinations.find_one({"_id":x["_id"]}))
def update(rid,uid,d):
 x=db.vaccinations.find_one({"_id":oid(rid)})
 if not x:raise HTTPException(404,"找不到疫苗紀錄")
 pet(x["petId"],uid);v=d.model_dump();v["updatedAt"]=now_taipei();db.vaccinations.update_one({"_id":x["_id"]},{"$set":v});x=db.vaccinations.find_one({"_id":x["_id"]});sync_timeline(x);sync_reminder(x,uid);return ser(db.vaccinations.find_one({"_id":x["_id"]}))
def delete(rid,uid):
 x=db.vaccinations.find_one({"_id":oid(rid)})
 if not x:raise HTTPException(404,"找不到疫苗紀錄")
 pet(x["petId"],uid);db.vaccinations.delete_one({"_id":x["_id"]});delete_timeline_item(x["petId"],"vaccination",rid);db.reminders.delete_many({"petId":x["petId"],"sourceType":"vaccination","sourceId":rid})
