from datetime import datetime, timezone
from app.schemas.vet import VetVisitBrief
from app.services.ai_context_service import build_context
from app.services.health_monitor_service import monitor
from .summary_service import DISCLAIMER

def build_vet_brief(pet_id: str, user_id: str, days: int) -> VetVisitBrief:
    context=build_context(pet_id,user_id,days); result=monitor(context); pet=context.pet
    weight=context.weight; logs=context.dailyLogs; events=context.healthEvents
    highlights=[]
    if weight.get('recordCount'): highlights.append(f"期間有 {weight['recordCount']} 筆體重紀錄。")
    if logs.get('recordCount'): highlights.append(f"期間有 {logs['recordCount']} 筆日常紀錄。")
    if events.get('totalCount'): highlights.append(f"期間有 {events['totalCount']} 筆健康異常紀錄。")
    if not highlights: highlights.append('目前紀錄不足，尚無法建立完整就醫前摘要。')
    summary=''.join(highlights)
    coverage={'weightRecords':int(weight.get('recordCount',0)),'dailyLogs':int(logs.get('recordCount',0)),'healthEvents':int(events.get('totalCount',0)),'medicalVisits':int(context.medical.get('visitCount',0))}
    sources=[{'type':'weight','label':'體重紀錄'},{'type':'daily_log','label':'日常紀錄'},{'type':'health_event','label':'健康異常'},{'type':'medical_visit','label':'就醫紀錄'}]
    return VetVisitBrief(pet=pet,period=context.period,keyObservations=highlights,weightSummary=weight,dailyLogSummary={k:logs.get(k) for k in ('recordCount','water','food','energy','stool')},recentHealthEvents=context.healthEvents.get('recentEvents',[])[:10],activeMedications=context.medications.get('active',[])[:10],recentMedicalVisits=context.medical.get('recentVisits',[])[:5],vaccination=context.vaccinations,deworming=context.dewormings,monitorAlerts=[a.model_dump(mode='json') for a in result.alerts],dataCoverage=coverage,generatedSummary=summary,disclaimer='本報告依 PawLog 中由飼主記錄的資料整理，內容僅供健康紀錄與就醫溝通參考，不代表疾病診斷，也不能取代獸醫專業評估。',generatedAt=datetime.now(timezone.utc),generationMode='deterministic',sources=sources)
