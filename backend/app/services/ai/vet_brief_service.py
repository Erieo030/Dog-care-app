from copy import deepcopy
from datetime import datetime

from app.schemas.ai import AIContext, HealthMonitorResult
from app.schemas.vet import VetVisitBrief
from app.services.ai_context_service import build_context
from app.services.health_monitor_service import monitor
from app.timezone import now_taipei


VET_SECTIONS = {
    "health": "健康異常",
    "weight": "體重趨勢",
    "daily": "日常觀察",
    "medications": "目前用藥",
    "medical": "近期就醫",
    "vaccinations": "疫苗",
    "dewormings": "驅蟲",
    "reminders": "待辦提醒",
}
EVENT_LABELS = {"vomiting": "嘔吐", "abnormal_stool": "排便異常", "low_appetite": "食慾下降", "abnormal_drinking": "喝水異常", "low_energy": "精神下降", "injury": "受傷", "skin_issue": "皮膚問題", "eye_ear_issue": "眼睛／耳朵問題", "possible_ingestion": "疑似誤食", "other": "其他異常"}
SEVERITY_LABELS = {"mild": "輕微", "moderate": "需要注意", "severe": "嚴重"}


def parse_vet_sections(raw: str | None) -> set[str]:
    if not raw:
        return set(VET_SECTIONS)
    sections = {value.strip() for value in raw.split(",") if value.strip() in VET_SECTIONS}
    if not sections:
        raise ValueError("至少選擇一種就醫摘要資料")
    return sections


def filter_context_for_vet(context_data: dict, sections: set[str]) -> dict:
    """未選取資料不顯示、分享，也不提供給 AI 補充整理。"""
    data = deepcopy(context_data)
    if "weight" not in sections:
        data["weight"] = {"latestWeightKg": None, "previousWeightKg": None, "differenceKg": None, "recordCount": 0, "series": []}
    if "daily" not in sections:
        data["dailyLogs"] = {"recordCount": 0, "water": {}, "food": {}, "energy": {}, "stool": {}, "recent": []}
    if "health" not in sections:
        data["healthEvents"] = {"totalCount": 0, "severityCounts": {}, "recentEvents": []}
    if "medical" not in sections:
        data["medical"] = {"visitCount": 0, "recentVisits": []}
    if "medications" not in sections:
        data["medications"] = {"active": [], "completedCount": 0}
    if "vaccinations" not in sections:
        data["vaccinations"] = {"latest": None, "upcomingCount": 0}
    if "dewormings" not in sections:
        data["dewormings"] = {"latest": None}
    if "reminders" not in sections:
        data["reminders"] = {"pendingCount": 0, "todayCount": 0, "upcomingCount": 0, "overdueCount": 0, "upcoming": []}
    return data


def _date_label(value) -> str:
    return value.strftime("%m/%d") if isinstance(value, datetime) else "日期未填寫"


def build_vet_brief(pet_id: str, user_id: str, days: int, context_data: dict | None = None, result: HealthMonitorResult | None = None, sections: set[str] | None = None) -> VetVisitBrief:
    selected = sections or set(VET_SECTIONS)
    raw_context = context_data or build_context(pet_id, user_id, days)
    context_data = filter_context_for_vet(raw_context, selected)
    result = result or monitor(context_data)
    context = AIContext.model_validate(context_data)
    weight, logs, events = context.weight, context.dailyLogs, context.healthEvents

    highlights = []
    if "weight" in selected and weight.get("differenceKg") is not None:
        direction = "增加" if weight["differenceKg"] > 0 else "減少" if weight["differenceKg"] < 0 else "沒有變化"
        highlights.append(f"最近兩次體重{direction}{abs(weight['differenceKg']):g} kg。")
    if "health" in selected:
        for event in reversed(events.get("recentEvents", [])[-5:]):
            event_label = EVENT_LABELS.get(event.get("type"), "健康異常")
            severity = SEVERITY_LABELS.get(event.get("severity"), "未標示")
            highlights.append(f"{_date_label(event.get('occurredAt'))}：{event_label}（{severity}）{event.get('summary', '')}".strip())
    for alert in result.alerts[:3]:
        highlights.append(f"照護觀察：{alert.title}。{alert.message}")
    if not highlights:
        highlights.append("已依所選資料整理；看診前可補充這次最想詢問的狀況。")
    highlights = highlights[:6]

    questions = []
    if events.get("totalCount"):
        questions.append("上述異常是否需要進一步檢查，或有需要特別觀察的警訊？")
    if context.medications.get("active"):
        questions.append("目前用藥是否需要持續、調整或安排追蹤？")
    if result.alerts:
        questions.append("近期照護趨勢是否需要調整，及何時應安排回診？")
    if not questions:
        questions.append("請向獸醫確認這次看診需要補充觀察哪些項目。")

    coverage = {"weightRecords": int(weight.get("recordCount", 0)), "dailyLogs": int(logs.get("recordCount", 0)), "healthEvents": int(events.get("totalCount", 0)), "medicalVisits": int(context.medical.get("visitCount", 0))}
    source_map = {"weight": "體重紀錄", "daily": "日常紀錄", "health": "健康異常", "medical": "就醫紀錄", "medications": "用藥紀錄", "vaccinations": "疫苗紀錄", "dewormings": "驅蟲紀錄", "reminders": "提醒事項"}
    return VetVisitBrief(
        pet=context.pet,
        period=context.period,
        keyObservations=highlights,
        weightSummary=weight,
        dailyLogSummary={key: logs.get(key) for key in ("recordCount", "water", "food", "energy", "stool")},
        recentHealthEvents=list(reversed(events.get("recentEvents", [])[-10:])),
        activeMedications=context.medications.get("active", [])[:10],
        recentMedicalVisits=context.medical.get("recentVisits", [])[:5],
        vaccination=context.vaccinations,
        deworming=context.dewormings,
        monitorAlerts=[alert.model_dump(mode="json") for alert in result.alerts],
        dataCoverage=coverage,
        generatedSummary="已依你選擇的資料整理就醫重點。",
        disclaimer="本報告依 MEGO 中由飼主記錄的資料整理，內容僅供健康紀錄與就醫溝通參考，不代表疾病診斷，也不能取代獸醫專業評估。",
        generatedAt=now_taipei(),
        generationMode="deterministic",
        sources=[{"type": key, "label": source_map[key]} for key in VET_SECTIONS if key in selected],
        scopeNotes=[f"健康異常、日常與體重依近 {days} 天資料整理。", f"本次選入：{'、'.join(VET_SECTIONS[key] for key in VET_SECTIONS if key in selected)}。", "未選取資料不會顯示、分享或提供給 AI 補充整理。"],
        vetQuestions=questions,
        upcomingReminders=context.reminders.get("upcoming", [])[:5],
    )
