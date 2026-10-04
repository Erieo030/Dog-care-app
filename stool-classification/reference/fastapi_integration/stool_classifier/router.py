"""FastAPI 路由：POST /api/v1/stool/classify（multipart/form-data，欄位名稱 file）。

上傳的照片只在記憶體中處理，推論後即丟棄，不寫入磁碟、不保存。
"""
from __future__ import annotations

import os
from typing import Dict, Optional

from fastapi import APIRouter, File, FastAPI, HTTPException, Request, UploadFile
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel

from .classifier import InvalidImageError, StoolClassifier

router = APIRouter(prefix="/api/v1/stool", tags=["stool-classifier"])

DISCLAIMER = "此結果為影像外觀分類，僅供照護紀錄參考，不是獸醫診斷。"


class ClassifyResponse(BaseModel):
    status: str                        # "ok" 或 "low_confidence"
    label: Optional[str]               # 低信心時為 null
    label_display: Optional[str]
    message: Optional[str]
    confidence: float
    probs: Dict[str, float]
    threshold: float
    model_version: str
    disclaimer: str = DISCLAIMER


def max_upload_bytes() -> int:
    return int(float(os.getenv("STOOL_MAX_UPLOAD_MB", "10")) * 1024 * 1024)


def load_stool_classifier(app: FastAPI) -> None:
    """在服務啟動時呼叫一次（lifespan），不要每次請求重新載入模型。"""
    app.state.stool_classifier = StoolClassifier(
        os.environ["STOOL_MODEL_DIR"],
        threads=int(os.getenv("STOOL_ORT_THREADS", "1")),
    )


@router.post("/classify", response_model=ClassifyResponse)
async def classify(request: Request, file: UploadFile = File(...)) -> dict:
    clf: Optional[StoolClassifier] = getattr(request.app.state, "stool_classifier", None)
    if clf is None:
        raise HTTPException(status_code=503, detail="分類模型尚未載入")

    limit = max_upload_bytes()
    try:
        data = await file.read(limit + 1)
    finally:
        await file.close()
    if len(data) > limit:
        raise HTTPException(status_code=413, detail=f"檔案超過 {limit // (1024 * 1024)} MB")

    try:
        result = await run_in_threadpool(clf.predict_bytes, data)   # 推論不阻塞 event loop
    except InvalidImageError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))
    finally:
        del data
    return {**result, "disclaimer": DISCLAIMER}
