"""Validation and preview helpers for curated MEGO RAG Markdown documents.

This intentionally supports a small, documented front-matter subset instead
of adding a YAML dependency. The canonical knowledge files use flat metadata,
inline tags, and a YAML list for source references.
"""
from __future__ import annotations

import argparse
import re
import sys
from datetime import date
from pathlib import Path
from urllib.parse import urlparse

try:  # Support both CLI execution and imports by the backend runtime.
    from .run_bm25_baseline import KNOWLEDGE, parse_markdown
except ImportError:  # pragma: no cover - direct script execution
    from run_bm25_baseline import KNOWLEDGE, parse_markdown


ROOT = Path(__file__).resolve().parents[2]
VALID_STATUSES = {"draft", "published", "retired"}
REQUIRED_FIELDS = (
    "id", "title", "category", "audience", "species", "tags", "source",
    "status", "jurisdiction", "editorial_review_status", "clinical_review_status", "version",
)
ALLOWED_EDITORIAL_STATES = {"pending", "reviewed"}
ALLOWED_CLINICAL_STATES = {"not_applicable", "not_reviewed", "reviewed"}


def read_front_matter(path: Path) -> tuple[dict[str, str], list[str]]:
    raw = path.read_text(encoding="utf-8")
    match = re.match(r"\A---\s*\n(.*?)\n---\s*\n(.*)\Z", raw, re.S)
    if not match:
        raise ValueError("missing YAML front matter")
    header, _body = match.groups()
    fields: dict[str, str] = {}
    for line in header.splitlines():
        item = re.match(r"^([A-Za-z][A-Za-z0-9_-]*):\s*(.*?)\s*$", line)
        if item:
            fields[item.group(1)] = item.group(2).strip().strip("\"'")

    source_lines: list[str] = []
    lines = header.splitlines()
    source_index = next((i for i, line in enumerate(lines) if line.strip() == "source:"), None)
    if source_index is not None:
        for line in lines[source_index + 1 :]:
            if not line.strip():
                continue
            entry = re.match(r"\s+-\s*(.*?)\s*$", line)
            if not entry:
                break
            value = re.sub(r"\s+#.*$", "", entry.group(1)).strip().strip("\"'")
            if value:
                source_lines.append(value)
    return fields, source_lines


def document_status(path: Path) -> str:
    fields, _ = read_front_matter(path)
    return fields.get("status", "")


def _valid_reference(reference: str) -> bool:
    parsed = urlparse(reference)
    if parsed.scheme in {"http", "https"}:
        return bool(parsed.netloc)
    if parsed.scheme or reference.startswith(("/", "~")) or ".." in Path(reference).parts:
        return False
    return (ROOT / reference).is_file()


def validate_document(path: Path, seen_ids: set[str] | None = None) -> tuple[list[str], list[dict[str, object]]]:
    errors: list[str] = []
    try:
        fields, sources = read_front_matter(path)
        chunks = parse_markdown(path)
    except (OSError, UnicodeError, ValueError) as exc:
        return [f"{path.name}: {exc}"], []

    for field in REQUIRED_FIELDS:
        if field == "source":
            continue  # source is a YAML list, not a scalar
        if field not in fields or not fields[field]:
            errors.append(f"{path.name}: required front-matter field '{field}' is missing")
    doc_id = fields.get("id", "")
    if doc_id and not re.fullmatch(r"[a-z0-9][a-z0-9-]{1,79}", doc_id):
        errors.append(f"{path.name}: id must be a lowercase slug (letters, digits, hyphens)")
    if seen_ids is not None and doc_id:
        if doc_id in seen_ids:
            errors.append(f"{path.name}: duplicate document id '{doc_id}'")
        seen_ids.add(doc_id)

    status = fields.get("status", "")
    if status not in VALID_STATUSES:
        errors.append(f"{path.name}: status must be one of {', '.join(sorted(VALID_STATUSES))}")
    if fields.get("editorial_review_status") not in ALLOWED_EDITORIAL_STATES:
        errors.append(f"{path.name}: editorial_review_status must be pending or reviewed")
    if fields.get("clinical_review_status") not in ALLOWED_CLINICAL_STATES:
        errors.append(f"{path.name}: clinical_review_status must be not_applicable, not_reviewed, or reviewed")

    review_date = fields.get("editorial_reviewed_at", "")
    if review_date and review_date.lower() != "null":
        try:
            date.fromisoformat(review_date)
        except ValueError:
            errors.append(f"{path.name}: editorial_reviewed_at must use YYYY-MM-DD")
    if status == "published":
        if fields.get("editorial_review_status") != "reviewed":
            errors.append(f"{path.name}: published documents must pass editorial review")
        if not fields.get("editorial_reviewed_by") or not review_date:
            errors.append(f"{path.name}: published documents need reviewer name and review date")

    tags_value = fields.get("tags", "")
    if not re.fullmatch(r"\[[^\[\]]+\]", tags_value):
        errors.append(f"{path.name}: tags must be a non-empty inline list, e.g. tags: [照護, 飲食]")
    elif not any(part.strip().strip("\"'") for part in tags_value[1:-1].split(",")):
        errors.append(f"{path.name}: tags list cannot be empty")

    if not sources:
        errors.append(f"{path.name}: at least one source reference is required")
    for reference in sources:
        if not _valid_reference(reference):
            errors.append(f"{path.name}: source must be an http(s) URL or existing repo-relative file: {reference}")
    if not chunks:
        errors.append(f"{path.name}: at least one non-empty ## section is required")
    for chunk in chunks:
        for reference in chunk["sources"]:
            if not _valid_reference(reference):
                errors.append(f"{path.name} / {chunk['section']}: invalid section source: {reference}")

    return errors, chunks


def validate_knowledge_dir(
    knowledge_dir: Path, *, published_only: bool = False
) -> tuple[list[str], list[dict[str, object]]]:
    errors: list[str] = []
    chunks: list[dict[str, object]] = []
    seen_ids: set[str] = set()
    documents = sorted(knowledge_dir.glob("*.md"))
    if not documents:
        return [f"No Markdown knowledge documents found in {knowledge_dir}"], []

    for path in documents:
        try:
            status = document_status(path)
        except (OSError, UnicodeError, ValueError) as exc:
            errors.append(f"{path.name}: {exc}")
            continue
        if published_only and status != "published":
            continue
        doc_errors, doc_chunks = validate_document(path, seen_ids)
        errors.extend(doc_errors)
        if not doc_errors and status == "published":
            chunks.extend(doc_chunks)

    identities = [(chunk["doc_id"], chunk["section"]) for chunk in chunks]
    if len(identities) != len(set(identities)):
        errors.append("Published corpus contains duplicate document/section identities")
    if published_only and not chunks:
        errors.append("No valid published sections are available for indexing")
    return errors, chunks


def load_published_chunks(knowledge_dir: Path) -> list[dict[str, object]]:
    errors, chunks = validate_knowledge_dir(knowledge_dir, published_only=True)
    if errors:
        raise ValueError("Knowledge validation failed:\n- " + "\n- ".join(errors))
    return chunks


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate or preview curated MEGO RAG documents.")
    parser.add_argument("--knowledge-dir", type=Path, default=KNOWLEDGE)
    parser.add_argument("--preview", metavar="DOC_ID", help="Print the indexed sections and their citations for a document")
    parser.add_argument("--include-nonpublished", action="store_true", help="Allow draft/retired sections in a local preview only")
    args = parser.parse_args()

    errors, chunks = validate_knowledge_dir(args.knowledge_dir)
    if errors:
        print("Knowledge validation failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        raise SystemExit(1)

    documents = sorted(args.knowledge_dir.glob("*.md"))
    published = sum(document_status(path) == "published" for path in documents)
    drafts = sum(document_status(path) == "draft" for path in documents)
    retired = sum(document_status(path) == "retired" for path in documents)
    print(f"Validation passed: {published} published, {drafts} draft, {retired} retired; {len(chunks)} published sections.")

    if args.preview:
        matches = [chunk for chunk in chunks if chunk["doc_id"] == args.preview]
        if not matches and args.include_nonpublished:
            path = next((item for item in documents if document_status(item) != "published" and read_front_matter(item)[0].get("id") == args.preview), None)
            if path:
                matches = parse_markdown(path)
        if not matches:
            raise SystemExit(f"Document not found in preview scope: {args.preview}")
        for chunk in matches:
            print(f"\n## {chunk['section']}\n{chunk['text']}\nSources:")
            for source in chunk["sources"]:
                print(f"- {source}")


if __name__ == "__main__":
    main()
