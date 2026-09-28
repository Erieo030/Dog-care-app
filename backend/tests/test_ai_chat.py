import asyncio
from datetime import datetime, timezone
from app.schemas.ai import AIContext, AIPeriod, HealthMonitorResult
from app.services.ai.chat_service import ChatService, ChatSource, classify, general_context_data

def ctx():
    now=datetime.now(timezone.utc)
    return AIContext(pet={"petId":"p1","name":"Kuro","breed":"柴犬"},period=AIPeriod(days=30,startAt=now,endAt=now),weight={"recordCount":1,"latestWeightKg":8.4,"differenceKg":0.2},dailyLogs={"recordCount":2,"water":{"recordCount":2,"latest":"normal"},"food":{"recordCount":1,"latest":"low"},"energy":{"recordCount":0},"stool":{"recordCount":1,"latest":"soft"}},healthEvents={"totalCount":1,"recentEvents":[]},medical={"visitCount":0,"recentVisits":[]},medications={"active":[{"name":"藥A"}],"completedCount":0},vaccinations={"latest":{"vaccineName":"狂犬病","administeredAt":"2026-07-20","nextDueAt":"2027-07-20"}},dewormings={"latest":None},reminders={"pendingCount":1,"overdueCount":0})
def monitor():
    now=datetime.now(timezone.utc); return HealthMonitorResult(period=AIPeriod(days=30,startAt=now,endAt=now),alerts=[],summary={"total":0,"info":0,"attention":0,"urgent":0})
def test_intents():
    assert classify('最近體重如何？') == 'weight_trend'
    assert classify('今天有什麼提醒？') == 'reminder_today'
    assert classify('上次疫苗是什麼時候？') == 'vaccination_latest'
    assert classify('現在正在吃什麼藥？') == 'medication_active'
    assert classify('柴犬常見疾病') == 'unknown'
    assert classify('是不是腸胃炎') == 'unknown'
    assert classify('狗狗喝水少，平常一天要喝多少？') == 'unknown'
    assert classify('狗狗可以吃葡萄嗎？') == 'unknown'
    assert classify('這個藥通常有什麼用途與副作用？') == 'unknown'
    assert classify('狗狗呼吸急促，是不是心臟有問題？') == 'unknown'
    assert classify('明天是不是會下雨') == 'unknown'
def test_deterministic_answers_and_sources():
    result=asyncio.run(ChatService().answer('上次疫苗？',ctx(),monitor()))
    assert '狂犬病' in result['answer']; assert result['fallbackUsed'] is True; assert result['sources'][0]['type']=='vaccination'
class PetHealthQuestionProvider:
    available = True
    model = "test-model"

    async def generate_structured(self, messages):
        prompt = messages[0]["content"]
        assert "不得只因問題提到疾病、症狀、藥物或食物就拒絕回答" in prompt
        assert "不得替特定毛孩確診" in prompt
        assert "個人化藥量／療程" in prompt
        return {"answer": "藥物的一般用途可以說明；實際用量需由獸醫依毛孩狀況確認。"}, self.model


def test_pet_medical_question_reaches_llm_with_safety_guidance():
    question = '這個藥狗狗可以吃多少？'
    assert classify(question) == 'unknown'
    result = asyncio.run(ChatService(PetHealthQuestionProvider()).answer_general(question))
    assert '一般用途' in result['answer']
    assert result['fallbackUsed'] is False
    assert result['generationMode'] == 'llm'

class GeneralProvider:
    available = True
    model = "test-model"

    async def generate_structured(self, messages):
        assert "一般生活與知識問題" in messages[0]["content"]
        assert messages[1]["content"] == "幫我整理旅行清單"
        return {"answer": "可以，先依交通、住宿與行李分類。"}, self.model

def test_general_question_uses_llm():
    result = asyncio.run(ChatService(GeneralProvider()).answer_general("幫我整理旅行清單"))
    assert result["answer"].startswith("可以")
    assert result["intent"] == "general"
    assert result["fallbackUsed"] is False
    assert result["generationMode"] == "llm"


def test_general_context_is_opt_in_by_topic_and_scoped_to_relevant_records():
    context = ctx()
    context.pet.update({"allergies": "雞肉", "chronicDiseases": "皮膚炎"})
    data, sources = general_context_data("我家狗狗最近喝水狀況如何？", context, monitor())
    assert data is not None
    assert set(data["facts"]) == {"pet", "dailyLogs"}
    assert "allergies" not in data["facts"]["pet"]
    assert [source.type for source in sources] == ["pet", "daily_log"]
    food_data, _ = general_context_data("狗狗可以吃葡萄嗎？", context, monitor())
    assert food_data is not None
    assert food_data["facts"]["pet"]["allergies"] == "雞肉"
    assert general_context_data("幫我整理旅行清單", ctx(), monitor()) == (None, [])
    assert general_context_data("我的旅行清單要帶什麼？", ctx(), monitor()) == (None, [])
    assert general_context_data("一般止痛藥有哪些用途？", ctx(), monitor()) == (None, [])


class ContextualProvider:
    available = True
    model = "test-model"

    async def generate_structured(self, messages):
        prompt = messages[1]["content"]
        assert "MEGO_FACTS" in prompt
        assert '"latestWeightKg": 8.4' in prompt
        assert "ALLOWED_SOURCE_TYPES: pet, weight" in prompt
        return {"answer": "最近紀錄是 8.4 公斤。", "sourceTypes": ["weight", "made_up"]}, self.model


def test_general_answer_only_returns_validated_sources():
    context_data = {"facts": {"pet": {"name": "Kuro"}, "weight": {"latestWeightKg": 8.4}}, "allowedSourceTypes": ["pet", "weight"]}
    sources = [ChatSource(type="pet", label="毛孩資料"), ChatSource(type="weight", label="體重紀錄")]
    result = asyncio.run(ChatService(ContextualProvider()).answer_general("狗狗最近體重？", context_data, sources))
    assert result["sources"] == [{"type": "weight", "label": "體重紀錄", "recordId": None, "occurredAt": None}]
