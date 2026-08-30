"""外部模型服務 client；模型不在 MEGO Backend 執行。"""
import json
import logging
import os
from typing import Any
try:
    import httpx
except ImportError:
    httpx = None
from .provider import ProviderError

AI_MODELS = {"TEXT": "gemma-4-26b-a4b"}
logger = logging.getLogger(__name__)


def _content_text(content: Any) -> str:
    if isinstance(content, list):
        return "".join(str(part.get("text", "")) for part in content if isinstance(part, dict)).strip()
    return str(content or "").strip()


def _parse_structured_content(content: Any) -> dict[str, Any]:
    text = _content_text(content)
    if not text:
        raise ProviderError("External model service returned empty content")
    fence = chr(96) * 3
    cleaned = text.replace(fence + "json", "").replace(fence + "JSON", "").replace(fence, "").strip()
    try:
        parsed = json.loads(cleaned)
        if isinstance(parsed, dict):
            return parsed
    except (json.JSONDecodeError, TypeError):
        logger.warning("External model returned non-JSON content; using text fallback (length=%s)", len(cleaned))
    return {"answer": cleaned, "_unstructured": True}


class ExternalModelService:
    name = "external_model_service"
    def __init__(self, base_url: str | None = None, api_key: str | None = None, timeout: float | None = None):
        self.base_url = (base_url or os.getenv("AI_MODEL_API_URL", os.getenv("MODEL_SERVICE_BASE_URL", ""))).rstrip("/")
        self.api_key = api_key if api_key is not None else os.getenv("AI_MODEL_API_KEY", os.getenv("MODEL_SERVICE_API_KEY", "")).strip()
        self.timeout = timeout or float(os.getenv("AI_MODEL_TIMEOUT_SECONDS", os.getenv("MODEL_SERVICE_TIMEOUT_SECONDS", "45")))
        self.text_model = os.getenv("AI_MODEL_NAME", os.getenv("MODEL_SERVICE_TEXT_MODEL", AI_MODELS["TEXT"]))

    @property
    def available(self) -> bool:
        return bool(self.base_url and self.api_key and httpx is not None)

    def _headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self.api_key}", "Accept": "application/json"}

    def _endpoint(self, path: str) -> str:
        # 同時支援 base URL 為 https://host 或 https://host/v1。
        root = self.base_url.rstrip("/")
        return f"{root}{path}" if root.endswith("/v1") else f"{root}/v1{path}"

    async def generate_structured(self, messages: list[dict[str, str]]) -> tuple[dict[str, Any], str | None]:
        if not self.available: raise ProviderError("External model service is not configured")
        payload = {"model": self.text_model, "messages": messages, "temperature": 0, "response_format": {"type": "json_object"}}
        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(self.timeout, connect=min(5, self.timeout))) as client:
                response = await client.post(self._endpoint("/chat/completions"), json=payload, headers={**self._headers(), "Content-Type": "application/json"})
        except (httpx.TimeoutException, httpx.RequestError) as exc:
            raise ProviderError("External model service request failed") from exc
        if response.status_code >= 400: raise ProviderError(f"External model service HTTP {response.status_code}", response.status_code)
        try:
            body=response.json()
            content=body["choices"][0]["message"].get("content")
            return _parse_structured_content(content), body.get("model")
        except ProviderError:
            raise
        except (KeyError, TypeError, ValueError) as exc:
            raise ProviderError("External model service response shape invalid") from exc
