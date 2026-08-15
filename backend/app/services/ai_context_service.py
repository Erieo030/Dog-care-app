from datetime import datetime, timedelta, timezone
from fastapi import HTTPException
from app.db import db

RANGES={7,30,90}
def _owned(pet_id,user_id):
    pet=db.pets.find_one({"_id": __import__("bson").ObjectId(pet_id),"userId":user_id})
    if not pet: raise HTTPException(404,"找不到毛孩資料")
    return pet
def _clean(x):
    if isinstance(x,dict): return {k:_clean(v) for k,v in x.items() if k not in {"password","userId","publicToken","token","apiKey","contentPath"}}
    if isinstance(x,list): return [_clean(v) for v in x]
    if isinstance(x,datetime): return x
    return x
def _aware(value):
    if isinstance(value, datetime) and value.tzinfo is None: return value.replace(tzinfo=timezone.utc)
    return value
def _summary(items,key):
    values=[x.get(key) for x in items if x.get(key) is not None]
    counts={v:values.count(v) for v in dict.fromkeys(values)}
    return {"recordCount":len(values),"latest":values[-1] if values else None,"recent":values[-14:],"counts":counts}
def build_context(pet_id,user_id,days):
    if days not in RANGES: raise HTTPException(422,"range 僅支援 7、30 或 90")
    pet=_owned(pet_id,user_id); end=datetime.now(timezone.utc); start=end-timedelta(days=days)
    weights=list(db.weight_records.find({"petId":pet_id,"measuredAt":{"$gte":start,"$lte":end}}).sort("measuredAt",1))
    logs=list(db.daily_logs.find({"petId":pet_id,"loggedAt":{"$gte":start,"$lte":end}}).sort("loggedAt",1).limit(30))
    events=list(db.health_events.find({"petId":pet_id,"occurredAt":{"$gte":start,"$lte":end}}).sort("occurredAt",1).limit(30))
    visits=list(db.medical_visits.find({"petId":pet_id}).sort("visitedAt",-1).limit(5))
    meds=list(db.medications.find({"petId":pet_id,"status":"active"}).limit(10)); completed=db.medications.count_documents({"petId":pet_id,"status":"completed"})
    vaccines=list(db.vaccinations.find({"petId":pet_id}).sort("administeredAt",-1).limit(5))
    deworms=list(db.dewormings.find({"petId":pet_id}).sort("administeredAt",-1).limit(5))
    reminders=list(db.reminders.find({"petId":pet_id,"status":"pending"}).sort("scheduledAt",1).limit(10)); now=datetime.now(timezone.utc)
    weight_series=[{"measuredAt":x.get("measuredAt"),"weightKg":x.get("weightKg")} for x in weights if isinstance(x.get("weightKg"),(int,float))]
    latest=weight_series[-1] if weight_series else None; previous=weight_series[-2] if len(weight_series)>1 else None
    diff=(latest["weightKg"]-previous["weightKg"]) if latest and previous else None
    logs_clean=[{"id":str(x["_id"]),"loggedAt":x.get("loggedAt"),**{k:x.get(k) for k in ("waterLevel","foodLevel","energyLevel","stoolLevel") if x.get(k) is not None}} for x in logs]
    return _clean({"pet":{"petId":pet_id,"name":pet.get("name",""),"breed":pet.get("breed",""),"sex":pet.get("gender",""),"birthDate":pet.get("birthday"),"isNeutered":pet.get("neutered")},"period":{"days":days,"startAt":start,"endAt":end},"weight":{"latestWeightKg":latest["weightKg"] if latest else None,"previousWeightKg":previous["weightKg"] if previous else None,"differenceKg":diff,"recordCount":len(weight_series),"series":weight_series},"dailyLogs":{"recordCount":len(logs_clean),"water":_summary(logs_clean,"waterLevel"),"food":_summary(logs_clean,"foodLevel"),"energy":_summary(logs_clean,"energyLevel"),"stool":_summary(logs_clean,"stoolLevel"),"recent":logs_clean[-30:]},"healthEvents":{"totalCount":len(events),"severityCounts":{v:sum(1 for x in events if x.get("severity")==v) for v in ("mild","moderate","severe")},"recentEvents":[{"id":str(x["_id"]),"type":x.get("type"),"occurredAt":x.get("occurredAt"),"severity":x.get("severity"),"summary":x.get("summary","")} for x in events[-14:]]},"medical":{"visitCount":len(visits),"recentVisits":[{"id":str(x["_id"]),"visitedAt":x.get("visitedAt"),"followUpAt":x.get("followUpAt"),"clinicName":x.get("clinicName",x.get("hospitalName","")),"reason":x.get("reason","")} for x in visits]},"medications":{"active":[{k:x.get(k) for k in ("name","startDate","endDate","instructions","timesPerDay","mealTiming")} for x in meds],"completedCount":completed},"vaccinations":{"latest":({k:vaccines[0].get(k) for k in ("vaccineName","administeredAt","nextDueAt")} if vaccines else None),"upcomingCount":sum(1 for x in vaccines if x.get("nextDueAt") and _aware(x["nextDueAt"])>=now)},"dewormings":{"latest":({k:deworms[0].get(k) for k in ("type","productName","administeredAt","nextDueAt")} if deworms else None)},"reminders":{"pendingCount":len(reminders),"todayCount":sum(1 for x in reminders if x.get("scheduledAt") and _aware(x["scheduledAt"]).date()==now.date()),"upcomingCount":len(reminders),"overdueCount":sum(1 for x in reminders if x.get("scheduledAt") and _aware(x["scheduledAt"])<now),"upcoming":[{"title":x.get("title",""),"scheduledAt":x.get("scheduledAt")} for x in reminders[:5]]}})
