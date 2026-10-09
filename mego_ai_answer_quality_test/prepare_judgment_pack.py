#!/usr/bin/env python3
"""Create blinded T1 pairs and separate T2/citation review files from a run."""
from __future__ import annotations

import argparse
import csv
import json
import random
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def read_jsonl(path: Path) -> dict[str, dict]:
    return {row["id"]: row for row in (json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip())}


def content_only(answer: str) -> str:
    answer = re.sub(r"(?im)^\s*(?:參考來源|參考資料|引用來源)\s*[:：].*$", "", answer)
    answer = re.sub(r"https?://\S+", "", answer)
    answer = re.sub(r"[\[(（]\s*R\d+\s*[\])）]", "", answer)
    return re.sub(r"\n{3,}", "\n\n", answer).strip()


def write_csv(path: Path, rows: list[dict], columns: list[str]) -> None:
    with path.open("x", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=columns, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("batch", help="Run folder name under runs/")
    args = parser.parse_args()
    run_dir = ROOT / "runs" / args.batch
    a = read_jsonl(run_dir / "answers_A.jsonl")
    b = read_jsonl(run_dir / "answers_B.jsonl")
    questions = list(csv.DictReader((ROOT / "questions.csv").open(encoding="utf-8-sig", newline="")))
    t1 = [q for q in questions if q["test"] == "1"]
    if len(t1) != 20 or set(a) != {q["id"] for q in t1} or not set(a).issubset(b):
        raise SystemExit("Expected matching 20-question T1 answers in A and B.")

    judge_dir = ROOT / "judgments" / args.batch
    judge_dir.mkdir(parents=True, exist_ok=False)
    rng = random.SystemRandom()
    blinded_rows, sealed = [], {}
    for question in t1:
        x_condition = rng.choice(("A", "B"))
        y_condition = "B" if x_condition == "A" else "A"
        blinded_rows.append({
            "question_id": question["id"],
            "category": question["category"],
            "question": question["question"],
            "expected_key_points": question["key_points"],
            "answer_X": content_only((a if x_condition == "A" else b)[question["id"]].get("answer") or ""),
            "answer_Y": content_only((a if y_condition == "A" else b)[question["id"]].get("answer") or ""),
            "X_key_points_hit": "",
            "Y_key_points_hit": "",
            "contradiction_or_unsafe_content": "",
            "notes": "",
        })
        sealed[question["id"]] = {"X": x_condition, "Y": y_condition}

    write_csv(judge_dir / "t1_blinded_content_judgment.csv", blinded_rows, list(blinded_rows[0]))
    (judge_dir / "sealed_condition_key.json").write_text(
        json.dumps(sealed, ensure_ascii=False, indent=2) + "\n", encoding="utf-8",
    )

    t2_rows = []
    for question in (q for q in questions if q["test"] != "1"):
        record = b.get(question["id"], {})
        t2_rows.append({
            "question_id": question["id"],
            "category": question["category"],
            "question": question["question"],
            "expected_behavior": question["expected"],
            "answer_B": record.get("answer") or "",
            "appropriate_boundary": "",
            "fabrication_or_unsupported_claim": "",
            "unsafe_advice": "",
            "pass": "",
            "notes": "",
        })
    write_csv(judge_dir / "t2_safety_judgment.csv", t2_rows, list(t2_rows[0]))

    citation_rows = []
    for question in t1:
        record = b[question["id"]]
        citation_rows.append({
            "question_id": question["id"],
            "question": question["question"],
            "answer": record.get("answer") or "",
            "knowledge_sources_json": json.dumps(record.get("knowledgeSources") or [], ensure_ascii=False),
            "source_relevant_and_supports_answer": "",
            "notes": "",
        })
    write_csv(judge_dir / "t1_b_citation_judgment.csv", citation_rows, list(citation_rows[0]))
    (judge_dir / "README.md").write_text(
        "# 本輪判讀資料\n\n"
        "- `t1_blinded_content_judgment.csv`：A/B 條件已隨機替換為 X/Y，且移除可見引用標記；先判回答要點與安全性。\n"
        "- `sealed_condition_key.json`：封存 X/Y 對照 A/B 的答案鍵；判完並鎖定內容分數後才開啟。請勿交給盲判者。\n"
        "- `t1_b_citation_judgment.csv`：只判 B 條件的引用是否相關且有支持答案。\n"
        "- `t2_safety_judgment.csv`：只判 B 條件的資料不足／安全邊界題。\n"
        "- 兩位判讀者各自複製相同 CSV 後獨立填寫；保留原始兩份，再共識整理。\n",
        encoding="utf-8",
    )

    all_rows = [("A", row) for row in a.values()] + [("B", row) for row in b.values()]
    metrics = {}
    for condition in ("A", "B"):
        rows = [row for label, row in all_rows if label == condition]
        metrics[condition] = {
            "answer_count": len(rows),
            "api_errors": sum(bool(row.get("error")) for row in rows),
            "fallback_used": sum(bool(row.get("fallbackUsed")) for row in rows),
            "answers_with_knowledge_sources": sum(bool(row.get("knowledgeSources")) for row in rows),
            "mean_seconds": round(sum(float(row.get("seconds") or 0) for row in rows) / max(1, len(rows)), 2),
            "models": sorted({str(row.get("model")) for row in rows if row.get("model")}),
        }
    (run_dir / "metrics.json").write_text(json.dumps(metrics, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Prepared blinded judgment materials: {judge_dir}")
    print(f"Saved non-content summary metrics: {run_dir / 'metrics.json'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
