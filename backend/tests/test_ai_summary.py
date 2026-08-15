from datetime import datetime, timezone
import asyncio
from app.schemas.ai import AIContext, AIPeriod, HealthMonitorResult
from app.services.ai.summary_service import HealthSummaryService

class MockProvider:
    available = True
    name = "mock"
    model = "mock-model"
    def __init__(self, response=None, error=None): self.response, self.error = response, error
    async def generate_structured(self, messages):
        assert "password" not in messages[1]["content"]
        if self.error: raise self.error
        return self.response, self.model

def context(has_data=True):
    now=datetime.now(timezone.utc)
    return AIContext(pet={"petId":"p1","name":"Kuro"}, period=AIPeriod(days=7,startAt=now,endAt=now), weight={"recordCount":1,"latestWeightKg":8.2}, dailyLogs={"recordCount":1,"water":{"recordCount":1},"food":{"recordCount":1},"energy":{"recordCount":1},"stool":{"recordCount":1}}, healthEvents={"totalCount":0}, medical={"visitCount":0}, medications={"active":[]}, vaccinations={"latest":None}, dewormings={"latest":None}, reminders={"pendingCount":0})

def monitor():
    now=datetime.now(timezone.utc)
    return HealthMonitorResult(period=AIPeriod(days=7,startAt=now,endAt=now), alerts=[], summary={"total":0,"info":0,"attention":0,"urgent":0})

def test_summary_provider_response_and_disclaimer():
    service=HealthSummaryService(MockProvider({"headline":"近 7 天摘要","summary":"紀錄摘要","highlights":["體重"],"attentionItems":[],"upcomingCare":[],"dataCoverage":"足夠"}))
    result=asyncio.run(service.generate(context(), monitor(), force_refresh=True))
    assert result.fallbackUsed is False
    assert result.provider == "self_hosted"
    assert result.disclaimer.startswith("此摘要")

def test_provider_failure_falls_back():
    service=HealthSummaryService(MockProvider(error=RuntimeError("offline")))
    result=asyncio.run(service.generate(context(), monitor(), force_refresh=True))
    assert result.fallbackUsed is True
    assert result.provider == "deterministic"

def test_no_data_skips_provider():
    service=HealthSummaryService(MockProvider(error=AssertionError("must not call")))
    empty=context(); empty.weight={}; empty.dailyLogs={"recordCount":0};
    result=asyncio.run(service.generate(empty, monitor(), force_refresh=True))
    assert result.fallbackUsed is True
    assert "紀錄較少" in result.summary
