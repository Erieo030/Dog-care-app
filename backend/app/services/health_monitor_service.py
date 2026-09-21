from app.timezone import now_taipei, TAIPEI
from datetime import datetime, timedelta, timezone
from app.schemas.ai import AIAlert, HealthMonitorResult

class HealthMonitorConfig:
    STREAK_COUNT = 3
    REPEATED_EVENT_COUNT = 3
    RECENT_SYMPTOM_WINDOW_HOURS = 72
    WEIGHT_CHANGE_ATTENTION_PERCENT = 5.0
    MEDICATION_ENDING_SOON_DAYS = 2
    CARE_DUE_SOON_DAYS = 7

def _aware(value):
    if isinstance(value, datetime) and value.tzinfo is None: return value.replace(tzinfo=TAIPEI)
    return value
def _id(rule, evidence):
    stable = str(evidence.get("lastObservedAt") or evidence.get("endDate") or evidence.get("dueAt") or evidence.get("types") or "current")
    return f"{rule}:{stable}"
def _alert(rule, severity, title, message, evidence):
    first=evidence.get("firstObservedAt"); last=evidence.get("lastObservedAt")
    return AIAlert(id=_id(rule,evidence),type=rule,severity=severity,title=title,message=message,evidence=evidence,firstObservedAt=first,lastObservedAt=last)
def _streak(summary, key, low, high):
    values=summary.get(key,{}).get("recent",[]); n=HealthMonitorConfig.STREAK_COUNT
    if len(values)>=n and all(v in low for v in values[-n:]): return _alert(f"{key}_low_streak","attention",f"近期{key}偏低",f"最近{n}筆{key}紀錄皆偏低。",{"records":values[-n:]})
    if high and len(values)>=n and all(v in high for v in values[-n:]): return _alert(f"{key}_high_streak","attention",f"近期{key}偏高",f"最近{n}筆{key}紀錄皆偏高。",{"records":values[-n:]})
    return None
def monitor(context):
    alerts=[]; logs=context.get("dailyLogs",{}); n=HealthMonitorConfig.STREAK_COUNT
    for key,low,high in (("food",{"low"},set()),("water",{"low"},{"high"}),("energy",{"low"},set())):
        a=_streak(logs,key,low,high)
        if a: alerts.append(a)
    stool=logs.get("stool",{}).get("recent",[])
    if len(stool)>=n and all(isinstance(v,int) and v!=3 for v in stool[-n:]):
        kind="偏軟或水狀" if all(v>=4 for v in stool[-n:]) else "偏硬" if all(v<=2 for v in stool[-n:]) else "異常型態"
        alerts.append(_alert("stool_abnormal_streak","attention","近期排便型態變化",f"最近{n}筆排便紀錄皆{kind}。",{"records":stool[-n:]}))
    events=context.get("healthEvents",{}).get("recentEvents",[]); types=[x.get("type") for x in events]
    for typ in sorted(set(types)):
        if types.count(typ)>=HealthMonitorConfig.REPEATED_EVENT_COUNT: alerts.append(_alert("repeated_health_event","attention","近期健康異常重複出現",f"最近期間記錄了 {types.count(typ)} 次相同類型的健康異常。",{"type":typ,"count":types.count(typ)}))
    now=now_taipei(); window=now-timedelta(hours=HealthMonitorConfig.RECENT_SYMPTOM_WINDOW_HOURS)
    recent=[x for x in events if _aware(x.get("occurredAt")) and _aware(x["occurredAt"])>=window]
    distinct=sorted({x.get("type") for x in recent if x.get("type")})
    if len(distinct)>=3: alerts.append(_alert("multiple_recent_symptoms","attention","近期有多種健康異常紀錄","最近 72 小時內記錄了多種不同健康異常。",{"windowHours":72,"types":distinct,"count":len(recent),"events":[{"type":x.get("type"),"occurredAt":x.get("occurredAt")} for x in recent]}))
    severe=[x for x in events if x.get("severity")=="severe"]
    if severe: alerts.append(_alert("severe_health_event","urgent","有嚴重異常紀錄","最近有一筆被標記為嚴重的健康異常紀錄。",{"eventIds":[x.get("id") for x in severe]}))
    series=context.get("weight",{}).get("series",[])
    if len(series)>=2 and series[0].get("weightKg") and series[-1].get("weightKg")<series[0]["weightKg"]:
        pct=(series[-1]["weightKg"]-series[0]["weightKg"])/series[0]["weightKg"]*100
        if pct<=-HealthMonitorConfig.WEIGHT_CHANGE_ATTENTION_PERCENT: alerts.append(_alert("weight_decrease","attention","近期體重變化",f"此期間紀錄的體重下降約 {abs(pct):.1f}%。",{"changePercent":round(pct,2)}))
    for item in context.get("medical",{}).get("recentVisits",[]):
        due=_aware(item.get("followUpAt"))
        if due and due<now and not item.get("followUpCompleted",False): alerts.append(_alert("follow_up_overdue","attention","回診提醒已逾期","有一筆回診日期已超過且尚未完成。",{"dueAt":due,"medicalVisitId":item.get("id")}))
    for item in context.get("medications",{}).get("active",[]):
        end=item.get("endDate")
        if end:
            try: end_date=datetime.fromisoformat(end).replace(tzinfo=TAIPEI)
            except ValueError: end_date=None
            if end_date and now<=end_date<=now+timedelta(days=HealthMonitorConfig.MEDICATION_ENDING_SOON_DAYS): alerts.append(_alert("medication_ending_soon","info","用藥療程即將結束",f"{item.get('name','用藥')} 的紀錄療程即將結束。",{"medicationName":item.get("name",""),"endDate":end,"daysRemaining":(end_date-now).days}))
    for key,label in (("vaccinations","疫苗"),("dewormings","驅蟲")):
        latest=context.get(key,{}).get("latest")
        due=_aware(latest.get("nextDueAt")) if latest else None
        if due:
            if due<now: alerts.append(_alert(f"{key[:-1]}_due","attention",f"{label}日期已超過",f"{label}的下次預計日期已超過。",{"nextDueAt":due,"status":"overdue"}))
            elif due<=now+timedelta(days=HealthMonitorConfig.CARE_DUE_SOON_DAYS): alerts.append(_alert(f"{key[:-1]}_due","info",f"{label}即將到期",f"{label}的下一次預計日期即將到來。",{"nextDueAt":due,"status":"upcoming"}))
    rank={"urgent":0,"attention":1,"info":2}; alerts.sort(key=lambda x:(rank[x.severity],-(x.lastObservedAt.timestamp() if isinstance(x.lastObservedAt,datetime) else 0),x.id))
    return HealthMonitorResult(period=context["period"],alerts=alerts,summary={"total":len(alerts),"info":sum(x.severity=="info" for x in alerts),"attention":sum(x.severity=="attention" for x in alerts),"urgent":sum(x.severity=="urgent" for x in alerts)})
