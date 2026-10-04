from app.core import config
from app.services.ai.rag_context_service import configured_rag_top_k


def test_upload_size_setting_defaults_and_clamps(monkeypatch):
    monkeypatch.delenv("MEGO_UPLOAD_MAX_MB", raising=False)
    assert config._bounded_upload_max_mb() == 10

    monkeypatch.setenv("MEGO_UPLOAD_MAX_MB", "100")
    assert config._bounded_upload_max_mb() == 50

    monkeypatch.setenv("MEGO_UPLOAD_MAX_MB", "invalid")
    assert config._bounded_upload_max_mb() == 10


def test_attachment_storage_dir_resolves_relative_paths_from_repo_root(monkeypatch):
    monkeypatch.setenv("ATTACHMENT_STORAGE_DIR", "var/mego-attachments")
    assert config._attachment_storage_dir() == (config.PROJECT_ROOT / "var/mego-attachments").resolve()


def test_rag_top_k_defaults_and_clamps(monkeypatch):
    monkeypatch.delenv("MEGO_RAG_TOP_K", raising=False)
    assert configured_rag_top_k() == 3

    monkeypatch.setenv("MEGO_RAG_TOP_K", "0")
    assert configured_rag_top_k() == 1

    monkeypatch.setenv("MEGO_RAG_TOP_K", "50")
    assert configured_rag_top_k() == 10

    monkeypatch.setenv("MEGO_RAG_TOP_K", "invalid")
    assert configured_rag_top_k() == 3
