# MEGO RAG 離線原型（第 1–4 階段）

此資料夾放知識文件、評估題與離線檢索實驗，不會接入正式聊天 API，也不會讀取飼主或毛孩資料。

## 初始範圍

- 犬隻一般知識：便便觀察、常見食物／物品誤食、用藥／營養補充品安全、一般症狀何時聯絡獸醫。
- App 操作知識：健康觀察的程式規則、就醫前摘要的操作方式。
- 照護知識保留原始文件來源連結；RAG 引用表示內容出處，不代表內容經獸醫審核或等同個別醫療建議。
- App 操作文件依現有程式整理，由開發端審閱，不代表醫療建議。

## 執行 BM25 基準

```bash
dog-care/bin/python backend/rag_experiment/run_bm25_baseline.py
```

程式只使用 Python 標準函式庫。它以簡易詞元化與 BM25 排序，輸出 `dev`／`test` 各自的 Recall@1、Recall@3、MRR，以及未標準答案題目的 Top-1 分數供觀察；不會自行決定拒答門檻。結果依小型人工題集解讀，不視為醫療正確率。

## 執行外接 Embedding／Reranker 比較

```bash
dog-care/bin/python backend/rag_experiment/run_embedding_experiment.py

# 若服務回傳的 embedding index 格式不一致，可降低單批問題數後重試
dog-care/bin/python backend/rag_experiment/run_embedding_experiment.py --questions backend/rag_experiment/evaluation/questions_v5_health_knowledge.jsonl --embedding-batch-size 4
```

此實驗使用根目錄 `.env` 的共用 `AI_MODEL_API_URL`／`AI_MODEL_API_KEY`，或各自覆寫的 `AI_EMBEDDING_API_URL`／`AI_EMBEDDING_API_KEY`、`AI_RERANK_API_URL`／`AI_RERANK_API_KEY`。文字回答可另設 `AI_CHAT_API_URL`／`AI_CHAT_API_KEY`。模型名稱由 `AI_EMBEDDING_MODEL`、`AI_RERANK_MODEL` 控制，預設為 `bge-m3-embedding`、`bge-m3-reranker`；更換 Embedding 模型後必須用新模型重建索引，Reranker 可獨立更換。線上檢索引用段落數可由 `MEGO_RAG_TOP_K` 設定（1～10，預設 3）。此流程會把本目錄的知識段落與合成評估問題送到相應模型服務，不讀取帳號、聊天紀錄或寵物資料；Embedding 向量只保存在記憶體。請確認模型服務允許這類資料處理；呼叫是否計費依供應商方案而定。

比較 BM25、純向量、BM25 前 5 名重排及 BM25+Embedding RRF 前 5 名重排。小型題集只供原型比較，不能證明醫療正確性；NONE 題目前只檢視排序，不設定線上拒答門檻。

2026-10-03 初測：Embedding API 回傳 1024 維；測試集 15 題的 Recall@1／Recall@3／MRR，BM25 為 0.667／0.867／0.774，純向量為 0.867／1.000／0.933，BM25 top-5 重排與 RRF top-5 重排皆為 1.000／1.000／1.000。5 題 NONE 中仍有錯誤 Top-1，且只有 1 題在 dev，因此拒答分數門檻尚不能可靠校準；完美測試排序也可能來自小樣本與題目措辭，不可視為泛化或醫療品質保證。

另建 `evaluation/questions_v2.jsonl` 作擴充集：50 題，dev/test 各 25 題；標註修正後共 31 題有知識庫目標、19 題目前無直接答案。混合 RRF+reranker 的 test Recall@1／Recall@3／MRR 為 0.933／1.000／0.956。只用 dev 選出的暫定 coverage 門檻為 0.009884，在 test 為 TP=15、FN=0、TN=10、FP=0；dev 本身仍有 FN=1、FP=2。這只是小型研究者自撰題集的初步觀察；門檻只決定是否附上知識庫段落，不可用來拒絕一般聊天。test 題已檢視過排序，後續若依錯誤改文件或門檻，需再建立新的保留測試集。

v2 當時使用的 5 份文件已凍結在 `snapshots/v2_20261003/knowledge/`；下列方式可重現 v2 BM25 測試集結果：

```bash
dog-care/bin/python backend/rag_experiment/run_bm25_baseline.py \
  --knowledge-dir backend/rag_experiment/snapshots/v2_20261003/knowledge \
  --questions backend/rag_experiment/evaluation/questions_v2.jsonl \
  --split test
```

依 dev 錯誤修訂了補充品同義詞／內容，並新增一般就醫警訊草稿。用 10 題 `evaluation/questions_v3_dev.jsonl` 只測 dev 的最近一次完整結果：BM25 為 0.900／1.000／0.933，純向量為 0.800／1.000／0.900，BM25 top-5 重排與 RRF top-5 重排皆為 0.900／1.000／0.950（Recall@1／Recall@3／MRR）。固定 22 段相同文字的 Embedding 重複呼叫 cosine min／mean 均為 1.000000，支援本次向量結果可重現；開發期間曾遇到一次暫時性 HTTP 429，加入有限重試後恢復。這是小型 dev 集，僅供修訂，不可視為泛化保證；尚未用新文件測盲測集，也沒有沿用 v2 門檻。

新的獨立盲測題尚待外部評估者提供，題型與封存流程見 `evaluation/EXTERNAL_HOLDOUT_GUIDE.md`。

## 建立可引用的 MongoDB 知識索引

### 第一版文件工作流（新增、審核、發布、更新與撤回）

文件格式範本在 `KNOWLEDGE_TEMPLATE.md`。每篇知識文件須有穩定 `id`、標題、主題、對象、物種、tags、來源、適用地區、版本與狀態；每個內容段落使用 `##` 標題，並以 `<!-- sources: ... -->` 標記直接支持該段的來源。來源可為可追溯的 `http(s)` 網址或存在於專案內的相對檔案路徑。驗證只檢查 URL 格式，不會保證網站仍可用或證明來源論點正確。

文件狀態：

- `draft`：可驗證與本機預覽，不會進入正式索引。
- `published`：必須通過編輯／來源對應檢查，並填 `editorial_review_status: reviewed`、審閱者與日期，才會進入索引。
- `retired`：保留文件與 Git 歷史，但不進入新索引。重新發布前需再次審閱。

`editorial_review_status` 表示文件格式、來源與整理內容經維護者檢查；`clinical_review_status: not_reviewed` 明確表示沒有獸醫臨床審閱，不可把引用或發布狀態誤當成臨床背書。若由獸醫審閱，才可記錄其審閱狀態與身分。

建議新增／更新步驟：

```bash
# 1. 複製範本建立新文件，維持 status: draft
# 2. 驗證全部文件格式、來源與段落
dog-care/bin/python backend/rag_experiment/knowledge_workflow.py

# 3. 預覽草稿切分結果與每段引用
dog-care/bin/python backend/rag_experiment/knowledge_workflow.py --preview dog-topic-short-name --include-nonpublished

# 4. 人工核對來源與段落後，將 status 改為 published，並填審閱欄位
# 5. 只驗證正式發布文件，不呼叫 embedding API
dog-care/bin/python backend/rag_experiment/build_mongo_index.py --validate-only

# 6. 預設 dry-run（會呼叫 embedding API，但不寫 Mongo）
dog-care/bin/python backend/rag_experiment/build_mongo_index.py

# 7. 確認輸出後發布新 active index
dog-care/bin/python backend/rag_experiment/build_mongo_index.py --write

# 8. 查詢抽查新知識與引用
dog-care/bin/python backend/rag_experiment/query_mongo_index.py "測試問題" --limit 3
```

更新已發布文件時，修改來源或內容後要增加 `version`（例如 `0.1` → `0.2`），再重跑驗證、預覽、dry-run、抽查，最後才 `--write`。索引版本由文件內容、來源、分類中繼資料與 embedding 模型共同計算；Mongo 先寫入完整新版本，再切換 active manifest。舊索引版本保留，失敗時不應手動刪除舊資料。

撤回文件時，將其 `status` 改為 `retired`，確認剩餘已發布內容仍通過驗證後，重新 dry-run 並 `--write`。新 active version 不含該文件；舊版仍留在專用 RAG collection 供回溯，不會修改任何帳號、聊天、毛孩或照護資料。`KNOWLEDGE_TEMPLATE.md` 放在知識文件資料夾之外，不會被索引掃描。

若新索引發布後需要回復，先從發佈紀錄取得舊版**完整** `activeVersion`，確認該版本 chunks 數量符合舊 manifest 記錄，再只將 `rag_index_manifests` 中 `_id: "mego-care-knowledge"` 的 `activeVersion` 設回該版本。線上查詢依 manifest 的 `activeVersion` 選取 chunks；不要刪除任何版本或操作其他 collections。回復是資料庫寫入操作，執行前應確認目前連到正確的本機資料庫，並記錄回復前後的版本。

2026-10-03 新增犬隻疫苗、寄生蟲預防、營養與體重三份文件；24 個已發布段落已發布至本機 MongoDB 專用 RAG collections，active version 前綴為 `a58268de33a0`；先前版本保留供回溯。三主題的合成檢索題集在 `evaluation/questions_v5_health_knowledge.jsonl`，可用 BM25 快速檢查：

```bash
dog-care/bin/python backend/rag_experiment/run_bm25_baseline.py \\
  --questions backend/rag_experiment/evaluation/questions_v5_health_knowledge.jsonl
```

此題集共 18 題有目標段落（dev/test 各 9 題）及 6 題 NONE（dev/test 各 3 題），可用來檢查「是否附上知識段落」的暫定門檻；這不是用來拒絕一般聊天問題。BM25 dev Recall@1／Recall@3／MRR 為 0.889／1.000／0.944，test 為 0.778／1.000／0.889。這是開發者自撰的小型題集，不是獨立盲測或醫療品質證明；由於本輪已檢視兩個 split 的結果，兩者都不能再視為未觸碰的盲測集。Embedding／Reranker 與來源回答抽查結果見 [`evaluation/v5_health_knowledge_report.md`](evaluation/v5_health_knowledge_report.md)。舊 v4 中「幼犬核心疫苗時程」仍標成 NONE，現在已被新疫苗文件涵蓋，解讀歷史 v4 結果時須注意該題標註已過時。

目前這是受控的檔案工作流，不包含圖形化管理後台，也不會自動爬取 URL。來源內容需由維護者閱讀並整理；索引工具只做格式／來源映射與發布，不替代臨床審查。

```bash
# 先嵌入文件並預覽，不寫入 MongoDB
dog-care/bin/python backend/rag_experiment/build_mongo_index.py

# 確認後只寫入專用 RAG collections
dog-care/bin/python backend/rag_experiment/build_mongo_index.py --write
```

索引文件會將每個段落與其 `source` 網址／內部檔案路徑一起保存；若段落有 `<!-- sources: ... -->` 區塊，會以該段落來源為準，否則沿用文件來源。每段 citation 含來源 URL、來源類型與文件標題；外部來源的標籤先用網域名稱，避免自行杜撰文章標題。向量由內容、來源、文件版本及模型版本共同決定索引版本。Mongo 寫入只 upsert `rag_knowledge_chunks`，再更新 `rag_index_manifests` 的 active version；不刪除舊版本，也不讀寫帳號、對話、毛孩或照護紀錄。根目錄 `.env` 需有共用或對應服務的 API URL／Key；`--write` 另需 `MONGO_URI`、`MONGO_DB`。目前 active index 為 24 個段落、1024 維，version 前綴 `a58268de33a0`。

索引建置完成；查詢檢索另由下方的查詢工具負責。

## 查詢檢索與引用預覽

```bash
dog-care/bin/python backend/rag_experiment/query_mongo_index.py "狗狗可以吃魚油嗎？" --limit 3

# 結構化結果，方便後續接 API／UI
dog-care/bin/python backend/rag_experiment/query_mongo_index.py "狗狗可以吃魚油嗎？" --limit 3 --json
```

此工具讀取 active RAG 索引，混合 BM25、Embedding、RRF 與 reranker 排序，回傳段落和該段來源 URL；不生成答案、不讀取使用者資料。沒有 reranker 時會退回 RRF 結果並明確標示方式。

目前 MongoDB 負責保存段落與向量；小型原型由 Python 讀取 active chunks 並線性計算 cosine，**尚未建立 MongoDB Atlas Vector Search 索引**。資料量增加前再評估原生向量搜尋或專用向量資料庫。

## 來源約束回答原型

```bash
dog-care/bin/python backend/rag_experiment/answer_mongo_rag.py "狗狗可以吃魚油嗎？"
```

此原型會把合成問題與檢索段落送到 `.env` 設定的文字模型，要求輸出答案及 source ID 清單；App 可將 URL 另列為「參考資料」，避免在正文塞滿標記。程式只接受索引中存在的 source ID，再映射回保存的來源網址；無引用、未知 ID 或非 JSON 回應時不顯示生成內容。此檢查只能確保來源存在，不能自動證明段落確實支持回答；正式接入前仍需評估引用支持度。請勿用真實飼主或毛孩資料做原型測試。

合成 smoke tests：魚油問題只附 [VCA 魚油資料](https://vcahospitals.com/know-your-pet/fish-)；就醫前摘要問題引用 MEGO 內部說明檔；嘔吐合併站立不穩與巧克力誤食各回傳相關來源；日本入境檢疫題回覆知識庫沒有直接說明、引用為空。這只驗證少數案例的格式及來源對應，不足以證明回答品質或引用支持度。外部來源是可點開 URL；`kind=internal` 是專案內部檔案路徑，正式 UI 不應將它偽裝成公開網址。

## MEGO AI 聊天整合

一般聊天會在使用者已完成 AI 資料使用確認後，針對犬隻照護主題檢索 active index；檢索失敗、逾時或沒有可用段落時，略過 RAG evidence，仍照常呼叫一般聊天模型。這個主題判斷只決定是否嘗試檢索，不會擋住或拒絕任何問題。一般明確紀錄查詢仍維持原本零 LLM 流程。

模型只收到 RAG 段落、來源 ID 與來源標籤，不以模型生成 URL；後端只接受檢索結果中存在的來源 ID，並回傳對應來源 URL。對話畫面顯示可點選的「參考資料」，並將來源一併保存在本機 session。設定 `MEGO_RAG_ENABLED=false` 可停用檢索；`MEGO_RAG_TIMEOUT_SECONDS` 控制總檢索等待時間。這不改變使用者的 AI 資料確認流程，且不會把資料不足當作拒答門檻。

RAG 主題檢索只處理已整理的犬隻公開知識；飼主問題只有在通過既有 AI 資料確認後才會送往既有模型服務。RAG 本身不讀取使用者／毛孩資料，也不將健康紀錄寫入知識庫。

目前離線自動測試涵蓋來源 ID 去重與映射、空答案／無證據回覆、未知或未宣告引用、JSON 格式解析、只回傳模型實際引用的來源，以及沒有檢索證據時不呼叫文字模型。執行：

```bash
dog-care/bin/python -m pytest -q backend/rag_experiment/test_index_builder.py backend/rag_experiment/test_retrieval.py backend/rag_experiment/test_answer_mongo_rag.py
```

`evaluation/questions_v4_internal_provisional.jsonl` 有 34 題（24 題有目標段落、10 題目前知識庫未直接涵蓋），由開發端自行撰寫，只是內部壓力測試，不是獨立盲測。可用以下指令跑 Embedding／Reranker 檢索比較，或對 20 題有目標段落的問題與 10 題 NONE 問題分開跑生成 smoke test：

```bash
dog-care/bin/python backend/rag_experiment/run_embedding_experiment.py --questions backend/rag_experiment/evaluation/questions_v4_internal_provisional.jsonl --split dev
dog-care/bin/python backend/rag_experiment/run_answer_smoke_suite.py --expected answerable --max-questions 20
dog-care/bin/python backend/rag_experiment/run_answer_smoke_suite.py --expected none
```

2026-10-03 暫定內部測試結果與限制見 [`evaluation/v4_internal_provisional_report.md`](evaluation/v4_internal_provisional_report.md)。這不是獨立盲測；正式泛化評估仍需外部評估者另外出題。

## 評估資料

`evaluation/questions.jsonl` 共 30 題，按知識文件分層預先分成調整集與測試集；相似問法不跨集合。`expected_doc: NONE` 表示這批知識文件沒有收錄答案，不代表 MEGO 必須拒絕一般聊天問題。

## 資料與授權

照護文件以短篇幅整理公開資料並保留來源連結，不複製原文；RAG 引用用來指出資訊出處，不代表個別醫療建議或內容經獸醫審核。評估題為 MEGO 專案自行撰寫。
