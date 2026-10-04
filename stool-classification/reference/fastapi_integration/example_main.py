"""最小可執行範例：STOOL_MODEL_DIR=<模型資料夾> uvicorn example_main:app --port 8000

既有後端只需要參考其中兩處：lifespan 內呼叫 load_stool_classifier(app)，以及 app.include_router(router)。
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI

from stool_classifier import load_stool_classifier, router


@asynccontextmanager
async def lifespan(app: FastAPI):
    load_stool_classifier(app)   # 啟動時載入一次
    yield


app = FastAPI(lifespan=lifespan)
app.include_router(router)
