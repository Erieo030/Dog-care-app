from datetime import datetime, timezone
import asyncio
from app.schemas.ai import AIContext, AIPeriod, HealthMonitorResult
from app.services.ai.summary_service import HealthSummaryService
from app.services.ai.vet_brief_service import filter_context_for_vet

class MockProvider:
    available = True
    name = "mock"
    model = "mock-model"
    def __init__(self, response=None, error=None): self.response, self.error, self.last_messages = response, error, None
    async def generate_structured(self, messages):
        self.last_messages = messages
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


def test_vet_provider_timeout_uses_non_ai_fallback():
    service = HealthSummaryService(MockProvider(error=TimeoutError("provider timeout")))
    result = asyncio.run(service.generate(context(), monitor(), purpose="vet", force_refresh=True))
    assert result.fallbackUsed is True
    assert result.provider == "deterministic"
    assert result.summary.startswith("AI 暫時無法整理")


def test_vet_unstructured_provider_response_uses_non_ai_fallback():
    service = HealthSummaryService(MockProvider({"answer": "not structured", "_unstructured": True}))
    result = asyncio.run(service.generate(context(), monitor(), purpose="vet", force_refresh=True))
    assert result.fallbackUsed is True
    assert result.provider == "deterministic"
    assert result.summary.startswith("AI 暫時無法整理")

def test_no_data_skips_provider():
    service=HealthSummaryService(MockProvider(error=AssertionError("must not call")))
    empty=context(); empty.weight={}; empty.dailyLogs={"recordCount":0};
    result=asyncio.run(service.generate(empty, monitor(), force_refresh=True))
    assert result.fallbackUsed is True
    assert "紀錄較少" in result.summary


def test_no_data_vet_summary_is_clearly_non_ai_and_does_not_call_provider():
    service = HealthSummaryService(MockProvider(error=AssertionError("must not call")))
    empty = context()
    empty.weight = {"recordCount": 0}
    empty.dailyLogs = {"recordCount": 0}
    empty.healthEvents = {"totalCount": 0}
    empty.medical = {"visitCount": 0}
    empty.medications = {"active": []}
    empty.vaccinations = {"latest": None}
    empty.dewormings = {"latest": None}
    empty.reminders = {"pendingCount": 0}
    result = asyncio.run(service.generate(empty, monitor(), purpose="vet", force_refresh=True))
    assert result.fallbackUsed is True
    assert result.provider == "deterministic"
    assert "紀錄較少" in result.summary


def test_vet_narrative_uses_selected_data_timeline_and_structured_sections():
    data = context()
    data.pet.update({"allergies": "雞肉", "chronicDiseases": "皮膚炎"})
    data.weight.update({"series": [{"measuredAt": "2026-09-20", "weightKg": 8.2}]})
    data.dailyLogs.update({"recent": [{"loggedAt": "2026-09-20", "foodLevel": "low"}]})
    data.healthEvents.update({"recentEvents": [{"occurredAt": "2026-09-20", "summary": "嘔吐"}]})
    response = {
        "summary": "近一週記錄到一次嘔吐，期間食量偏少；毛孩另有已登記的雞肉過敏與皮膚炎。",
        "highlights": ["9/20 記錄嘔吐及食量偏少。", "9/20 記錄嘔吐及食量偏少。"],
        "vetQuestions": ["這次嘔吐需要觀察哪些狀況？"],
        "dataGaps": ["尚未記錄嘔吐後是否再次發生。"],
    }
    provider = MockProvider(response)
    sections = {"health", "daily"}
    filtered_data = filter_context_for_vet(data.model_dump(mode="python"), sections)
    filtered = AIContext.model_validate(filtered_data)
    result = asyncio.run(HealthSummaryService(provider).generate(
        filtered, monitor(), purpose="vet", selected_sections=sections,
    ))

    sent_data = provider.last_messages[1]["content"]
    assert '"allergies": "雞肉"' in sent_data
    assert '"series"' in sent_data and '"recent"' in sent_data
    assert '"selectedSections": ["daily", "health"]' in sent_data
    assert '"weightKg": 8.2' not in sent_data
    assert result.vetQuestions == response["vetQuestions"]
    assert result.dataGaps == response["dataGaps"]
    assert result.highlights == ["9/20 記錄嘔吐及食量偏少。"]
