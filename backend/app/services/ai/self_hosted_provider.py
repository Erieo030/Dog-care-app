"""PawLog 正式外部自建模型 Provider。"""
from .external_model_service import ExternalModelService

class SelfHostedProvider(ExternalModelService):
    name = "self_hosted"
