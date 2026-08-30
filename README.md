# MEGO

MEGO 是一個幫飼主整理狗狗日常照護資料的手機 App。

它不是要你每天填很多表格，而是在真的有需要時，快速記下體重、身體異常、就醫內容或提醒。完成的重要操作會整理到同一條時間軸，之後要回想「什麼時候開始吐？上次看醫生是何時？最近體重有沒有變？」會比較容易。

MEGO 是照護紀錄工具，不是獸醫診斷系統，也不提供藥物或治療建議。

## 現在可以做什麼

- 註冊、登入及登出帳號。
- 建立多隻毛孩，切換、編輯或刪除毛孩資料。
- 查看首頁健康儀表板、今日提醒、最近體重、健康事件及就醫摘要。
- 新增、編輯與刪除體重，查看歷史、差異和趨勢圖。
- 快速記錄嘔吐、排便、食慾、精神和喝水異常。
- 保存就醫日期、醫院、獸醫、治療說明、費用及多筆藥物。
- 建立一般提醒或回診提醒，完成、延後、略過及設定重複週期。
- 在 Android／iOS 支援的環境排程手機本機通知。
- 把提醒、健康異常、體重及就醫紀錄整合到時間軸。
- 上傳健康照片附件，並在詳細頁與時間軸查看。
- 搜尋與篩選體重、健康事件、就醫及提醒資料。
- 匯出不含圖片的 PDF 健康照護報告（可選最近 30 天、90 天或全部紀錄）。
- 在設定中心管理毛孩入口、通知、匯出、隱私說明及登出。
- 使用 MEGO AI 主頁建立或開啟最多 5 個獨立對話 Session；最近對話支援左滑刪除。
- 直接查詢既有照護資料不使用 LLM，也不計入每日 AI 次數；跨資料整理才使用 LLM 額度。

## 專案由什麼組成

- `frontend/`：目前使用中的 Expo／React Native App。
- `backend/`：FastAPI API，入口是 `backend/main.py`。
- MongoDB 7：保存帳號、毛孩與健康紀錄。
- Mongo Express：只供本機開發查看資料。
- `dog-care/`：本機 Python 虛擬環境，不是另一套 App，也不應提交到 Git。

技術版本：Expo 54、React Native 0.81、React 19、FastAPI、PyMongo、MongoDB 7。

## 開始前需要

- Linux 或可執行 Bash 的環境
- Docker 與 Docker Compose
- Python 3
- Node.js 與 npm
- Android／iOS 手機或模擬器（若要測試 App）

TODO：正式支援的最低 Node.js、Python、Android 及 iOS 版本尚未確認。

## 第一次 clone 後

```bash
git clone <repository-url>
cd Dog-care-app
cp backend/.env.example backend/.env
cd frontend && npm ci
cd ..
python3 -m venv dog-care
dog-care/bin/python -m pip install -r backend/requirements.txt
```

接著依照下方環境變數設定，最後執行 `./start.sh`。不要把 `backend/.env`、密碼或 API key 提交到 Git。

## 第一次安裝

先建立後端環境設定：

```bash
cp backend/.env.example backend/.env
```

在 `backend/.env` 填入 MongoDB 設定：

```env
PORT=8000
MONGO_URI=mongodb://使用者名稱:密碼@localhost:27017/app_dog_db?authSource=admin
MONGO_DB=app_dog_db
MONGO_USERNAME=使用者名稱
MONGO_PASSWORD=密碼
```

不要把填有真實帳密的 `.env` 提交到 Git。

如果要手動準備依賴：

```bash
cd frontend && npm ci
cd ..
python3 -m venv dog-care
dog-care/bin/python -m pip install -r backend/requirements.txt
```

## 最簡單的啟動方式

`start.sh` 會檢查環境、啟動 MongoDB／Mongo Express、啟動 FastAPI，並以目前 LAN IP 設定 Expo API URL。手機掃 QR 前，請先用手機瀏覽器開啟它顯示的 Phone API 位址。

目前資料庫含一組展示測試資料。帳號密碼請使用交付訊息中的資料；不要把密碼寫入 Git 或正式文件。資料重置只適用測試環境。

```bash
./start.sh
```

## 展示測試帳號

目前資料庫已建立一組展示資料，涵蓋主要功能。帳號密碼請使用交付訊息中的資料；不要把密碼寫入 Git 或正式文件。

資料重置會清除所有 MongoDB application collections，僅可在展示或測試環境執行，並應重新執行型別、後端與 API 檢查。

它會準備並啟動：

- MongoDB
- Mongo Express
- FastAPI
- Expo Metro

常用位置：

| 服務 | 位址 |
| --- | --- |
| FastAPI | `http://localhost:8000` |
| API 文件 | `http://localhost:8000/docs` |
| Mongo Express | `http://localhost:8082` |
| 手機 API | 以 `start.sh` 終端顯示為準 |

手機與開發電腦若不在可互通的網路，可嘗試：

```bash
EXPO_CONNECTION=tunnel ./start.sh
```

注意：Expo tunnel 只處理 App bundle，手機仍然必須能連到 FastAPI API。

## 停止服務

在執行 `start.sh` 的終端按 `Ctrl+C`，可停止 Expo 與 FastAPI。

MongoDB 與 Mongo Express 需另外停止：

```bash
docker compose --env-file backend/.env -f backend/docker-compose.yml down
```

這會保留 MongoDB volume。除非確定要永久刪除本機資料，否則不要使用 `down -v`。

## 開發檢查

```bash
bash -n start.sh
cd frontend && ./node_modules/.bin/tsc --noEmit
cd .. && dog-care/bin/python -m compileall -q backend/app
git diff --check
```

目前已設定 lint、Prettier、前端 Jest、後端 pytest 與 GitHub Actions CI。

## 常見問題

### 手機掃描 QR code 後停在 Opening project

- 手機和開發電腦必須能互相連線。
- VM 的 Host-only IP 和手機 Wi-Fi IP 通常不在同一網段。
- 先用手機瀏覽器開啟 `start.sh` 顯示的 Phone API。
- IP 變更後重新執行 `start.sh`，不要沿用舊 QR code。
- 必要時改用 Expo tunnel，但 FastAPI 仍需有手機可連線的位址。

### 顯示 Network request failed

檢查 `frontend/.env`：

```env
EXPO_PUBLIC_API_URL=http://手機可連到的電腦IP:8000
```

也要確認防火牆沒有阻擋 TCP 8000。

### App 重開後需要重新登入

目前 session 只存在記憶體，尚未完成安全的登入狀態持久化。

### 通知沒有出現

- 確認系統通知權限已開啟。
- 到「設定」確認手機通知權限與照護提醒已開啟。
- Local Notification 需要 Android／iOS 實機環境驗證。
- 關閉手機提醒不會刪除 App 內的 Reminder。

### 圖片或匯出檔案消失

目前附件與匯出檔案使用專題開發環境的本機儲存方式，不是 Cloud Backup。匯出檔應完成後立即分享或儲存到使用者選擇的位置。

## 目前已知限制

- 現行 `userId` 仍由前端傳入，不等於完整安全認證。
- 正式密碼雜湊、JWT／Session、忘記密碼及 Email 驗證尚未完成。
- 目前固定使用淺色介面，外觀設定功能已移除。
- Local Notification、分享、檔案下載及小螢幕版面仍需實機完整驗收。
- 匯出工作狀態目前保存在單一 FastAPI process 記憶體。
- 沒有 Cloud Backup、Push Notification Server、OCR 或醫療判讀；AI 功能目前已接入受額度限制的外部模型服務。
- 正式 TLS、監控、備份、Production build 與 App Store 發布尚未完成。

更多架構與規劃：

- [ARCHITECTURE.md](ARCHITECTURE.md)
- [ROADMAP.md](ROADMAP.md)
- [adjust.txt](adjust.txt) 是需求與候選方案，不代表每次都要一次完成全部項目。

## 最新進度（2026-08）

- Home 首屏 API 已分級：Dashboard 先載入，AI health monitor 背景載入，不阻塞首頁。
- 登入背景與首頁背景已提供 WebP 壓縮版本：`frontend/assets/home-scene/login.webp`、`background.webp`；原 PNG 保留作為來源。
- Login／Register 使用一致的米白、輕量欄位與 terracotta CTA presentation。
- AI 助手支援 deterministic routing、必要時 LLM 與每日帳號次數額度；token 只保留後端內部統計，不作前端限額。
- AI Tab 與首頁 MEGO AI 入口固定開啟 AI 主頁；Session 由使用者主動選擇，不自動回到上次對話。
- 日期與時間欄位改用自製 Calendar／Time Modal；日期預設今天並拒絕 2000 年以前資料，避免 1970 年 picker 問題。
- 就醫與健康異常只記錄日期；提醒及用藥提醒時間只保留到分鐘。
- 疫苗、驅蟲、用藥、就醫紀錄支援複製新增，常用欄位已依一般飼主情境精簡。
- MongoDB healthcheck timeout 已提高至 15 秒，避免初始化較慢時誤判未 ready。

## 工程品質

目前可執行 TypeScript、ESLint、Prettier、Jest、Python smoke test 與 pytest；GitHub Actions 也會執行基本檢查。

```bash
cd frontend && npm run typecheck
cd .. && PYTHONPATH=backend dog-care/bin/python -m unittest discover -s backend/tests
```

## 介面與工程品質現況

目前主要畫面已統一成溫暖、簡潔、容易點選的風格，包含首頁、健康紀錄、提醒、時間軸、搜尋、匯出、設定與協尋流程。表單欄位及主要按鈕已加大，方便手機操作。


> 目前版本先固定使用淺色介面；設定中的外觀設定功能目前已移除，避免主題切換造成不一致的畫面體驗。

## 後端穩定性補充

FastAPI 現在會統一處理 HTTP 錯誤、輸入驗證錯誤與未預期例外；對外只回傳可理解訊息，不回傳 stack trace。MongoDB 啟動時會建立毛孩 ownership、子資料與日期查詢索引。毛孩刪除時會同步清理目前已支援的 Daily Log、體重、健康異常、就醫、疫苗、驅蟲、用藥、提醒、時間軸、附件與協尋設定。

## API 格式

前端 service 已集中處理新的 `{ success, message, data }` 回應，也能相容目前部分舊格式。新增或修改 API 時請同步更新後端 schema、前端 service 與測試；既有模組會依批次逐步遷移。

目前 Auth、Pet、Weight、Daily Log 已採用新的 API `data` envelope；其他模組會分批遷移，期間前端仍支援舊格式。

Health Event、Medical Visit、Reminder 的主要 API 也已完成 `data` envelope 遷移；刪除操作維持 204 回應。

Vaccination、Deworming、Medication API 已完成新的 `data` response envelope，前端仍由 service layer 負責相容解包。

Timeline 與 Lost Pet 私有管理 API 已完成 `data` envelope；檔案下載、圖片內容與公開 HTML 仍維持檔案／HTML 回應，不套用 JSON envelope。

## App 大小與效能優化

目前已明確啟用 Hermes，圖片選取時先以較低品質進入後續壓縮流程，減少高解析原圖的記憶體壓力。`dist/`、build、Pods 與 `node_modules/` 已排除，不會納入 Git；未引用的 placeholder 檔案暫不刪除，避免破壞未知相容流程。

## 最近效能清理
首頁提醒入口改為「接下來 7 天待做」；完整提醒事項仍由「紀錄 → 提醒」管理。首頁「今天待做」會依內容導向提醒或健康異常；同時存在時提供選擇。健康觀察數量來自最近 30 天健康監測警示，不等同原始紀錄筆數。

後端新產生的時間、提醒判斷與服務 log 統一以台灣時區（UTC+8）處理；目前資料庫保留 2 個展示帳號與每個功能 10 筆測試資料。

健康異常、就醫、體重、疫苗、驅蟲、用藥、提醒、時間軸與搜尋列表已改用 `FlatList`，並統一設定初始渲染數、批次大小、視窗範圍與裁切非可見項目；保留既有刷新、空狀態、錯誤重試與導覽行為。

主要列表已共用 `ScreenState` 處理初始 Loading；匯出服務會在後端啟動時清理超過 7 天的已完成／失敗／取消匯出檔。Android production bundle 已實測輸出，約 3.85 MB（Hermes bundle）；`dist/` 僅為產物且不納入 Git。

狗狗身份 QR 為固定公開身份連結；QR 本身只含隨機 token URL，不含帳號、密碼或健康紀錄。飼主可選擇公開毛孩欄位與聯絡方式，掃描頁以中文分組顯示，平時即可使用，不限定走失情境。

## AI 基礎層（目前版本）

MEGO 已提供零 API 成本的 AI Data Foundation 與 Rule-based Health Monitor。後端會依毛孩資料產生有限範圍的健康 Context，再以固定規則整理可追溯的觀察趨勢。此層不使用 LLM、外部模型服務、向量資料庫或 AI 診斷。

目前只描述紀錄中觀察到的模式，不提供疾病診斷、用藥建議或治療方案。

## AI-M3 健康摘要（可選）

MEGO 的 AI-M3 由 FastAPI 管理 LLM Provider，手機不會接觸 外部模型服務金鑰。設定 `backend/.env` 的 `AI_MODEL_API_KEY` 後，可使用 `AI_MODEL_NAME`（預設 `gemma-4-26b-a4b`）產生 7／30／90 日健康摘要；未設定金鑰、服務失敗、逾時或模型回傳格式不正確時，會自動改用 deterministic 基本摘要，核心紀錄仍可正常使用。摘要只整理已記錄內容，不提供診斷或用藥建議。

## AI-M4 MEGO AI 助手

AI 助手支援毛孩紀錄查詢與一般問題。問題先經固定 Intent Router；明確的毛孩紀錄查詢使用 deterministic 回覆，不消耗 LLM 次數，健康摘要與一般問題使用 LLM。疾病確診、處方、藥物劑量與停藥等高風險要求仍會拒絕。每日次數限制預設關閉；設定 `AI_DAILY_REQUEST_LIMIT_ENABLED=true` 後，可用 `AI_DAILY_REQUEST_LIMIT` 調整。前端顯示已用與剩餘次數，不設定 token 上限。每隻毛孩最多保留 5 個本機 Session，第 6 個建立前會提示將刪除的最舊對話。

## AI-M5 就醫前摘要與健康報告

「就醫前摘要」會依 7／30／90 天整理毛孩資料、體重、日常紀錄、健康異常、用藥、就醫、疫苗、驅蟲與健康觀察。可在 App 分享純文字。Export Center 目前固定匯出不含圖片的 PDF 健康照護報告；報告包含固定資料摘要，不呼叫 LLM。內容只供就醫溝通，不是診斷或處方。

## Home 品牌與背景

首頁使用 `frontend/assets/home-scene/background.webp` 作為單一自然背景，`frontend/assets/home-scene/logo.png` 作為 Header 品牌識別。首頁不載入人物、狗狗、Treehouse 或 branch 裝飾。

## 外部 AI Model Service

目前 AI 不在 MEGO Backend 執行。Self-hosted Model API 是目前正式 Provider。Backend 透過 `AI_MODEL_API_URL` 呼叫外部 OpenAI-compatible 服務：文字模型預設 `gemma-4-26b-a4b`（PawBrain）。金鑰只放 `backend/.env`，App 不直接呼叫外部服務。未設定服務或服務失敗時，AI 功能回傳友善錯誤或既有 deterministic 結果；不影響一般 CRUD。

## 重要環境設定

Backend 的秘密與部署設定放在 `backend/.env`：MongoDB、`AI_MODEL_API_KEY`、外部模型 URL、模型名稱、timeout、CORS、公開 URL 與 App metadata。Frontend 只使用 `frontend/.env` 的公開設定，例如 `EXPO_PUBLIC_API_BASE_URL`、`EXPO_PUBLIC_API_URL`、`EXPO_PUBLIC_LOST_PET_BASE_URL`；不要放 API key。`./start.sh` 會依區網自動更新前端 API 位址，正式環境請改用明確的 HTTPS URL。

### Env 必填／選填

Backend：`MONGO_URI`、`MONGO_DB` 是啟動必填。`MONGO_USERNAME`、`MONGO_PASSWORD` 在使用 Docker 預設值時可省略。`AI_MODEL_API_URL` 與 `AI_MODEL_API_KEY` 是 AI 外部服務選填；未設定時仍可使用 deterministic fallback。

Frontend：`EXPO_PUBLIC_API_URL` 是手機連線必填，`./start.sh` 會自動設定。`EXPO_PUBLIC_API_BASE_URL` 可選填固定 API 位址；`EXPO_PUBLIC_LOST_PET_BASE_URL` 與 `EXPO_PUBLIC_ENABLE_AI` 都是選填。不要在任何 `EXPO_PUBLIC_` 變數放 API Key 或密碼。


## 搜尋

搜尋欄可快速以關鍵字查找資料；「進階搜尋」可展開日期、類型、醫院／醫師、體重、附件與提醒狀態等篩選。


## AI 配置與用量控制

- Provider：self-hosted OpenAI-compatible Model API。
- Endpoint：`AI_MODEL_API_URL`，Backend 呼叫 `/v1/chat/completions`。
- 文字模型：`AI_MODEL_NAME`，預設 `gemma-4-26b-a4b`。
- API 金鑰：只放在 `backend/.env` 的 `AI_MODEL_API_KEY`，不進入 App。
- 明確查詢先走 deterministic，不消耗 LLM；模糊／跨資料摘要才呼叫 LLM。
- 單次 LLM completion 不由 MEGO Backend 限制，實際上限由外部模型服務決定。
- 每日 AI 請求限制預設關閉；`AI_DAILY_REQUEST_LIMIT_ENABLED=true` 時，使用 `AI_DAILY_REQUEST_LIMIT`（預設 20）限制。
- 不設定每日 token 顯示預算；後端可保留 token 使用量作內部監測，前端只顯示每日次數。
- 外部服務不可用、逾時或輸出格式錯誤時，摘要使用 deterministic fallback。
- AI 前端請求 timeout 為 45 秒；Backend 模型 timeout 為 45 秒。
- 語音轉文字功能已移除；AI 目前只支援文字對話與健康整理。
- 日期／時間欄位統一使用前端自製 JavaScript Modal。 日曆可點擊年月標題，以年份網格快速切換，避免逐月操作。
