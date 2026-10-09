"""糞便照片分類 API 測試；完整模型測試需設定 STOOL_MODEL_DIR。"""
import io
import os
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from PIL import Image

from app.api.routes import stool_classifications
from app.services import stool_classifier_service as svc

MODEL_DIR = os.environ.get("STOOL_MODEL_DIR", "").strip()
if MODEL_DIR:
    # start.sh 在 backend 啟動 API；測試使用相同路徑基準，不受 pytest 執行位置影響。
    MODEL_DIR = str((Path(__file__).resolve().parents[1] / MODEL_DIR).resolve())
needs_model = pytest.mark.skipif(not MODEL_DIR, reason="未設定 STOOL_MODEL_DIR")
URL = "/api/pets/pet-1/stool-classifications?userId=user-1"


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(stool_classifications, "ensure_owned_pet", lambda pet_id, user_id: None)
    app = FastAPI()
    app.include_router(stool_classifications.router, prefix="/api")
    return TestClient(app)


@pytest.fixture
def loaded(monkeypatch):
    monkeypatch.setattr(svc, "_classifier", svc.StoolClassifier(MODEL_DIR))


def image_bytes(size=(256, 256), fmt="PNG"):
    output = io.BytesIO()
    Image.new("RGB", size, (120, 80, 40)).save(output, format=fmt)
    return output.getvalue()


def post(client, data, name="photo.jpg", mime="image/jpeg"):
    return client.post(URL, files={"file": (name, data, mime)})


def test_model_not_loaded_returns_503(client, monkeypatch):
    monkeypatch.setattr(svc, "_classifier", None)
    assert post(client, image_bytes()).status_code == 503


def test_mapping_covers_existing_daily_stool_levels():
    assert set(svc.LABEL_TO_STOOL_LEVEL.values()) == {"hard", "normal", "soft", "watery"}


@needs_model
def test_sample_photo_returns_a_suggestion_not_a_record(client, loaded):
    response = post(client, (Path(MODEL_DIR) / "sample.jpg").read_bytes())
    assert response.status_code == 200, response.text
    data = response.json()["data"]
    assert data["status"] in {"ok", "low_confidence"}
    assert data["suggestedStoolLevel"] is None or data["suggestedStoolLevel"] in svc.LABEL_TO_STOOL_LEVEL.values()
    assert set(data["probabilities"]) == {"hard", "normal", "soft", "watery"}
    assert abs(sum(data["probabilities"].values()) - 1) < 1e-3
    assert "不是疾病診斷" in data["disclaimer"]


@needs_model
def test_preprocessing_matches_deployment_package(loaded):
    import importlib.util

    spec = importlib.util.spec_from_file_location("deployment_preprocess", Path(MODEL_DIR) / "preprocess.py")
    package = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(package)
    image = package.load_image(Path(MODEL_DIR) / "sample.jpg")
    classifier = svc.get_classifier()
    assert (classifier.preprocess(image) == package.preprocess(image, classifier.meta)).all()


@needs_model
@pytest.mark.parametrize(
    "data,expected_status",
    [
        (b"", 422),
        (b"not an image", 415),
        (image_bytes((20, 20)), 422),
        (image_bytes(fmt="BMP"), 415),
    ],
)
def test_invalid_photos_return_clear_client_errors(client, loaded, data, expected_status):
    assert post(client, data).status_code == expected_status


@needs_model
def test_oversized_photo_is_rejected(client, loaded, monkeypatch):
    monkeypatch.setattr(svc, "MAX_FILE_BYTES", 1000)
    sample = (Path(MODEL_DIR) / "sample.jpg").read_bytes()
    assert post(client, sample).status_code == 413
