# MEGO｜毛孩照護紀錄 App

MEGO 是給寵物主人的低負擔照護紀錄 App。它把狗狗的日常觀察、健康異常、體重、就醫、疫苗、驅蟲、用藥與提醒集中管理，讓飼主能快速回顧變化，也能整理資料提供獸醫參考。

MEGO 是紀錄與整理工具，不提供疾病診斷、處方或用藥指示。

## 功能特色

- 帳號註冊、登入、登出。
- 建立多隻毛孩，切換、編輯與刪除資料。
- 日常照護、健康異常、體重、就醫、疫苗、驅蟲、用藥紀錄。
- 日常紀錄可使用 EfficientNet-B0（ONNX Runtime CPU）對便便照片進行外觀分類並提供建議；飼主確認／修改後才會儲存，照片只送至 MEGO 後端推論、不保存、不送往 MEGO AI。模型檔需依 `STOOL_MODEL_DIR` 本機設定，未設定時仍可手動記錄。
- 健康異常、體重、就醫與毛孩頭像照片會先壓縮，再上傳至 MEGO 後端本機檔案儲存；MongoDB 保存附件中繼資料。此版本尚未使用雲端物件儲存，需備份後端 `uploads/` 檔案及資料庫。
- 健康紀錄支援複製新增，減少重複輸入。
- 提醒支援新增、編輯、完成、延後、略過、刪除與重複週期；列表主要操作為完成／延後，其餘收在「更多」，從月曆進入時可查看指定日期的提醒。
- 首頁顯示今日待做與日常健康觀察；健康觀察只從喝水、飼料、精神與便便的連續變化推算，不混入健康異常事件。
- 時間軸整合提醒、健康異常、體重與照護事件。
- 健康照護報告匯出為不含圖片的 PDF。
- 毛孩身份 QR：以隨機公開 Token 顯示飼主選擇的毛孩與聯絡資料。
- iOS／Android Expo App；手機通知使用本機通知。
- MEGO AI：固定照護紀錄查詢使用 deterministic 規則；健康整理與一般知識問題可使用設定的 OpenAI-compatible LLM。一般聊天可附帶同一 session 最近最多 10 則對話作為上下文；session 保存在裝置，不會跨裝置同步，每隻毛孩最多保留 5 個。首次使用需確認資料使用說明。
- MEGO AI 一般聊天可檢索已整理的犬隻照護參考資料，回答下方會列出可點擊來源；檢索失敗時仍可照常使用一般聊天，不會因知識庫無資料而封鎖問題。檢索不讀取或保存飼主／毛孩紀錄。
- 設定：查看通知、相簿與相機權限，閱讀 AI 資料使用說明，管理毛孩、身份 QR 與 PDF 匯出。

## 技術棧

- 前端：React 19.2.3、React Native 0.86.3、Expo SDK 57、TypeScript 6、React Navigation 7、Ionicons、AsyncStorage。
- 後端：Python 3、FastAPI、Pydantic 2、PyMongo、Uvicorn、ReportLab。
- 資料庫：MongoDB 7。
- 開發環境：Docker Compose、Mongo Express、Expo Metro。
- 測試／品質：TypeScript、ESLint、Prettier、Jest、Python unittest／pytest、GitHub Actions。

## 安裝方式

使用 Node.js 22.13 以上的 22.x 版本；CI 使用 Node 22。iPhone 需 iOS 16.4 以上，Expo Go 必須支援 SDK 57。

升級後先停止舊 Metro，在 `frontend/` 執行 `npm ci`，再回根目錄執行 `./start.sh`。`npm start` 與 `start.sh` 預設以 Expo Go 開啟；開發版 App 使用 `npm run start:dev-client`，且須重新建置。Linux 無法執行本機 Xcode iOS 編譯；原生 iOS build 需 macOS、Xcode 與 CocoaPods，或 EAS Build。

```bash
git clone <repository-url>
cd Dog-care-app
cp env.example .env
cd frontend && npm ci
cd ..
python3 -m venv dog-care
dog-care/bin/python -m pip install -r backend/requirements.txt
```

請在專案根目錄 `.env` 設定前後端共用的本機環境變數；不要提交 `.env`、密碼或 API Key。環境範例以根目錄 `env.example` 為唯一來源。

## 設定說明

根目錄 `.env`（前後端共用）：

```env
# [選填] ./start.sh 會讀取此埠號；未設定時使用 8000
PORT=8000
# [必填] MongoDB 連線，帳密需與下方 Docker 設定一致
MONGO_URI=mongodb://mego:change-me@localhost:27017/app_dog_db?authSource=admin
# [必填] MongoDB 資料庫名稱
MONGO_DB=app_dog_db
# [必填] 至少 32 字元隨機密鑰；./start.sh 留白時會自動產生
AUTH_SECRET_KEY=
# [選填] Access Token 分鐘數，預設 15
AUTH_ACCESS_TOKEN_MINUTES=15
# [選填] 閒置登入天數，預設且上限 7 天
AUTH_REFRESH_TOKEN_DAYS=7
# [Docker 選填] 本機 MongoDB 管理者帳密，需與 MONGO_URI 相同
MONGO_USERNAME=mego
MONGO_PASSWORD=change-me

# [選填] 目前支援 self_hosted；未設定時使用此預設 Provider
AI_PROVIDER=self_hosted
# [選填／共用服務時必填] 共用模型服務位址與機密金鑰；各服務皆獨立設定時可留白，不可放在前端環境變數
AI_MODEL_API_URL=
AI_MODEL_API_KEY=
# [選填] 文字聊天／Embedding／Reranker 可各自指定端點與金鑰；留白時沿用上方共用值
AI_CHAT_API_URL=
AI_CHAT_API_KEY=
AI_EMBEDDING_API_URL=
AI_EMBEDDING_API_KEY=
AI_RERANK_API_URL=
AI_RERANK_API_KEY=
# [選填] 模型名稱與請求逾時
AI_MODEL_NAME=gemma-4-26b-a4b
AI_MODEL_TIMEOUT_SECONDS=45
# [選填] RAG Embedding／Reranker 模型名稱；更換後重啟後端，換 Embedding 還須重建索引
AI_EMBEDDING_MODEL=bge-m3-embedding
AI_RERANK_MODEL=bge-m3-reranker
# [選填] 就醫前摘要 AI 補充整理逾時；基礎摘要不呼叫模型
AI_VET_BRIEF_TIMEOUT_SECONDS=15
# [選填] MEGO AI 犬隻照護 RAG 檢索開關，預設啟用；false 只停用知識檢索，不會限制一般聊天
MEGO_RAG_ENABLED=true
# [選填] RAG 檢索總逾時秒數；索引不可用或逾時時會略過引用，繼續一般模型回答
MEGO_RAG_TIMEOUT_SECONDS=24
# [選填] RAG 最終提供的參考段落數，1～10，預設 3
MEGO_RAG_TOP_K=3

# [選填] 每日 AI 次數限制預設關閉；啟用後使用下方上限
AI_DAILY_REQUEST_LIMIT_ENABLED=false
AI_DAILY_REQUEST_LIMIT=20

# [選填] EfficientNet-B0 ONNX 模型目錄；留白會停用便便照片分類
STOOL_MODEL_DIR=
# [選填] 每個後端 worker 使用的 ONNX CPU 執行緒數，預設 1
STOOL_ORT_THREADS=1

# [選填] 附件儲存目錄；相對路徑以專案根目錄為準
ATTACHMENT_STORAGE_DIR=backend/uploads
# [選填] 附件與便便分類照片單檔上限 MB，預設 10、允許 1～50
MEGO_UPLOAD_MAX_MB=10

# [選填] 本機開發可用 *；正式 Web 網域請明確設定
CORS_ORIGINS=*
APP_TITLE=MEGO Backend
APP_VERSION=2.0.0

# [選填／公開] 前端 AI 請求逾時，單位毫秒；start.sh 會匯出給 Expo
EXPO_PUBLIC_AI_REQUEST_TIMEOUT_MS=45000
EXPO_PUBLIC_AI_CHAT_TIMEOUT_MS=75000
EXPO_PUBLIC_AI_VET_BRIEF_TIMEOUT_MS=20000
```

`./start.sh` 會在根目錄 `.env` 缺少有效 `AUTH_SECRET_KEY` 時產生並保留一組隨機密鑰；手動／正式部署可用 `openssl rand -hex 32` 產生。重啟或多個後端實例必須使用同一密鑰。Access token 有效期短；refresh token 以雜湊保存並輪替，閒置 7 天後到期；每次成功 refresh 會重新計算 7 天期限，因此持續使用不會被固定 7 天上限打斷。閒置超過期限後必須重新輸入帳號密碼。手機端憑證存放於 iOS Keychain／Android Keystore。登出會撤銷該裝置 session。首次成功登入時，既有明文密碼會遷移為 PBKDF2 雜湊，不會刪除帳號或毛孩資料。正式部署請使用 HTTPS 保護網路中的 bearer token。

前端 Expo 公開設定也放在同一個根目錄 `.env`；`./start.sh` 會將必要的 `EXPO_PUBLIC_*` 變數傳入 Metro，並自動更新 API URL。上傳大小共用 `MEGO_UPLOAD_MAX_MB`，啟動時傳給前端作為預先提示，後端才是實際限制的權威來源。

`EXPO_PUBLIC_*` 會被打包進 App，任何人都可能讀取，不能放 API Key、密碼或私密 token。`PORT` 與 `EXPO_CONNECTION` 也可用啟動命令前的 shell 環境變數覆蓋 `.env` 設定。

執行 `./start.sh` 時會自動偵測電腦目前使用的網路 IP（無論是 Wi-Fi 或手機熱點），檢查 IP 屬於目前電腦後，同步更新 `EXPO_PUBLIC_API_URL` 與 `EXPO_PUBLIC_API_BASE_URL`，避免舊 IP 造成登入逾時。一般情況不必手動選擇網路；特殊網路可在 `MEGO_API_URL` 指定 API URL。切換網路後請重啟 `./start.sh`／Metro，再重新掃描 Expo QR code。`EXPO_CONNECTION` 只控制 Expo Go bundle 連線方式，不會代替 FastAPI 的 API 網址。

`EXPO_PUBLIC_*` 變數不可放秘密；API Key 只能放後端。Expo Tunnel 只處理 Metro bundle，不會代轉 FastAPI API，手機仍需能連到選取的 Phone API URL。

## 使用方式

一鍵啟動 MongoDB、Mongo Express、FastAPI 與 Expo：

```bash
./start.sh
```

手機與電腦不在同一網段時可使用：

```bash
EXPO_CONNECTION=tunnel ./start.sh
```

服務位置：

| 服務             | 位址                         |
| ---------------- | ---------------------------- |
| FastAPI          | `http://localhost:8000`      |
| Swagger API 文件 | `http://localhost:8000/docs` |
| Mongo Express    | `http://localhost:8082`      |
| Expo             | 依終端機輸出的 QR／網址      |

停止：在 `start.sh` 終端按 `Ctrl+C`；MongoDB 另執行：

```bash
docker compose --env-file .env -f backend/docker-compose.yml down
```

此指令保留資料 volume；除非確認要清空資料，勿使用 `down -v`。

## 專案結構

```text
Dog-care-app/
├── frontend/
│   ├── screens/       # 首頁、紀錄、提醒、AI、設定與表單畫面
│   ├── features/      # 依照護領域整理的畫面、元件、樣式與模組 README
│   ├── components/    # 共用元件（日期／時間 Modal、按鈕、導航）
│   ├── services/      # API client 與各功能 service
│   ├── utils/         # 可測試的前端業務規則（例如健康趨勢引擎）
│   ├── contexts/      # Auth、Pet、Settings 狀態
│   ├── navigation/    # Root、Tab 與功能 Stack
│   ├── constants/     # 色票、提醒、時間軸等固定設定
│   └── assets/        # 背景、Logo 與壓縮圖片
├── backend/
│   ├── app/api/routes/    # FastAPI 路由
│   ├── app/services/      # CRUD、AI、匯出與業務邏輯
│   ├── app/schemas/       # Pydantic 輸入／輸出模型
│   ├── app/db/            # MongoDB 連線與索引
│   ├── tests/             # 後端 smoke tests
│   ├── main.py            # ASGI 啟動入口
│   └── docker-compose.yml  # MongoDB／Mongo Express
├── stool-classification/  # 便便分類研究文件、本機模型部署包與獨立 benchmark 參考
└── start.sh           # 本機啟動 MongoDB、FastAPI 與 Expo
```

`stool-classification/model/efficientnet_b0/` 是本機模型部署資料夾；ONNX 權重不納入 Git。請在根目錄 `.env` 將 `STOOL_MODEL_DIR` 指向此目錄。研究計畫與部署細節見 `stool-classification/docs/`。

`dog-care/` 是本機 Python 虛擬環境，不納入 Git。

前端功能位置：疫苗、驅蟲、用藥、毛孩身份 QR、設定子頁在 `frontend/features/<功能>/screens/`；首頁、提醒、時間軸、就醫、健康異常、AI 與毛孩表單仍由 `frontend/screens/` 組裝，相關欄位與視覺元件位於對應 `frontend/features/<功能>/`。導航入口是 `frontend/navigation/MainTabs.tsx` 與 `SharedHealthScreens.tsx`。Screen 經 `frontend/services/` 呼叫 API，不直接使用 `fetch`；後端 `app/api/routes/` 轉交 `app/services/` 執行資料操作。各功能目錄的 `README.md` 標記細部位置與資料流。

## API 文件與範例

啟動後可用 Swagger：`http://localhost:8000/docs`。API 基礎路徑為 `/api`，成功回應通常為 `{ "success": true, "message": "...", "data": ... }`。

```bash
# 取得毛孩
curl "http://localhost:8000/api/pets/<user_id>"

# 取得目前毛孩提醒
curl "http://localhost:8000/api/pets/<pet_id>/reminders?userId=<user_id>"

# 取得時間軸
curl "http://localhost:8000/api/pets/<pet_id>/timeline?userId=<user_id>&limit=20&skip=0"

# 取得健康監測（7／30／90 天）
curl "http://localhost:8000/api/pets/<pet_id>/ai/health-monitor?userId=<user_id>&range=30"

# 公開毛孩身份 QR 頁（只接受公開 token）
curl "http://localhost:8000/api/public/lost-pets/<public_token>/page"
```

主要 endpoint 分組：Auth、Pets、Daily Logs（含便便照片分類建議）、Health Events、Weights、Medical Visits、Vaccinations、Dewormings、Medications、Reminders、Timeline、Exports、AI、Lost Pet QR。完整參數與 schema 以 Swagger 為準。

## 開發、測試與 Build

```bash
# shell 語法
bash -n start.sh

# 前端型別、lint、格式與測試
cd frontend
npm run typecheck
npm run lint
npm run format:check
npm test

# Expo 開發／平台 build
npm start
npm run ios
npm run android
npm run web

# 後端
cd ..
PYTHONPATH=backend dog-care/bin/python -m compileall -q backend/app
PYTHONPATH=backend dog-care/bin/python -m unittest discover -s backend/tests

git diff --check
```

正常 iPhone 的首頁不依賴 ScrollView 才能完成主要操作；小螢幕與鍵盤情境依畫面需要支援捲動。

## 目前產品與資料狀態

- 2026-10-04 AI 對話載入／重試狀態已補強：讀取 session 時暫停送出，讀取失敗提供重試；送出失敗保留輸入並可重試；AI 已回覆但本機保存失敗時保留回答並明確提示。毛孩清單的過期請求不會覆蓋切換帳號後的清單。前端 typecheck、指定檔案 ESLint、22 個 Jest suites／79 個測試與 `git diff --check` 通過。
- 2026-10-03 便便照片外觀分類已整合：以實際 MongoDB、有效登入 Session 與所屬毛孩呼叫 FastAPI，分類 API 回傳成功；使用不相符的帳號識別呼叫回傳 403，MongoDB `attachments`／`daily_logs` 前後筆數不變。後端模型測試 9 項通過（未設定模型時 2 項通過、7 項略過），前端型別、分類 service 測試、ESLint 與 `git diff --check` 通過。iPhone 拍照／相簿完整實機流程仍待人工驗收。
- 2026-09-28 紀錄詳情頁整理：日常表單不重複列出歷史；體重歷史預設顯示最新 3 筆並可展開；健康異常附件依容器寬度排版；疫苗／驅蟲／用藥的編輯與複製按鈕尺寸一致，就醫刪除操作降為次要。提醒卡片收合次要操作，月曆進入提醒時依選取日期篩選。
- 前端主要頁面採「摘要 → 資料分組 → 清楚主要操作」層級；保留既有資料與導航流程。
- 健康管理的疫苗、驅蟲、用藥、就醫，皆有列表、摘要式詳細頁與分段表單；支援原有的編輯、複製新增、刪除、日期、提醒及附件功能。
- 毛孩表單依基本資料、生活資訊、健康備註、身份資訊分段；多毛孩以可滑動身份卡切換。身份 QR 設定頁清楚標示每個公開欄位的開啟／關閉狀態。
- AI 對話有空白引導、建議提問、來源清楚的訊息泡泡與 Session 清單；就醫前摘要保留結構化資料、圖表、分享與可選 AI 補充。
- 頁內已有主要標題的畫面，導航列只保留返回控制，避免重複標題。
- 日期／時間欄位使用自製 JavaScript Calendar／Time Modal，避免 native picker 的 1970 初始值與模組錯誤。
- 新產生時間與服務 log 使用台灣時區 UTC+8。
- 本機展示資料可用下列指令重建：保留 `users` 帳號，清空其餘資料並為每個帳號建立新版測試毛孩與照護紀錄。

  ```bash
  cd backend
  PYTHONPATH=. ../dog-care/bin/python scripts/reset_and_seed_demo_data.py
  ```

- `healthTrendEngine.ts` 依日常紀錄顯示「今天狀況穩定」、「近期有 N 項需留意」或「有 N 項持續需留意」。喝水／食量偏少、精神稍低、便便偏硬／偏軟連續 2 天開始留意、3 天為持續；水狀便首次即留意、連續 2 天為持續；食量偏多連續 3 天留意但不升級為持續。
- 「健康觀察」詳細頁只說明日常趨勢與連續天數；健康異常事件仍由獨立紀錄頁管理。展示腳本會為每個帳號建立 1 隻毛孩，以及日常、體重、健康異常、就醫、疫苗、驅蟲、用藥、提醒各 10 筆資料；近三天會保留可驗證健康趨勢的樣本。
- AI Session 每隻毛孩最多 5 個，非 LLM 查詢不計每日次數；每日 LLM 限制預設關閉。
- AI 對話 session 是裝置端資料；聊天請求最多包含同一 session 最近 10 則訊息，每則上限 1000 字元。聊天歷史不由後端持久化。
- 就醫前摘要可選近 7、15、30 天與要帶入的照護資料；先以結構化內容立即產生，使用者可再主動選擇 AI 補充整理。
- PDF 報告為中文、不含圖片；包含日常、體重、健康事件、就醫、疫苗、用藥、驅蟲與提醒資料，目錄會列出實際頁碼；封面標示毛孩、匯出時間與資料期間，頁尾標示頁碼。內容供照護溝通，不是醫療診斷。
- 背景圖片使用 WebP 壓縮資產；日期選擇器不重新引入 native picker。

## 安全與限制

- 登入使用短效 JWT access token 與可撤銷、輪替的 refresh session；憑證存放於手機安全儲存區。正式部署仍需 HTTPS、嚴格 CORS、秘密管理、資料備份與還原演練。
- 一般照護附件儲存在後端本機 `backend/uploads/`，MongoDB `attachments` 保存中繼資料；尚無雲端物件儲存或跨主機備援。便便分類照片只作暫時推論，不會寫入附件儲存。
- 公開 QR 不回傳帳號、密碼、完整健康紀錄或內部資料庫 ID；飼主可設定公開欄位並更新 Token。
- AI 外部服務金鑰只存在後端；服務逾時或格式錯誤會使用 deterministic fallback 或友善錯誤。
- AI 使用前會記錄目前版本的資料使用說明確認；固定紀錄查詢不送至 LLM，需生成文字的功能才會依請求與已選資料呼叫模型服務。
- App 目前沒有 OCR、雲端備份、醫療診斷或藥物處方功能。

本 README 保持自包含，供 GitHub 使用者了解、安裝與啟動專案。開發工作區可另保留不提交的產品、功能與流程維護文件。
