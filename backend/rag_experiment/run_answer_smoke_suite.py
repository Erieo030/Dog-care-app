"""Run source-cited answer smoke tests on synthetic questions only."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

try:  # Support both CLI execution and imports by the backend runtime.
    from .answer_mongo_rag import NO_EVIDENCE_ANSWER, generate_answer
    from .query_mongo_index import retrieve
except ImportError:  # pragma: no cover - direct script execution
    from answer_mongo_rag import NO_EVIDENCE_ANSWER, generate_answer
    from query_mongo_index import retrieve


ROOT = Path(__file__).resolve().parent
QUESTIONS = ROOT / "evaluation" / "questions_v4_internal_provisional.jsonl"


def load_questions(path: Path, split: str) -> list[dict[str, Any]]:
    questions = [
        json.loads(line)
        for line in path.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    if split != "all":
        questions = [item for item in questions if item.get("split") == split]
    return questions


def assess_case(question: dict[str, Any], result: dict[str, Any]) -> dict[str, Any]:
    expected_doc = question["expected_doc"]
    expected_section = question.get("expected_section", "")
    retrieval = result.get("retrieval", {})
    retrieved_results = retrieval.get("results", [])
    target_rank = next((
        index for index, item in enumerate(retrieved_results, start=1)
        if item.get("document_id") == expected_doc
        and item.get("section") == expected_section
    ), None) if expected_doc != "NONE" else None

    target_urls = {
        str(citation.get("url", "")).strip()
        for item in retrieved_results
        if item.get("document_id") == expected_doc and item.get("section") == expected_section
        for citation in item.get("citations", [])
        if citation.get("url")
    }
    cited_urls = {
        str(source.get("url", "")).strip()
        for source in result.get("sources", [])
        if source.get("url")
    }
    answer = result.get("answer", "")
    return {
        "id": question["id"],
        "expected_doc": expected_doc,
        "expected_section": expected_section,
        "target_rank": target_rank,
        "no_evidence_fallback": answer == NO_EVIDENCE_ANSWER,
        "cited_target_source": bool(target_urls & cited_urls) if expected_doc != "NONE" else None,
        "answer": answer,
        "sources": result.get("sources", []),
        "error": result.get("error"),
    }


def run_suite(questions: list[dict[str, Any]], limit: int) -> list[dict[str, Any]]:
    cases = []
    for question in questions:
        try:
            retrieval = retrieve(question["question"], limit=limit)
            answer = generate_answer(question["question"], retrieval)
            answer["retrieval"] = retrieval
        except (RuntimeError, ValueError) as error:
            answer = {"answer": "", "sources": [], "error": str(error), "retrieval": {}}
        cases.append(assess_case(question, answer))
        print(json.dumps(cases[-1], ensure_ascii=False))

    answerable = [case for case in cases if case["expected_doc"] != "NONE"]
    no_answer = [case for case in cases if case["expected_doc"] == "NONE"]
    summary = {
        "cases": len(cases),
        "answerable_cases": len(answerable),
        "answerable_target_hit_at_limit": sum(case["target_rank"] is not None for case in answerable),
        "answerable_with_any_citation": sum(bool(case["sources"]) for case in answerable),
        "answerable_citing_expected_section_source": sum(bool(case["cited_target_source"]) for case in answerable),
        "no_answer_cases": len(no_answer),
        "no_answer_fallbacks": sum(case["no_evidence_fallback"] for case in no_answer),
        "errors": sum(bool(case["error"]) for case in cases),
        "note": "Provisional internal smoke test; not an independent blind evaluation or factual-accuracy score.",
    }
    print("SUMMARY " + json.dumps(summary, ensure_ascii=False))
    return cases


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--questions", type=Path, default=QUESTIONS)
    parser.add_argument("--split", choices=("dev", "test", "all"), default="all")
    parser.add_argument("--expected", choices=("all", "answerable", "none"), default="all")
    parser.add_argument("--max-questions", type=int, default=0, help="Optional cap after filtering; 0 runs all selected questions")
    parser.add_argument("--ids", help="Optional comma-separated question IDs to run")
    parser.add_argument("--limit", type=int, default=5)
    args = parser.parse_args()
    if not 1 <= args.limit <= 10:
        raise SystemExit("--limit must be between 1 and 10")
    questions = load_questions(args.questions, args.split)
    if args.expected == "answerable":
        questions = [item for item in questions if item.get("expected_doc") != "NONE"]
    elif args.expected == "none":
        questions = [item for item in questions if item.get("expected_doc") == "NONE"]
    if args.ids:
        selected_ids = {value.strip() for value in args.ids.split(",") if value.strip()}
        questions = [item for item in questions if item.get("id") in selected_ids]
    if args.max_questions > 0:
        questions = questions[:args.max_questions]
    if not questions:
        raise SystemExit("No evaluation questions selected")
    print("WARNING: uses synthetic questions and curated RAG passages with the configured external model service; never pass real user or pet data.")
    run_suite(questions, args.limit)


if __name__ == "__main__":
    main()
