# PawLog

PawLog 是一個幫飼主整理狗狗日常照護資料的手機 App。

它不是要你每天填很多表格，而是在真的有需要時，快速記下體重、身體異常、就醫內容或提醒。完成的重要操作會整理到同一條時間軸，之後要回想「什麼時候開始吐？上次看醫生是何時？最近體重有沒有變？」會比較容易。

PawLog 是照護紀錄工具，不是獸醫診斷系統，也不提供藥物或治療建議。

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
- 匯出 PDF 健康報告、CSV、JSON，或包含照片的 ZIP。
- 在設定中心管理毛孩入口、外觀、通知、提醒時間、儲存空間、匯出、隱私說明及登出。

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
- 到「我的／設定」確認「PawLog 手機提醒」已開啟。
- Local Notification 需要 Android／iOS 實機環境驗證。
- 關閉手機提醒不會刪除 App 內的 Reminder。

### 圖片或匯出檔案消失

目前附件與匯出檔案使用專題開發環境的本機儲存方式，不是 Cloud Backup。匯出檔應完成後立即分享或儲存到使用者選擇的位置。

## 目前已知限制

- 現行 `userId` 仍由前端傳入，不等於完整安全認證。
- 正式密碼雜湊、JWT／Session、忘記密碼及 Email 驗證尚未完成。
- Settings 與 Navigation 已支援外觀偏好，但既有畫面尚未全部完成 Dark Mode。
- Local Notification、分享、檔案下載及小螢幕版面仍需實機完整驗收。
- 匯出工作狀態目前保存在單一 FastAPI process 記憶體。
- 沒有 Cloud Backup、Push Notification Server、AI、OCR 或醫療判讀。
- 正式 TLS、監控、備份、Production build 與 App Store 發布尚未完成。

更多架構與規劃：

- [ARCHITECTURE.md](ARCHITECTURE.md)
- [ROADMAP.md](ROADMAP.md)
- [adjust.txt](adjust.txt) 是需求與候選方案，不代表每次都要一次完成全部項目。
## 工程品質

目前可執行 TypeScript、ESLint、Prettier、Jest、Python smoke test 與 pytest；GitHub Actions 也會執行基本檢查。

```bash
cd frontend && npm run typecheck
cd .. && PYTHONPATH=backend dog-care/bin/python -m unittest discover -s backend/tests
```
