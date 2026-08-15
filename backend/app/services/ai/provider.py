from dataclasses import dataclass
from typing import Any, Protocol

class ProviderError(Exception):
    def __init__(self, message: str, status_code: int | None = None):
        super().__init__(message)
        self.status_code = status_code

class LLMProvider(Protocol):
    name: str
    model: str
    async def generate_structured(self, messages: list[dict[str, str]]) -> tuple[dict[str, Any], str | None]: ...
