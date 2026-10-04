"""Small, deterministic BM25 character-bigram baseline; standard library only."""
from __future__ import annotations

import json
import math
import re
import argparse
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent
KNOWLEDGE = ROOT / "knowledge"
QUESTIONS = ROOT / "evaluation" / "questions.jsonl"


def parse_markdown(path: Path) -> list[dict[str, str]]:
    raw = path.read_text(encoding="utf-8")
    match = re.match(r"\A---\s*\n(.*?)\n---\s*\n(.*)\Z", raw, re.S)
    if not match:
        raise ValueError(f"{path.name}: missing YAML front matter")
    metadata, body = match.groups()
    doc_id = re.search(r"^id:\s*(.+?)\s*$", metadata, re.M)
    title = re.search(r"^title:\s*(.+?)\s*$", metadata, re.M)
    version = re.search(r"^version:\s*(.+?)\s*$", metadata, re.M)
    if not doc_id or not title:
        raise ValueError(f"{path.name}: id/title missing")

    sources = []
    metadata_lines = metadata.splitlines()
    source_start = next((index for index, line in enumerate(metadata_lines) if line.strip() == "source:"), None)
    if source_start is not None:
        for line in metadata_lines[source_start + 1 :]:
            if not line.strip():
                continue
            entry = re.match(r"\s+-\s*(.*?)\s*$", line)
            if not entry:
                break
            reference = re.sub(r"\s+#.*$", "", entry.group(1)).strip().strip("\"'")
            if reference:
                sources.append(reference)
    if not sources:
        raise ValueError(f"{path.name}: source references missing")

    sections = re.split(r"^##\s+(.+?)\s*$", body, flags=re.M)
    chunks = []
    for index in range(1, len(sections), 2):
        heading, text = sections[index], sections[index + 1]
        section_source_match = re.match(r"\s*<!--\s*sources:\s*\n(.*?)\n\s*-->\s*", text, re.S)
        chunk_sources = sources
        if section_source_match:
            chunk_sources = []
            for line in section_source_match.group(1).splitlines():
                entry = re.match(r"\s*-\s*(.*?)\s*$", line)
                if entry and entry.group(1).strip():
                    chunk_sources.append(entry.group(1).strip().strip("\"'"))
            text = text[section_source_match.end() :]
            if not chunk_sources:
                raise ValueError(f"{path.name} / {heading}: section source list is empty")
        text = " ".join(text.split())
        if text:
            chunks.append({
                "doc_id": doc_id.group(1),
                "title": title.group(1),
                "document_version": version.group(1) if version else "1",
                "category": _front_matter_value(metadata, "category"),
                "audience": _front_matter_value(metadata, "audience"),
                "species": _front_matter_value(metadata, "species"),
                "jurisdiction": _front_matter_value(metadata, "jurisdiction"),
                "status": _front_matter_value(metadata, "status"),
                "editorial_review_status": _front_matter_value(metadata, "editorial_review_status"),
                "editorial_reviewed_by": _front_matter_value(metadata, "editorial_reviewed_by"),
                "editorial_reviewed_at": _front_matter_value(metadata, "editorial_reviewed_at"),
                "clinical_review_status": _front_matter_value(metadata, "clinical_review_status"),
                "tags": _front_matter_list(metadata, "tags"),
                "section": heading,
                "text": f"{title.group(1)} {heading} {text}",
                "sources": chunk_sources,
            })
    return chunks


def _front_matter_value(metadata: str, key: str) -> str:
    match = re.search(rf"^{re.escape(key)}:\s*(.*?)\s*$", metadata, re.M)
    return match.group(1).strip().strip("\"'") if match else ""


def _front_matter_list(metadata: str, key: str) -> list[str]:
    value = _front_matter_value(metadata, key)
    if not (value.startswith("[") and value.endswith("]")):
        return []
    return [item.strip().strip("\"'") for item in value[1:-1].split(",") if item.strip().strip("\"'")]


def tokenize(text: str) -> list[str]:
    """Use CJK bigrams plus normalized Latin/digit terms as a transparent baseline."""
    tokens: list[str] = []
    for run in re.findall(r"[\u3400-\u9fff]+|[a-zA-Z0-9]+", text.lower()):
        if re.fullmatch(r"[\u3400-\u9fff]+", run):
            tokens.extend(run[index : index + 2] for index in range(len(run) - 1))
            if len(run) == 1:
                tokens.append(run)
        else:
            tokens.append(run)
    return tokens


def bm25_scores(corpus: list[list[str]], query: list[str]) -> list[float]:
    count = len(corpus)
    if not count:
        return []
    lengths = [len(document) for document in corpus]
    average_length = sum(lengths) / count or 1.0
    frequencies = [Counter(document) for document in corpus]
    document_frequency = Counter(token for document in frequencies for token in document)
    scores = [0.0] * count
    k1, b = 1.5, 0.75
    for token in set(query):
        df = document_frequency.get(token, 0)
        if not df:
            continue
        idf = math.log(1 + (count - df + 0.5) / (df + 0.5))
        for index, frequencies_for_doc in enumerate(frequencies):
            tf = frequencies_for_doc.get(token, 0)
            if tf:
                norm = tf + k1 * (1 - b + b * lengths[index] / average_length)
                scores[index] += idf * tf * (k1 + 1) / norm
    return scores


def reciprocal_rank(relevant_rank: int | None) -> float:
    return 1 / relevant_rank if relevant_rank else 0.0


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--knowledge-dir", type=Path, default=KNOWLEDGE, help="Directory of curated Markdown documents")
    parser.add_argument("--questions", type=Path, default=QUESTIONS, help="JSONL evaluation set")
    parser.add_argument("--split", choices=("dev", "test", "all"), default="all", help="Evaluate only one split to avoid inspecting a holdout set")
    args = parser.parse_args()
    chunks = [chunk for path in sorted(args.knowledge_dir.glob("*.md")) for chunk in parse_markdown(path)]
    if not chunks:
        raise SystemExit("No knowledge sections found")
    corpus = [tokenize(chunk["text"]) for chunk in chunks]
    questions = [json.loads(line) for line in args.questions.read_text(encoding="utf-8").splitlines() if line.strip()]
    if args.split != "all":
        questions = [item for item in questions if item["split"] == args.split]
    answerable = [item for item in questions if item["expected_doc"] != "NONE"]

    print(f"BM25 baseline: {len(chunks)} sections, {len(questions)} questions, character bigrams; no LLM/Embedding")
    for split in (("dev", "test") if args.split == "all" else (args.split,)):
        items = [item for item in answerable if item["split"] == split]
        if not items:
            print(f"{split}: no answerable questions")
            continue
        recall1 = recall3 = mrr = 0.0
        print(f"\n[{split}] {len(items)} answerable questions")
        for item in items:
            scores = bm25_scores(corpus, tokenize(item["question"]))
            ranked = sorted(range(len(chunks)), key=lambda index: (-scores[index], index))
            target = next((index for index, chunk in enumerate(chunks) if chunk["doc_id"] == item["expected_doc"] and chunk["section"] == item["expected_section"]), None)
            if target is None:
                raise ValueError(f"{item['id']}: expected document/section not found")
            rank = ranked.index(target) + 1
            recall1 += rank == 1
            recall3 += rank <= 3
            mrr += reciprocal_rank(rank)
            best = chunks[ranked[0]]
            print(f"{item['id']}: expected rank={rank}; top1={best['doc_id']} / {best['section']}")
        size = len(items)
        print(f"Recall@1={recall1/size:.3f} Recall@3={recall3/size:.3f} MRR={mrr/size:.3f}")

    unanswerable = [item for item in questions if item["expected_doc"] == "NONE"]
    if unanswerable:
        print(f"\n[no-answer inspection] {len(unanswerable)} questions; scores shown only, no rejection threshold fitted")
        for item in unanswerable:
            scores = bm25_scores(corpus, tokenize(item["question"]))
            top = max(scores, default=0.0)
            print(f"{item['id']}: top1_score={top:.3f}; {item['question']}")


if __name__ == "__main__":
    main()
