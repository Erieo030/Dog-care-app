# MEGO｜毛孩照護紀錄 App

MEGO 是給狗狗飼主使用的照護紀錄 App，集中管理日常觀察、健康事件、體重、就醫、疫苗、驅蟲、用藥與提醒，方便回顧並整理資料提供獸醫參考。

MEGO 是紀錄與整理工具，不提供疾病診斷、處方或用藥指示。

## 功能特色

- 帳號註冊、登入、登出。
- 建立多隻毛孩，切換、編輯與刪除資料。
- 日常照護、健康異常、體重、就醫、疫苗、驅蟲、用藥紀錄。
- 可選擇使用 EfficientNet-B0 分類便便照片外觀；結果由飼主確認後才記錄，未設定模型仍可手動新增日常紀錄。
- 健康異常、體重、就醫與毛孩頭像支援照片附件。
- 照護相簿：既有健康異常、體重及就醫附件依毛孩、月份與週整理，可篩選、隱藏健康事件縮圖、查看大圖並返回原始紀錄；照片不重新複製。
- 健康紀錄支援複製新增，減少重複輸入。
- 提醒支援新增、編輯、完成、延後、略過、刪除與重複週期；列表主要操作為完成／延後，其餘收在「更多」，從月曆進入時可查看指定日期的提醒。
- 首頁顯示今日待做與日常健康觀察；健康觀察只從喝水、飼料、精神與便便的連續變化推算，不混入健康異常事件。
- 時間軸整合提醒、健康異常、體重與照護事件。
- 就醫前摘要先顯示一頁看診重點，可自填詢問事項、選擇 7／15／30 天與資料類別；原始紀錄和 AI 整理預設收合。
- 健康照護 PDF 首頁提供看診快速摘要，後續保留完整紀錄；不匯出圖片。
- 就醫地圖：App 內瀏覽臺中市夜間／急診院所，搜尋、按需定位、電話聯絡及外部導航，並可將醫院名稱帶回就醫表單。目前收錄 11 家，其中 10 家顯示查核後座標，1 家位置待確認。
- 毛孩身份 QR：以隨機公開 Token 顯示飼主選擇的毛孩與聯絡資料。
- iOS／Android Expo App；手機通知使用本機通知。
- MEGO AI：固定照護紀錄查詢由規則直接處理；需要生成文字時可呼叫設定的語言模型。犬隻照護知識檢索會附上參考來源。
- 設定：查看通知、相簿、相機與定位權限，閱讀 AI 資料使用說明，管理毛孩、身份 QR 與 PDF 匯出。定位僅在就醫地圖點選定位時請求，不使用背景定位。

目前底部導覽暫設六個入口：首頁、紀錄、照片、地圖、MEGO AI、設定。照片與地圖先獨立，後續再決定整合位置。從地圖分頁進入只瀏覽院所；從就醫表單進入才提供帶回醫院名稱的操作。兩者是既有照護流程的輔助工具，目前沒有社群、預約或醫院合作平台。

## 技術棧

- 前端：React 19.2.3、React Native 0.86.3、Expo SDK 57、TypeScript 6、React Navigation 7、Ionicons、AsyncStorage。
- 後端：Python 3、FastAPI、Pydantic 2、PyMongo、Uvicorn、ReportLab。
- 資料庫：MongoDB 7。
- 開發環境：Docker Compose、Mongo Express、Expo Metro。
- 測試／品質：TypeScript、ESLint、Prettier、Jest、pytest、GitHub Actions。

## 安裝方式

需要 Docker Compose、Node.js、Python 3 與 Expo Go（版本需支援專案所用 Expo SDK）。iOS 原生建置需 macOS 與 Xcode；一般本機測試可使用 Expo Go。

```bash
git clone <repository-url>
cd Dog-care-app
cp env.example .env
```

啟動前確認根目錄 `.env` 中 MongoDB 設定可用。啟動腳本會安裝依賴、啟動資料庫與 API，再啟動 Expo。

## 設定說明

所有環境變數集中在專案根目錄的 `.env`，完整欄位與中文註解請看 `env.example`。複製範例後，確認 MongoDB 連線與資料庫名稱；`./start.sh` 會自動產生缺少的登入簽章金鑰，並偵測本機 API 網址。

AI 模型與便便分類模型屬選用設定，不使用時可留白。請勿提交 `.env`、API Key 或密碼；任何 `EXPO_PUBLIC_*` 值都會進入 App，不能存放秘密。正式部署請設定 HTTPS 與正式網域 CORS。

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

在啟動終端按 `Ctrl+C` 停止服務；MongoDB 資料 volume 會保留。

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

獨立照片、地圖頁分別位於 `frontend/features/care-photos/` 與 `frontend/features/vet-map/`。照護相簿查詢由後端 `care_photo_service.py` 組裝，縮圖沿用附件的帳號／毛孩權限保護。

## API 文件與範例

啟動後開啟 `http://localhost:8000/docs` 查看互動式 API 文件。API 位於 `/api`，涵蓋登入、毛孩、照護紀錄、提醒、附件、匯出與 AI；參數與授權需求以 Swagger 定義為準。

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
PYTHONPATH=backend pytest -q backend/tests

git diff --check
```

## 目前產品與資料狀態

- 帳號、毛孩與照護紀錄存於 MongoDB。照片壓縮後存於後端本機 `backend/uploads/`，資料庫保存附件中繼資料；備份時需同時保存兩者。
- AI 對話 session 保存在使用者裝置，不會跨裝置同步；犬隻照護 RAG 參考資料與個人照護紀錄分開管理。
- 便便照片分類需設定 EfficientNet-B0 ONNX 模型；未設定時不影響其他照護功能。
- 日常便便辨識目前只回傳分類建議，不保存該張照片；因此不會出現在照護相簿。第一版相簿也不包含頭像、未儲存附件或獨立生活照片上傳。
- 後端時間採台灣時區 UTC+8。

## 安全與限制

- 登入憑證存放於手機安全儲存區；正式部署須使用 HTTPS 並設定適當的 CORS。
- 公開 QR 只呈現飼主選擇公開的資料；App 不提供疾病診斷或藥物處方。
- AI 外部服務金鑰僅設定在後端；首次使用 AI 前會顯示資料使用說明。
- 照護相簿的「健康異常」來自健康事件附件，不等同首頁的日常健康觀察；「就醫照片」包括該筆就醫附上的文件或藥袋。讀取失敗會提供重試，不當成沒有照片。
- 就醫地圖取得位置時可取消；拒絕定位仍能瀏覽清單，也可前往手機設定管理權限。名冊及座標來源日期不代表院所即時營業狀態。

本 README 保持自包含，供 GitHub 使用者了解、安裝與啟動專案。開發工作區可另保留不提交的產品、功能與流程維護文件。
