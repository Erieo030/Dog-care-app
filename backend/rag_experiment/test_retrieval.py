from __future__ import annotations

import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent))

import run_embedding_experiment
from query_mongo_index import cosine, reciprocal_rank_fusion


class RetrievalTests(unittest.TestCase):
    def test_rrf_promotes_items_present_in_both_rankers(self):
        scores = reciprocal_rank_fusion([4, 2, 7], [2, 4, 8])
        ranking = sorted(scores, key=lambda index: (-scores[index], index))
        self.assertEqual(set(ranking[:2]), {2, 4})
        self.assertAlmostEqual(scores[4], scores[2])
        self.assertGreater(scores[4], scores[7])

    def test_cosine_matches_identical_vectors(self):
        self.assertAlmostEqual(cosine([1.0, 2.0], [1.0, 2.0]), 1.0)

    def test_embedding_uses_model_configured_in_environment(self):
        with patch.dict("os.environ", {"AI_EMBEDDING_MODEL": "custom-embedding"}), patch.object(
            run_embedding_experiment,
            "post_json",
            return_value={"model": "custom-embedding", "data": [{"index": 0, "embedding": [0.1, 0.2]}]},
        ) as post_json:
            vectors = run_embedding_experiment.embed(["question"], "", max_attempts=1)

        self.assertEqual(vectors, [[0.1, 0.2]])
        self.assertEqual(post_json.call_args.args[1]["model"], "custom-embedding")

    def test_reranker_uses_model_configured_in_environment(self):
        with patch.dict("os.environ", {"AI_RERANK_MODEL": "custom-reranker"}), patch.object(
            run_embedding_experiment,
            "post_json",
            return_value={"results": [{"index": 0, "relevance_score": 0.9}]},
        ) as post_json:
            ranking = run_embedding_experiment.rerank(
                "question", [{"text": "passage"}], max_attempts=1,
            )

        self.assertEqual(ranking, ([0], [0.9]))
        self.assertEqual(post_json.call_args.args[1]["model"], "custom-reranker")

    def test_service_specific_api_endpoints_override_shared_endpoint(self):
        with patch.dict("os.environ", {
            "AI_MODEL_API_URL": "https://shared.example/v1",
            "AI_MODEL_API_KEY": "shared-key",
            "AI_EMBEDDING_API_URL": "https://embedding.example/v1",
            "AI_EMBEDDING_API_KEY": "embedding-key",
            "AI_RERANK_API_URL": "https://rerank.example/v1",
            "AI_RERANK_API_KEY": "rerank-key",
        }, clear=True):
            self.assertEqual(
                run_embedding_experiment.model_api_config("embedding"),
                ("https://embedding.example/v1", "embedding-key"),
            )
            self.assertEqual(
                run_embedding_experiment.model_api_config("rerank"),
                ("https://rerank.example/v1", "rerank-key"),
            )
            self.assertEqual(
                run_embedding_experiment.model_api_config("chat"),
                ("https://shared.example/v1", "shared-key"),
            )

    def test_service_specific_api_configuration_falls_back_to_shared_endpoint(self):
        with patch.dict("os.environ", {
            "AI_MODEL_API_URL": "https://shared.example/v1/",
            "AI_MODEL_API_KEY": "shared-key",
        }, clear=True):
            self.assertEqual(
                run_embedding_experiment.model_api_config("embedding"),
                ("https://shared.example/v1", "shared-key"),
            )


if __name__ == "__main__":
    unittest.main()
