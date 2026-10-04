"""MEGO 糞便外觀分類 — 部署用前處理（只依賴 Pillow 與 numpy）。設定來自 model_meta.json。"""
import numpy as np
from PIL import Image, ImageOps


def load_image(fp):
    """fp 可為檔案路徑或 file-like 物件。依 EXIF 轉正並轉成 RGB。"""
    im = Image.open(fp)
    im = ImageOps.exif_transpose(im)
    return im.convert("RGB")


def preprocess(im, meta):
    """PIL RGB 影像 -> float32 [1, 3, H, W]。"""
    pp = meta["preprocess"]
    if pp.get("autocontrast", True):
        im = ImageOps.autocontrast(im)
    h, w = pp["input_size"]
    im = im.resize((w, h), Image.BILINEAR)                      # 直接縮放，不裁切
    x = np.asarray(im, dtype=np.float32) / 255.0
    x = (x - np.array(pp["mean"], dtype=np.float32)) / np.array(pp["std"], dtype=np.float32)
    return np.ascontiguousarray(x.transpose(2, 0, 1)[None])
