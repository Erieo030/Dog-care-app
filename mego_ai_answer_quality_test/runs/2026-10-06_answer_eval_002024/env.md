# A/B 聊天測試環境

- 開始時間：2026-10-06T00:20:27+08:00
- Git commit：9e1e0d73da3a242ac1881fe38d075baef6058c8b
- 文字模型：gpt-oss-120b
- Embedding model：bge-m3-embedding
- active RAG index：a58268de33a0da41804d6e853b1e3afb26a13aa32cbb9afa3d8745206600107c
- 本輪隔離資料庫：mego_ai_eval_1ab993b18c874a3f947f5c7d6ee8270c（只含 24 個知識段落與 manifest；未複製使用者資料）
- RAG Top-K / RAG timeout / LLM timeout：3 / 24 秒 / 60 秒
- Embedding／Reranker：bge-m3-embedding／bge-m3-reranker
- A：MEGO_RAG_ENABLED=false；B：MEGO_RAG_ENABLED=true
- Top-K：3；RAG timeout：24 秒；LLM timeout：60 秒
- 每日 LLM 限額：測試伺服器程序內關閉
- 測試帳號與毛孩：只建立於隔離資料庫，完成後清除；不保存 email、密碼、token 或 pet ID。
- 對話：每題新請求、history 為空。
