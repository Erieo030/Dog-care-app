#!/usr/bin/env python3
"""Preflight the RAG retriever for the fixed question bank; no chat/API account used."""
from __future__ import annotations

import csv
import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PROJECT_ROOT = ROOT.parent
sys.path.insert(0, str(PROJECT_ROOT / "backend"))

from rag_experiment.query_mongo_index import retrieve  # noqa: E402
from rag_experiment.run_embedding_experiment import load_repo_env  # noqa: E402
from app.services.ai.rag_context_service import is_canine_knowledge_question  # noqa: E402


def main() -> int:
    load_repo_env({"MEGO_RAG_TOP_K"})
    try:
        top_k = min(10, max(1, int(os.getenv("MEGO_RAG_TOP_K", "3"))))
    except ValueError:
        top_k = 3
    with (ROOT / "questions.csv").open(encoding="utf-8-sig", newline="") as handle:
        questions = list(csv.DictReader(handle))

    batch = datetime.now().astimezone().strftime("%Y-%m-%d_%H%M%S")
    output_dir = ROOT / "runs" / batch
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / "retrieval.jsonl"
    completed = failed = skipped = 0
    with output_path.open("x", encoding="utf-8") as output:
        for row in questions:
            question = row["question"]
            triggered = is_canine_knowledge_question(question)
            record = {
                "id": row["id"],
                "question": question,
                "triggered": triggered,
                "configuredTopK": top_k,
            }
            if not triggered:
                record.update(status="skipped_not_triggered", indexVersion=None,
                              retrievalMethod=None, results=[])
                skipped += 1
            else:
                started = time.monotonic()
                try:
                    result = retrieve(question, limit=top_k)
                    record.update(
                        status="ok",
                        indexVersion=result.get("index_version"),
                        retrievalMethod=result.get("retrieval_method"),
                        results=[
                            {
                                "documentId": item.get("document_id"),
                                "documentTitle": item.get("document_title"),
                                "section": item.get("section"),
                                "rerankerScore": item.get("reranker_score"),
                                "citations": item.get("citations", []),
                            }
                            for item in result.get("results", [])
                        ],
                    )
                    completed += 1
                except Exception as exc:  # record the error class only, never response contents
                    record.update(status="error", errorType=type(exc).__name__)
                    failed += 1
                record["seconds"] = round(time.monotonic() - started, 1)
            output.write(json.dumps(record, ensure_ascii=False) + "\n")
            output.flush()
            print(f"{row['id']}: {record['status']}")
            if triggered:
                time.sleep(0.5)
    print(f"Saved {output_path}; ok={completed}, skipped={skipped}, errors={failed}")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
