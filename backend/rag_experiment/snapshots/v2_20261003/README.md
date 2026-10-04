# v2 knowledge snapshot

These five Markdown files are an exact copy of the knowledge corpus used for the v2 embedding/reranker evaluation on 2026-10-03. Do not edit them. New content belongs in `backend/rag_experiment/knowledge/`.

To reproduce v2 BM25 test-set ranking:

```bash
dog-care/bin/python backend/rag_experiment/run_bm25_baseline.py \\
  --knowledge-dir backend/rag_experiment/snapshots/v2_20261003/knowledge \\
  --questions backend/rag_experiment/evaluation/questions_v2.jsonl \\
  --split test
```

The measured test result was Recall@1 0.733, Recall@3 0.933, MRR 0.844.

SHA-256:

| File | SHA-256 |
|---|---|
| `app-health-observation.md` | `049ac2d6bee8d78b834664893bf11fb3d98a6fe6a4b9d5c15b53efd016a20d57` |
| `app-pre-vet-summary.md` | `2843ed00c52eadc21705404237e702bb1641d8de3d84725df5645e2716f274bc` |
| `care-medication-safety.md` | `8f034dede6f329b00714a2e74ffd06c8fd6bf8b5b80f9a0c67658b2dbd6f18b2` |
| `care-toxic-ingestion.md` | `f8a4ba785cbef75f3affda7796a92f599760541dd54842264942d41eab04d766` |
| `care_stool_observation.md` | `d776f961e96c721e05cbf079649d1bf4fcd474bcc2518c7f5f08dd643ba590c7` |
