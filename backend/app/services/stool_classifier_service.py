"""糞便外觀照片分類。圖片僅供即時推論，不保存、不送至 LLM。"""
from __future__ import annotations

import hashlib
import io
import json
import logging
import os
import threading
from pathlib import Path

import numpy as np
import onnxruntime as ort
from fastapi import HTTPException
from PIL import Image, ImageOps, UnidentifiedImageError
from app.core.config import get_settings

logger = logging.getLogger(__name__)

MAX_FILE_BYTES = get_settings().upload_max_mb * 1024 * 1024
ALLOWED_FORMATS = {"JPEG", "PNG"}
MIN_SIDE = 64
MAX_PIXELS = 40_000_000

# 資料集外觀標籤對應至 App 現有選項；此對應不代表疾病或成因判斷。
LABEL_TO_STOOL_LEVEL = {
    "Diarrhea": "watery",
    "Lack-of-Water": "hard",
    "Normal": "normal",
    "Soft-Poop": "soft",
}
STOOL_LEVEL_LABEL_ZH = {"hard": "偏硬", "normal": "正常", "soft": "偏軟", "watery": "水狀"}
DISCLAIMER = "此為照片外觀分類建議，請確認或修改後再儲存；不是疾病診斷。"


class StoolClassifier:
    def __init__(self, model_dir: str | Path, threads: int = 1):
        model_dir = Path(model_dir).expanduser().resolve()
        metadata_path = model_dir / "model_meta.json"
        onnx_path = model_dir / "model.onnx"
        self.meta = json.loads(metadata_path.read_text(encoding="utf-8"))
        expected_hash = self.meta["export"]["onnx_sha256"]
        actual_hash = hashlib.sha256(onnx_path.read_bytes()).hexdigest()
        if actual_hash != expected_hash:
            raise RuntimeError(
                f"model.onnx 雜湊不符：預期 {expected_hash[:12]}…，實際 {actual_hash[:12]}…"
            )

        options = ort.SessionOptions()
        options.intra_op_num_threads = max(1, threads)
        options.inter_op_num_threads = 1
        self.session = ort.InferenceSession(
            str(onnx_path), options, providers=["CPUExecutionProvider"]
        )
        self.classes: list[str] = self.meta["class_order"]
        if set(self.classes) != set(LABEL_TO_STOOL_LEVEL):
            raise RuntimeError(f"模型類別與對應表不符：{self.classes}")

        self.input_name: str = self.meta["input"]["name"]
        preprocess = self.meta["preprocess"]
        self.height, self.width = preprocess["input_size"]
        self.mean = np.asarray(preprocess["mean"], dtype=np.float32)
        self.std = np.asarray(preprocess["std"], dtype=np.float32)
        self.autocontrast = bool(preprocess.get("autocontrast", True))
        self.threshold = float(self.meta["low_confidence_threshold"])
        self.version: str = self.meta["model_version"]
        # Warm-up once at startup so the first user request avoids initialization latency.
        self.session.run(
            None,
            {self.input_name: np.zeros((1, 3, self.height, self.width), dtype=np.float32)},
        )

    @staticmethod
    def decode(data: bytes) -> Image.Image:
        if not data:
            raise HTTPException(status_code=422, detail="照片不可為空")
        try:
            image = Image.open(io.BytesIO(data))
            width, height = image.size
            if image.format not in ALLOWED_FORMATS:
                raise HTTPException(status_code=415, detail="只支援 JPG、JPEG、PNG 圖片")
            if width * height > MAX_PIXELS:
                raise HTTPException(status_code=413, detail="照片尺寸過大，請重新拍攝")
            if min(width, height) < MIN_SIDE:
                raise HTTPException(status_code=422, detail="照片太小，無法辨識")
            return ImageOps.exif_transpose(image).convert("RGB")
        except HTTPException:
            raise
        except UnidentifiedImageError as exc:
            raise HTTPException(status_code=415, detail="只支援 JPG、JPEG、PNG 圖片") from exc
        except (Image.DecompressionBombError, OSError, SyntaxError, ValueError) as exc:
            raise HTTPException(status_code=422, detail="無法讀取照片，請重新拍攝") from exc

    def preprocess(self, image: Image.Image) -> np.ndarray:
        if self.autocontrast:
            image = ImageOps.autocontrast(image)
        image = image.resize((self.width, self.height), Image.Resampling.BILINEAR)
        pixels = np.asarray(image, dtype=np.float32) / 255.0
        pixels = (pixels - self.mean) / self.std
        return np.ascontiguousarray(pixels.transpose(2, 0, 1)[None])

    def predict(self, data: bytes) -> dict:
        probabilities = self.session.run(
            None, {self.input_name: self.preprocess(self.decode(data))}
        )[0][0]
        index = int(np.argmax(probabilities))
        confidence = float(probabilities[index])
        low_confidence = confidence < self.threshold
        model_label = self.classes[index]
        level = None if low_confidence else LABEL_TO_STOOL_LEVEL[model_label]
        return {
            "status": "low_confidence" if low_confidence else "ok",
            "modelLabel": None if low_confidence else model_label,
            "suggestedStoolLevel": level,
            "suggestedStoolLabel": STOOL_LEVEL_LABEL_ZH[level] if level else None,
            "message": "無法判斷，請重拍或手動選擇" if low_confidence else None,
            "confidence": round(confidence, 4),
            "probabilities": {
                LABEL_TO_STOOL_LEVEL[label]: round(float(probability), 4)
                for label, probability in zip(self.classes, probabilities)
            },
            "threshold": self.threshold,
            "modelVersion": self.version,
            "disclaimer": DISCLAIMER,
        }


_classifier: StoolClassifier | None = None
_lock = threading.Lock()


def load_classifier() -> None:
    """載入一次模型；未設定路徑時只停用照片分類，不影響其他功能。"""
    global _classifier
    model_dir = os.getenv("STOOL_MODEL_DIR", "").strip()
    if not model_dir:
        logger.warning("STOOL_MODEL_DIR 未設定，照片辨識功能停用")
        return
    with _lock:
        _classifier = StoolClassifier(
            model_dir, threads=int(os.getenv("STOOL_ORT_THREADS", "1"))
        )
    logger.info("照片辨識模型已載入：%s", _classifier.version)


def get_classifier() -> StoolClassifier:
    if _classifier is None:
        raise HTTPException(status_code=503, detail="照片辨識功能暫時無法使用，請手動選擇")
    return _classifier
