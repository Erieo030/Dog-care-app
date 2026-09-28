from html import escape
from app.timezone import now_taipei, TAIPEI
import secrets
import re
from urllib.parse import quote
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
def has_public_contact(data):
 return bool(
  (data.showContactPhone and data.contactPhone.strip())
  or (data.showAlternatePhone and data.alternatePhone.strip())
  or (data.showContactEmail and data.contactEmail.strip())
 )
def save(pid,uid,data):
 own(pid,uid)
 if data.enabled and not has_public_contact(data):
  raise HTTPException(422,"請至少填寫並公開一種聯絡方式：電話、備用電話或 Email")
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
    if not item: raise HTTPException(404, "這個毛孩資訊頁目前無法使用")
    pet = db.pets.find_one({"_id": oid(item["petId"])})
    if not pet: raise HTTPException(404, "這個毛孩資訊頁目前無法使用")
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
    x = public(token)
    name = escape(str(x.get("name", "毛孩")))
    avatar = x.get("avatar")
    image = (
        f'<img class="avatar" src="{escape(str(avatar), quote=True)}" alt="{name}的照片" />'
        if isinstance(avatar, str) and avatar.startswith(("https://", "http://"))
        else '<div class="avatar-placeholder" aria-hidden="true">MEGO</div>'
    )

    pet_labels = {
        "breed": "品種",
        "sex": "性別",
        "isNeutered": "結紮狀態",
        "coatColor": "毛色",
        "distinctiveFeatures": "明顯特徵",
    }
    pet_parts = []
    for key, label in pet_labels.items():
        if key not in x or x[key] in (None, ""):
            continue
        value = x[key]
        if key == "sex":
            value = {"male": "公", "female": "母"}.get(str(value), value)
        elif key == "isNeutered":
            value = "已結紮" if value else "未結紮"
        pet_parts.append(f'<div class="detail"><span>{label}</span><strong>{escape(str(value))}</strong></div>')
    pet_fields = "".join(pet_parts) or '<p class="empty">飼主尚未公開其他毛孩資料</p>'

    contact_parts = []
    contact_name = x.get("contactName")
    if contact_name:
        contact_parts.append(f'<p class="contact-name">聯絡人：{escape(str(contact_name))}</p>')
    for key, label, scheme in (
        ("contactPhone", "撥打電話", "tel"),
        ("alternatePhone", "撥打備用電話", "tel"),
        ("contactEmail", "傳送 Email", "mailto"),
    ):
        value = x.get(key)
        if not value:
            continue
        raw_value = str(value).strip()
        if scheme == "tel":
            href_value = re.sub(r"[^0-9+*#,;]", "", raw_value)
        else:
            href_value = quote(raw_value, safe="@.+-_")
        href = escape(f"{scheme}:{href_value}", quote=True)
        contact_parts.append(
            f'<a class="contact-action" href="{href}"><span>{label}</span>'
            f'<strong>{escape(raw_value)}</strong><span class="arrow" aria-hidden="true">›</span></a>'
        )
    contact_message = x.get("contactMessage")
    if contact_message:
        contact_parts.append(f'<p class="contact-note">{escape(str(contact_message))}</p>')
    contact_fields = "".join(contact_parts) or '<p class="empty">目前沒有公開聯絡方式</p>'

    lost_labels = {"lostSince": "協尋開始", "lostLocationText": "最後位置", "lostMessage": "協尋留言"}
    lost_fields = "".join(
        f'<div class="detail"><span>{label}</span><strong>{escape(str(x[key]))}</strong></div>'
        for key, label in lost_labels.items()
        if x.get(key) not in (None, "", False)
    )
    status = (
        '<div class="lost"><strong>目前需要協尋</strong><span>若你找到牠，請使用下方聯絡方式通知飼主。</span></div>'
        if x.get("lostMode")
        else ""
    )
    lost_section = f'<section><h2>協尋資訊</h2><div class="details">{lost_fields}</div></section>' if lost_fields else ""
    updated = x.get("updatedAt")
    if isinstance(updated, datetime):
        if updated.tzinfo is None:
            updated = updated.replace(tzinfo=TAIPEI)
        updated_text = updated.astimezone(TAIPEI).strftime("%Y/%m/%d %H:%M")
        update_note = f"資料更新於 {escape(updated_text)}"
    else:
        update_note = "資料由飼主提供，內容可能隨時更新。"

    return f'''<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#F7F4EE">
  <title>{name}｜MEGO 毛孩資訊卡</title>
  <style>
    :root {{ color-scheme: light; --ink:#2F2925; --muted:#746B63; --accent:#B7653B; --green:#5F9274; --line:#E4DDD4; --paper:#F7F4EE; --surface:#fff; }}
    * {{ box-sizing:border-box; }}
    body {{ margin:0; min-height:100vh; padding:24px 16px calc(28px + env(safe-area-inset-bottom)); background:var(--paper); color:var(--ink); font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; -webkit-font-smoothing:antialiased; }}
    main {{ width:min(100%,520px); margin:0 auto; }}
    .brand {{ display:flex; align-items:center; gap:9px; margin:2px 4px 16px; color:var(--accent); font-size:14px; font-weight:800; letter-spacing:.12em; }}
    .brand-mark {{ width:28px; height:28px; display:grid; place-items:center; border-radius:10px; background:#F3E1D5; letter-spacing:0; font-size:12px; }}
    .profile {{ overflow:hidden; border:1px solid var(--line); border-radius:26px; background:var(--surface); box-shadow:0 12px 36px rgba(86,65,48,.07); }}
    .hero {{ padding:28px 22px 22px; text-align:center; background:linear-gradient(180deg,#FFF9F2 0%,#fff 100%); }}
    .avatar,.avatar-placeholder {{ width:112px; height:112px; margin:0 auto 14px; border-radius:36px; }}
    .avatar {{ display:block; object-fit:cover; background:#F3E1D5; }}
    .avatar-placeholder {{ display:grid; place-items:center; background:#F3E1D5; color:var(--accent); font-size:17px; font-weight:900; letter-spacing:.12em; }}
    .eyebrow {{ margin:0 0 5px; color:var(--accent); font-size:12px; font-weight:800; letter-spacing:.1em; }}
    h1 {{ margin:0; font-size:28px; line-height:1.25; font-weight:850; overflow-wrap:anywhere; }}
    .status {{ display:inline-flex; margin-top:13px; padding:7px 12px; border-radius:999px; background:#F3E1D5; color:#9C4E30; font-size:13px; font-weight:750; }}
    section {{ padding:20px 20px 18px; border-top:1px solid #F0EBE5; }}
    h2 {{ margin:0 0 14px; color:var(--ink); font-size:17px; font-weight:800; }}
    .details {{ display:grid; gap:0; }}
    .detail {{ display:flex; justify-content:space-between; align-items:flex-start; gap:18px; padding:10px 0; border-bottom:1px solid #F2EEE9; }}
    .detail:last-child {{ border-bottom:0; }}
    .detail span {{ flex:0 0 84px; color:var(--muted); font-size:14px; }}
    .detail strong {{ color:var(--ink); font-size:15px; line-height:1.5; text-align:right; font-weight:650; overflow-wrap:anywhere; }}
    .contact-name {{ margin:0 0 10px; color:var(--muted); font-size:14px; }}
    .contact-action {{ display:flex; align-items:center; gap:10px; min-height:58px; margin-top:9px; padding:10px 13px; border:1px solid #DDE9E1; border-radius:16px; background:#F3F8F4; color:var(--green); text-decoration:none; }}
    .contact-action span:first-child {{ flex:1; font-size:13px; font-weight:750; }}
    .contact-action strong {{ color:var(--ink); font-size:14px; text-align:right; overflow-wrap:anywhere; }}
    .contact-action .arrow {{ flex:0 0 auto; color:var(--green); font-size:24px; line-height:1; }}
    .contact-note {{ margin:12px 0 0; padding:12px 14px; border-radius:14px; background:#FFF9F2; color:var(--muted); font-size:14px; line-height:1.6; overflow-wrap:anywhere; }}
    .empty {{ margin:0; color:var(--muted); font-size:14px; line-height:1.55; }}
    .lost {{ display:grid; gap:4px; margin:0 20px 4px; padding:14px 16px; border-radius:16px; background:#FFF0E8; color:#9C4E30; }}
    .lost strong {{ font-size:16px; }}
    .lost span {{ font-size:13px; line-height:1.5; }}
    .footer {{ margin:15px 5px 0; color:var(--muted); font-size:12px; line-height:1.6; text-align:center; }}
    @media (max-width:360px) {{ body {{ padding-right:12px; padding-left:12px; }} .hero {{ padding-right:16px; padding-left:16px; }} section {{ padding-right:16px; padding-left:16px; }} h1 {{ font-size:25px; }} }}
  </style>
</head>
<body>
  <main>
    <div class="brand"><span class="brand-mark" aria-hidden="true">M</span><span>MEGO 毛孩資訊</span></div>
    <article class="profile">
      <header class="hero">{image}<p class="eyebrow">毛孩資訊卡</p><h1>{name}</h1>{status}</header>
      <section><h2>毛孩資料</h2><div class="details">{pet_fields}</div></section>
      <section><h2>聯絡飼主</h2>{contact_fields}</section>
      {lost_section}
    </article>
    <p class="footer">此頁僅顯示飼主選擇公開的內容。{update_note}</p>
  </main>
</body>
</html>'''
