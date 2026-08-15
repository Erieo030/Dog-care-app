"""用途：在後端跨來源搜尋、篩選、去重、排序及分頁。"""
from datetime import datetime, timedelta, timezone
import re
from bson.errors import InvalidId
from bson.objectid import ObjectId
from fastapi import HTTPException
from app.db import db
from app.schemas.search import SearchRequest

HEALTH_CATEGORY_TYPES={
 "digestive":{"vomiting","abnormal_stool","low_appetite","abnormal_drinking"},
 "skin":{"skin_issue"},"respiratory":set(),"eye":{"eye_ear_issue"},
 "injury":{"injury","possible_ingestion"},"other":{"low_energy","other"},
}
SOURCE_TYPE_MAP={"weight":"weight_record","health_event":"health_event","medical_visit":"medical_visit","reminder":"reminder", "deworming":"deworming", "medication":"medication"}
TIMELINE_RESULT_MAP={"weight":"weight","health_event":"health_event","medical_visit":"medical_visit","reminder_completed":"reminder", "deworming":"deworming", "medication":"medication"}


def _ensure_owned_pet(pet_id:str,user_id:str)->None:
    try: oid=ObjectId(pet_id)
    except InvalidId: raise HTTPException(status_code=400,detail="毛孩 ID 格式錯誤")
    if not db.pets.find_one({"_id":oid,"userId":user_id},{"_id":1}): raise HTTPException(status_code=404,detail="找不到毛孩資料")


def ensure_search_indexes()->None:
    db.weight_records.create_index([("petId",1),("measuredAt",-1)],name="dashboard_weight_date")
    db.health_events.create_index([("petId",1),("occurredAt",-1)],name="dashboard_health_date")
    db.medical_visits.create_index([("petId",1),("visitedAt",-1)],name="dashboard_medical_date")
    db.reminders.create_index([("petId",1),("scheduledAt",-1),("status",1)],name="dashboard_reminder_status_date")
    db.timeline.create_index([("petId",1),("occurredAt",-1)],name="dashboard_timeline_date")


def _date_from_query(value:str, timezone_offset_minutes:int)->tuple[datetime,datetime]|None:
    normalized=value.strip().replace("/","-")
    if not re.fullmatch(r"\d{4}-\d{1,2}-\d{1,2}",normalized): return None
    try: start=datetime.fromisoformat(normalized).replace(tzinfo=timezone.utc)+timedelta(minutes=timezone_offset_minutes)
    except ValueError: return None
    return start,start+timedelta(days=1)


def _date_match(field:str,request:SearchRequest,query_date:tuple[datetime,datetime]|None)->dict:
    conditions={}
    start=request.start_at;end=request.end_at
    if query_date: start,end=query_date
    if start: conditions["$gte"]=start
    if end: conditions["$lte" if not query_date else "$lt"]=end
    return {field:conditions} if conditions else {}


def _attachment_match(mode:str)->dict:
    if mode=="any": return {}
    present={"attachmentIds.0":{"":True}}
    return present if mode=="with" else {"$nor":present["$or"]}


def _count_attachments(item:dict)->int:
    return len(item.get("attachmentIds",[]))


def _result(kind:str,item:dict,date_field:str,title:str,description:str="",metadata:dict|None=None)->dict:
    source_id=str(item["_id"])
    return {"id":f"{kind}:{source_id}","type":kind,"occurredAt":item[date_field],"title":title,"description":description,"sourceId":source_id,"sourceType":SOURCE_TYPE_MAP[kind],"attachmentCount":_count_attachments(item),"metadata":metadata or {}}


def _fetch(collection,match:dict,sort:list[tuple[str,int]],limit:int)->list[dict]:
    # 分頁在跨 collection 合併後執行；只回傳當頁，不把全量資料送往前端。
    return list(collection.find(match).sort(sort))


def search(pet_id:str,user_id:str,request:SearchRequest)->dict:
    _ensure_owned_pet(pet_id,user_id);ensure_search_indexes()
    wanted=request.types or {"weight","health_event","medical_visit","reminder","deworming","medication"}
    escaped=re.escape(request.query.strip());regex={"$regex":escaped,"$options":"i"} if escaped else None
    query_date=_date_from_query(request.query, request.timezone_offset_minutes);take=request.page*request.page_size;items=[]
    direction=1 if request.sort in {"oldest","az"} else -1

    if "weight" in wanted:
        match={"petId":pet_id,**_date_match("measuredAt",request,query_date),**_attachment_match(request.attachment)}
        if request.min_weight is not None or request.max_weight is not None:
            match["weightKg"]={**({"$gte":request.min_weight} if request.min_weight is not None else {}),**({"$lte":request.max_weight} if request.max_weight is not None else {})}
        if regex and not query_date:
            ors=[{"notes":regex}]
            try: ors.append({"weightKg":float(request.query)})
            except ValueError: pass
            match["$or"]=ors
        for item in _fetch(db.weight_records,match,[("measuredAt",direction),("_id",direction)],take):
            items.append(_result("weight",item,"measuredAt",f"體重 {item['weightKg']:g} kg",item.get("notes","") or "無備註",{"weightKg":item["weightKg"]}))

    if "health_event" in wanted:
        match={"petId":pet_id,**_date_match("occurredAt",request,query_date),**_attachment_match(request.attachment)}
        if request.health_categories:
            allowed=set().union(*(HEALTH_CATEGORY_TYPES[x] for x in request.health_categories));match["type"]={"$in":list(allowed)}
        if regex and not query_date: match["$or"]=[{"summary":regex},{"notes":regex},{"type":regex}]
        for item in _fetch(db.health_events,match,[("occurredAt",direction),("_id",direction)],take):
            items.append(_result("health_event",item,"occurredAt",item.get("summary","健康異常紀錄"),item.get("notes","") or item.get("severity",""),{"healthEventType":item.get("type"),"severity":item.get("severity")}))

    if "medical_visit" in wanted:
        match={"petId":pet_id,**_date_match("visitedAt",request,query_date),**_attachment_match(request.attachment)}
        if request.clinic: match["clinicName"]={"$regex":re.escape(request.clinic),"$options":"i"}
        if request.veterinarian: match["veterinarianName"]={"$regex":re.escape(request.veterinarian),"$options":"i"}
        if regex and not query_date: match["$or"]=[{field:regex} for field in ["reason","clinicName","veterinarianName","veterinarianNotes","treatmentNotes","medicationNotes","notes","medications.name","medications.instructions","medications.notes"]]
        for item in _fetch(db.medical_visits,match,[("visitedAt",direction),("_id",direction)],take):
            clinic=item.get("clinicName","") or "未填寫醫院";items.append(_result("medical_visit",item,"visitedAt",item.get("reason","就醫紀錄"),f"{clinic} · {item.get('veterinarianName','') or '未填寫醫師'}",{"clinicName":item.get("clinicName",""),"veterinarianName":item.get("veterinarianName","")}))

    if "deworming" in wanted:
        match={"petId":pet_id,**_date_match("administeredAt",request,query_date),**_attachment_match(request.attachment)}
        if regex and not query_date: match["$or"]=[{"productName":regex},{"type":regex},{"hospitalName":regex},{"notes":regex}]
        for item in _fetch(db.dewormings,match,[("administeredAt",direction),("_id",direction)],take): items.append(_result("deworming",item,"administeredAt",item.get("productName","驅蟲紀錄"),item.get("type",""),{"dewormingType":item.get("type")}))

    if "medication" in wanted:
        match={"petId":pet_id,**_attachment_match(request.attachment)}
        if regex: match["$or"]=[{"name":regex},{"instructions":regex},{"notes":regex}]
        for item in _fetch(db.medications,match,[("startDate",direction),("_id",direction)],take): items.append(_result("medication",item,"startDate",item.get("name","用藥紀錄"),item.get("instructions",""),{"status":item.get("status")}))

    if "reminder" in wanted and request.attachment!="with":
        match={"petId":pet_id,**_date_match("scheduledAt",request,query_date)};now=datetime.now(timezone.utc)
        if request.reminder_status=="completed":match["status"]="completed"
        elif request.reminder_status=="pending":match.update({"status":{"$in":["pending","snoozed"]},"scheduledAt":{**match.get("scheduledAt",{}),"$gte":max(now,match.get("scheduledAt",{}).get("$gte",now))}})
        elif request.reminder_status=="overdue":match.update({"status":{"$in":["pending","snoozed"]},"scheduledAt":{**match.get("scheduledAt",{}),"$lt":min(now,match.get("scheduledAt",{}).get("$lt",now))}})
        if regex and not query_date:match["$or"]=[{"title":regex},{"notes":regex},{"type":regex}]
        for item in _fetch(db.reminders,match,[("scheduledAt",direction),("_id",direction)],take):
            status=item.get("status","pending");items.append(_result("reminder",item,"scheduledAt",item.get("title","提醒"),item.get("notes","") or status,{"status":status,"reminderType":item.get("type")}))

    # Timeline title/description 也可命中；以來源鍵去重，避免同筆來源顯示兩次。
    timeline_match={"petId":pet_id,**_date_match("occurredAt",request,query_date)}
    timeline_types=[key for key,value in TIMELINE_RESULT_MAP.items() if value in wanted]
    if request.reminder_status in {"pending","overdue"}: timeline_types=[value for value in timeline_types if value != "reminder_completed"]
    timeline_match["type"]={"$in":timeline_types}
    if request.attachment=="with":timeline_match["attachmentCount"]={"$gt":0}
    elif request.attachment=="without":timeline_match["$or"]=[{"attachmentCount":0},{"attachmentCount":{"$exists":False}}]
    if regex and not query_date:
        text_match={"$or":[{"title":regex},{"description":regex}]}
        if "$or" in timeline_match:
            attachment_or=timeline_match.pop("$or");timeline_match["$and"]=[{"$or":attachment_or},text_match]
        else: timeline_match.update(text_match)
    existing={(x["type"],x["sourceId"]) for x in items}
    for item in _fetch(db.timeline,timeline_match,[("occurredAt",direction),("_id",direction)],take):
        kind=TIMELINE_RESULT_MAP.get(item.get("type"));key=(kind,item.get("sourceId"))
        if not kind or key in existing:continue
        items.append({"id":f"{kind}:{item.get('sourceId')}","type":kind,"occurredAt":item["occurredAt"],"title":item.get("title",""),"description":item.get("description",""),"sourceId":item.get("sourceId",""),"sourceType":item.get("sourceType") or SOURCE_TYPE_MAP[kind],"attachmentCount":max(0,item.get("attachmentCount",0)),"metadata":{}});existing.add(key)

    reverse=request.sort in {"newest","za"};key=(lambda x:x["title"].casefold()) if request.sort in {"az","za"} else (lambda x:str(x["occurredAt"]))
    items.sort(key=key,reverse=reverse);total=len(items);start=(request.page-1)*request.page_size;page=items[start:start+request.page_size]
    return {"items":page,"page":request.page,"pageSize":request.page_size,"total":total,"hasMore":start+len(page)<total}
