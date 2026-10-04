"""Compare BM25, BGE-M3 embeddings, and BGE-M3 reranking on the local RAG set.

Sends only synthetic evaluation questions and curated knowledge snippets to the
configured model endpoint. It never reads user/pet records and keeps vectors in
memory only. Requires AI_MODEL_API_URL and AI_MODEL_API_KEY in the repo-root .env.
"""
from __future__ import annotations

import json
import math
import os
import argparse
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

try:  # Support both CLI execution and imports by the backend runtime.
    from .run_bm25_baseline import KNOWLEDGE, QUESTIONS, bm25_scores, parse_markdown, reciprocal_rank, tokenize
except ImportError:  # pragma: no cover - direct script execution
    from run_bm25_baseline import KNOWLEDGE, QUESTIONS, bm25_scores, parse_markdown, reciprocal_rank, tokenize

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_EMBEDDING_MODEL = "bge-m3-embedding"
DEFAULT_RERANKER_MODEL = "bge-m3-reranker"
EMBEDDING_BATCH_SIZE = 16


def load_repo_env(keys: set[str] | None = None) -> None:
    """Load an explicit allowlist of settings from the repo-root .env."""
    allowed = keys or {
        "AI_MODEL_API_URL", "AI_MODEL_API_KEY",
        "AI_CHAT_API_URL", "AI_CHAT_API_KEY",
        "AI_EMBEDDING_API_URL", "AI_EMBEDDING_API_KEY",
        "AI_RERANK_API_URL", "AI_RERANK_API_KEY",
        "AI_EMBEDDING_MODEL", "AI_RERANK_MODEL",
    }
    env_file = ROOT / ".env"
    if not env_file.exists():
        return
    for raw in env_file.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        if key in allowed and key not in os.environ:
            os.environ[key] = value.strip().strip('"').strip("'")


def configured_embedding_model() -> str:
    load_repo_env({"AI_EMBEDDING_MODEL"})
    return os.getenv("AI_EMBEDDING_MODEL", "").strip() or DEFAULT_EMBEDDING_MODEL


def configured_reranker_model() -> str:
    load_repo_env({"AI_RERANK_MODEL"})
    return os.getenv("AI_RERANK_MODEL", "").strip() or DEFAULT_RERANKER_MODEL


def model_api_config(service: str) -> tuple[str, str]:
    if service not in {"chat", "embedding", "rerank"}:
        raise ValueError(f"Unknown model service: {service}")
    load_repo_env()
    prefix = {"chat": "AI_CHAT", "embedding": "AI_EMBEDDING", "rerank": "AI_RERANK"}[service]
    base = (os.getenv(f"{prefix}_API_URL") or os.getenv("AI_MODEL_API_URL", "")).strip()
    key = (os.getenv(f"{prefix}_API_KEY") or os.getenv("AI_MODEL_API_KEY", "")).strip()
    return base.rstrip("/"), key


def api_root(service: str = "embedding") -> str:
    base, _ = model_api_config(service)
    if not base:
        raise RuntimeError(f"{service} model API URL is not configured")
    return base if base.endswith("/v1") else base + "/v1"


def post_json(
    path: str,
    payload: dict[str, Any],
    timeout_seconds: float = 60,
    max_attempts: int = 4,
    service: str = "embedding",
) -> dict[str, Any]:
    base, key = model_api_config(service)
    if not base:
        raise RuntimeError(f"{service} model API URL is not configured")
    if not key:
        raise RuntimeError(f"{service} model API key is not configured")
    request = urllib.request.Request(
        api_root(service) + path,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        method="POST",
    )
    if max_attempts < 1:
        raise ValueError("max_attempts must be positive")
    for attempt in range(max_attempts):
        try:
            with urllib.request.urlopen(request, timeout=timeout_seconds) as response:
                result = json.loads(response.read().decode("utf-8"))
            break
        except urllib.error.HTTPError as exc:
            # Retry transient rate limits; never print provider bodies, which may
            # echo submitted text or other sensitive request details.
            if exc.code == 429 and attempt + 1 < max_attempts:
                try:
                    retry_after = float(exc.headers.get("Retry-After", ""))
                except (TypeError, ValueError):
                    retry_after = 2**attempt
                delay = min(max(retry_after, 1), 30)
                print(f"Model API rate limited {path}; retry {attempt + 1}/3 in {delay:g}s")
                time.sleep(delay)
                continue
            raise RuntimeError(f"Model API returned HTTP {exc.code} for {path}") from None
        except (TimeoutError, urllib.error.URLError, json.JSONDecodeError) as exc:
            raise RuntimeError(f"Model API request failed for {path}: {type(exc).__name__}") from None
    else:  # pragma: no cover - loop exits via break or raises above
        raise RuntimeError(f"Model API retries exhausted for {path}")
    if not isinstance(result, dict):
        raise RuntimeError(f"Unexpected JSON response for {path}")
    return result


def embed(
    texts: list[str],
    prefix: str,
    batch_size: int = EMBEDDING_BATCH_SIZE,
    request_timeout_seconds: float = 60,
    max_attempts: int = 4,
) -> list[list[float]]:
    model = configured_embedding_model()
    vectors: list[list[float]] = []
    if batch_size < 1:
        raise ValueError("Embedding batch size must be positive")
    for start in range(0, len(texts), batch_size):
        batch = texts[start : start + batch_size]
        result = post_json(
            "/embeddings",
            {"model": model, "input": [prefix + text for text in batch]},
            timeout_seconds=request_timeout_seconds,
            max_attempts=max_attempts,
            service="embedding",
        )
        rows = result.get("data")
        if not isinstance(rows, list) or len(rows) != len(batch):
            raise RuntimeError("Embedding response count does not match input batch")
        if result.get("model") not in (None, model):
            raise RuntimeError("Embedding response model does not match requested model")
        if not all(isinstance(row, dict) for row in rows):
            raise RuntimeError("Embedding response contains a malformed row")
        indices = [row.get("index") for row in rows]
        if all(index is None for index in indices):
            # Some OpenAI-compatible gateways omit the optional response index;
            # preserve their documented input/output order in that case.
            print("Embedding response omitted indices; preserving provider response order")
        elif all(isinstance(index, int) for index in indices):
            if sorted(indices) != list(range(len(batch))):
                raise RuntimeError(f"Embedding response indices are duplicated or out of range: {indices!r}")
            rows = sorted(rows, key=lambda row: row["index"])
        else:
            raise RuntimeError(f"Embedding response has partial/non-integer indices: {indices!r}")
        batch_vectors = [row.get("embedding") for row in rows]
        if not all(isinstance(vector, list) and vector for vector in batch_vectors):
            raise RuntimeError("Embedding response has a missing vector")
        dimensions = {len(vector) for vector in batch_vectors}
        if len(dimensions) != 1 or not all(math.isfinite(float(v)) for vector in batch_vectors for v in vector):
            raise RuntimeError("Embedding vectors have inconsistent dimensions or non-finite values")
        vectors.extend([[float(value) for value in vector] for vector in batch_vectors])
    return vectors


def rerank(
    query: str,
    candidates: list[dict[str, str]],
    request_timeout_seconds: float = 60,
    max_attempts: int = 4,
) -> tuple[list[int], list[float]]:
    model = configured_reranker_model()
    result = post_json(
        "/rerank",
        {
            "model": model,
            "query": query,
            "documents": [item["text"] for item in candidates],
            "top_n": len(candidates),
            "return_documents": False,
        },
        timeout_seconds=request_timeout_seconds,
        max_attempts=max_attempts,
        service="rerank",
    )
    rows = result.get("results")
    if not isinstance(rows, list) or not rows:
        raise RuntimeError("Reranker response has no results")
    try:
        ordered = sorted(rows, key=lambda row: float(row.get("relevance_score", row.get("score"))), reverse=True)
        indices = [int(row["index"]) for row in ordered]
        scores = [float(row.get("relevance_score", row.get("score"))) for row in ordered]
        if sorted(indices) != list(range(len(candidates))) or not all(math.isfinite(score) for score in scores):
            raise ValueError("invalid reranker index or score")
        return indices, scores
    except (KeyError, TypeError, ValueError):
        raise RuntimeError("Reranker response is missing index/score fields") from None


def cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    return dot / (norm_a * norm_b) if norm_a and norm_b else 0.0


def metrics(name: str, split: str, items: list[dict[str, Any]], rankings: dict[str, list[int]], chunks: list[dict[str, str]]) -> None:
    if not items:
        return
    print(f"\n[{name} / {split}] {len(items)} answerable")
    for item in items:
        target = next((i for i, chunk in enumerate(chunks) if chunk["doc_id"] == item["expected_doc"] and chunk["section"] == item["expected_section"]), None)
        if target is None:
            raise ValueError(f"{item['id']}: expected section missing")
        rank = rankings[item["id"]].index(target) + 1 if target in rankings[item["id"]] else None
        print(f"{item['id']}: expected_rank={rank or 'not_in_candidates'}")
    ranks = []
    for item in items:
        target = next(i for i, chunk in enumerate(chunks) if chunk["doc_id"] == item["expected_doc"] and chunk["section"] == item["expected_section"])
        ranks.append(rankings[item["id"]].index(target) + 1 if target in rankings[item["id"]] else None)
    size = len(items)
    recall1 = sum(rank == 1 for rank in ranks) / size
    recall3 = sum(rank is not None and rank <= 3 for rank in ranks) / size
    mrr = sum(reciprocal_rank(rank) for rank in ranks) / size
    print(f"Recall@1={recall1:.3f} Recall@3={recall3:.3f} MRR={mrr:.3f}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--questions", type=Path, default=QUESTIONS, help="JSONL evaluation set")
    parser.add_argument("--knowledge-dir", type=Path, default=KNOWLEDGE, help="Directory of curated Markdown documents")
    parser.add_argument("--split", choices=("dev", "test", "all"), default="all", help="Evaluate only one split to avoid inspecting a holdout set")
    parser.add_argument("--embedding-batch-size", type=int, default=EMBEDDING_BATCH_SIZE, help="Embedding request size (1-16); lower this if the provider returns malformed indices")
    parser.add_argument("--check-repeatability", action="store_true", help="Call embeddings twice for identical inputs and compare cosine similarity")
    parser.add_argument("--repeatability-only", action="store_true", help="Check embedding repeatability without reranking/evaluating questions")
    args = parser.parse_args()
    if not 1 <= args.embedding_batch_size <= EMBEDDING_BATCH_SIZE:
        raise SystemExit(f"--embedding-batch-size must be between 1 and {EMBEDDING_BATCH_SIZE}")
    load_repo_env()
    chunks = [chunk for path in sorted(args.knowledge_dir.glob("*.md")) for chunk in parse_markdown(path)]
    questions = [json.loads(line) for line in args.questions.read_text(encoding="utf-8").splitlines() if line.strip()]
    if args.split != "all":
        questions = [item for item in questions if item["split"] == args.split]
    answerable = [item for item in questions if item["expected_doc"] != "NONE"]
    print("WARNING: sends only curated knowledge snippets and synthetic evaluation questions to the configured external model service.")
    print(f"Embedding model={configured_embedding_model()}; reranker={configured_reranker_model()}; chunks={len(chunks)}; questions={len(questions)}")

    # BGE-M3 does not require the E5-style query:/passage: instruction prefixes.
    chunk_vectors = embed([chunk["text"] for chunk in chunks], "", args.embedding_batch_size)
    question_vectors = embed([item["question"] for item in questions], "", args.embedding_batch_size)
    print(f"Embedding verified: {len(chunk_vectors)} passage vectors, dimension={len(chunk_vectors[0])}; {len(question_vectors)} query vectors.")
    if args.check_repeatability or args.repeatability_only:
        repeated_chunks = embed([chunk["text"] for chunk in chunks], "", args.embedding_batch_size)
        repeated_questions = embed([item["question"] for item in questions], "", args.embedding_batch_size)
        repeat_scores = [cosine(a, b) for a, b in zip(chunk_vectors + question_vectors, repeated_chunks + repeated_questions)]
        print(f"Embedding repeatability: min_cosine={min(repeat_scores):.9f}; mean_cosine={sum(repeat_scores)/len(repeat_scores):.9f}; threshold_for_warning=0.999000")
        if min(repeat_scores) < 0.999:
            print("WARNING: repeated identical inputs produced a low-similarity vector; inspect provider deployment/version before trusting offline ranking metrics.")
        if args.repeatability_only:
            return

    bm_corpus = [tokenize(chunk["text"]) for chunk in chunks]
    rankings: dict[str, dict[str, list[int]]] = {name: {} for name in ("BM25", "Embedding", "BM25->Rerank@5", "RRF(BM25+Embedding)->Rerank@5")}
    rerank_top_scores: dict[str, float] = {}
    for item, query_vector in zip(questions, question_vectors):
        bm_scores = bm25_scores(bm_corpus, tokenize(item["question"]))
        bm_rank = sorted(range(len(chunks)), key=lambda i: (-bm_scores[i], i))
        vector_scores = [cosine(query_vector, vector) for vector in chunk_vectors]
        vector_rank = sorted(range(len(chunks)), key=lambda i: (-vector_scores[i], i))
        # Rerank the BM25 top five; separately rerank an RRF union of the top five from each retriever.
        bm_candidates = bm_rank[:5]
        fused_scores: dict[int, float] = {}
        for ranking in (bm_rank[:5], vector_rank[:5]):
            for rank, idx in enumerate(ranking, 1):
                fused_scores[idx] = fused_scores.get(idx, 0.0) + 1 / (60 + rank)
        fused_candidates = sorted(fused_scores, key=lambda idx: (-fused_scores[idx], idx))
        for name, ranking in (("BM25", bm_rank), ("Embedding", vector_rank)):
            rankings[name][item["id"]] = ranking
        reranked_bm, _bm_rerank_scores = rerank(item["question"], [chunks[i] for i in bm_candidates])
        reranked_fused, fused_rerank_scores = rerank(item["question"], [chunks[i] for i in fused_candidates])
        rerank_top_scores[item["id"]] = fused_rerank_scores[0]
        rankings["BM25->Rerank@5"][item["id"]] = [bm_candidates[i] for i in reranked_bm] + [i for i in bm_rank if i not in bm_candidates]
        rankings["RRF(BM25+Embedding)->Rerank@5"][item["id"]] = [fused_candidates[i] for i in reranked_fused] + [i for i in fused_candidates if i not in {fused_candidates[j] for j in reranked_fused}]

    selected_splits = ("dev", "test") if args.split == "all" else (args.split,)
    for split in selected_splits:
        items = [item for item in answerable if item["split"] == split]
        for name, ranking in rankings.items():
            metrics(name, split, items, ranking, chunks)

    unanswerable = [item for item in questions if item["expected_doc"] == "NONE"]
    print("\nCoverage gate: selects whether to attach retrieved KB context only; it does not block/general-reject the user's question.")
    dev_items = [item for item in questions if item["split"] == "dev"]
    test_items = [item for item in questions if item["split"] == "test"]
    if not dev_items or not any(item["expected_doc"] == "NONE" for item in dev_items) or not any(item["expected_doc"] != "NONE" for item in dev_items):
        print("Coverage gate threshold not evaluated: dev split must contain both answerable and NONE examples.")
        return
    dev_labeled = [(rerank_top_scores[item["id"]], item["expected_doc"] != "NONE") for item in dev_items]
    thresholds = sorted({score for score, _ in dev_labeled})
    candidates = [thresholds[0] - 1e-9] + [(a + b) / 2 for a, b in zip(thresholds, thresholds[1:])] + [thresholds[-1] + 1e-9]
    def balanced_accuracy(threshold: float) -> tuple[float, float, float]:
        tp = sum(score >= threshold and positive for score, positive in dev_labeled)
        fn = sum(score < threshold and positive for score, positive in dev_labeled)
        tn = sum(score < threshold and not positive for score, positive in dev_labeled)
        fp = sum(score >= threshold and not positive for score, positive in dev_labeled)
        sensitivity = tp / (tp + fn) if tp + fn else 0.0
        specificity = tn / (tn + fp) if tn + fp else 0.0
        return (sensitivity + specificity) / 2, sensitivity, specificity
    threshold = max(candidates, key=lambda value: (*balanced_accuracy(value), -value))
    print(f"Threshold selected on dev only: {threshold:.6f}; dev balanced_accuracy/sensitivity/specificity=" + "/".join(f"{x:.3f}" for x in balanced_accuracy(threshold)))
    for split_items in ((dev_items, test_items) if args.split == "all" else (dev_items,)):
        tp = fn = tn = fp = 0
        gate_errors: list[str] = []
        for item in split_items:
            positive = item["expected_doc"] != "NONE"
            predicted = rerank_top_scores[item["id"]] >= threshold
            tp += predicted and positive
            fn += (not predicted) and positive
            tn += (not predicted) and (not positive)
            fp += predicted and (not positive)
            if predicted != positive:
                top = rankings["RRF(BM25+Embedding)->Rerank@5"][item["id"]][0]
                gate_errors.append(
                    f"{item['id']}: {'FN' if positive else 'FP'} score={rerank_top_scores[item['id']]:.6f}; "
                    f"{chunks[top]['doc_id']} / {chunks[top]['section']}; question={item['question']}"
                )
        sensitivity = tp / (tp + fn) if tp + fn else 0.0
        specificity = tn / (tn + fp) if tn + fp else 0.0
        precision = tp / (tp + fp) if tp + fp else 0.0
        label = "dev calibration (in-sample)" if split_items[0]["split"] == "dev" else "test holdout"
        print(f"{label} coverage-gate: threshold={threshold:.6f}; TP={tp} FN={fn} TN={tn} FP={fp}; sensitivity={sensitivity:.3f} specificity={specificity:.3f} precision={precision:.3f}")
        for error in gate_errors:
            print("GATE_ERROR", error)
    print(f"No-answer examples={len(unanswerable)}; false-positive retrieved passages are not treated as permission to assert unsupported facts.")
    for item in unanswerable:
        top = rankings["RRF(BM25+Embedding)->Rerank@5"][item["id"]][0]
        print(f"{item['id']}: top_score={rerank_top_scores[item['id']]:.6f}; top1={chunks[top]['doc_id']} / {chunks[top]['section']}")


if __name__ == "__main__":
    main()
