import asyncio
import os

from fastapi import APIRouter, Query
from app.schemas.chat import ChatRequest
from app.services.ai_context_service import build_context
from app.services.health_monitor_service import monitor
from app.schemas.ai import AIContext
router=APIRouter(tags=["ai"] )

@router.get("/ai/usage")
def usage(user_id: str = Query(alias="userId")):
    from app.services.ai_usage_service import get_usage
    return {"success": True, "message": "AI 用量已取得", "data": get_usage(user_id)}
@router.get("/pets/{pet_id}/ai/context")
def context(pet_id:str,user_id:str=Query(alias="userId"),range_days:int=Query(default=30,alias="range")):
    return {"success":True,"message":"健康資料 context 已產生","data":build_context(pet_id,user_id,range_days)}
@router.get("/pets/{pet_id}/ai/health-monitor")
def health_monitor(pet_id:str,user_id:str=Query(alias="userId"),range_days:int=Query(default=30,alias="range")):
    result=monitor(build_context(pet_id,user_id,range_days))
    return {"success":True,"message":"健康觀察已完成","data":result.model_dump()}

@router.get("/pets/{pet_id}/ai/summary")
async def summary(pet_id: str, user_id: str = Query(alias="userId"), range_days: int = Query(default=30, alias="range")):
    from app.services.ai.factory import get_llm_provider
    from app.services.ai.summary_service import HealthSummaryService
    provider = get_llm_provider()
    llm_candidate = getattr(provider, "available", False)
    usage = None
    if llm_candidate:
        from app.services.ai_usage_service import consume
        usage = consume(user_id)
    context_data = build_context(pet_id, user_id, range_days)
    result = monitor(context_data)
    context = AIContext.model_validate(context_data)
    summary_result = await HealthSummaryService(provider).generate(context, result)
    if llm_candidate:
        from app.services.ai_usage_service import finalize
        usage = finalize(user_id, summary_result.fallbackUsed, len(summary_result.summary) // 4)
    return {"success": True, "message": "健康摘要已產生", "data": {**summary_result.model_dump(mode="json"), "usage": usage}}

@router.post("/pets/{pet_id}/ai/chat")
async def chat(pet_id: str, payload: ChatRequest, user_id: str = Query(alias="userId")):
    message = payload.message.strip()
    if not message:
        from fastapi import HTTPException
        raise HTTPException(status_code=422, detail="message 不可為空白")
    from app.services.ai.chat_service import ChatService, classify
    from app.services.ai.factory import get_llm_provider
    provider = get_llm_provider()
    intent = classify(message)
    # 未命中照護紀錄關鍵字時，以一般 AI 問題處理，不載入毛孩 context。
    if intent == "unknown":
        usage = None
        if getattr(provider, "available", False):
            from app.services.ai_usage_service import consume
            usage = consume(user_id)
        answer = await ChatService(provider).answer_general(message)
        answer["conversationId"] = payload.conversationId
        if usage is not None:
            from app.services.ai_usage_service import finalize
            usage = finalize(user_id, answer.get("fallbackUsed", False), (len(message) + len(answer.get("answer", ""))) // 4)
            answer["usage"] = usage
        return {"success": True, "message": "Chat 回覆已產生", "data": answer}
    # 明確資料查詢維持零模型用量；只有健康摘要才進入 LLM。
    llm_candidate = intent in {"health_summary", "health_monitor"} and getattr(provider, "available", False)
    usage = None
    if llm_candidate:
        from app.services.ai_usage_service import consume
        usage = consume(user_id)
    context_data = build_context(pet_id, user_id, payload.range)
    result = monitor(context_data)
    context = AIContext.model_validate(context_data)
    answer = await ChatService(provider).answer(message, context, result)
    answer["conversationId"] = payload.conversationId
    if llm_candidate:
        from app.services.ai_usage_service import finalize
        usage = finalize(user_id, answer.get("fallbackUsed", False), (len(message) + len(answer.get("answer", ""))) // 4)
    if usage is not None:
        answer["usage"] = usage
    return {"success": True, "message": "Chat 回覆已產生", "data": answer}

@router.get("/pets/{pet_id}/ai/vet-brief")
async def vet_brief(pet_id: str, user_id: str = Query(alias="userId"), range_days: int = Query(default=7, alias="range"), include_narrative: bool = Query(default=False, alias="includeNarrative"), sections: str | None = Query(default=None)):
    from app.services.ai.vet_brief_service import build_vet_brief, filter_context_for_vet, parse_vet_sections
    from app.services.ai.factory import get_llm_provider
    from app.services.ai.summary_service import HealthSummaryService
    from app.services.ai_context_service import build_context
    from app.services.health_monitor_service import monitor
    try:
        selected_sections = parse_vet_sections(sections)
    except ValueError as exc:
        from fastapi import HTTPException
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    context_data = filter_context_for_vet(build_context(pet_id, user_id, range_days), selected_sections)
    context = AIContext.model_validate(context_data)
    monitor_result = monitor(context_data)
    brief = build_vet_brief(pet_id, user_id, range_days, context_data, monitor_result, selected_sections)
    usage = None
    if include_narrative:
        provider = get_llm_provider()
        generator = HealthSummaryService(provider)
        narrative = generator.get_cached(context, monitor_result, purpose="vet")
        reserved = False
        if narrative is None and getattr(provider, "available", False) and generator._has_data(context):
            from app.services.ai_usage_service import consume
            usage = consume(user_id)
            reserved = True
        if narrative is None:
            try:
                timeout = max(5, float(os.getenv("AI_VET_BRIEF_TIMEOUT_SECONDS", "15")))
                narrative = await asyncio.wait_for(generator.generate(context, monitor_result, purpose="vet"), timeout=timeout)
            except TimeoutError:
                narrative = generator._fallback(context, monitor_result)
        if reserved:
            from app.services.ai_usage_service import finalize
            usage = finalize(user_id, narrative.fallbackUsed, len(narrative.summary) // 4)
        brief.generatedSummary = narrative.summary
        brief.generationMode = "fallback" if narrative.fallbackUsed else "llm"
    return {"success": True, "message": "就醫前摘要已產生", "data": {**brief.model_dump(mode="json"), "usage": usage}}
