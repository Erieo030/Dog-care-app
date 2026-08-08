from datetime import datetime,timezone
from bson.errors import InvalidId
from bson.objectid import ObjectId
from fastapi import HTTPException
from app.db import db
from app.schemas.daily_log import DailyLogCreateRequest,DailyLogUpdateRequest
from app.services.timeline_service import delete_timeline_item,upsert_timeline_item
W={"very_low":"很少","low":"偏少","normal":"正常","high":"偏多","very_high":"很多"};E={"very_energetic":"很有精神","normal":"正常","slightly_low":"稍微沒精神","clearly_low":"明顯沒精神","very_low":"很差"};S={1:"很硬",2:"偏硬",3:"正常",4:"偏軟",5:"水狀"}
def oid(v):
 try:return ObjectId(v)
 except InvalidId:raise HTTPException(400,"ID 格式錯誤")
def pet(pid,uid):
 try:o=ObjectId(pid)
 except InvalidId:raise HTTPException(400,"毛孩 ID 格式錯誤")
 if not db.pets.find_one({"_id":o,"userId":uid}):raise HTTPException(404,"找不到毛孩資料")
def ser(x):return {"id":str(x["_id"]),**{k:v for k,v in x.items() if k!="_id"}}
def summary(x):
 p=[]
 if x.get("waterLevel"):p.append("喝水"+W[x["waterLevel"]])
 if x.get("foodLevel"):p.append("食量"+W[x["foodLevel"]])
 if x.get("snack") is True:p.append("有零食")
 if x.get("energyLevel"):p.append("精神"+E[x["energyLevel"]])
 if x.get("stoolLevel"):p.append(f"便便 Level {x['stoolLevel']}（{S[x['stoolLevel']]}）")
 return "・".join(p) or "尚未填寫觀察項目"
def sync(x):upsert_timeline_item(x["petId"],"daily_log",x["loggedAt"],"今日健康紀錄已更新",str(x["_id"]),summary(x))
def list_records(pid,uid,limit=50):
 pet(pid,uid);return {"records":[ser(x) for x in db.daily_logs.find({"petId":pid,"userId":uid}).sort([("loggedAt",-1),("_id",-1)]).limit(limit)]}
def get_record(rid,uid):
 x=db.daily_logs.find_one({"_id":oid(rid),"userId":uid})
 if not x: raise HTTPException(404,"找不到日常紀錄")
 pet(x["petId"],uid); return ser(x)
def get_today(pid,uid,date):
 pet(pid,uid);x=db.daily_logs.find_one({"petId":pid,"userId":uid,"localDate":date});return {"record":ser(x) if x else None}
def create(pid,uid,d:DailyLogCreateRequest):
 pet(pid,uid)
 if db.daily_logs.find_one({"petId":pid,"userId":uid,"localDate":d.localDate}):raise HTTPException(409,"今天已有日常紀錄，請編輯現有紀錄")
 n=datetime.now(timezone.utc);x={"petId":pid,"userId":uid,**d.model_dump(),"createdAt":n,"updatedAt":n};x["_id"]=db.daily_logs.insert_one(x).inserted_id;sync(x);return ser(x)
def update(rid,uid,d:DailyLogUpdateRequest):
 x=db.daily_logs.find_one({"_id":oid(rid),"userId":uid})
 if not x:raise HTTPException(404,"找不到日常紀錄")
 pet(x["petId"],uid);v=d.model_dump(exclude_unset=True);v["updatedAt"]=datetime.now(timezone.utc);x=db.daily_logs.find_one_and_update({"_id":x["_id"]},{"$set":v},return_document=True);sync(x);return ser(x)
def delete(rid,uid):
 x=db.daily_logs.find_one({"_id":oid(rid),"userId":uid})
 if not x:raise HTTPException(404,"找不到日常紀錄")
 pet(x["petId"],uid);db.daily_logs.delete_one({"_id":x["_id"]});delete_timeline_item(x["petId"],"daily_log",rid)
