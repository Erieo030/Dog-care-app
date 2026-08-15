from typing import Literal
from pydantic import BaseModel, Field
class ChatRequest(BaseModel):
    role: str = "general"
    message: str = Field(min_length=1, max_length=1000)
    range: Literal[7,30,90] = 30
    conversationId: str | None = None
class ChatResponse(BaseModel):
    answer: str; intent: str; sources: list[dict]; fallbackUsed: bool; provider: str; model: str | None = None; generationMode: str; conversationId: str | None = None; suggestions: list[str] = []
