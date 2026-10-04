"""Generate a source-constrained answer from the active MEGO RAG index.

Prototype only: retrieved passages and the synthetic question are sent to the
configured model service. Returned source IDs are mapped back to stored URLs;
the model never supplies citation URLs directly.
"""
from __future__ import annotations

import argparse
import json
import os
import re
from typing import Any

try:  # Support both CLI execution and imports by the backend runtime.
    from .query_mongo_index import retrieve
    from .run_embedding_experiment import load_repo_env, post_json
except ImportError:  # pragma: no cover - direct script execution
    from query_mongo_index import retrieve
    from run_embedding_experiment import load_repo_env, post_json


SYSTEM_PROMPT = """你是 MEGO 的知識整理助手。只能根據提供的 EVIDENCE 回答，不可使用外部記憶補充事實，不可推測或杜撰。請在 citations 陣列只列出直接支持整體回答的來源，選擇足以支持內容的最少來源（通常 1 至 2 個），不要把所有提供的來源都列上；只能使用允許清單，不可創造來源、網址、標題或編號。answer 文字中不要插入 [S1] 等標記，來源會由 App 另列在「參考資料」。若 EVIDENCE 無法直接支持問題，answer 請說「目前整理的參考資料沒有直接說明這個問題。」並讓 citations 為空陣列。不得診斷、推測病因、提供藥物劑量或治療指示。用繁體中文，只輸出 JSON：{"answer":"...","citations":["S1"]}。"""
NO_EVIDENCE_ANSWER = "目前整理的參考資料沒有直接說明這個問題。"


def prepare_evidence(results: list[dict[str, Any]]) -> tuple[list[dict[str, str]], list[dict[str, Any]]]:
    sources_by_url: dict[str, dict[str, str]] = {}
    evidence = []
    for item in results:
        citation_ids = []
        for citation in item.get("citations", []):
            url = str(citation.get("url", "")).strip()
            if not url:
                continue
            if url not in sources_by_url:
                source_id = f"S{len(sources_by_url) + 1}"
                sources_by_url[url] = {
                    "source_id": source_id,
                    "title": str(citation.get("title") or item.get("document_title") or "參考來源"),
                    "url": url,
                    "kind": str(citation.get("kind") or "internal"),
                }
            citation_ids.append(sources_by_url[url]["source_id"])
        evidence.append({
            "document_title": str(item.get("document_title", "")),
            "section": str(item.get("section", "")),
            "text": str(item.get("text", "")),
            "source_ids": sorted(set(citation_ids)),
        })
    return list(sources_by_url.values()), evidence


def validate_answer_payload(payload: Any, allowed_ids: set[str]) -> dict[str, Any]:
    if not isinstance(payload, dict) or not isinstance(payload.get("answer"), str):
        raise ValueError("Model answer must contain a string answer field")
    answer = payload["answer"].strip()
    raw_citations = payload.get("citations")
    if not isinstance(raw_citations, list) or not all(isinstance(item, str) for item in raw_citations):
        raise ValueError("Model answer must contain a citations array")
    if not answer:
        raise ValueError("Model answer must not be empty")
    normalized_ids = [item.strip().strip("[]") for item in raw_citations]
    inline_ids = list(dict.fromkeys(re.findall(r"\[(S\d+)\]", answer)))
    invalid_ids = sorted((set(normalized_ids) | set(inline_ids)) - allowed_ids)
    if invalid_ids:
        raise ValueError(f"Generated answer contains unknown source IDs: {', '.join(invalid_ids)}")
    declared_ids = list(dict.fromkeys(normalized_ids))
    if answer == NO_EVIDENCE_ANSWER and not declared_ids and not inline_ids:
        return {"answer": answer, "citations": [], "invalid_citation_ids": []}
    if answer == NO_EVIDENCE_ANSWER:
        raise ValueError("No-evidence fallback must not include citations")
    if answer and not declared_ids:
        raise ValueError("Generated answer has no valid source citation")
    if inline_ids and not set(inline_ids).issubset(declared_ids):
        raise ValueError("Inline answer citations are missing from its citations array")
    return {"answer": answer, "citations": declared_ids, "invalid_citation_ids": []}


def parse_model_json(content: Any) -> dict[str, Any]:
    if isinstance(content, list):
        content = "".join(str(part.get("text", "")) for part in content if isinstance(part, dict))
    if not isinstance(content, str):
        raise ValueError("Model returned no text content")
    cleaned = re.sub(r"^\s*```(?:json)?\s*|\s*```\s*$", "", content.strip(), flags=re.IGNORECASE)
    parsed = json.loads(cleaned)
    if not isinstance(parsed, dict):
        raise ValueError("Model response JSON must be an object")
    return parsed


def generate_answer(question: str, retrieval_result: dict[str, Any]) -> dict[str, Any]:
    sources, evidence = prepare_evidence(retrieval_result.get("results", []))
    if not evidence or not sources:
        return {
            "answer": "目前整理的參考資料沒有直接說明這個問題。",
            "citations": [],
            "sources": [],
            "retrieval_method": retrieval_result.get("retrieval_method"),
            "index_version": retrieval_result.get("index_version"),
        }

    load_repo_env({"AI_MODEL_API_URL", "AI_MODEL_API_KEY", "AI_MODEL_NAME"})
    model = os.getenv("AI_MODEL_NAME", "").strip()
    if not model:
        raise RuntimeError("AI_MODEL_NAME is not configured in the repo-root .env")

    user_content = json.dumps({
        "question": question,
        "allowed_sources": sources,
        "evidence": evidence,
    }, ensure_ascii=False)
    result = post_json("/chat/completions", {
        "model": model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ],
        "temperature": 0,
        "response_format": {"type": "json_object"},
    }, service="chat")
    try:
        content = result["choices"][0]["message"].get("content")
    except (KeyError, IndexError, TypeError):
        raise RuntimeError("Model answer response shape is invalid") from None
    allowed_ids = {source["source_id"] for source in sources}
    validated = validate_answer_payload(parse_model_json(content), allowed_ids)
    sources_by_id = {source["source_id"]: source for source in sources}
    cited_sources = [sources_by_id[source_id] for source_id in validated["citations"]]
    return {
        "answer": validated["answer"],
        "citations": validated["citations"],
        "sources": cited_sources,
        "invalid_citation_ids": validated["invalid_citation_ids"],
        "retrieval_method": retrieval_result.get("retrieval_method"),
        "index_version": retrieval_result.get("index_version"),
        "model": result.get("model", model),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("question", help="Synthetic evaluation question; never include real user or pet data")
    args = parser.parse_args()
    retrieval_result = retrieve(args.question, limit=5)
    try:
        answer = generate_answer(args.question, retrieval_result)
    except (RuntimeError, ValueError) as error:
        answer = {
            "answer": "這次無法確認回答引用的來源，先不顯示生成內容。",
            "citations": [],
            "sources": [],
            "error": str(error),
        }
    print(json.dumps(answer, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
