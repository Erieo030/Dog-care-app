# MEGO｜毛孩照護紀錄 App

MEGO 是給寵物主人的低負擔照護紀錄 App。它把狗狗的日常觀察、健康異常、體重、就醫、疫苗、驅蟲、用藥與提醒集中管理，讓飼主能快速回顧變化，也能整理資料提供獸醫參考。

MEGO 是紀錄與整理工具，不提供疾病診斷、處方或用藥指示。

## 功能特色

- 帳號註冊、登入、登出。
- 建立多隻毛孩，切換、編輯與刪除資料。
- 日常照護、健康異常、體重、就醫、疫苗、驅蟲、用藥紀錄。
- 健康紀錄支援複製新增，減少重複輸入。
- 提醒支援新增、編輯、完成、延後、略過、刪除與重複週期。
- 首頁顯示今日待做、未來 7 天待辦與健康觀察。
- 時間軸整合提醒、健康異常、體重與照護事件。
- 搜尋與條件篩選紀錄。
- 健康照護報告匯出為不含圖片的 PDF。
- 毛孩身份 QR：以隨機公開 Token 顯示飼主選擇的毛孩與聯絡資料。
- iOS／Android Expo App；手機通知使用本機通知。
- MEGO AI：紀錄查詢使用 deterministic 規則；健康整理與一般問題可選用外部 OpenAI-compatible LLM。非 LLM 查詢不計次數。

## 技術棧

- 前端：React 19、React Native 0.81、Expo 54、TypeScript、React Navigation 7、Ionicons、AsyncStorage。
- 後端：Python 3、FastAPI、Pydantic 2、PyMongo、Uvicorn、ReportLab。
- 資料庫：MongoDB 7。
- 開發環境：Docker Compose、Mongo Express、Expo Metro。
- 測試／品質：TypeScript、ESLint、Prettier、Jest、Python unittest／pytest、GitHub Actions。

## 安裝方式

```bash
git clone <repository-url>
cd Dog-care-app
cp backend/.env.example backend/.env
cd frontend && npm ci
cd ..
python3 -m venv dog-care
dog-care/bin/python -m pip install -r backend/requirements.txt
```

請在 `backend/.env` 設定 MongoDB；不要提交 `.env`、密碼或 API Key。

## 設定說明

Backend `backend/.env`：

```env
PORT=8000
MONGO_URI=mongodb://使用者名稱:密碼@localhost:27017/app_dog_db?authSource=admin
MONGO_DB=app_dog_db
MONGO_USERNAME=使用者名稱
MONGO_PASSWORD=密碼

# 可選；未設定時 AI 使用 deterministic fallback
AI_PROVIDER=self_hosted
AI_MODEL_API_URL=
AI_MODEL_API_KEY=
AI_MODEL_NAME=gemma-4-26b-a4b
AI_MODEL_TIMEOUT_SECONDS=45

# 預設關閉每日限制
AI_DAILY_REQUEST_LIMIT_ENABLED=false
AI_DAILY_REQUEST_LIMIT=20

PUBLIC_APP_URL=
CORS_ORIGINS=*
```

Frontend 可使用 `frontend/.env`：

```env
EXPO_PUBLIC_API_URL=http://手機可連到的電腦IP:8000
EXPO_PUBLIC_LOST_PET_BASE_URL=https://你的公開網域
EXPO_PUBLIC_ENABLE_AI=true
```

API Key 只能放後端；`EXPO_PUBLIC_*` 變數不可放秘密。

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

| 服務 | 位址 |
| --- | --- |
| FastAPI | `http://localhost:8000` |
| Swagger API 文件 | `http://localhost:8000/docs` |
| Mongo Express | `http://localhost:8082` |
| Expo | 依終端機輸出的 QR／網址 |

停止：在 `start.sh` 終端按 `Ctrl+C`；MongoDB 另執行：

```bash
docker compose --env-file backend/.env -f backend/docker-compose.yml down
```

此指令保留資料 volume；除非確認要清空資料，勿使用 `down -v`。

## 專案結構

```text
Dog-care-app/
├── frontend/
│   ├── screens/       # 首頁、紀錄、提醒、AI、設定與表單畫面
│   ├── components/    # 共用元件（日期／時間 Modal、按鈕、導航）
│   ├── services/      # API client 與各功能 service
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
├── start.sh
├── AGENTS.md
├── ARCHITECTURE.md
├── ROADMAP.md
└── adjust.txt
```

`dog-care/` 是本機 Python 虛擬環境，不納入 Git。

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

主要 endpoint 分組：Auth、Pets、Daily Logs、Health Events、Weights、Medical Visits、Vaccinations、Dewormings、Medications、Reminders、Timeline、Search、Exports、AI、Lost Pet QR。完整參數與 schema 以 Swagger 為準。

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

- 日期／時間欄位使用自製 JavaScript Calendar／Time Modal，避免 native picker 的 1970 初始值與模組錯誤。
- 新產生時間與服務 log 使用台灣時區 UTC+8。
- 目前展示資料保留帳號與毛孩，照護功能可建立測試資料；重置資料前需確認範圍。
- AI Session 每隻毛孩最多 5 個，非 LLM 查詢不計每日次數；每日 LLM 限制預設關閉。
- PDF 報告為中文、不含圖片；內容供照護溝通，不是醫療診斷。
- 背景圖片使用 WebP 壓縮資產；日期選擇器不重新引入 native picker。

## 安全與限制

- 正式環境應改用 JWT／Session、HTTPS、嚴格 CORS、秘密管理與備份策略。
- 公開 QR 不回傳帳號、密碼、完整健康紀錄或內部資料庫 ID；飼主可設定公開欄位並更新 Token。
- AI 外部服務金鑰只存在後端；服務逾時或格式錯誤會使用 deterministic fallback 或友善錯誤。
- App 目前沒有 OCR、雲端備份、醫療診斷或藥物處方功能。

更多規劃請參考 [ARCHITECTURE.md](ARCHITECTURE.md)、[ROADMAP.md](ROADMAP.md) 與 [adjust.txt](adjust.txt)。
