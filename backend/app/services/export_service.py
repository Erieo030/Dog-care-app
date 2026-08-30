"""用途：集中蒐集資料並產生 PDF 健康照護報告。"""
from __future__ import annotations
from app.timezone import now_taipei, TAIPEI
import shutil, threading
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
from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle, KeepTogether
from app.db import db
from app.schemas.export import ExportCreateRequest

ROOT = Path(__file__).resolve().parents[2] / "mego-exports"
ROOT.mkdir(parents=True, exist_ok=True)
EXECUTOR = ThreadPoolExecutor(max_workers=2, thread_name_prefix="mego-export")

def shutdown() -> None:
    """應用程式停止時釋放匯出背景執行緒。"""
    EXECUTOR.shutdown(wait=False, cancel_futures=True)

LOCK = threading.Lock()
JOBS: dict[str, dict] = {}
DATE_FIELDS = {"vaccinations":"administeredAt", "weights":"measuredAt", "healthEvents":"occurredAt", "medicalVisits":"visitedAt", "reminders":"scheduledAt", "dewormings":"administeredAt", "medications":"startDate"}
COLLECTIONS = {"vaccinations":db.vaccinations, "weights":db.weight_records, "healthEvents":db.health_events, "medicalVisits":db.medical_visits, "reminders":db.reminders, "dewormings":db.dewormings, "medications":db.medications}

class Cancelled(Exception): pass

def _now(): return now_taipei()
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
    if end.tzinfo is None: end=end.replace(tzinfo=TAIPEI)
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
    return data

def _check(job):
    if job.get("cancelRequested"): raise Cancelled()
def _progress(job,n):
    with LOCK: job["progress"]=n; job["updatedAt"]=_now(); _persist(job)

def _s(value): return escape(str(value if value not in (None,"") else "未填寫"))
def _date(value):
    if not value: return "未填寫"
    if isinstance(value, dict) and "$date" in value: value = value["$date"]
    try: return datetime.fromisoformat(str(value).replace("Z", "+00:00")).astimezone(TAIPEI).strftime("%Y/%m/%d")
    except (ValueError, TypeError): return str(value)[:10]
def _chart(weights,font):
    drawing=Drawing(470,130); values=[float(x["weightKg"]) for x in weights[-20:]]
    if len(values)<2: return Paragraph("體重資料不足，暫不繪製趨勢圖。",ParagraphStyle("empty",fontName=font,fontSize=10))
    low,high=min(values),max(values); span=max(high-low,1); points=[]
    for i,v in enumerate(values): points.append((25+i*420/(len(values)-1),20+(v-low)*90/span))
    for a,b in zip(points,points[1:]): drawing.add(Line(a[0],a[1],b[0],b[1],strokeColor=colors.HexColor("#E07A5F"),strokeWidth=2))
    for x,y in points: drawing.add(Circle(x,y,3,fillColor=colors.HexColor("#E07A5F"),strokeColor=None))
    drawing.add(String(25,115,f"{high:g} kg",fontName=font,fontSize=8)); drawing.add(String(25,5,f"{low:g} kg",fontName=font,fontSize=8))
    first_date = _date(weights[0].get("measuredAt")); last_date = _date(weights[-1].get("measuredAt"))
    drawing.add(String(25,115,first_date,fontName=font,fontSize=7,textAnchor="start"))
    drawing.add(String(445,5,last_date,fontName=font,fontSize=7,textAnchor="end")); return drawing

def _write_pdf(path,data,job):
    # 使用 ReportLab 內建 CID 字型，確保中英文字元、數字與日期都能被閱讀器正確映射。
    font = "STSong-Light"
    try:
        pdfmetrics.registerFont(UnicodeCIDFont(font))
    except KeyError:
        font = "Helvetica"
    styles=getSampleStyleSheet();
    title=ParagraphStyle("zh-title",fontName=font,fontSize=27,leading=38,alignment=TA_CENTER,textColor=colors.HexColor("#3D332D"),spaceAfter=8)
    h1=ParagraphStyle("zh-h1",fontName=font,fontSize=17,leading=26,textColor=colors.HexColor("#3D332D"),spaceBefore=14,spaceAfter=7)
    body=ParagraphStyle("zh-body",fontName=font,fontSize=10,leading=17,textColor=colors.HexColor("#3D332D"),wordWrap="CJK",spaceAfter=4)
    small=ParagraphStyle("zh-small",fontName=font,fontSize=9,leading=15,textColor=colors.HexColor("#6F625A"),wordWrap="CJK",spaceAfter=3)
    toc=ParagraphStyle("zh-toc", parent=h1, alignment=TA_CENTER, spaceBefore=6, spaceAfter=10)
    pet_names = "、".join(str(p.get("name") or "毛孩") for p in data["pets"])
    export_time = _now().astimezone(TAIPEI).strftime("%Y/%m/%d %H:%M")
    section_defs=[("毛孩基本資料", True), ("健康紀錄摘要", any(data[k] for k in ("weights","healthEvents","medicalVisits"))), ("體重趨勢", bool(data["weights"])), ("健康事件", bool(data["healthEvents"])), ("就醫紀錄", bool(data["medicalVisits"])), ("疫苗紀錄", bool(data["vaccinations"])), ("用藥紀錄", bool(data["medications"])), ("驅蟲紀錄", bool(data["dewormings"])), ("提醒", bool(data["reminders"]))]
    story=[Spacer(1,28*mm),Paragraph("MEGO",small),Spacer(1,3*mm),Paragraph("健康照護報告",title),Spacer(1,10*mm),Table([[Paragraph(f"<b>毛孩</b><br/>{_s(pet_names)}",body),Paragraph(f"<b>匯出時間</b><br/>{export_time}",body)]],colWidths=[82*mm,82*mm],style=TableStyle([["BACKGROUND",(0,0),(-1,-1),colors.HexColor("#FFF4E8")],["BOX",(0,0),(-1,-1),0.6,colors.HexColor("#E8D4C2")],["VALIGN",(0,0),(-1,-1),"MIDDLE"],["LEFTPADDING",(0,0),(-1,-1),10],["RIGHTPADDING",(0,0),(-1,-1),10],["TOPPADDING",(0,0),(-1,-1),9],["BOTTOMPADDING",(0,0),(-1,-1),9]])),Spacer(1,9*mm),Paragraph("這份報告整理毛孩的健康與照護紀錄，方便日常查看，也能在就醫時提供獸醫參考。",body),Spacer(1,5*mm),Paragraph("內容來自飼主在 MEGO 中的紀錄，未填寫的欄位會標示為「未填寫」。",small),PageBreak(),Paragraph("報告目錄",toc)]
    story += [Paragraph(f"{index}　{_s(label)}",body) for index,(label,enabled) in enumerate(section_defs,1) if enabled]
    story += [Spacer(1,5*mm)]
    story += [PageBreak()]
    for pet in data["pets"]:
        _check(job); pid=pet["id"]
        gender = {"male": "公", "female": "母"}.get(pet.get("gender") or pet.get("sex"), pet.get("gender") or pet.get("sex"))
        birthday = pet.get("birthday") or pet.get("birthDate")
        breed_type = {"purebred": "純種", "mixed": "混種", "unknown": "不確定"}.get(pet.get("breedType"), "不確定")
        pet_table=Table([
            [Paragraph("<b>品種</b>",small),Paragraph(f"{_s(pet.get('breed'))}（{_s(breed_type)}）",body),Paragraph("<b>性別</b>",small),Paragraph(_s(gender),body)],
            [Paragraph("<b>生日</b>",small),Paragraph(_date(birthday),body),Paragraph("<b>結紮</b>",small),Paragraph(_s('已結紮' if pet.get('neutered') else '未設定或未結紮'),body)],
            [Paragraph("<b>毛色</b>",small),Paragraph(_s(pet.get('coatColor')),body),Paragraph("<b>明顯特徵</b>",small),Paragraph(_s(pet.get('distinctiveFeatures')),body)],
        ],colWidths=[22*mm,57*mm,25*mm,60*mm],style=TableStyle([["BACKGROUND",(0,0),(0,-1),colors.HexColor("#FFF4E8")],["BACKGROUND",(2,0),(2,-1),colors.HexColor("#FFF4E8")],["BOX",(0,0),(-1,-1),0.5,colors.HexColor("#E8D4C2")],["INNERGRID",(0,0),(-1,-1),0.35,colors.HexColor("#E8D4C2")],["VALIGN",(0,0),(-1,-1),"MIDDLE"],["LEFTPADDING",(0,0),(-1,-1),7],["RIGHTPADDING",(0,0),(-1,-1),7],["TOPPADDING",(0,0),(-1,-1),6],["BOTTOMPADDING",(0,0),(-1,-1),6]]))
        story += [Paragraph(_s(pet.get("name", "毛孩")),h1),pet_table,Spacer(1,5*mm)]
        groups={k:[x for x in data[k] if x.get("petId")==pid] for k in COLLECTIONS}
        if job["request"].include_ai_summary:
            summary = "；".join([f"體重 {len(groups["weights"])} 筆", f"健康事件 {len(groups["healthEvents"])} 筆", f"就醫 {len(groups["medicalVisits"])} 筆", f"用藥 {len(groups["medications"])} 筆", f"驅蟲 {len(groups["dewormings"])} 筆"]) + "。"
            if not any(groups[k] for k in ("weights", "healthEvents", "medicalVisits")): summary = "目前紀錄不足，尚無法建立完整摘要。"
            summary_table=Table([[Paragraph("<b>體重</b>",small),Paragraph(f"{len(groups['weights'])} 筆",body),Paragraph("<b>健康事件</b>",small),Paragraph(f"{len(groups['healthEvents'])} 筆",body)], [Paragraph("<b>就醫</b>",small),Paragraph(f"{len(groups['medicalVisits'])} 筆",body),Paragraph("<b>提醒</b>",small),Paragraph(f"{len(groups['reminders'])} 筆",body)]],colWidths=[25*mm,52*mm,25*mm,52*mm],style=TableStyle([["BACKGROUND",(0,0),(-1,-1),colors.HexColor("#F6F1EB")],["BOX",(0,0),(-1,-1),0.5,colors.HexColor("#E8D4C2")],["INNERGRID",(0,0),(-1,-1),0.35,colors.HexColor("#E8D4C2")],["VALIGN",(0,0),(-1,-1),"MIDDLE"],["LEFTPADDING",(0,0),(-1,-1),7],["TOPPADDING",(0,0),(-1,-1),6],["BOTTOMPADDING",(0,0),(-1,-1),6]]))
            vet_points=[]
            if groups['healthEvents']:
                latest=sorted(groups['healthEvents'], key=lambda x: str(x.get('occurredAt') or ''), reverse=True)[0]
                vet_points.append(f"近期健康事件：{_date(latest.get('occurredAt'))}，{_s(latest.get('summary') or latest.get('type'))}")
            if groups['medications']:
                names='、'.join(str(x.get('name') or '未填寫藥品') for x in groups['medications'][:5])
                vet_points.append(f"用藥紀錄：{_s(names)}")
            pending=sum(1 for x in groups['reminders'] if x.get('status') in ('pending','snoozed'))
            if pending:
                vet_points.append(f"尚未完成提醒：{pending} 項")
            vet_summary=Paragraph('<b>給獸醫參考的重點</b><br/>' + '<br/>'.join(f"• {_s(point)}" for point in vet_points) if vet_points else '<b>給獸醫參考的重點</b><br/>目前沒有需要特別標示的近期資料。', body)
            story += [Paragraph("健康紀錄摘要",h1),summary_table,Spacer(1,3*mm),Paragraph(_s(summary),body),vet_summary,Spacer(1,2*mm),Paragraph("本報告依 MEGO 中由飼主記錄的資料整理，內容僅供健康紀錄與就醫溝通參考，不代表疾病診斷，也不能取代獸醫專業評估。",small), Spacer(1,5*mm)]
        if groups["weights"]:
            ordered_weights=sorted(groups["weights"], key=lambda x: str(x.get("measuredAt") or ""))
            latest_weight=ordered_weights[-1]
            previous_weight=ordered_weights[-2] if len(ordered_weights) > 1 else None
            latest_value=float(latest_weight.get("weightKg") or 0)
            weight_note=f"最新體重：{latest_value:g} kg（{_date(latest_weight.get('measuredAt'))}）"
            if previous_weight:
                previous_value=float(previous_weight.get("weightKg") or 0)
                weight_note += f"；較前次{'增加' if latest_value > previous_value else '減少' if latest_value < previous_value else '沒有變化'} {abs(latest_value-previous_value):g} kg"
            story += [Paragraph("體重趨勢",h1), Paragraph(_s(weight_note),body), _chart(ordered_weights,font)]
        if groups["healthEvents"]:
            story += [Paragraph("健康事件",h1)]
            for event in sorted(groups["healthEvents"], key=lambda x: str(x.get("occurredAt") or ""), reverse=True):
                severity = {'mild':'輕微','moderate':'中等','severe':'嚴重'}.get(event.get('severity'), event.get('severity'))
                story.append(KeepTogether([Table([[Paragraph(f"<b>{_date(event.get('occurredAt'))}</b>",small),Paragraph(f"<b>{_s(event.get('summary') or event.get('type'))}</b><br/>程度：{_s(severity)}<br/>{_s(event.get('notes'))}",body)]],colWidths=[33*mm,131*mm],style=TableStyle([["BACKGROUND",(0,0),(0,0),colors.HexColor("#FFF4E8")],["BOX",(0,0),(-1,-1),0.5,colors.HexColor("#E8D4C2")],["VALIGN",(0,0),(-1,-1),"TOP"],["LEFTPADDING",(0,0),(-1,-1),8],["RIGHTPADDING",(0,0),(-1,-1),8],["TOPPADDING",(0,0),(-1,-1),7],["BOTTOMPADDING",(0,0),(-1,-1),7]]))]))
        if groups["medicalVisits"]:
            story += [Paragraph("就醫紀錄",h1)]
            for visit in sorted(groups["medicalVisits"], key=lambda x: str(x.get("visitedAt") or ""), reverse=True):
                visit_rows = [[Paragraph("看診日期",small),Paragraph(_date(visit.get('visitedAt')),body)],[Paragraph("醫院",small),Paragraph(_s(visit.get('clinicName')),body)],[Paragraph("看診原因",small),Paragraph(_s(visit.get('reason')),body)],[Paragraph("治療／用藥說明",small),Paragraph(_s(visit.get('treatmentNotes')),body)],[Paragraph("下次回診",small),Paragraph(_date(visit.get('followUpAt')),body)]]
                story.append(KeepTogether([Table(visit_rows,colWidths=[34*mm,130*mm],style=TableStyle([["BACKGROUND",(0,0),(0,-1),colors.HexColor("#F1F8F2")],["BOX",(0,0),(-1,-1),0.5,colors.HexColor("#C9E3D0")],["INNERGRID",(0,0),(-1,-1),0.35,colors.HexColor("#DDE9DF")],["VALIGN",(0,0),(-1,-1),"TOP"],["LEFTPADDING",(0,0),(-1,-1),8],["RIGHTPADDING",(0,0),(-1,-1),8],["TOPPADDING",(0,0),(-1,-1),6],["BOTTOMPADDING",(0,0),(-1,-1),6]])),Spacer(1,3*mm)]))
        if groups["vaccinations"]:
            story += [Paragraph("疫苗紀錄",h1)]
            rows=[[Paragraph("接種日期",small),Paragraph("疫苗",small),Paragraph("醫院",small),Paragraph("下次接種",small)]]
            rows += [[Paragraph(_date(x.get('administeredAt')),body),Paragraph(_s(x.get('vaccineName')),body),Paragraph(_s(x.get('hospitalName')),body),Paragraph(_date(x.get('nextDueAt')),body)] for x in groups["vaccinations"]]
            story.append(Table(rows,colWidths=[31*mm,51*mm,45*mm,37*mm],style=TableStyle([["BACKGROUND",(0,0),(-1,0),colors.HexColor("#FFF4E8")],["BOX",(0,0),(-1,-1),0.5,colors.HexColor("#E8D4C2")],["INNERGRID",(0,0),(-1,-1),0.35,colors.HexColor("#E8D4C2")],["VALIGN",(0,0),(-1,-1),"TOP"],["LEFTPADDING",(0,0),(-1,-1),6],["RIGHTPADDING",(0,0),(-1,-1),6],["TOPPADDING",(0,0),(-1,-1),6],["BOTTOMPADDING",(0,0),(-1,-1),6]])))
        if groups["medications"]:
            story += [Paragraph("用藥紀錄",h1)]
            rows=[[Paragraph("開始",small),Paragraph("藥品",small),Paragraph("用法",small),Paragraph("結束",small)]]
            rows += [[Paragraph(_date(x.get('startDate')),body),Paragraph(_s(x.get('name')),body),Paragraph(f"{_s(x.get('instructions'))}（每日 {_s(x.get('timesPerDay'))} 次）",body),Paragraph(_date(x.get('endDate')),body)] for x in groups["medications"]]
            story.append(Table(rows,colWidths=[38*mm,38*mm,70*mm,18*mm],style=TableStyle([["BACKGROUND",(0,0),(-1,0),colors.HexColor("#F1F8F2")],["BOX",(0,0),(-1,-1),0.5,colors.HexColor("#C9E3D0")],["INNERGRID",(0,0),(-1,-1),0.35,colors.HexColor("#DDE9DF")],["VALIGN",(0,0),(-1,-1),"TOP"],["LEFTPADDING",(0,0),(-1,-1),6],["RIGHTPADDING",(0,0),(-1,-1),6],["TOPPADDING",(0,0),(-1,-1),6],["BOTTOMPADDING",(0,0),(-1,-1),6]])))
        if groups["dewormings"]:
            story += [Paragraph("驅蟲紀錄",h1)]
            rows=[[Paragraph("日期",small),Paragraph("項目",small),Paragraph("用量",small),Paragraph("下次",small)]]
            rows += [[Paragraph(_date(x.get('administeredAt')),body),Paragraph(_s(x.get('productName') or x.get('type')),body),Paragraph(_s(x.get('dosageText')),body),Paragraph(_date(x.get('nextDueAt')),body)] for x in groups["dewormings"]]
            story.append(Table(rows,colWidths=[31*mm,54*mm,45*mm,34*mm],style=TableStyle([["BACKGROUND",(0,0),(-1,0),colors.HexColor("#FFF4E8")],["BOX",(0,0),(-1,-1),0.5,colors.HexColor("#E8D4C2")],["INNERGRID",(0,0),(-1,-1),0.35,colors.HexColor("#E8D4C2")],["VALIGN",(0,0),(-1,-1),"TOP"],["LEFTPADDING",(0,0),(-1,-1),6],["RIGHTPADDING",(0,0),(-1,-1),6],["TOPPADDING",(0,0),(-1,-1),6],["BOTTOMPADDING",(0,0),(-1,-1),6]])))
        if groups["reminders"]:
            story += [Paragraph("提醒",h1)]
            reminder_rows=[[Paragraph("日期",small),Paragraph("事項",small),Paragraph("狀態",small)]]
            for reminder in sorted(groups["reminders"], key=lambda x: str(x.get("scheduledAt") or "")):
                status={'pending':'待完成','completed':'已完成','skipped':'已略過','snoozed':'已延後'}.get(reminder.get('status'), reminder.get('status'))
                reminder_rows.append([Paragraph(_date(reminder.get('scheduledAt')),body),Paragraph(_s(reminder.get('title')),body),Paragraph(_s(status),body)])
            story.append(Table(reminder_rows,colWidths=[35*mm,95*mm,34*mm],style=TableStyle([["BACKGROUND",(0,0),(-1,0),colors.HexColor("#FFF4E8")],["BOX",(0,0),(-1,-1),0.5,colors.HexColor("#E8D4C2")],["INNERGRID",(0,0),(-1,-1),0.35,colors.HexColor("#E8D4C2")],["VALIGN",(0,0),(-1,-1),"TOP"],["LEFTPADDING",(0,0),(-1,-1),7],["RIGHTPADDING",(0,0),(-1,-1),7],["TOPPADDING",(0,0),(-1,-1),6],["BOTTOMPADDING",(0,0),(-1,-1),6]])))
        story += [Spacer(1,4*mm), Paragraph("照護提醒",h1), Paragraph("本報告協助整理日常照護紀錄，若毛孩出現持續或緊急症狀，請直接諮詢獸醫。報告內容不取代獸醫診斷。",small)]
        story.append(PageBreak())
    def page(canvas,doc):
        # 頁尾使用標準字型，確保各手機 PDF 閱讀器都能顯示日期與頁碼。
        canvas.saveState()
        canvas.setFillColor(colors.black)
        canvas.setFont("Helvetica", 8)
        canvas.drawString(18*mm, 10*mm, "MEGO")
        canvas.drawRightString(195*mm, 10*mm, f"第 {canvas.getPageNumber()} 頁")
        canvas.restoreState()
    SimpleDocTemplate(str(path),pagesize=A4,rightMargin=18*mm,leftMargin=18*mm,topMargin=16*mm,bottomMargin=18*mm,title="MEGO 健康照護報告").build(story,onFirstPage=page,onLaterPages=page)

def _run(job):
    try:
        job["status"]="processing"; _progress(job,5); data=_collect(job["userId"],job["request"]); _check(job); _progress(job,45)
        request=job["request"]; stamp=_now().strftime("%Y%m%d-%H%M%S"); base=f"mego-health-report-{stamp}-{job["id"][:8]}"
        ext,mime="pdf","application/pdf"
        path=ROOT/job["id"]/f"{base}.{ext}"; path.parent.mkdir(parents=True,exist_ok=True)
        _write_pdf(path,data,job)
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

def cleanup_expired_exports(max_age_days: int = 7) -> None:
    """清理已完成或失敗且超過保留期限的匯出檔，避免暫存目錄持續增長。"""
    cutoff = _now() - timedelta(days=max_age_days)
    for job in db.export_jobs.find({"updatedAt": {"$lt": cutoff}, "status": {"$in": ["completed", "failed", "cancelled"]}}):
        file_path = job.get("filePath")
        if file_path:
            path = Path(file_path)
            if path.is_file():
                path.unlink(missing_ok=True)
        db.export_jobs.delete_one({"_id": job["_id"]})
        JOBS.pop(job.get("_id"), None)

def recover_jobs() -> None:
    """FastAPI process 重啟時重新接手未完成的匯出工作。"""
    cleanup_expired_exports()
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
