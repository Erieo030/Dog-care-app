from html import escape
from app.timezone import now_taipei, TAIPEI
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
 now=now_taipei();old=db.lost_pet_profiles.find_one({"petId":pid});token=old.get("publicToken") if old else None
 if not token:token=secrets.token_urlsafe(32)
 values={**data.model_dump(),"petId":pid,"publicToken":token,"updatedAt":now};
 values["enabled"] = True
 values["lostMode"] = False
 values.setdefault("createdAt",now)
 if old:db.lost_pet_profiles.update_one({"_id":old["_id"]},{"$set":values});item=db.lost_pet_profiles.find_one({"_id":old["_id"]})
 else:values["createdAt"]=now;item={"_id":db.lost_pet_profiles.insert_one(values).inserted_id,**values}
 return serialize_private(item)
def serialize_private(x):return {"id":str(x["_id"]),**{k:v for k,v in x.items() if k not in {"_id"}} ,"enabled":x.get("enabled",False),"hasToken":bool(x.get("publicToken"))}
def rotate(pid,uid):
 item=private(pid,uid);now=now_taipei();token=secrets.token_urlsafe(32)
 if item:db.lost_pet_profiles.update_one({"_id":item["_id"]},{"$set":{"publicToken":token,"tokenRotatedAt":now,"updatedAt":now}})
 else:raise HTTPException(404,"尚未建立公開協尋頁")
 return {"publicToken":token,"updatedAt":now}
def disable(pid,uid):
 item=private(pid,uid)
 if not item:raise HTTPException(404,"尚未建立公開協尋頁")
 db.lost_pet_profiles.update_one({"_id":item["_id"]},{"$set":{"enabled":False,"updatedAt":now_taipei()}})
def public(token):
    item = db.lost_pet_profiles.find_one({"publicToken": token, "enabled": True})
    if not item: raise HTTPException(404, "這個毛孩身份頁目前無法使用")
    pet = db.pets.find_one({"_id": oid(item["petId"])})
    if not pet: raise HTTPException(404, "這個毛孩身份頁目前無法使用")
    out = {"name": pet.get("name", "毛孩"), "lostMode": bool(item.get("lostMode", False)), "updatedAt": item.get("updatedAt")}
    for flag, key, source in (("showAvatar", "avatar", "avatarUri"), ("showBreed", "breed", "breed"), ("showSex", "sex", "gender"), ("showNeutered", "isNeutered", "neutered"), ("showCoatColor", "coatColor", "coatColor"), ("showDistinctiveFeatures", "distinctiveFeatures", "distinctiveFeatures")):
        if item.get(flag, False) and pet.get(source) not in (None, ""): out[key] = pet.get(source)
    for flag, key in (("showContactName", "contactName"), ("showContactEmail", "contactEmail"), ("showContactPhone", "contactPhone"), ("showAlternatePhone", "alternatePhone"), ("showContactMessage", "contactMessage")):
        if item.get(flag, False) and item.get(key) not in (None, ""): out[key] = item.get(key)
    if item.get("lostMode"):
        for key in ("lostSince", "lostLocationText", "lostMessage"):
            if item.get(key) not in (None, ""): out[key] = item.get(key)
    return out

def public_html(token):
    x = public(token); name = escape(str(x.get("name", "毛孩"))); avatar = x.get("avatar")
    image = f'<img class="avatar" src="{escape(str(avatar), quote=True)}" alt="毛孩照片" />' if isinstance(avatar, str) and avatar.startswith(("https://", "http://")) else ""
    labels = {"breed":"品種", "sex":"性別", "isNeutered":"結紮", "coatColor":"毛色", "distinctiveFeatures":"明顯特徵", "contactName":"聯絡人", "contactEmail":"Email", "contactPhone":"聯絡電話", "alternatePhone":"備用電話", "contactMessage":"聯絡留言", "lostSince":"協尋開始", "lostLocationText":"最後位置", "lostMessage":"協尋留言"}
    pet_keys = {"breed", "sex", "isNeutered", "coatColor", "distinctiveFeatures"}; contact_keys = {"contactName", "contactEmail", "contactPhone", "alternatePhone", "contactMessage"}
    pet_fields = "".join(f"<p><b>{labels[k]}：</b>{escape(str(v))}</p>" for k, v in x.items() if k in pet_keys and v not in (None, "", False))
    contact_fields = "".join(f"<p><b>{labels[k]}：</b>{escape(str(v))}</p>" for k, v in x.items() if k in contact_keys and v not in (None, "", False))
    lost_fields = "".join(f"<p><b>{labels[k]}：</b>{escape(str(v))}</p>" for k, v in x.items() if k in {"lostSince", "lostLocationText", "lostMessage"} and v not in (None, "", False))
    status = "<div class=lost>目前標記為需要協尋</div>" if x.get("lostMode") else ""; lost_section = f"<section><h2>協尋資訊</h2>{lost_fields}</section>" if lost_fields else ""
    return f'''<!doctype html><html lang=zh-Hant><meta name=viewport content="width=device-width,initial-scale=1"><title>{name}｜MEGO 毛孩身份</title><body><main><div class=brand>🐾 MEGO</div>{image}<h1>{name}</h1>{status}<section><h2>毛孩資料</h2>{pet_fields}</section><section><h2>聯絡方式</h2>{contact_fields}</section>{lost_section}<p class=hint>資料由飼主提供，最後更新時間會隨 App 同步。</p></main></body><style>body{{font-family:-apple-system,BlinkMacSystemFont,system-ui,sans-serif;padding:20px;background:#fffaf5;color:#3f342c}}main{{max-width:520px;margin:auto;background:#fff;padding:24px;border-radius:24px;box-shadow:0 4px 18px #eadfd5;overflow-wrap:anywhere}}.brand{{color:#b96843;font-weight:800;letter-spacing:2px;font-size:18px}}.avatar{{display:block;width:150px;height:150px;object-fit:cover;border-radius:75px;margin:18px auto}}h1{{font-size:30px;margin:8px 0 18px;color:#3f342c}}h2{{font-size:18px;color:#5d9279;border-bottom:1px solid #e8ddd4;padding-bottom:8px}}p{{font-size:16px;line-height:1.55;margin:8px 0}}.lost{{background:#f7dfd0;color:#ae5e3d;padding:12px 14px;border-radius:12px;font-weight:700}}.hint{{color:#887d74;font-size:13px;margin-top:22px}}</style></html>'''
