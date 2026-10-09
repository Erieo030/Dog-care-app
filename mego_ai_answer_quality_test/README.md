# MEGO AI 回答品質評估

本資料夾獨立保存本輪評估題目、回答、人工判讀與報告素材；不混入論文正文、既有 RAG 檢索題集或既有測試紀錄。

- PLAN.md：執行流程、測試條件、判讀方式。
- questions.csv：20 題知識庫有依據題、20 題資料不足／無毛孩紀錄題。
- run_chat_evaluation.py：本機聊天 API 批次執行器，只接受 localhost；從環境變數讀測試帳密，不保存密碼或 token。
- run_full_evaluation.py：一鍵執行 A/B 的隔離流程。它只複製發布中的 RAG 知識索引到全新 scratch DB，不複製使用者資料；測試帳號也只建立在 scratch DB，完成後刪除 scratch DB。
- prepare_judgment_pack.py：由完成的 A/B 答案建立隨機 X/Y 內容盲判表，另產生引用與安全判讀表；條件對照金鑰獨立封存。
- run_retrieval_preflight.py：逐題預檢檢索觸發與命中段落，不呼叫聊天 API、不需要登入。
- runs/：每次執行的環境快照、檢索結果與模型回答。
- judgments/：兩位判讀者分開填寫的紀錄。
- reports/：彙整結果與例題。

正式 A/B 執行不得指向正在使用的應用資料庫；一鍵流程會建立隨機名稱的隔離資料庫，複製 active RAG index，並在兩個條件中使用同一份索引。不得記錄密碼、Token、API key 或真實使用者資料。

於專案虛擬環境中執行下列命令。流程會在 localhost 的 18101、18102 啟動兩個暫時 API；若任一連接埠已使用就會停止，不影響既有後端。模型服務會收到本測試題目與空白測試寵物資料，不會送入真實照護紀錄：

<pre>
dog-care/bin/python mego_ai_answer_quality_test/run_full_evaluation.py
</pre>

流程會跑 A（20 題、關閉 RAG）與 B（40 題、開啟 RAG），保留回答及伺服器記錄於 runs/。完成後會刪除隔離 DB；若流程中斷，先查看 `run_status.md` 與終端訊息確認 scratch DB 清理狀態，再手動只刪除明確標記為 `mego_ai_eval_` 的本輪資料庫。每輪使用新的結果資料夾，不覆寫既有結果。後端 access log 已停用；若舊批次的除錯記錄仍含本輪臨時 ID，請勿公開分享。不要提交含機密的執行環境。

完成一輪後，使用獨立判讀流程建立盲判材料：

<pre>
dog-care/bin/python mego_ai_answer_quality_test/prepare_judgment_pack.py 批次資料夾名稱
</pre>

先由兩位判讀者各自填寫 X/Y 內容與 T2 安全判讀表；鎖定後才打開 `sealed_condition_key.json`。來源正確性另在 citation 表判讀。模型輸出不得直接當成正確答案或臨床證據。
