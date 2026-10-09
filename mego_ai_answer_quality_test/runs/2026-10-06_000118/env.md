# 題庫 RAG 預檢環境

- 日期：2026-10-06（Asia/Taipei）
- Git commit：9e1e0d7
- 文字模型設定：gpt-oss-120b（本次只執行檢索，未呼叫文字生成模型）
- RAG 設定：啟用；Top-K=3；timeout=24 秒
- LLM timeout 設定：60 秒（本次未呼叫文字生成模型）
- active index：a58268de33a0da41804d6e853b1e3afb26a13aa32cbb9afa3d8745206600107c
- 檢索流程：BM25 + Embedding + RRF + Reranker
- Embedding／Reranker：使用根目錄 .env 指定的服務；未記錄服務網址或任何金鑰。
- 帳號／毛孩：未使用；檢索預檢只讀公開 RAG 知識索引。
