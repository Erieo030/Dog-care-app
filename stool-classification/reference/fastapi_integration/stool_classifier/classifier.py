"""MEGO 糞便外觀分類：ONNX 模型載入與 CPU 推論。

只依賴 onnxruntime、numpy、Pillow。前處理必須與 model_meta.json 及訓練時完全一致，
不要自行更改縮放方式、正規化或自動對比設定。
"""
from __future__ import annotations

import hashlib
import io
import json
from pathlib import Path

import numpy as np
import onnxruntime as ort
from PIL import Image, ImageOps, UnidentifiedImageError

# App 顯示用的溫和外觀描述，不是診斷。上線前請指導者確認用詞。
# 注意：Lack-of-Water 只是資料集的類別名稱，不可顯示成「缺水」。
DISPLAY_ZH = {
    "Diarrhea": "稀軟水狀",
    "Lack-of-Water": "偏乾硬",
    "Normal": "成形",
    "Soft-Poop": "偏軟",
}

ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}
MIN_SIDE = 64                 # 太小的影像無法判斷
MAX_PIXELS = 40_000_000       # 防止解壓縮炸彈；一般手機照片約 12–48 MP，App 端應先縮圖


class InvalidImageError(ValueError):
    """上傳內容不是可用的影像。status_code 供 API 層對應 HTTP 狀態碼。"""

    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.status_code = status_code


class StoolClassifier:
    def __init__(self, model_dir: str | Path, threads: int = 1, verify_hash: bool = True):
        model_dir = Path(model_dir)
        self.meta = json.loads((model_dir / "model_meta.json").read_text(encoding="utf-8"))
        onnx_path = model_dir / "model.onnx"

        if verify_hash:
            expected = self.meta["export"]["onnx_sha256"]
            actual = hashlib.sha256(onnx_path.read_bytes()).hexdigest()
            if actual != expected:
                raise RuntimeError(f"model.onnx 雜湊不符：預期 {expected[:12]}…，實際 {actual[:12]}…")

        so = ort.SessionOptions()
        so.intra_op_num_threads = threads
        so.inter_op_num_threads = 1
        self.session = ort.InferenceSession(str(onnx_path), so, providers=["CPUExecutionProvider"])

        self.classes: list[str] = self.meta["class_order"]
        self.input_name: str = self.meta["input"]["name"]
        if self.session.get_inputs()[0].name != self.input_name:
            raise RuntimeError("ONNX 輸入名稱與 model_meta.json 不符")
        if self.session.get_outputs()[0].shape[-1] != len(self.classes):
            raise RuntimeError("ONNX 輸出類別數與 model_meta.json 不符")

        pp = self.meta["preprocess"]
        self.height, self.width = pp["input_size"]
        self.mean = np.array(pp["mean"], dtype=np.float32)
        self.std = np.array(pp["std"], dtype=np.float32)
        self.autocontrast = bool(pp.get("autocontrast", True))
        self.threshold = float(self.meta["low_confidence_threshold"])
        self.version: str = self.meta["model_version"]

        self.session.run(None, {self.input_name: np.zeros((1, 3, self.height, self.width), np.float32)})  # 暖機

    @staticmethod
    def decode(data: bytes) -> Image.Image:
        """位元組 -> 轉正後的 RGB 影像；不合格時拋出 InvalidImageError。"""
        if not data:
            raise InvalidImageError("檔案是空的")
        try:
            im = Image.open(io.BytesIO(data))
            fmt = im.format
            w, h = im.size
            if fmt not in ALLOWED_FORMATS:
                raise InvalidImageError(f"不支援的影像格式：{fmt}（支援 JPEG、PNG、WEBP）", 415)
            if w * h > MAX_PIXELS:
                raise InvalidImageError(f"影像太大（{w}x{h}），請先縮圖", 413)
            if min(w, h) < MIN_SIDE:
                raise InvalidImageError(f"影像太小（{w}x{h}）")
            im = ImageOps.exif_transpose(im)
            return im.convert("RGB")
        except InvalidImageError:
            raise
        except (UnidentifiedImageError, Image.DecompressionBombError, OSError, SyntaxError, ValueError) as e:
            raise InvalidImageError(f"無法讀取影像：{e.__class__.__name__}", 415 if isinstance(e, UnidentifiedImageError) else 400)

    def preprocess(self, im: Image.Image) -> np.ndarray:
        """與部署包 preprocess.py 相同：自動對比 -> 直接縮放 224x224（不裁切）-> /255 -> 正規化 -> NCHW。"""
        if self.autocontrast:
            im = ImageOps.autocontrast(im)
        im = im.resize((self.width, self.height), Image.BILINEAR)
        x = np.asarray(im, dtype=np.float32) / 255.0
        x = (x - self.mean) / self.std
        return np.ascontiguousarray(x.transpose(2, 0, 1)[None])

    def predict_image(self, im: Image.Image) -> dict:
        probs = self.session.run(None, {self.input_name: self.preprocess(im)})[0][0]
        i = int(np.argmax(probs))
        confidence = float(probs[i])
        low = confidence < self.threshold
        label = None if low else self.classes[i]
        return {
            "status": "low_confidence" if low else "ok",
            "label": label,
            "label_display": DISPLAY_ZH.get(label) if label else None,
            "message": "無法判斷，請重拍或手動選擇" if low else None,
            "confidence": round(confidence, 4),
            "probs": {c: round(float(p), 4) for c, p in zip(self.classes, probs)},
            "threshold": self.threshold,
            "model_version": self.version,
        }

    def predict_bytes(self, data: bytes) -> dict:
        return self.predict_image(self.decode(data))
