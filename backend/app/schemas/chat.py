from typing import Literal
from pydantic import BaseModel, ConfigDict, Field


class ChatHistoryTurn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=1000)


class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    role: str = "general"
    message: str = Field(min_length=1, max_length=1000)
    range: Literal[7,30,90] = 30
    conversationId: str | None = None
    # Stateless server: the client sends only the active conversation's recent turns.
    history: list[ChatHistoryTurn] = Field(default_factory=list, max_length=10)
class ChatResponse(BaseModel):
    answer: str
    intent: str
    sources: list[dict] = Field(default_factory=list)
    knowledgeSources: list[dict] = Field(default_factory=list)
    fallbackUsed: bool
    provider: str
    model: str | None = None
    generationMode: str
    conversationId: str | None = None
    suggestions: list[str] = Field(default_factory=list)
