"""執行：STOOL_MODEL_DIR=<解壓後的模型資料夾> pytest -q tests/test_stool_classifier.py"""
import importlib.util
import io
import os
from pathlib import Path

import numpy as np
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from PIL import Image

from stool_classifier import StoolClassifier, load_stool_classifier, router

MODEL_DIR = os.environ.get("STOOL_MODEL_DIR")
pytestmark = pytest.mark.skipif(not MODEL_DIR, reason="請設定 STOOL_MODEL_DIR")


@pytest.fixture(scope="module")
def clf():
    return StoolClassifier(MODEL_DIR)


@pytest.fixture(scope="module")
def client():
    app = FastAPI()
    app.include_router(router)
    load_stool_classifier(app)
    return TestClient(app)


def png_bytes(size=(256, 256), color=(120, 80, 40)):
    buf = io.BytesIO()
    Image.new("RGB", size, color).save(buf, format="PNG")
    return buf.getvalue()


def sample_bytes():
    return (Path(MODEL_DIR) / "sample.jpg").read_bytes()


def test_preprocess_matches_package(clf):
    """整合程式的前處理必須與部署包 preprocess.py 輸出完全相同。"""
    spec = importlib.util.spec_from_file_location("pkg_preprocess", Path(MODEL_DIR) / "preprocess.py")
    pkg = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(pkg)
    im = pkg.load_image(Path(MODEL_DIR) / "sample.jpg")
    np.testing.assert_array_equal(clf.preprocess(im), pkg.preprocess(im, clf.meta))


def test_predict_sample(clf):
    r = clf.predict_bytes(sample_bytes())
    assert r["status"] in {"ok", "low_confidence"}
    assert abs(sum(r["probs"].values()) - 1) < 1e-3
    assert list(r["probs"]) == clf.classes
    assert (r["label"] is None) == (r["status"] == "low_confidence")


def test_endpoint_ok(client):
    res = client.post("/api/v1/stool/classify", files={"file": ("sample.jpg", sample_bytes(), "image/jpeg")})
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["model_version"] and "disclaimer" in body


def test_not_an_image(client):
    res = client.post("/api/v1/stool/classify", files={"file": ("a.jpg", b"not an image", "image/jpeg")})
    assert res.status_code == 415


def test_empty_file(client):
    res = client.post("/api/v1/stool/classify", files={"file": ("a.jpg", b"", "image/jpeg")})
    assert res.status_code == 400


def test_too_small(client):
    res = client.post("/api/v1/stool/classify", files={"file": ("a.png", png_bytes((20, 20)), "image/png")})
    assert res.status_code == 400


def test_unsupported_format(client):
    buf = io.BytesIO()
    Image.new("RGB", (256, 256)).save(buf, format="BMP")
    res = client.post("/api/v1/stool/classify", files={"file": ("a.bmp", buf.getvalue(), "image/bmp")})
    assert res.status_code == 415


def test_too_large(client, monkeypatch):
    monkeypatch.setenv("STOOL_MAX_UPLOAD_MB", "0.001")
    res = client.post("/api/v1/stool/classify", files={"file": ("sample.jpg", sample_bytes(), "image/jpeg")})
    assert res.status_code == 413


def test_missing_file(client):
    assert client.post("/api/v1/stool/classify").status_code == 422


def test_model_not_loaded():
    app = FastAPI()
    app.include_router(router)
    res = TestClient(app).post("/api/v1/stool/classify", files={"file": ("a.png", png_bytes(), "image/png")})
    assert res.status_code == 503
