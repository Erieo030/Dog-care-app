"""Optional retrieval of public, curated dog-care references for MEGO AI."""
from __future__ import annotations

import asyncio
import logging
import os
from typing import Any

from rag_experiment.query_mongo_index import retrieve

logger = logging.getLogger(__name__)
DEFAULT_RAG_TOP_K = 3
MIN_RAG_TOP_K = 1
MAX_RAG_TOP_K = 10


def configured_rag_top_k() -> int:
    try:
        value = int(os.getenv("MEGO_RAG_TOP_K", str(DEFAULT_RAG_TOP_K)))
    except ValueError:
        return DEFAULT_RAG_TOP_K
    return min(MAX_RAG_TOP_K, max(MIN_RAG_TOP_K, value))

_CANINE_CUES = (
    "狗", "犬", "毛孩", "寵物", "獸醫", "疫苗", "狂犬病", "驅蟲", "寄生蟲",
    "心絲蟲", "跳蚤", "壁蝨", "飼料", "狗糧", "飲食", "營養", "體重", "體態",
    "便便", "大便", "糞便", "嘔吐", "腹瀉", "皮膚", "用藥", "藥物", "藥品",
    "誤食", "可以吃", "能吃", "症狀", "照護", "訓練", "品種", "幼犬", "成犬",
)


def is_canine_knowledge_question(question: str) -> bool:
    """Scope retrieval only; this never filters or rejects the chat question."""
    text = question.strip().lower()
    return bool(text) and any(cue in text for cue in _CANINE_CUES)


def build_knowledge_bundle(results: list[dict[str, Any]]) -> dict[str, Any]:
    """Create model-safe evidence and an allowlisted URL map from retrieved chunks."""
    source_by_url: dict[str, dict[str, str]] = {}
    evidence: list[dict[str, Any]] = []
    for item in results:
        source_ids: list[str] = []
        for citation in item.get("citations", []):
            url = str(citation.get("url", "")).strip()
            if not url.startswith(("https://", "http://")):
                continue
            if url not in source_by_url:
                source_id = f"R{len(source_by_url) + 1}"
                source_by_url[url] = {
                    "sourceId": source_id,
                    "title": str(citation.get("title") or "參考來源"),
                    "documentTitle": str(item.get("document_title") or "犬隻照護資料"),
                    "section": str(item.get("section") or ""),
                    "url": url,
                }
            source_ids.append(source_by_url[url]["sourceId"])
        text = str(item.get("text", "")).strip()
        if text and source_ids:
            evidence.append({
                "documentTitle": str(item.get("document_title", "")),
                "section": str(item.get("section", "")),
                "text": text,
                "sourceIds": list(dict.fromkeys(source_ids)),
            })
    return {
        "allowedSources": [{"sourceId": source["sourceId"], "title": source["title"]} for source in source_by_url.values()],
        "evidence": evidence,
        "sourceMap": {source["sourceId"]: source for source in source_by_url.values()},
    }


async def retrieve_canine_knowledge(question: str) -> list[dict[str, Any]]:
    """Retrieve public references with bounded waits; failures leave normal chat available."""
    enabled = os.getenv("MEGO_RAG_ENABLED", "true").strip().lower() not in {"0", "false", "no", "off"}
    if not enabled or not is_canine_knowledge_question(question):
        return []

    try:
        total_timeout = float(os.getenv("MEGO_RAG_TIMEOUT_SECONDS", "24"))
        total_timeout = min(max(total_timeout, 8), 40)
        model_timeout = max(1, (total_timeout - 5) / 2)
        result = await asyncio.wait_for(
            asyncio.to_thread(retrieve, question, configured_rag_top_k(), model_timeout),
            timeout=total_timeout,
        )
        return result.get("results", []) if isinstance(result, dict) else []
    except Exception as exc:
        logger.warning("MEGO RAG retrieval unavailable; continuing without references (%s)", type(exc).__name__)
        return []
