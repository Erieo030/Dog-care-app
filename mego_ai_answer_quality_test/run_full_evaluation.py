#!/usr/bin/env python3
"""Run A/B chat evaluation in an isolated MongoDB database, then drop it."""
from __future__ import annotations

import json
import os
import secrets
import socket
import subprocess
import sys
import time
import uuid
from datetime import date, datetime
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen

from dotenv import dotenv_values
from pymongo import MongoClient

ROOT = Path(__file__).resolve().parent
PROJECT_ROOT = ROOT.parent
RUNNER = ROOT / "run_chat_evaluation.py"
PORT_A, PORT_B = 18101, 18102
sys.path.insert(0, str(PROJECT_ROOT / "backend"))
from rag_experiment.build_mongo_index import CHUNK_COLLECTION, MANIFEST_COLLECTION, MANIFEST_ID


def local_database_guard() -> None:
    config = dotenv_values(PROJECT_ROOT / ".env")
    parsed = urlparse(config.get("MONGO_URI") or "")
    if parsed.hostname not in {"localhost", "127.0.0.1"}:
        raise RuntimeError("Refusing evaluation: root .env must point to local MongoDB.")
    if not config.get("MONGO_DB"):
        raise RuntimeError("Refusing evaluation: root .env must define MONGO_DB.")


def prepare_isolated_database(database_name: str) -> dict:
    """Copy only the published RAG index; never copy user or pet data."""
    config = dotenv_values(PROJECT_ROOT / ".env")
    source_name = str(config.get("MONGO_DB") or "").strip()
    if not source_name or source_name == database_name or not database_name.startswith("mego_ai_eval_"):
        raise RuntimeError("Unsafe isolated database name/source configuration.")
    client = MongoClient(config["MONGO_URI"], serverSelectionTimeoutMS=5000)
    try:
        client.admin.command("ping")
        if database_name in client.list_database_names():
            raise RuntimeError("Unique evaluation database already exists; refusing to reuse it.")
        source, target = client[source_name], client[database_name]
        manifest = source[MANIFEST_COLLECTION].find_one({"_id": MANIFEST_ID})
        if not manifest or not manifest.get("activeVersion"):
            raise RuntimeError("No active published RAG index is available in local MongoDB.")
        chunks = list(source[CHUNK_COLLECTION].find({"indexVersion": manifest["activeVersion"]}))
        if not chunks or len(chunks) != int(manifest.get("chunkCount") or -1):
            raise RuntimeError("Active RAG index is empty or its manifest count does not match.")
        try:
            target[CHUNK_COLLECTION].insert_many(chunks, ordered=True)
            target[MANIFEST_COLLECTION].insert_one(manifest)
            target[CHUNK_COLLECTION].create_index([("indexVersion", 1), ("chunkId", 1)], unique=True)
        except Exception:
            client.drop_database(database_name)
            raise
        return {
            "source_db": source_name,
            "active_index": str(manifest["activeVersion"]),
            "chunk_count": len(chunks),
            "embedding_model": str(manifest.get("embeddingModel") or "unknown"),
        }
    finally:
        client.close()


def drop_isolated_database(database_name: str) -> None:
    if not database_name.startswith("mego_ai_eval_"):
        raise RuntimeError("Refusing to drop a database without the evaluation prefix.")
    config = dotenv_values(PROJECT_ROOT / ".env")
    client = MongoClient(config["MONGO_URI"], serverSelectionTimeoutMS=5000)
    try:
        client.drop_database(database_name)
    finally:
        client.close()


def port_is_free(port: int) -> bool:
    with socket.socket() as sock:
        return sock.connect_ex(("127.0.0.1", port)) != 0


def api_json(url: str, method: str = "GET", body: dict | None = None,
             token: str | None = None, timeout: int = 15) -> dict:
    headers = {"Accept": "application/json"}
    data = None
    if body is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(body, ensure_ascii=False).encode("utf-8")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    try:
        with urlopen(Request(url, data=data, headers=headers, method=method), timeout=timeout) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        raise RuntimeError(f"Local MEGO API returned HTTP {exc.code}") from None
    except (URLError, TimeoutError, OSError, json.JSONDecodeError) as exc:
        raise RuntimeError(f"Local MEGO API request failed ({type(exc).__name__})") from None
    if not isinstance(payload, dict) or payload.get("success") is False:
        raise RuntimeError("Local MEGO API returned an unsuccessful response")
    return payload


def start_backend(port: int, rag_enabled: bool, database_name: str, log_path: Path) -> subprocess.Popen:
    env = os.environ.copy()
    env["MEGO_RAG_ENABLED"] = "true" if rag_enabled else "false"
    env["MONGO_DB"] = database_name
    # This experiment evaluates chat/RAG only; do not let an unrelated, optional
    # stool-model path prevent the temporary API from starting.
    env["STOOL_MODEL_DIR"] = ""
    env["AI_DAILY_REQUEST_LIMIT_ENABLED"] = "false"
    env.setdefault("AI_DAILY_REQUEST_LIMIT", "20")
    log = log_path.open("x", encoding="utf-8")
    try:
        process = subprocess.Popen(
            [
                sys.executable, "-m", "uvicorn", "main:app", "--app-dir", "backend",
                "--host", "127.0.0.1", "--port", str(port), "--no-access-log",
            ],
            cwd=PROJECT_ROOT,
            env=env,
            stdout=log,
            stderr=subprocess.STDOUT,
        )
    except Exception:
        log.close()
        raise
    process._mego_log_handle = log  # keep the file open until the process exits
    base = f"http://127.0.0.1:{port}"
    for _ in range(60):
        if process.poll() is not None:
            handle = getattr(process, "_mego_log_handle", None)
            if handle:
                handle.close()
            raise RuntimeError(f"Isolated backend on port {port} exited during startup; see {log_path}")
        try:
            api_json(f"{base}/", timeout=2)
            return process
        except RuntimeError:
            time.sleep(1)
    process.terminate()
    process.wait(timeout=10)
    log.close()
    raise RuntimeError(f"Isolated backend on port {port} did not become ready; see {log_path}")


def stop_backend(process: subprocess.Popen | None) -> None:
    if process is None:
        return
    if process.poll() is None:
        process.terminate()
        try:
            process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait(timeout=5)
    handle = getattr(process, "_mego_log_handle", None)
    if handle:
        handle.close()


def delete_fixture_account(base_url: str, email: str, password: str, token: str) -> None:
    # Re-login first so cleanup still works when the evaluation outlasts a 15m token.
    login = api_json(
        f"{base_url}/api/login", method="POST",
        body={"email": email, "password": password},
    ).get("data", {})
    fresh_token = str(login.get("accessToken") or token)
    api_json(
        f"{base_url}/api/account/delete", method="POST",
        body={"password": password}, token=fresh_token,
    )


def main() -> int:
    batch = datetime.now().astimezone().strftime("%Y-%m-%d_answer_eval_%H%M%S")
    run_dir = ROOT / "runs" / batch
    run_dir.mkdir(parents=True, exist_ok=False)
    backend_a = backend_b = None
    fixture_base = None
    user_id = access_token = password = ""
    email = ""
    cleanup_status = "not_created"
    database_status = "not_created"
    eval_db = "mego_ai_eval_" + uuid.uuid4().hex
    exit_code = 1
    try:
        local_database_guard()
        if not port_is_free(PORT_A) or not port_is_free(PORT_B):
            raise RuntimeError(f"Evaluation ports {PORT_A}/{PORT_B} must be unused.")

        index_info = prepare_isolated_database(eval_db)
        database_status = "created"
        backend_a = start_backend(PORT_A, False, eval_db, run_dir / "backend_A.log")
        fixture_base = f"http://127.0.0.1:{PORT_A}"
        email = f"mego-eval-{secrets.token_hex(6)}@example.test"
        password = secrets.token_urlsafe(32)

        registered = api_json(
            f"{fixture_base}/api/register", method="POST",
            body={"email": email, "password": password},
        ).get("data", {})
        user_id = str(registered.get("userId") or "")
        access_token = str(registered.get("accessToken") or "")
        if not user_id or not access_token:
            raise RuntimeError("Temporary test account registration returned incomplete data.")
        cleanup_status = "created"

        pet_response = api_json(
            f"{fixture_base}/api/create-pet", method="POST", token=access_token,
            body={
                "userId": user_id,
                "name": "MEGO 評估測試犬",
                "gender": "male",
                "breed": "測試犬",
                "breedType": "unknown",
                "birthday": "",
                "arrivalDate": date.today().isoformat(),
                "neutered": False,
                "allergies": "",
                "chronicDiseases": "",
                "microchipNumber": "",
                "coatColor": "",
                "distinctiveFeatures": "",
            },
        ).get("data", {}).get("petData", {})
        pet_id = str(pet_response.get("_id") or "")
        if not pet_id:
            raise RuntimeError("Temporary test pet creation returned no pet id.")
        api_json(
            f"{fixture_base}/api/ai/data-consent?userId={user_id}",
            method="POST", token=access_token,
        )

        (run_dir / "env.md").write_text(
            "# A/B 聊天測試環境\n\n"
            f"- 開始時間：{datetime.now().astimezone().isoformat(timespec='seconds')}\n"
            f"- Git commit：{subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=PROJECT_ROOT, capture_output=True, text=True).stdout.strip() or 'unknown'}\n"
            f"- 文字模型：{dotenv_values(PROJECT_ROOT / '.env').get('AI_MODEL_NAME') or '依本機設定'}\n"
            f"- Embedding model：{index_info['embedding_model']}\n"
            f"- active RAG index：{index_info['active_index']}\n"
            f"- 本輪隔離資料庫：{eval_db}（只含 {index_info['chunk_count']} 個知識段落與 manifest；未複製使用者資料）\n"
            f"- RAG Top-K / RAG timeout / LLM timeout：{dotenv_values(PROJECT_ROOT / '.env').get('MEGO_RAG_TOP_K') or '3'} / {dotenv_values(PROJECT_ROOT / '.env').get('MEGO_RAG_TIMEOUT_SECONDS') or '24'} 秒 / {dotenv_values(PROJECT_ROOT / '.env').get('AI_MODEL_TIMEOUT_SECONDS') or '45'} 秒\n"
            f"- Embedding／Reranker：{dotenv_values(PROJECT_ROOT / '.env').get('AI_EMBEDDING_MODEL') or '未設定'}／{dotenv_values(PROJECT_ROOT / '.env').get('AI_RERANK_MODEL') or '未設定'}\n"
            "- A：MEGO_RAG_ENABLED=false；B：MEGO_RAG_ENABLED=true\n"
            "- Top-K：3；RAG timeout：24 秒；LLM timeout：60 秒\n"
            "- 每日 LLM 限額：測試伺服器程序內關閉\n"
            "- 測試帳號與毛孩：只建立於隔離資料庫，完成後清除；不保存 email、密碼、token 或 pet ID。\n"
            "- 對話：每題新請求、history 為空。\n",
            encoding="utf-8",
        )
        (run_dir / "fixture.md").write_text(
            "# 測試資料生命週期\n\n"
            f"- 建立本輪專用資料庫 `{eval_db}`，只複製目前發布中的 RAG 知識段落與 manifest。\n"
            "- 不複製、不讀取其他使用者、寵物或照護資料；臨時帳號與空白測試犬只存在於隔離 DB。\n"
            "- 測試完成後刪除本次專用帳號及其所有相依資料。\n",
            encoding="utf-8",
        )

        for condition, port, rag_enabled in (("A", PORT_A, False), ("B", PORT_B, True)):
            if condition == "B":
                backend_b = start_backend(PORT_B, True, eval_db, run_dir / "backend_B.log")
            env = os.environ.copy()
            env.update({
                "MEGO_EVAL_EMAIL": email,
                "MEGO_EVAL_PASSWORD": password,
                "MEGO_EVAL_PET_ID": pet_id,
                "MEGO_EVAL_BASE_URL": f"http://127.0.0.1:{port}",
                "MEGO_RAG_ENABLED": "true" if rag_enabled else "false",
            })
            print(f"Starting condition {condition} (RAG {'enabled' if rag_enabled else 'disabled'})", flush=True)
            completed = subprocess.run(
                [sys.executable, str(RUNNER), "--condition", condition, "--batch", batch],
                cwd=PROJECT_ROOT,
                env=env,
                check=False,
            )
            if completed.returncode:
                print(f"Condition {condition} exited with status {completed.returncode}", flush=True)

        # Both backends share only this run's scratch database and local auth secret.
        cleanup_api = fixture_base if backend_a and backend_a.poll() is None else f"http://127.0.0.1:{PORT_B}"
        delete_fixture_account(cleanup_api, email, password, access_token)
        cleanup_status = "deleted"
        (run_dir / "fixture.md").write_text(
            "# 測試資料生命週期\n\n"
            f"- 本輪隔離資料庫 `{eval_db}` 只包含 RAG 索引及本次臨時測試資料。\n"
            "- 每題為獨立請求，無聊天 history。\n"
            "- 完成後已透過帳號刪除 API 清理本次測試帳號及其毛孩、AI 用量、同意狀態與 session。\n"
            "- 未使用或更動原資料庫中的任何帳號、毛孩與照護資料。\n",
            encoding="utf-8",
        )
        errors = []
        for condition in ("A", "B"):
            path = run_dir / f"answers_{condition}.jsonl"
            if not path.exists():
                errors.append(f"answers_{condition}.jsonl missing")
                continue
            with path.open(encoding="utf-8") as handle:
                records = [json.loads(line) for line in handle if line.strip()]
            expected_count = 20 if condition == "A" else 40
            if len(records) != expected_count:
                errors.append(f"condition {condition}: expected {expected_count}, got {len(records)}")
            errors.extend(f"{condition}/{row.get('id')}: {row.get('error')}" for row in records if row.get("error"))
        (run_dir / "run_status.md").write_text(
            "# 執行狀態\n\n"
            f"- 暫存帳號清理：{cleanup_status}\n"
            f"- A/B 答案檔檢查：{'有錯誤' if errors else '筆數完整且無 API 錯誤'}\n"
            + ("- 問題：\n" + "".join(f"  - {item}\n" for item in errors) if errors else ""),
            encoding="utf-8",
        )
        exit_code = 1 if errors else 0
        print(f"Evaluation batch saved to {run_dir}; cleanup={cleanup_status}; issues={len(errors)}", flush=True)
    except KeyboardInterrupt:
        print("Interrupted; attempting temporary-account cleanup.", file=sys.stderr, flush=True)
        exit_code = 130
    except Exception as exc:
        print(f"Evaluation stopped: {exc}", file=sys.stderr, flush=True)
        exit_code = 1
    finally:
        if cleanup_status == "created" and fixture_base and user_id and password and access_token:
            try:
                delete_fixture_account(fixture_base, email, password, access_token)
                cleanup_status = "deleted"
                (run_dir / "fixture.md").write_text(
                    "# 測試資料生命週期\n\n"
                    "- 本次專用測試帳號清理成功，相關測試資料已一併刪除。\n"
                    "- 未使用或更動其他帳號、毛孩與照護資料。\n",
                    encoding="utf-8",
                )
            except Exception as exc:
                print(f"WARNING: temporary evaluation account cleanup failed ({type(exc).__name__}); see local API availability.", file=sys.stderr, flush=True)
        stop_backend(backend_b)
        stop_backend(backend_a)
        if database_status == "created":
            try:
                drop_isolated_database(eval_db)
                database_status = "dropped"
            except Exception as exc:
                database_status = "cleanup_failed"
                print(f"WARNING: isolated test database cleanup failed ({type(exc).__name__}); database={eval_db}", file=sys.stderr, flush=True)
        if run_dir.exists():
            status_path = run_dir / "run_status.md"
            prior = status_path.read_text(encoding="utf-8") if status_path.exists() else "# 執行狀態\n\n"
            status_path.write_text(prior + f"\n- 隔離測試資料庫清理：{database_status}\n", encoding="utf-8")
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
