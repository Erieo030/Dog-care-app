import os
from .provider import LLMProvider
from .self_hosted_provider import SelfHostedProvider

def get_llm_provider() -> LLMProvider:
    provider = os.getenv("AI_PROVIDER", "self_hosted").strip().lower()
    if provider == "self_hosted":
        return SelfHostedProvider()
    # 不讓未知設定導致核心 API crash；回到目前正式 Provider。
    return SelfHostedProvider()
