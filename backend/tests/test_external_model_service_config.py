import asyncio

import app.services.ai.external_model_service as external_model_service
from app.services.ai.external_model_service import AI_MODELS, ExternalModelService


def test_external_model_service_reads_current_ai_environment(monkeypatch):
    monkeypatch.setenv("AI_MODEL_API_URL", "https://models.example/v1/")
    monkeypatch.setenv("AI_MODEL_API_KEY", "test-key")
    monkeypatch.setenv("AI_MODEL_TIMEOUT_SECONDS", "18")
    monkeypatch.setenv("AI_MODEL_NAME", "test-model")

    service = ExternalModelService()

    assert service.base_url == "https://models.example/v1"
    assert service.api_key == "test-key"
    assert service.timeout == 18
    assert service.text_model == "test-model"


def test_external_model_service_uses_chat_specific_endpoint_and_key(monkeypatch):
    monkeypatch.setenv("AI_MODEL_API_URL", "https://shared.example/v1")
    monkeypatch.setenv("AI_MODEL_API_KEY", "shared-key")
    monkeypatch.setenv("AI_CHAT_API_URL", "https://chat.example/v1")
    monkeypatch.setenv("AI_CHAT_API_KEY", "chat-key")

    service = ExternalModelService()

    assert service.base_url == "https://chat.example/v1"
    assert service.api_key == "chat-key"


def test_external_model_service_does_not_read_legacy_environment_names(monkeypatch):
    for name in ("AI_MODEL_API_URL", "AI_MODEL_API_KEY", "AI_MODEL_TIMEOUT_SECONDS", "AI_MODEL_NAME"):
        monkeypatch.delenv(name, raising=False)
    monkeypatch.delenv("AI_CHAT_API_URL", raising=False)
    monkeypatch.delenv("AI_CHAT_API_KEY", raising=False)
    monkeypatch.setenv("MODEL_SERVICE_BASE_URL", "https://legacy.example")
    monkeypatch.setenv("MODEL_SERVICE_API_KEY", "legacy-key")
    monkeypatch.setenv("MODEL_SERVICE_TIMEOUT_SECONDS", "99")
    monkeypatch.setenv("MODEL_SERVICE_TEXT_MODEL", "legacy-model")

    service = ExternalModelService()

    assert service.base_url == ""
    assert service.api_key == ""
    assert service.timeout == 45
    assert service.text_model == AI_MODELS["TEXT"]


def test_external_model_service_exposes_provider_prompt_token_usage(monkeypatch):
    class Response:
        status_code = 200

        @staticmethod
        def json():
            return {
                "model": "test-model",
                "choices": [{"message": {"content": '{"answer":"完成"}'}}],
                "usage": {"prompt_tokens": 12005, "completion_tokens": 10},
            }

    class Client:
        def __init__(self, *_args, **_kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *_args):
            return None

        async def post(self, *_args, **_kwargs):
            return Response()

    monkeypatch.setenv("AI_MODEL_API_URL", "https://models.example/v1")
    monkeypatch.setenv("AI_MODEL_API_KEY", "test-key")
    monkeypatch.setattr(external_model_service.httpx, "AsyncClient", Client)

    result, model = asyncio.run(
        ExternalModelService().generate_structured([{"role": "user", "content": "問題"}])
    )

    assert model == "test-model"
    assert result["_prompt_tokens"] == 12005
