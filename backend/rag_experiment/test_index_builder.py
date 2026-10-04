from __future__ import annotations

import sys
import tempfile
import unittest
import json
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from build_mongo_index import build_records, index_version, load_chunks
from knowledge_workflow import validate_document, validate_knowledge_dir
from run_bm25_baseline import parse_markdown


SAMPLE = """---
id: sample-doc
title: 測試文件
version: 1.0
category: care_knowledge
audience: owner
species: dog
tags: [照護, 測試]
status: published
jurisdiction: international
editorial_review_status: reviewed
editorial_reviewed_by: Test reviewer
editorial_reviewed_at: 2026-10-03
clinical_review_status: not_reviewed
source:
  - https://example.org/article # source note
---

## 測試段落
<!-- sources:
- https://example.org/section-specific
-->

來源可追溯的段落文字。
"""


class IndexBuilderTests(unittest.TestCase):
    def test_chunk_preserves_citations_and_text(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            path = Path(temp_dir) / "sample.md"
            path.write_text(SAMPLE, encoding="utf-8")
            chunks = parse_markdown(path)

        self.assertEqual(len(chunks), 1)
        self.assertEqual(chunks[0]["sources"], ["https://example.org/section-specific"])
        self.assertEqual(chunks[0]["section"], "測試段落")
        self.assertIn("來源可追溯的段落文字", chunks[0]["text"])

    def test_index_version_changes_with_source_or_content(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            path = Path(temp_dir) / "sample.md"
            path.write_text(SAMPLE, encoding="utf-8")
            initial = load_chunks(Path(temp_dir))
            original_version = index_version(initial)
            path.write_text(SAMPLE.replace("example.org/section-specific", "example.org/updated"), encoding="utf-8")
            changed = load_chunks(Path(temp_dir))

        self.assertNotEqual(original_version, index_version(changed))

    def test_index_record_keeps_citations_with_chunk(self):
        chunk = {
            "doc_id": "sample-doc", "title": "測試文件", "document_version": "1.0",
            "section": "測試段落", "text": "測試內容", "sources": ["https://example.org/article"],
            "category": "care_knowledge", "audience": "owner", "species": "dog",
            "jurisdiction": "international", "tags": ["照護"],
        }
        record = build_records([chunk], [[0.1, 0.2]], "version-hash")[0]
        self.assertEqual(record["citations"][0]["url"], "https://example.org/article")
        self.assertEqual(record["citations"][0]["kind"], "external")
        self.assertEqual(record["embeddingDimensions"], 2)
        self.assertEqual(record["jurisdiction"], "international")
        self.assertEqual(record["tags"], ["照護"])

    def test_published_document_requires_editorial_review_and_valid_source(self):
        invalid = SAMPLE.replace("editorial_review_status: reviewed", "editorial_review_status: pending")
        invalid = invalid.replace("https://example.org/article # source note", "not-a-valid-source")
        with tempfile.TemporaryDirectory() as temp_dir:
            path = Path(temp_dir) / "sample.md"
            path.write_text(invalid, encoding="utf-8")
            errors, _ = validate_document(path)
        self.assertTrue(any("pass editorial review" in error for error in errors))
        self.assertTrue(any("source must be" in error for error in errors))

    def test_draft_is_excluded_from_published_index(self):
        draft = SAMPLE.replace("status: published", "status: draft").replace(
            "editorial_review_status: reviewed", "editorial_review_status: pending"
        ).replace("editorial_reviewed_by: Test reviewer", 'editorial_reviewed_by: ""').replace(
            "editorial_reviewed_at: 2026-10-03", "editorial_reviewed_at: null"
        )
        with tempfile.TemporaryDirectory() as temp_dir:
            path = Path(temp_dir) / "sample.md"
            path.write_text(draft, encoding="utf-8")
            errors, chunks = validate_knowledge_dir(Path(temp_dir))
            published_errors, published_chunks = validate_knowledge_dir(Path(temp_dir), published_only=True)
        self.assertEqual(errors, [])
        self.assertEqual(chunks, [])
        self.assertTrue(published_errors)
        self.assertEqual(published_chunks, [])

    def test_provisional_question_set_has_valid_unique_targets(self):
        evaluation_path = Path(__file__).resolve().parent / "evaluation" / "questions_v4_internal_provisional.jsonl"
        question_rows = [json.loads(line) for line in evaluation_path.read_text(encoding="utf-8").splitlines() if line.strip()]
        chunks = [
            chunk
            for path in sorted((Path(__file__).resolve().parent / "knowledge").glob("*.md"))
            for chunk in parse_markdown(path)
        ]
        ids = [row["id"] for row in question_rows]
        self.assertEqual(len(question_rows), 34)
        self.assertEqual(len(ids), len(set(ids)))
        self.assertEqual(sum(row["expected_doc"] == "NONE" for row in question_rows), 10)
        for row in question_rows:
            if row["expected_doc"] == "NONE":
                self.assertEqual(row["expected_section"], "")
                continue
            self.assertTrue(any(
                chunk["doc_id"] == row["expected_doc"] and chunk["section"] == row["expected_section"]
                for chunk in chunks
            ), row["id"])

    def test_v5_health_knowledge_questions_have_valid_targets_and_splits(self):
        evaluation_path = Path(__file__).resolve().parent / "evaluation" / "questions_v5_health_knowledge.jsonl"
        question_rows = [json.loads(line) for line in evaluation_path.read_text(encoding="utf-8").splitlines() if line.strip()]
        chunks = [
            chunk
            for path in sorted((Path(__file__).resolve().parent / "knowledge").glob("*.md"))
            for chunk in parse_markdown(path)
        ]
        ids = [row["id"] for row in question_rows]
        target_docs = {"care-canine-vaccination", "care-canine-parasite-prevention", "care-canine-nutrition-weight"}
        self.assertEqual(len(question_rows), 24)
        self.assertEqual(len(ids), len(set(ids)))
        self.assertEqual({row["split"] for row in question_rows}, {"dev", "test"})
        self.assertEqual(sum(row["expected_doc"] == "NONE" for row in question_rows), 6)
        self.assertEqual(sum(row["expected_doc"] == "NONE" and row["split"] == "dev" for row in question_rows), 3)
        self.assertEqual(sum(row["expected_doc"] == "NONE" and row["split"] == "test" for row in question_rows), 3)
        for row in question_rows:
            if row["expected_doc"] == "NONE":
                self.assertEqual(row["expected_section"], "")
                continue
            self.assertIn(row["expected_doc"], target_docs)
            self.assertTrue(any(
                chunk["doc_id"] == row["expected_doc"] and chunk["section"] == row["expected_section"]
                for chunk in chunks
            ), row["id"])

    def test_medication_citations_are_not_misattributed_to_fish_oil_page(self):
        doc_path = Path(__file__).resolve().parent / "knowledge" / "care-medication-safety.md"
        sections = parse_markdown(doc_path)
        confirmation = next(chunk for chunk in sections if chunk["section"] == "把用藥問題交給獸醫確認")
        self.assertIn("https://www.fda.gov/animal-veterinary/safety-health/frequently-asked-questions-about-animal-drugs", confirmation["sources"])
        self.assertNotIn("https://vcahospitals.com/know-your-pet/fish-", confirmation["sources"])
        self.assertFalse(any("vcahospitals.com" in source for chunk in sections for source in chunk["sources"]))


if __name__ == "__main__":
    unittest.main()
