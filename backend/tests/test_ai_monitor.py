from datetime import datetime, timezone, timedelta
from app.services.health_monitor_service import monitor

def ctx(**overrides):
    base={"period":{"days":30,"startAt":datetime.now(timezone.utc)-timedelta(days=30),"endAt":datetime.now(timezone.utc)},"dailyLogs":{"food":{"recent":[]},"water":{"recent":[]},"energy":{"recent":[]},"stool":{"recent":[]}},"healthEvents":{"recentEvents":[]},"weight":{"series":[]},"medical":{"recentVisits":[]},"medications":{"active":[]},"vaccinations":{"latest":None},"dewormings":{"latest":None}}
    base.update(overrides); return base

def test_multiple_symptoms_and_deterministic():
    now=datetime.now(timezone.utc)
    c=ctx(healthEvents={"recentEvents":[{"type":"vomiting","occurredAt":now},{"type":"low_appetite","occurredAt":now},{"type":"low_energy","occurredAt":now}]})
    a=monitor(c).alerts; b=monitor(c).alerts
    assert any(x.type=="multiple_recent_symptoms" for x in a)
    assert [(x.id,x.type) for x in a]==[(x.id,x.type) for x in b]

def test_streak_non_trigger():
    c=ctx(dailyLogs={"food":{"recent":["low","normal","low"]},"water":{"recent":[]},"energy":{"recent":[]},"stool":{"recent":[]}})
    assert not any(x.type=="food_low_streak" for x in monitor(c).alerts)

def test_due_and_medication_rules():
    now=datetime.now(timezone.utc)
    c=ctx(medications={"active":[{"name":"藥物A","endDate":(now+timedelta(days=1)).date().isoformat()}]},vaccinations={"latest":{"vaccineName":"疫苗","nextDueAt":now+timedelta(days=3)}},dewormings={"latest":None})
    types={x.type for x in monitor(c).alerts}; assert "medication_ending_soon" in types and "vaccination_due" in types
