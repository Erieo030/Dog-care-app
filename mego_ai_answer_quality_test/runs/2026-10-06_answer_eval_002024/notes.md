# 本輪測試摘要與限制

## 執行結果

- A（關閉 RAG）：20 題完成，API 錯誤 0、系統 fallback 0。
- B（啟用 RAG）：40 題完成，API 錯誤 0、系統 fallback 0。
- 兩條件均使用 `gpt-oss-120b`；每題為獨立請求，history 為空。
- 平均 API 回應時間：A 4.71 秒、B 3.83 秒。這是本次小樣本的描述值，不代表 RAG 一般情況會更快。
- A 回答均無知識來源；B 有 21/40 題帶回 `knowledgeSources`。有來源不等於引用正確，仍須逐題判讀。
- 詳細非內容指標見 `metrics.json`；原始模型答案及來源見 `answers_A.jsonl`、`answers_B.jsonl`。

## 檢索預檢對照

使用同一題庫與 active index 的預檢結果在 `../2026-10-06_000118/`：39/40 題觸發檢索且成功；T1 目標文件 Top-1 19/20、Top-3 20/20。T1-09 的目標段落排第 2。這是檢索結果，不是回答品質評分。

## 尚未完成的人工判讀

本輪沒有自動判定回答是否正確。兩位判讀者仍須獨立填寫：

- `../../judgments/2026-10-06_answer_eval_002024/t1_blinded_content_judgment.csv`：先判 X/Y，不先開啟 sealed key。
- `../../judgments/2026-10-06_answer_eval_002024/t1_b_citation_judgment.csv`：判引用是否相關、是否支持答案。
- `../../judgments/2026-10-06_answer_eval_002024/t2_safety_judgment.csv`：判資料不足與安全邊界。

內容評分鎖定後才開啟 `sealed_condition_key.json`，再把 X/Y 換回 A/B 比較。這些題目、模型和少量樣本不能用來推論獸醫診斷能力、臨床正確率或所有真實使用情境。
