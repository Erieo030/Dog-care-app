# 預檢環境快照

- 日期：2026-10-05（Asia/Taipei）
- Git commit：9e1e0d7
- 文字模型：gpt-oss-120b
- RAG：啟用
- RAG Top-K：3
- RAG timeout：24 秒
- LLM timeout：60 秒
- active index：a58268de33a0da41804d6e853b1e3afb26a13aa32cbb9afa3d8745206600107c
- Embedding／Reranker：由目前根目錄環境設定的模型服務提供；本次成功完成檢索。未將服務網址、API key 或連線資訊寫入紀錄。
- 測試帳號與毛孩：尚未設定／驗證；尚未呼叫聊天 API。

注意：正式測試時須重新記錄該輪環境；本檔只是索引與服務預檢快照，不是回答品質結果。
本批檢索預檢在題庫仍含兩題 MEGO 內部功能題時執行；確認內部路徑來源不會被送入 LLM 後，已調整題目。此批只作草擬題庫的服務可用性紀錄，不作正式題庫分析。
