"""Retrieve source-attributed passages from the active local MEGO RAG index.

This prototype prints retrieved evidence and citations only; it does not call a
generative LLM and does not access user, pet, chat, or care-record collections.
"""
from __future__ import annotations

import argparse
import json
import math
import os
from typing import Any

from pymongo import MongoClient

try:  # Support both CLI execution and imports by the backend runtime.
    from .run_bm25_baseline import tokenize, bm25_scores
    from .run_embedding_experiment import configured_embedding_model, embed, load_repo_env, rerank
    from .build_mongo_index import CHUNK_COLLECTION, MANIFEST_COLLECTION, MANIFEST_ID
except ImportError:  # pragma: no cover - direct script execution
    from run_bm25_baseline import tokenize, bm25_scores
    from run_embedding_experiment import configured_embedding_model, embed, load_repo_env, rerank
    from build_mongo_index import CHUNK_COLLECTION, MANIFEST_COLLECTION, MANIFEST_ID


def cosine(left: list[float], right: list[float]) -> float:
    dot = sum(a * b for a, b in zip(left, right))
    norm_left = math.sqrt(sum(value * value for value in left))
    norm_right = math.sqrt(sum(value * value for value in right))
    return dot / (norm_left * norm_right) if norm_left and norm_right else 0.0


def reciprocal_rank_fusion(*rankings: list[int], constant: int = 60) -> dict[int, float]:
    scores: dict[int, float] = {}
    for ranking in rankings:
        for rank, index in enumerate(ranking, start=1):
            scores[index] = scores.get(index, 0.0) + 1 / (constant + rank)
    return scores


def retrieve(question: str, limit: int = 5, model_timeout_seconds: float = 60) -> dict[str, Any]:
    load_repo_env({
        "AI_MODEL_API_URL", "AI_MODEL_API_KEY",
        "AI_EMBEDDING_API_URL", "AI_EMBEDDING_API_KEY",
        "AI_RERANK_API_URL", "AI_RERANK_API_KEY",
        "AI_EMBEDDING_MODEL", "AI_RERANK_MODEL", "MONGO_URI", "MONGO_DB",
    })
    mongo_uri = os.getenv("MONGO_URI", "").strip()
    database_name = os.getenv("MONGO_DB", "").strip()
    if not mongo_uri or not database_name:
        raise RuntimeError("MONGO_URI and MONGO_DB must be configured in the repo-root .env")

    client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
    try:
        client.admin.command("ping")
        db = client[database_name]
        manifest = db[MANIFEST_COLLECTION].find_one({"_id": MANIFEST_ID})
        if not manifest or not manifest.get("activeVersion"):
            raise RuntimeError("No active MEGO RAG index; run build_mongo_index.py first")
        configured_model = configured_embedding_model()
        indexed_model = manifest.get("embeddingModel")
        if indexed_model and indexed_model != configured_model:
            raise RuntimeError(
                "Configured embedding model does not match the active index; rebuild the index first"
            )
        version = manifest["activeVersion"]
        chunks = list(db[CHUNK_COLLECTION].find(
            {"indexVersion": version},
            {"embedding": 1, "text": 1, "docId": 1, "documentTitle": 1,
             "section": 1, "citations": 1, "_id": 0},
        ))
    finally:
        client.close()

    if not chunks:
        raise RuntimeError("Active MEGO RAG index contains no chunks")
    dimensions = {len(chunk.get("embedding", [])) for chunk in chunks}
    if len(dimensions) != 1 or not dimensions or 0 in dimensions:
        raise RuntimeError("Active index has missing or inconsistent embeddings")

    query_vector = embed(
        [question], "", batch_size=1,
        request_timeout_seconds=model_timeout_seconds, max_attempts=1,
    )[0]
    if len(query_vector) != next(iter(dimensions)):
        raise RuntimeError("Query embedding dimensions do not match active index")

    bm25_values = bm25_scores([tokenize(str(chunk["text"])) for chunk in chunks], tokenize(question))
    bm25_order = sorted(range(len(chunks)), key=lambda index: (-bm25_values[index], index))
    vector_values = [cosine(query_vector, chunk["embedding"]) for chunk in chunks]
    vector_order = sorted(range(len(chunks)), key=lambda index: (-vector_values[index], index))
    fused = reciprocal_rank_fusion(bm25_order[:5], vector_order[:5])
    candidate_indices = sorted(fused, key=lambda index: (-fused[index], index))
    candidates = [chunks[index] for index in candidate_indices]

    method = "bm25+embedding+rrf+reranker"
    rerank_scores: list[float] | None
    try:
        ranked_candidate_indices, rerank_scores = rerank(
            question, candidates, request_timeout_seconds=model_timeout_seconds, max_attempts=1,
        )
        final_indices = [candidate_indices[index] for index in ranked_candidate_indices[:limit]]
        score_by_chunk = {
            candidate_indices[index]: score
            for index, score in zip(ranked_candidate_indices, rerank_scores)
        }
    except RuntimeError:
        # Retrieval remains usable if the optional reranker endpoint is down.
        method = "bm25+embedding+rrf (reranker unavailable)"
        final_indices = candidate_indices[:limit]
        score_by_chunk = {}

    retrieved = []
    for index in final_indices:
        chunk = chunks[index]
        retrieved.append({
            "document_id": chunk["docId"],
            "document_title": chunk["documentTitle"],
            "section": chunk["section"],
            "text": chunk["text"],
            "reranker_score": score_by_chunk.get(index),
            "citations": chunk["citations"],
        })
    return {"index_version": version, "retrieval_method": method, "results": retrieved}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("question", help="Synthetic evaluation question; not a user/pet record")
    parser.add_argument("--limit", type=int, default=5)
    parser.add_argument("--json", action="store_true", help="Print structured results for citation/UI prototyping")
    args = parser.parse_args()
    if not 1 <= args.limit <= 10:
        raise SystemExit("--limit must be between 1 and 10")

    result = retrieve(args.question, args.limit)
    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return
    print(f"檢索方式：{result['retrieval_method']}；索引版本：{result['index_version'][:12]}")
    for position, item in enumerate(result["results"], start=1):
        print(f"\n[{position}] {item['document_title']}｜{item['section']}")
        print(item["text"])
        for citation in item["citations"]:
            print(f"來源（{citation['kind']}）：{citation['url']}")


if __name__ == "__main__":
    main()
