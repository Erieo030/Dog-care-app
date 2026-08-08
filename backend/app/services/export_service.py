"""用途：集中蒐集資料並產生 PDF、CSV、JSON／含圖片 ZIP 匯出檔。"""
from __future__ import annotations
import csv, json, shutil, threading, zipfile
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from uuid import uuid4
from xml.sax.saxutils import escape
from bson import ObjectId
from fastapi import HTTPException
from reportlab.graphics.shapes import Circle, Drawing, Line, String
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from reportlab.platypus import Image, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from app.db import db
from app.schemas.export import ExportCreateRequest
from app.services.attachment_service import storage

ROOT = Path(__file__).resolve().parents[2] / "exports"
ROOT.mkdir(parents=True, exist_ok=True)
EXECUTOR = ThreadPoolExecutor(max_workers=2, thread_name_prefix="pawlog-export")
LOCK = threading.Lock()
JOBS: dict[str, dict] = {}
DATE_FIELDS = {"weights":"measuredAt", "healthEvents":"occurredAt", "medicalVisits":"visitedAt", "reminders":"scheduledAt", "dewormings":"administeredAt", "medications":"startDate"}
COLLECTIONS = {"weights":db.weight_records, "healthEvents":db.health_events, "medicalVisits":db.medical_visits, "reminders":db.reminders, "dewormings":db.dewormings, "medications":db.medications}
CSV_MAP = {"weight":"weights", "health_event":"healthEvents", "medical_visit":"medicalVisits", "reminder":"reminders", "deworming":"dewormings", "medication":"medications"}

class Cancelled(Exception): pass

def _now(): return datetime.now(timezone.utc)
def _json(value):
    if isinstance(value, (datetime, date, ObjectId)): return value.isoformat() if not isinstance(value, ObjectId) else str(value)
    if isinstance(value, list): return [_json(v) for v in value]
    if isinstance(value, dict): return {("id" if k == "_id" else k): _json(v) for k,v in value.items() if k != "storageKey"}
    return value

def _public(job):
    return {k:_json(v) for k,v in job.items() if k not in {"userId","filePath","request","cancelRequested"}}

def _persist(job):
    """將匯出狀態保存到 MongoDB，讓 process 重啟後仍可查詢已完成工作。"""
    payload={k:v for k,v in job.items() if k not in {"request","cancelRequested"}}
    if hasattr(job.get("request"), "model_dump"):
        payload["request"]=job["request"].model_dump(by_alias=True)
    db.export_jobs.update_one({"_id": job["id"]},{"$set": payload},upsert=True)

def _owned_pets(user_id, request):
    query={"userId":user_id}
    if request.scope == "current_pet":
        if not ObjectId.is_valid(request.pet_id): raise HTTPException(400,"毛孩 ID 格式錯誤")
        query["_id"]=ObjectId(request.pet_id)
    pets=list(db.pets.find(query))
    if not pets: raise HTTPException(404,"找不到可匯出的毛孩資料")
    return pets

def _range(request):
    end=request.end_at or _now()
    if end.tzinfo is None: end=end.replace(tzinfo=timezone.utc)
    if request.period=="30_days": return end-timedelta(days=30),end
    if request.period=="90_days": return end-timedelta(days=90),end
    if request.period=="custom":
        start=request.start_at.replace(tzinfo=request.start_at.tzinfo or timezone.utc)
        return start,end
    return None,None

def _collect(user_id, request, pet_docs=None):
    pets=pet_docs or _owned_pets(user_id,request); pet_ids=[str(p["_id"]) for p in pets]
    start,end=_range(request); data={"pets":[_json(p) for p in pets]}
    for key,collection in COLLECTIONS.items():
        query={"petId":{"$in":pet_ids}}; field=DATE_FIELDS[key]
        if start: query[field]={"$gte":start,"$lte":end}
        data[key]=[_json(x) for x in collection.find(query).sort([(field,1),("_id",1)])]
    attachment_ids={v for key in ("weights","healthEvents","medicalVisits") for item in data[key] for v in item.get("attachmentIds",[])}
    parsed=[ObjectId(v) for v in attachment_ids if ObjectId.is_valid(v)]
    attachments=list(db.attachments.find({"_id":{"$in":parsed},"petId":{"$in":pet_ids}}))
    data["attachments"]=[_json(a) for a in attachments]
    return data,attachments

def _check(job):
    if job.get("cancelRequested"): raise Cancelled()
def _progress(job,n):
    with LOCK: job["progress"]=n; job["updatedAt"]=_now(); _persist(job)

def _write_json(path,data):
    payload={"schemaVersion":"1.0","exportedAt":_now().isoformat(),"app":"PawLog","data":data}
    with path.open("w",encoding="utf-8") as f: json.dump(payload,f,ensure_ascii=False,indent=2)

def _zip_json(path,data,attachments,job):
    backup=path.parent/"backup.json"; metadata={str(a["_id"]):a for a in attachments}
    for item in data["attachments"]:
        source=metadata.get(item["id"]); item["includedPath"]=None
        if source and source.get("storageProvider")=="local":
            p=storage.path(source["storageKey"])
            if p.is_file(): item["includedPath"]=f"attachments/{item['id']}-{source.get('originalName','photo')}"
    _write_json(backup,data)
    with zipfile.ZipFile(path,"w",zipfile.ZIP_DEFLATED) as archive:
        archive.write(backup,"backup.json")
        for item in data["attachments"]:
            _check(job)
            if item.get("includedPath"):
                source=metadata[item["id"]]; archive.write(storage.path(source["storageKey"]),item["includedPath"])
    backup.unlink(missing_ok=True)

def _write_csv(path,key,items):
    fields={"weights":["id","petId","measuredAt","weightKg","notes","attachmentIds"],"healthEvents":["id","petId","occurredAt","type","severity","summary","notes","details","attachmentIds"],"medicalVisits":["id","petId","visitedAt","clinicName","veterinarianName","reason","treatmentNotes","followUpAt","cost","notes","medications","attachmentIds"],"reminders":["id","petId","scheduledAt","type","title","status","recurrenceRule","completedAt","notes"],"dewormings":["id","petId","type","productName","administeredAt","nextDueAt","notes"],"medications":["id","petId","name","instructions","timesPerDay","startDate","endDate","mealTiming","status","notes"]}[key]
    with path.open("w",encoding="utf-8-sig",newline="") as f:
        writer=csv.DictWriter(f,fieldnames=fields,extrasaction="ignore"); writer.writeheader()
        for item in items:
            row=dict(item)
            for name,value in row.items():
                if isinstance(value,(list,dict)): row[name]=json.dumps(value,ensure_ascii=False)
            writer.writerow(row)

def _s(value): return escape(str(value if value not in (None,"") else "未填寫"))
def _chart(weights,font):
    drawing=Drawing(470,130); values=[float(x["weightKg"]) for x in weights[-20:]]
    if len(values)<2: return Paragraph("體重資料不足，暫不繪製趨勢圖。",ParagraphStyle("empty",fontName=font,fontSize=10))
    low,high=min(values),max(values); span=max(high-low,1); points=[]
    for i,v in enumerate(values): points.append((25+i*420/(len(values)-1),20+(v-low)*90/span))
    for a,b in zip(points,points[1:]): drawing.add(Line(a[0],a[1],b[0],b[1],strokeColor=colors.HexColor("#E07A5F"),strokeWidth=2))
    for x,y in points: drawing.add(Circle(x,y,3,fillColor=colors.HexColor("#E07A5F"),strokeColor=None))
    drawing.add(String(25,115,f"{high:g} kg",fontName=font,fontSize=8)); drawing.add(String(25,5,f"{low:g} kg",fontName=font,fontSize=8)); return drawing

def _write_pdf(path,data,attachments,job):
    try: pdfmetrics.registerFont(UnicodeCIDFont("MSung-Light"))
    except KeyError: pass
    font="MSung-Light"; styles=getSampleStyleSheet(); title=ParagraphStyle("zh-title",fontName=font,fontSize=25,leading=34,alignment=TA_CENTER,textColor=colors.HexColor("#6B4F3B")); h1=ParagraphStyle("zh-h1",fontName=font,fontSize=17,leading=24,textColor=colors.HexColor("#6B4F3B")); body=ParagraphStyle("zh-body",fontName=font,fontSize=9,leading=14)
    story=[Spacer(1,55*mm),Paragraph("PawLog 健康報告",title),Spacer(1,10*mm),Paragraph(f"匯出日期：{_now().astimezone().strftime('%Y/%m/%d')}",body),PageBreak(),Paragraph("目錄",h1)]
    story += [Paragraph(f"{i+1}. {_s(p.get('name','毛孩'))}",body) for i,p in enumerate(data["pets"])] + [PageBreak()]
    by_id={str(a["_id"]):a for a in attachments}
    for pet in data["pets"]:
        _check(job); pid=pet["id"]; story += [Paragraph(_s(pet.get("name","毛孩")),h1),Paragraph(f"品種：{_s(pet.get('breed'))}　性別：{_s(pet.get('gender'))}　生日：{_s(pet.get('birthday') or pet.get('birthDate'))}",body),Paragraph(f"結紮：{_s('已結紮' if pet.get('neutered') else '未設定或未結紮')}　毛色：{_s(pet.get('coatColor'))}　明顯特徵：{_s(pet.get('distinctiveFeatures'))}",body),Spacer(1,5*mm)]
        groups={k:[x for x in data[k] if x.get("petId")==pid] for k in COLLECTIONS}
        story += [Paragraph("體重趨勢",h1),_chart(groups["weights"],font),Paragraph("健康事件",h1)]
        story += [Paragraph(f"{_s(x.get('occurredAt'))}　{_s(x.get('summary') or x.get('type'))}",body) for x in groups["healthEvents"]] or [Paragraph("此期間沒有健康事件。",body)]
        story += [Paragraph("就醫紀錄",h1)] + ([Paragraph(f"{_s(x.get('visitedAt'))}　{_s(x.get('clinicName'))}：{_s(x.get('reason'))}",body) for x in groups["medicalVisits"]] or [Paragraph("此期間沒有就醫紀錄。",body)])
        story += [Paragraph("提醒",h1)] + ([Paragraph(f"{_s(x.get('scheduledAt'))}　{_s(x.get('title'))}（{_s(x.get('status'))}）",body) for x in groups["reminders"]] or [Paragraph("此期間沒有提醒。",body)])
        if job["request"].include_images:
            image_ids=[v for k in ("weights","healthEvents","medicalVisits") for x in groups[k] for v in x.get("attachmentIds",[])]
            if image_ids: story.append(Paragraph("照片",h1))
            for aid in image_ids:
                source=by_id.get(aid)
                if source and source.get("storageProvider")=="local":
                    try: story.append(Image(str(storage.path(source["storageKey"])),width=55*mm,height=42*mm,kind="proportional"))
                    except Exception: story.append(Paragraph("照片無法載入。",body))
        story.append(PageBreak())
    def page(canvas,doc):
        canvas.saveState(); canvas.setFont(font,8); canvas.drawString(18*mm,10*mm,_now().astimezone().strftime("%Y/%m/%d")); canvas.drawRightString(195*mm,10*mm,f"第 {doc.page} 頁"); canvas.restoreState()
    SimpleDocTemplate(str(path),pagesize=A4,rightMargin=18*mm,leftMargin=18*mm,topMargin=16*mm,bottomMargin=18*mm,title="PawLog 健康報告").build(story,onFirstPage=page,onLaterPages=page)

def _run(job):
    try:
        job["status"]="processing"; _progress(job,5); data,attachments=_collect(job["userId"],job["request"]); _check(job); _progress(job,45)
        request=job["request"]; stamp=_now().strftime("%Y%m%d-%H%M%S"); base=f"pawlog-{stamp}"
        if request.format=="pdf": ext,mime="pdf","application/pdf"
        elif request.format=="csv": ext,mime="csv","text/csv"
        elif request.include_images: ext,mime="zip","application/zip"
        else: ext,mime="json","application/json"
        path=ROOT/job["id"]/f"{base}.{ext}"; path.parent.mkdir(parents=True,exist_ok=True)
        if ext=="pdf": _write_pdf(path,data,attachments,job)
        elif ext=="csv": key=CSV_MAP[request.csv_type]; _write_csv(path,key,data[key])
        elif ext=="zip": _zip_json(path,data,attachments,job)
        else: _write_json(path,data)
        _check(job)
        with LOCK: job.update(status="completed",progress=100,filePath=str(path),fileName=path.name,mimeType=mime,updatedAt=_now()); _persist(job)
    except Cancelled:
        shutil.rmtree(ROOT/job["id"],ignore_errors=True); job.update(status="cancelled",updatedAt=_now()); _persist(job)
    except Exception:
        shutil.rmtree(ROOT/job["id"],ignore_errors=True); job.update(status="failed",error="匯出失敗，請稍後重試",updatedAt=_now()); _persist(job)

def create_job(user_id,request):
    _owned_pets(user_id,request); job={"id":uuid4().hex,"userId":user_id,"format":request.format,"status":"queued","progress":0,"createdAt":_now(),"updatedAt":_now(),"request":request,"cancelRequested":False}
    with LOCK: JOBS[job["id"]]=job; _persist(job)
    EXECUTOR.submit(_run,job); return _public(job)

def recover_jobs() -> None:
    """FastAPI process 重啟時重新接手未完成的匯出工作。"""
    for stored in db.export_jobs.find({"status": {"$in": ["queued", "processing"]}}):
        try:
            request = ExportCreateRequest.model_validate(stored.get("request", {}))
            job = {**stored, "id": stored["_id"], "request": request,
                   "cancelRequested": False, "status": "queued", "updatedAt": _now()}
            JOBS[job["id"]] = job
            _persist(job)
            EXECUTOR.submit(_run, job)
        except Exception:
            db.export_jobs.update_one({"_id": stored["_id"]}, {"$set": {"status": "failed", "error": "匯出工作無法恢復", "updatedAt": _now()}})
def _owned(job_id,user_id):
    job=JOBS.get(job_id)
    if not job:
        job=db.export_jobs.find_one({"_id":job_id})
    if not job or job["userId"]!=user_id: raise HTTPException(404,"找不到匯出工作")
    return job
def get_job(job_id,user_id): return _public(_owned(job_id,user_id))
def cancel_job(job_id,user_id):
    job=_owned(job_id,user_id)
    if job["status"] in {"queued","processing"}: job["cancelRequested"]=True
    return _public(job)
def download_job(job_id,user_id):
    job=_owned(job_id,user_id)
    if job["status"]!="completed": raise HTTPException(409,"匯出檔案尚未完成")
    path=Path(job["filePath"])
    if not path.is_file(): raise HTTPException(404,"匯出檔案已過期")
    return path,job["fileName"],job["mimeType"]
