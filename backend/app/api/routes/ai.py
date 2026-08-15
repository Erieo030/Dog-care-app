from fastapi import APIRouter, Query
from app.schemas.chat import ChatRequest
from fastapi import File, UploadFile
from app.services.ai_context_service import build_context
from app.services.health_monitor_service import monitor
router=APIRouter(tags=["ai"] )
@router.get("/pets/{pet_id}/ai/context")
def context(pet_id:str,user_id:str=Query(alias="userId"),range_days:int=Query(default=30,alias="range")):
    return {"success":True,"message":"健康資料 context 已產生","data":build_context(pet_id,user_id,range_days)}
@router.get("/pets/{pet_id}/ai/health-monitor")
def health_monitor(pet_id:str,user_id:str=Query(alias="userId"),range_days:int=Query(default=30,alias="range")):
    result=monitor(build_context(pet_id,user_id,range_days))
    return {"success":True,"message":"健康觀察已完成","data":result.model_dump()}

@router.get("/pets/{pet_id}/ai/summary")
async def summary(pet_id: str, user_id: str = Query(alias="userId"), range_days: int = Query(default=30, alias="range")):
    from app.services.ai.summary_service import HealthSummaryService
    context = build_context(pet_id, user_id, range_days)
    result = monitor(context)
    summary_result = await HealthSummaryService().generate(context, result)
    return {"success": True, "message": "健康摘要已產生", "data": summary_result.model_dump(mode="json")}

@router.post("/pets/{pet_id}/ai/chat")
async def chat(pet_id: str, payload: ChatRequest, user_id: str = Query(alias="userId")):
    message = payload.message.strip()
    if not message:
        from fastapi import HTTPException
        raise HTTPException(status_code=422, detail="message 不可為空白")
    from app.services.ai.chat_service import ChatService
    from app.services.ai.factory import get_llm_provider
    context = build_context(pet_id, user_id, payload.range)
    result = monitor(context)
    answer = await ChatService(get_llm_provider()).answer(message, context, result)
    answer["conversationId"] = payload.conversationId
    return {"success": True, "message": "Chat 回覆已產生", "data": answer}

@router.get("/pets/{pet_id}/ai/vet-brief")
async def vet_brief(pet_id: str, user_id: str = Query(alias="userId"), range_days: int = Query(default=7, alias="range")):
    from app.services.ai.vet_brief_service import build_vet_brief
    from app.services.ai.factory import get_llm_provider
    from app.services.ai.summary_service import HealthSummaryService
    from app.services.ai_context_service import build_context
    from app.services.health_monitor_service import monitor
    brief = build_vet_brief(pet_id, user_id, range_days)
    context = build_context(pet_id, user_id, range_days)
    narrative = await HealthSummaryService(get_llm_provider()).generate(context, monitor(context))
    brief.generatedSummary = narrative.summary
    brief.generationMode = "fallback" if narrative.fallbackUsed else "llm"
    return {"success": True, "message": "就醫前摘要已產生", "data": brief.model_dump(mode="json")}

@router.post("/ai/transcribe")
async def transcribe(file: UploadFile = File(...)):
    from fastapi import HTTPException
    from app.services.ai.factory import get_llm_provider
    try:
        content = await file.read()
        if not content or len(content) > 25 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="音訊檔案大小不符")
        text = await get_llm_provider().transcribe_audio(file.filename or "audio", content, file.content_type)
        return {"success": True, "message": "語音轉文字完成", "data": {"text": text}}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=503, detail="語音服務目前無法使用，請稍後再試")
