#!/usr/bin/env python3
"""Run the answer-quality question bank against a local MEGO development API.

Credentials are accepted only from process environment variables and are never
written to result files. This runner intentionally rejects non-local API hosts.
"""
from __future__ import annotations

import argparse
import csv
import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode, urlparse
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent
PROJECT_ROOT = ROOT.parent
QUESTIONS = ROOT / "questions.csv"
RUNS = ROOT / "runs"
HTTP_TIMEOUT_SECONDS = 90


class APIError(RuntimeError):
    def __init__(self, message: str, status: int | None = None):
        super().__init__(message)
        self.status = status


def request_json(url: str, method: str = "GET", body: dict | None = None,
                 token: str | None = None) -> dict:
    headers = {"Accept": "application/json"}
    data = None
    if body is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(body, ensure_ascii=False).encode("utf-8")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = Request(url, data=data, headers=headers, method=method)
    try:
        with urlopen(request, timeout=HTTP_TIMEOUT_SECONDS) as response:
            parsed = json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        # Do not persist or print response bodies: they may contain user data.
        raise APIError(f"API returned HTTP {exc.code}", exc.code) from None
    except (URLError, TimeoutError, OSError, json.JSONDecodeError) as exc:
        raise APIError(f"Request failed ({type(exc).__name__})") from None
    if not isinstance(parsed, dict) or parsed.get("success") is False:
        raise APIError("API response was unsuccessful")
    return parsed


def local_base_url() -> str:
    value = os.getenv("MEGO_EVAL_BASE_URL", "http://127.0.0.1:8000").rstrip("/")
    parsed = urlparse(value)
    if parsed.scheme != "http" or parsed.hostname not in {"127.0.0.1", "localhost"}:
        raise APIError("For safety, MEGO_EVAL_BASE_URL must be a local http://localhost or 127.0.0.1 URL")
    return value


def load_questions() -> list[dict[str, str]]:
    with QUESTIONS.open(encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle))
    if len(rows) != 40 or any(not row.get("id") or not row.get("question") for row in rows):
        raise APIError("Question bank is malformed; expected 40 rows with id and question")
    return rows


def configured_rag_enabled() -> bool | None:
    value = os.getenv("MEGO_RAG_ENABLED")
    if value is None:
        env_file = PROJECT_ROOT / ".env"
        if env_file.exists():
            for line in env_file.read_text(encoding="utf-8").splitlines():
                key, separator, raw = line.partition("=")
                if separator and key.strip() == "MEGO_RAG_ENABLED":
                    value = raw.strip().strip("\"'")
                    break
    if value is None:
        return None
    return value.strip().lower() not in {"0", "false", "no", "off"}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--condition", choices=("A", "B"), required=True,
                        help="A: T1 only, with RAG disabled; B: T1 and T2, with RAG enabled")
    parser.add_argument("--batch", help="Optional batch folder name; defaults to current Taipei date/time")
    args = parser.parse_args()

    email = os.getenv("MEGO_EVAL_EMAIL", "").strip()
    password = os.getenv("MEGO_EVAL_PASSWORD", "")
    pet_id = os.getenv("MEGO_EVAL_PET_ID", "").strip()
    if not email or not password or not pet_id:
        print("Set MEGO_EVAL_EMAIL, MEGO_EVAL_PASSWORD, and MEGO_EVAL_PET_ID for a dedicated test account and empty test pet.", file=sys.stderr)
        return 2
    try:
        base_url = local_base_url()
        questions = load_questions()
        rag_enabled = configured_rag_enabled()
    except APIError as exc:
        print(str(exc), file=sys.stderr)
        return 2
    expected_rag = args.condition == "B"
    if rag_enabled is None or rag_enabled != expected_rag:
        expected_value = "true" if expected_rag else "false"
        print(f"Set MEGO_RAG_ENABLED={expected_value} in the backend environment and restart the API before this run.", file=sys.stderr)
        return 2

    selected = [row for row in questions if args.condition == "B" or row["test"] == "1"]
    batch = args.batch or datetime.now().astimezone().strftime("%Y-%m-%d_%H%M%S")
    output_dir = RUNS / batch
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / f"answers_{args.condition}.jsonl"
    if output_path.exists():
        print(f"Refusing to overwrite existing results: {output_path}", file=sys.stderr)
        return 2

    try:
        login = request_json(
            f"{base_url}/api/login", method="POST",
            body={"email": email, "password": password},
        ).get("data", {})
    except APIError as exc:
        print(f"Login failed: {exc}", file=sys.stderr)
        return 1
    user_id = str(login.get("userId") or "")
    access_token = str(login.get("accessToken") or "")
    refresh_token = str(login.get("refreshToken") or "")
    if not user_id or not access_token:
        print("Login response did not include userId/accessToken.", file=sys.stderr)
        return 1
    expires_at = time.monotonic() + int(login.get("expiresIn") or 900)

    def ensure_token() -> None:
        nonlocal access_token, refresh_token, expires_at
        if time.monotonic() < expires_at - 60:
            return
        if not refresh_token:
            raise APIError("Access token expired and no refresh token is available")
        refreshed = request_json(
            f"{base_url}/api/refresh", method="POST",
            body={"refreshToken": refresh_token},
        ).get("data", {})
        access_token = str(refreshed.get("accessToken") or "")
        refresh_token = str(refreshed.get("refreshToken") or "")
        expires_at = time.monotonic() + int(refreshed.get("expiresIn") or 900)
        if not access_token:
            raise APIError("Refresh response did not include accessToken")

    failures = 0
    with output_path.open("x", encoding="utf-8") as output:
        for row in selected:
            started = time.monotonic()
            result: dict = {}
            error = None
            for attempt in range(2):
                try:
                    ensure_token()
                    query = urlencode({"userId": user_id})
                    pet_path = quote(pet_id, safe="")
                    response = request_json(
                        f"{base_url}/api/pets/{pet_path}/ai/chat?{query}",
                        method="POST",
                        body={"message": row["question"], "history": [], "range": 30},
                        token=access_token,
                    )
                    result = response.get("data") or {}
                    error = None
                    break
                except APIError as exc:
                    if exc.status == 401 and attempt == 0 and refresh_token:
                        expires_at = 0
                        continue
                    error = str(exc)
                    if attempt == 0:
                        time.sleep(1)
            record = {
                "id": row["id"],
                "test": row["test"],
                "category": row["category"],
                "condition": args.condition,
                "question": row["question"],
                "keyPoints": row["key_points"],
                "expected": row["expected"],
                "retrievalTriggerExpected": row["retrieval_trigger_expected"],
                "answer": result.get("answer"),
                "knowledgeSources": result.get("knowledgeSources", []),
                "recordSources": result.get("sources", []),
                "fallbackUsed": result.get("fallbackUsed"),
                "provider": result.get("provider"),
                "model": result.get("model"),
                "seconds": round(time.monotonic() - started, 1),
                "error": error,
                "attempts": 2 if error else 1,
            }
            output.write(json.dumps(record, ensure_ascii=False) + "\n")
            output.flush()
            failures += bool(error)
            print(f"{row['id']}: {'ERROR ' + error if error else 'saved'}")
            time.sleep(1)

    print(f"Saved {len(selected)} answers to {output_path}; failures={failures}")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
