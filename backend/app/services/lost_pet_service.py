import secrets
from datetime import datetime,timezone
from bson.errors import InvalidId
from bson.objectid import ObjectId
from fastapi import HTTPException
from app.db import db
from app.schemas.lost_pet import LostPetProfileRequest
def oid(v):
 try:return ObjectId(v)
 except InvalidId:raise HTTPException(400,"毛孩 ID 格式錯誤")
def own(pid,uid):
 if not db.pets.find_one({"_id":oid(pid),"userId":uid}):raise HTTPException(404,"找不到毛孩資料")
def private(pid,uid):
 own(pid,uid);return db.lost_pet_profiles.find_one({"petId":pid})
def save(pid,uid,data):
 own(pid,uid)
 if data.enabled and (not data.contactName.strip() or not data.contactPhone.strip()):raise HTTPException(422,"啟用公開頁前需要聯絡人姓名與電話")
 now=datetime.now(timezone.utc);old=db.lost_pet_profiles.find_one({"petId":pid});token=old.get("publicToken") if old else None
 if not token:token=secrets.token_urlsafe(32)
 values={**data.model_dump(),"petId":pid,"publicToken":token,"updatedAt":now};
 values["lostMode"] = bool(data.enabled)
 values.setdefault("createdAt",now)
 if old:db.lost_pet_profiles.update_one({"_id":old["_id"]},{"$set":values});item=db.lost_pet_profiles.find_one({"_id":old["_id"]})
 else:values["createdAt"]=now;item={"_id":db.lost_pet_profiles.insert_one(values).inserted_id,**values}
 return serialize_private(item)
def serialize_private(x):return {"id":str(x["_id"]),**{k:v for k,v in x.items() if k not in {"_id"}} ,"enabled":x.get("enabled",False),"hasToken":bool(x.get("publicToken"))}
def rotate(pid,uid):
 item=private(pid,uid);now=datetime.now(timezone.utc);token=secrets.token_urlsafe(32)
 if item:db.lost_pet_profiles.update_one({"_id":item["_id"]},{"$set":{"publicToken":token,"tokenRotatedAt":now,"updatedAt":now}})
 else:raise HTTPException(404,"尚未建立公開協尋頁")
 return {"publicToken":token,"updatedAt":now}
def disable(pid,uid):
 item=private(pid,uid)
 if not item:raise HTTPException(404,"尚未建立公開協尋頁")
 db.lost_pet_profiles.update_one({"_id":item["_id"]},{"$set":{"enabled":False,"updatedAt":datetime.now(timezone.utc)}})
def public(token):
 item=db.lost_pet_profiles.find_one({"publicToken":token,"enabled":True})
 if not item:raise HTTPException(404,"這個協尋頁目前無法使用")
 pet=db.pets.find_one({"_id":oid(item["petId"])})
 if not pet:raise HTTPException(404,"這個協尋頁目前無法使用")
 out={"name":pet.get("name", ""),"lostMode":bool(item.get("enabled",False)),"lostSince":item.get("lostSince"),"lostLocationText":item.get("lostLocationText", ""),"lostMessage":item.get("lostMessage", ""),"contactName":item.get("contactName", ""),"contactPhone":item.get("contactPhone", ""),"alternatePhone":item.get("alternatePhone", ""),"contactMessage":item.get("contactMessage", "")}
 for flag,key in (("showAvatar","avatar"),("showBreed","breed"),("showSex","sex"),("showNeutered","isNeutered"),("showCoatColor","coatColor"),("showDistinctiveFeatures","distinctiveFeatures")):
  if item.get(flag):out[key]=pet.get({"avatar":"avatarUri","breed":"breed","sex":"gender","isNeutered":"neutered","coatColor":"coatColor","distinctiveFeatures":"distinctiveFeatures"}[key])
 return out
def public_html(token):
 from html import escape
 x=public(token);name=escape(str(x.get("name","毛孩")));status='<h2>正在協尋</h2>' if x.get("lostMode") else ''
 avatar=x.get("avatar")
 image=f'<img class="avatar" src="{escape(str(avatar), quote=True)}" alt="毛孩照片" />' if isinstance(avatar,str) and avatar.startswith(("https://","http://")) else ""
 fields="".join(f'<p><b>{escape(k)}：</b>{escape(str(v))}</p>' for k,v in x.items() if v not in (None,"",False) and k not in {"name","lostMode","avatar"})
 return f"<!doctype html><html lang=zh-Hant><meta name=viewport content=width=device-width,initial-scale=1><title>PawLog 毛孩協尋</title><body><main><h1>🐾 PawLog 毛孩協尋</h1>{image}<h2>{name}</h2>{status}{fields}</main></body><style>body{{font-family:system-ui;padding:24px;background:#fffaf5}}main{{max-width:520px;margin:auto;background:white;padding:24px;border-radius:18px;box-shadow:0 2px 14px #ddd;overflow-wrap:anywhere}}.avatar{{display:block;width:180px;height:180px;object-fit:cover;border-radius:90px;margin:0 auto 16px}}h1{{color:#6b4f3b}}h2{{color:#b6533c}}</style></html>"
