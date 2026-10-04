"""Build a versioned, source-attributed knowledge index in a dedicated Mongo collection.

Default mode is dry-run. --write only upserts MEGO RAG knowledge collections;
it never reads or modifies user, pet, chat, or care-record collections.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

from pymongo import MongoClient, UpdateOne

try:  # Support both CLI execution and imports by the backend runtime.
    from .run_bm25_baseline import KNOWLEDGE
    from .run_embedding_experiment import configured_embedding_model, embed, load_repo_env
    from .knowledge_workflow import load_published_chunks, validate_knowledge_dir
except ImportError:  # pragma: no cover - direct script execution
    from run_bm25_baseline import KNOWLEDGE
    from run_embedding_experiment import configured_embedding_model, embed, load_repo_env
    from knowledge_workflow import load_published_chunks, validate_knowledge_dir


ROOT = Path(__file__).resolve().parents[2]
CHUNK_COLLECTION = "rag_knowledge_chunks"
MANIFEST_COLLECTION = "rag_index_manifests"
MANIFEST_ID = "mego-care-knowledge"


def load_chunks(knowledge_dir: Path) -> list[dict[str, object]]:
    chunks = load_published_chunks(knowledge_dir)
    if not chunks:
        raise ValueError(f"No knowledge sections found in {knowledge_dir}")
    identities = [(chunk["doc_id"], chunk["section"]) for chunk in chunks]
    if len(identities) != len(set(identities)):
        raise ValueError("Duplicate document/section identity in knowledge corpus")
    return chunks


def index_version(chunks: list[dict[str, object]], model: str | None = None) -> str:
    model = model or configured_embedding_model()
    stable_payload = {
        "embedding_model": model,
        "chunks": [
            {
                "doc_id": chunk["doc_id"],
                "document_version": chunk["document_version"],
                "title": chunk["title"],
                "category": chunk.get("category", ""),
                "audience": chunk.get("audience", ""),
                "species": chunk.get("species", ""),
                "jurisdiction": chunk.get("jurisdiction", ""),
                "tags": chunk.get("tags", []),
                "editorial_review_status": chunk.get("editorial_review_status", ""),
                "editorial_reviewed_by": chunk.get("editorial_reviewed_by", ""),
                "editorial_reviewed_at": chunk.get("editorial_reviewed_at", ""),
                "clinical_review_status": chunk.get("clinical_review_status", ""),
                "section": chunk["section"],
                "text": chunk["text"],
                "sources": chunk["sources"],
            }
            for chunk in chunks
        ],
    }
    encoded = json.dumps(stable_payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(encoded.encode("utf-8")).hexdigest()


def citation_records(references: list[str], document_title: str) -> list[dict[str, str]]:
    citations = []
    for reference in references:
        parsed = urlparse(reference)
        external = parsed.scheme in {"http", "https"} and bool(parsed.netloc)
        citations.append({
            "title": document_title if not external else parsed.netloc,
            "url": reference,
            "kind": "external" if external else "internal",
        })
    return citations


def build_records(
    chunks: list[dict[str, object]],
    vectors: list[list[float]],
    version: str,
    model: str | None = None,
) -> list[dict[str, object]]:
    model = model or configured_embedding_model()
    if len(chunks) != len(vectors):
        raise ValueError("Chunk and embedding counts do not match")
    dimensions = {len(vector) for vector in vectors}
    if len(dimensions) != 1 or not dimensions or next(iter(dimensions)) == 0:
        raise ValueError("Embedding dimensions are empty or inconsistent")

    records = []
    for chunk, vector in zip(chunks, vectors):
        stable_id = hashlib.sha256(f"{chunk['doc_id']}\0{chunk['section']}".encode()).hexdigest()[:24]
        records.append({
            "_id": f"{version}:{stable_id}",
            "indexVersion": version,
            "chunkId": stable_id,
            "docId": chunk["doc_id"],
            "documentTitle": chunk["title"],
            "documentVersion": chunk["document_version"],
            "section": chunk["section"],
            "text": chunk["text"],
            "category": chunk.get("category", ""),
            "audience": chunk.get("audience", ""),
            "species": chunk.get("species", ""),
            "jurisdiction": chunk.get("jurisdiction", ""),
            "tags": chunk.get("tags", []),
            "editorialReviewStatus": chunk.get("editorial_review_status", ""),
            "editorialReviewedBy": chunk.get("editorial_reviewed_by", ""),
            "editorialReviewedAt": chunk.get("editorial_reviewed_at", ""),
            "clinicalReviewStatus": chunk.get("clinical_review_status", ""),
            "embedding": vector,
            "embeddingModel": model,
            "embeddingDimensions": len(vector),
            "citations": citation_records(chunk["sources"], chunk["title"]),
        })
    return records


def write_index(records: list[dict[str, object]], version: str, database_name: str) -> None:
    mongo_uri = os.getenv("MONGO_URI", "").strip()
    if not mongo_uri:
        raise RuntimeError("MONGO_URI is not configured in the repo-root .env")

    client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
    try:
        client.admin.command("ping")
        db = client[database_name]
        chunks_collection = db[CHUNK_COLLECTION]
        manifests_collection = db[MANIFEST_COLLECTION]
        chunks_collection.create_index([("indexVersion", 1), ("chunkId", 1)], unique=True)

        now = datetime.now(timezone.utc)
        operations = [
            UpdateOne({"_id": record["_id"]}, {"$set": {**record, "updatedAt": now}}, upsert=True)
            for record in records
        ]
        if operations:
            chunks_collection.bulk_write(operations, ordered=True)

        source_list = sorted({citation["url"] for record in records for citation in record["citations"]})
        manifests_collection.update_one(
            {"_id": MANIFEST_ID},
            {"$set": {
                "activeVersion": version,
                "embeddingModel": records[0]["embeddingModel"],
                "embeddingDimensions": records[0]["embeddingDimensions"],
                "chunkCount": len(records),
                "sourceUrls": source_list,
                "updatedAt": now,
            }},
            upsert=True,
        )
        print(f"Mongo index ready: db={database_name}; chunks={len(records)}; activeVersion={version[:12]}")
        print(f"Dedicated collections only: {CHUNK_COLLECTION}, {MANIFEST_COLLECTION}; previous versions are retained.")
    finally:
        client.close()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--knowledge-dir", type=Path, default=KNOWLEDGE)
    parser.add_argument("--write", action="store_true", help="Upsert into dedicated MEGO RAG Mongo collections; default is dry-run")
    parser.add_argument("--validate-only", action="store_true", help="Validate knowledge documents without calling the embedding API")
    args = parser.parse_args()

    errors, chunks = validate_knowledge_dir(args.knowledge_dir)
    if errors:
        raise SystemExit("Knowledge validation failed:\n- " + "\n- ".join(errors))
    print(f"Knowledge validation passed: {len(chunks)} published sections ready for indexing.")
    if args.validate_only:
        return

    load_repo_env({"AI_MODEL_API_URL", "AI_MODEL_API_KEY", "MONGO_URI", "MONGO_DB"})
    database_name = os.getenv("MONGO_DB", "").strip()
    if args.write and not database_name:
        raise SystemExit("MONGO_DB is not configured in the repo-root .env")

    embedding_model = configured_embedding_model()
    version = index_version(chunks, embedding_model)
    vectors = embed([str(chunk["text"]) for chunk in chunks], "")
    records = build_records(chunks, vectors, version, embedding_model)
    print(f"Prepared {len(records)} source-attributed chunks; dimensions={records[0]['embeddingDimensions']}; version={version[:12]}")
    print(f"Sources={len({citation['url'] for record in records for citation in record['citations']})}; no user or pet records are read.")

    if args.write:
        write_index(records, version, database_name)
    else:
        print("Dry run only; use --write to upsert into the two dedicated RAG collections.")


if __name__ == "__main__":
    main()
