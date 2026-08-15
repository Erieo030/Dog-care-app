"""外部模型服務 client；模型不在 PawLog Backend 執行。"""
import os
from typing import Any
try:
    import httpx
except ImportError:
    httpx = None
from .provider import ProviderError

AI_MODELS = {"TEXT": "gemma-4-26b-a4b", "SPEECH_TO_TEXT": "whisper-large-v3"}

class ExternalModelService:
    name = "external_model_service"
    def __init__(self, base_url: str | None = None, api_key: str | None = None, timeout: float | None = None):
        self.base_url = (base_url or os.getenv("AI_MODEL_API_URL", os.getenv("MODEL_SERVICE_BASE_URL", ""))).rstrip("/")
        self.api_key = api_key if api_key is not None else os.getenv("AI_MODEL_API_KEY", os.getenv("MODEL_SERVICE_API_KEY", "")).strip()
        self.timeout = timeout or float(os.getenv("AI_MODEL_TIMEOUT_SECONDS", os.getenv("MODEL_SERVICE_TIMEOUT_SECONDS", "20")))
        self.text_model = os.getenv("AI_MODEL_NAME", os.getenv("MODEL_SERVICE_TEXT_MODEL", AI_MODELS["TEXT"]))
        self.speech_model = os.getenv("AI_SPEECH_MODEL_NAME", os.getenv("MODEL_SERVICE_SPEECH_MODEL", AI_MODELS["SPEECH_TO_TEXT"]))

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
            body=response.json(); content=body["choices"][0]["message"]["content"]
            import json
            text=str(content).strip().removeprefix("```json").removesuffix("```").strip()
            parsed=json.loads(text)
            if not isinstance(parsed, dict): raise ValueError("structured output is not an object")
            return parsed, body.get("model")
        except Exception as exc:
            raise ProviderError("External model service returned invalid JSON") from exc

    async def transcribe_audio(self, filename: str, content: bytes, content_type: str | None = None) -> str:
        if not self.available: raise ProviderError("External model service is not configured")
        files={"file": (filename, content, content_type or "application/octet-stream")}; data={"model": self.speech_model}
        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(self.timeout, connect=min(5, self.timeout))) as client:
                response=await client.post(self._endpoint("/audio/transcriptions"), data=data, files=files, headers=self._headers())
        except (httpx.TimeoutException, httpx.RequestError) as exc:
            raise ProviderError("External transcription service request failed") from exc
        if response.status_code >= 400: raise ProviderError(f"External transcription service HTTP {response.status_code}", response.status_code)
        try: return str(response.json()["text"]).strip()
        except Exception as exc: raise ProviderError("External transcription response invalid") from exc
