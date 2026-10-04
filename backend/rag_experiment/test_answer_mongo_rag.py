from __future__ import annotations

import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent))

from answer_mongo_rag import (
    NO_EVIDENCE_ANSWER,
    generate_answer,
    parse_model_json,
    prepare_evidence,
    validate_answer_payload,
)


class CitationAnswerTests(unittest.TestCase):
    def test_evidence_gets_stable_source_ids_and_url_mapping(self):
        results = [{
            "document_title": "照護文件",
            "section": "用藥安全",
            "text": "請依獸醫指示。",
            "citations": [
                {"title": "avma.org", "url": "https://avma.org/guide", "kind": "external"},
                {"title": "avma.org", "url": "https://avma.org/guide", "kind": "external"},
            ],
        }]
        sources, evidence = prepare_evidence(results)
        self.assertEqual([source["source_id"] for source in sources], ["S1"])
        self.assertEqual(evidence[0]["source_ids"], ["S1"])
        self.assertEqual(sources[0]["url"], "https://avma.org/guide")
        self.assertEqual(sources[0]["kind"], "external")

    def test_rejects_missing_or_unknown_citations(self):
        with self.assertRaisesRegex(ValueError, "no valid source citation"):
            validate_answer_payload({"answer": "請詢問獸醫。", "citations": []}, {"S1"})
        with self.assertRaisesRegex(ValueError, "unknown source IDs"):
            validate_answer_payload(
                {"answer": "請詢問獸醫。[S9]", "citations": ["S9"]}, {"S1"}
            )

    def test_answer_level_citations_are_enough_but_inline_ids_must_be_declared(self):
        result = validate_answer_payload(
            {"answer": "請依醫師指示。", "citations": ["S1"]}, {"S1"}
        )
        self.assertEqual(result["citations"], ["S1"])
        with self.assertRaisesRegex(ValueError, "missing from its citations"):
            validate_answer_payload(
                {"answer": "請詢問獸醫。[S1]", "citations": ["S2"]}, {"S1", "S2"}
            )

    def test_allows_no_evidence_fallback_without_citation(self):
        result = validate_answer_payload({"answer": NO_EVIDENCE_ANSWER, "citations": []}, {"S1"})
        self.assertEqual(result["citations"], [])

    def test_rejects_empty_answer_and_cited_no_evidence_fallback(self):
        with self.assertRaisesRegex(ValueError, "must not be empty"):
            validate_answer_payload({"answer": "  ", "citations": ["S1"]}, {"S1"})
        with self.assertRaisesRegex(ValueError, "must not include citations"):
            validate_answer_payload({"answer": NO_EVIDENCE_ANSWER, "citations": ["S1"]}, {"S1"})

    def test_parser_handles_list_content_and_rejects_invalid_json(self):
        parsed = parse_model_json([{"text": '{"answer":"可查看來源。","citations":'}, {"text": '["S1"]}'}])
        self.assertEqual(parsed["citations"], ["S1"])
        with self.assertRaises(ValueError):
            parse_model_json("not json")

    @patch("answer_mongo_rag.post_json")
    @patch("answer_mongo_rag.load_repo_env")
    def test_generation_returns_only_model_cited_sources(self, load_env, post):
        import os

        previous_model = os.environ.get("AI_MODEL_NAME")
        os.environ["AI_MODEL_NAME"] = "test-model"
        post.return_value = {
            "model": "test-model",
            "choices": [{"message": {"content": '{"answer":"先確認產品是否適合。","citations":["S1"]}'}}],
        }
        retrieval = {"results": [
            {"document_title": "魚油", "section": "安全", "text": "先確認適用性。", "citations": [
                {"title": "VCA", "url": "https://example.test/fish-oil", "kind": "external"},
            ]},
            {"document_title": "其他", "section": "其他", "text": "其他資料。", "citations": [
                {"title": "內部指南", "url": "frontend/guide.md", "kind": "internal"},
            ]},
        ], "retrieval_method": "test", "index_version": "v1"}
        try:
            result = generate_answer("魚油問題", retrieval)
        finally:
            if previous_model is None:
                os.environ.pop("AI_MODEL_NAME", None)
            else:
                os.environ["AI_MODEL_NAME"] = previous_model
        self.assertEqual([source["url"] for source in result["sources"]], ["https://example.test/fish-oil"])
        self.assertEqual(result["sources"][0]["kind"], "external")
        load_env.assert_called_once()
        post.assert_called_once()

    @patch("answer_mongo_rag.post_json")
    @patch("answer_mongo_rag.load_repo_env")
    def test_empty_retrieval_does_not_call_text_model(self, load_env, post):
        result = generate_answer("沒有資料的問題", {"results": [], "retrieval_method": "test"})
        self.assertEqual(result["answer"], NO_EVIDENCE_ANSWER)
        self.assertEqual(result["sources"], [])
        load_env.assert_not_called()
        post.assert_not_called()

    def test_parses_json_code_fence(self):
        parsed = parse_model_json('```json\n{"answer":"根據資料。[S1]","citations":["S1"]}\n```')
        self.assertEqual(parsed["citations"], ["S1"])


if __name__ == "__main__":
    unittest.main()
