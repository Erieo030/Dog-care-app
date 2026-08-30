import asyncio
from datetime import datetime, timezone
from app.schemas.ai import AIContext, AIPeriod, HealthMonitorResult
from app.services.ai.chat_service import ChatService, classify

def ctx():
    now=datetime.now(timezone.utc)
    return AIContext(pet={"petId":"p1","name":"Kuro","breed":"柴犬"},period=AIPeriod(days=30,startAt=now,endAt=now),weight={"recordCount":1,"latestWeightKg":8.4,"differenceKg":0.2},dailyLogs={"recordCount":2,"water":{"recordCount":2,"latest":"normal"},"food":{"recordCount":1,"latest":"low"},"energy":{"recordCount":0},"stool":{"recordCount":1,"latest":3}},healthEvents={"totalCount":1,"recentEvents":[]},medical={"visitCount":0,"recentVisits":[]},medications={"active":[{"name":"藥A"}],"completedCount":0},vaccinations={"latest":{"vaccineName":"狂犬病","administeredAt":"2026-07-20","nextDueAt":"2027-07-20"}},dewormings={"latest":None},reminders={"pendingCount":1,"overdueCount":0})
def monitor():
    now=datetime.now(timezone.utc); return HealthMonitorResult(period=AIPeriod(days=30,startAt=now,endAt=now),alerts=[],summary={"total":0,"info":0,"attention":0,"urgent":0})
def test_intents():
    assert classify('最近體重如何？') == 'weight_trend'
    assert classify('上次疫苗？') == 'vaccination_latest'
    assert classify('現在吃什麼藥') == 'medication_active'
    assert classify('柴犬常見疾病') == 'unknown'
    assert classify('是不是腸胃炎') == 'medical_advice_request'
    assert classify('明天是不是會下雨') == 'unknown'
def test_deterministic_answers_and_sources():
    result=asyncio.run(ChatService().answer('上次疫苗？',ctx(),monitor()))
    assert '狂犬病' in result['answer']; assert result['fallbackUsed'] is True; assert result['sources'][0]['type']=='vaccination'
def test_safety_answer():
    result=asyncio.run(ChatService().answer('藥吃多少？',ctx(),monitor()))
    assert '無法' in result['answer']; assert result['intent']=='medical_advice_request'

class GeneralProvider:
    available = True
    model = "test-model"

    async def generate_structured(self, messages):
        assert "不限寵物主題" in messages[0]["content"]
        assert messages[1]["content"] == "幫我整理旅行清單"
        return {"answer": "可以，先依交通、住宿與行李分類。"}, self.model

def test_general_question_uses_llm():
    result = asyncio.run(ChatService(GeneralProvider()).answer_general("幫我整理旅行清單"))
    assert result["answer"].startswith("可以")
    assert result["intent"] == "general"
    assert result["fallbackUsed"] is False
    assert result["generationMode"] == "llm"
