# 糞便外觀分類模型：MEGO 移接文件

> 版本：2026-10-03（依目前 MEGO 專案與實際 MongoDB/API 驗證更新）
> 適用對象：負責 MEGO 後端（FastAPI）與 App（Expo）的開發者

本文件說明如何把 Colab 訓練好的分類模型接入 MEGO：飼主在「日常紀錄」拍攝大便照片，後端以 CPU 推論後回傳「大便狀況」建議，**飼主確認或修改後才儲存**。部署端只需 onnxruntime、numpy、Pillow，不需要 PyTorch 或 GPU。

> ⚠️ 本模型判斷的是「資料集定義的影像外觀類別」，**不是獸醫診斷**。API 與 App 皆不得顯示疾病、脫水或治療建議。

> 實作狀態（2026-10-03）：EfficientNet-B0 已接入 MEGO FastAPI 與日常紀錄表單。高信心分類只預選表單選項，使用者仍須確認並按既有儲存按鈕；分類照片不保存、不送至 LLM。以下步驟保留作為部署與驗證參考。

---

## 1. 整合設計

### 1.1 接入點：日常紀錄的「大便狀況」

MEGO 的便便資料有兩處：

| 位置 | 欄位 | 選項 | 是否接入 |
|---|---|---|---|
| 日常紀錄 `daily_logs` | `stoolLevel` | `hard` 偏硬、`normal` 正常、`soft` 偏軟、`watery` 水狀 | ✅ **本次接入** |
| 健康異常 `health_events`（`abnormal_stool`） | `details.stoolConsistency` | `soft`、`watery`、`hard`、`other`（無「正常」） | 未接入，列為後續 |

選擇日常紀錄的原因：

1. **四個類別一一對應**（表 1-2），包含「正常」；異常事件表單沒有「正常」選項。
2. 日常紀錄的 `stoolLevel` 已接上 App 既有的趨勢提醒（前端 `utils/healthTrendEngine.ts`、後端 `services/health_monitor_service.py`），辨識結果經飼主確認後可直接沿用，不需新增提醒邏輯。

**表 1-2　模型類別對應**

| 模型類別 | `stoolLevel` | App 顯示文字 |
|---|---|---|
| Normal | `normal` | 正常 |
| Soft-Poop | `soft` | 偏軟 |
| Diarrhea | `watery` | 水狀 |
| Lack-of-Water | `hard` | 偏硬 |

> 一律使用 App 既有的顯示文字。Lack-of-Water 只是資料集的類別名稱，**不可顯示為「缺水」**。

### 1.2 資料流

```text
DailyLogScreen「大便狀況」
  └─ 拍照辨識／從相簿選擇
       └─ App：縮至長邊 1024 px、轉 JPEG（HEIC 也轉 JPEG）
            └─ POST /api/pets/{petId}/stool-classifications?userId=…（multipart: file）
                 ├─ 登入中介層：JWT 與 userId 必須一致
                 ├─ ensure_owned_pet：毛孩必須屬於該使用者
                 ├─ 檢查格式、大小 → 前處理 → ONNX Runtime（CPU）→ 低信心判斷
                 └─ 回傳建議（照片只在記憶體中處理，不保存）
  └─ 預選對應的「大便狀況」選項，顯示信心與提示
  └─ 飼主確認或改選 → 儲存今日紀錄（既有 API）
       └─ 既有趨勢提醒、就醫前摘要、PDF、MEGO AI 沿用 stoolLevel
```

照片**不經過**既有附件流程（`attachments`），不寫入 `backend/uploads/`，也不送至 LLM。

---

## 2. 模型選擇

三個模型都已匯出為同一介面的部署包，可直接互換。test 共 116 張（每類約 29 張）。

| 模型 | test Accuracy | test Macro-F1（95% CI） | 部署前處理 Macro-F1 | ONNX 大小 | Colab CPU 推論 p50 |
|---|---|---|---|---|---|
| YOLO26n-cls | 0.810 | 0.808（0.732–0.877） | 0.817 | 6.2 MB | 4.7 ms |
| YOLO11n-cls | 0.845 | 0.842（0.771–0.904） | 0.825 | 6.2 MB | 4.7 ms |
| **EfficientNet-B0（建議）** | **0.871** | **0.870（0.803–0.927）** | **0.853** | 16.0 MB | 13.7 ms |

**Phase 5 補充**（參數量相近模型、各自調參、3 個種子）：YOLO11s-cls 0.866 ± 0.013、YOLO26s-cls 0.864 ± 0.020、EfficientNet-B0 0.848 ± 0.026（test Macro-F1），兩兩 McNemar 檢定 p > 0.05，三者無顯著差異。部署採用已完成整合驗證的 EfficientNet-B0 部署包；YOLO-s 尚未匯出至 MEGO API。原始實驗結果不在目前工作區，請勿把此摘要當成可由 repo 重現的完整實驗紀錄。

---

## 3. 需要的檔案

### 3.1 模型部署包

目前本機部署包：`stool-classification/model/efficientnet_b0/`。若從 Colab zip 下載，解壓後需得到相同的目錄與檔案。

```text
efficientnet_b0/
├── model.onnx              # 輸入 images [N,3,224,224]，輸出 probs [N,4]
├── model_meta.json         # 類別順序、前處理參數、低信心門檻、指標、版本、雜湊值
├── preprocess.py           # 參考前處理（與訓練一致）
├── predict_example.py      # 單張推論範例
├── requirements-serve.txt  # Colab 驗證過的版本
└── sample.jpg              # 測試用影像
```

部署包已放在上述本機路徑。ONNX 權重不提交 Git；根目錄 `.gitignore` 已忽略模型檔。

### 3.2 MEGO 整合程式（已整合至本專案）

路徑與 MEGO 專案相同，可直接對應複製：

```text
backend/app/services/stool_classifier_service.py
backend/app/api/routes/stool_classifications.py
backend/tests/test_stool_classifications.py
frontend/services/stoolClassifierService.ts
frontend/screens/DailyLogScreen.tsx
```

驗證狀態：後端分類測試 **9 項通過**；未設定模型的測試為 2 項通過、7 項略過。另已使用實際 MongoDB、有效登入 Session 與所屬毛孩呼叫 FastAPI：分類成功（HTTP 200），不相符的使用者識別遭拒（HTTP 403），分類前後 `attachments` 與 `daily_logs` 文件筆數不變。範例部署包輸出 `Diarrhea`、confidence 約 `0.9999`。前端 TypeScript、分類 service 測試、ESLint 與 `git diff --check` 通過；iPhone 拍照／相簿完整端到端流程仍待手動驗收。

### 3.3 獨立驗證工具（參考資料夾）

與 MEGO 無關的獨立版本，供在 server 上單獨驗證模型與量測效能（`scripts/benchmark.py`）。整合進 MEGO 時請使用 3.2 的檔案。

---

## 4. 後端移接步驟

### Step 1：放置模型

```bash
# 模型已放置於 stool-classification/model/efficientnet_b0
STOOL_MODEL_DIR=/home/erieo/Desktop/Dog-care-app/stool-classification/model/efficientnet_b0
```

在 `.gitignore` 排除模型檔：

```gitignore
stool-classification/model/efficientnet_b0/model.onnx
```

權重不進 Git；以本文件記錄取得位置，並以 `model_meta.json` 的 `export.onnx_sha256` 驗證檔案（服務啟動時會自動檢查）。

### Step 2：加入套件

在 `backend/requirements.txt` 加入（`python-multipart` 已存在）：

```text
onnxruntime>=1.17,<2
numpy>=1.24,<3
Pillow>=10,<13
```

Colab 驗證版本：onnxruntime 1.30.0、numpy 2.1.3、Pillow 11.3.0。CI 使用 Python 3.12，以上套件皆支援。

### Step 3：先單獨驗證模型

```bash
cd stool-classification/model/efficientnet_b0
../../dog-care/bin/python predict_example.py sample.jpg
```

應輸出 `"label": "Diarrhea"`、`"confidence"` 約 0.9999、`"model_version": "efficientnet_b0-split_v1-p3v2-dbf9106a"`。結果不同代表套件或檔案有問題，先排除再往下做。

### Step 4：整合程式（已完成）

MEGO 整合程式已直接加入目前專案；不要以參考資料夾中的程式覆蓋專案檔案。

### Step 5：路由註冊與啟動載入（已完成）

`backend/app/api/router.py`：在 import 與 router 清單各加一項 `stool_classifications`。

```python
from app.api.routes import (
    attachments, ai, auth, dashboard, exports, settings, health_events, medical_visits, pets, reminders, timeline, weights, daily_logs, vaccinations, dewormings, medications, lost_pets,
    stool_classifications,
)
...
for router in [
    ..., lost_pets.router, stool_classifications.router,
]:
```

`backend/app/factory.py`：MEGO 以 `add_event_handler` 管理啟動／關閉，在 `create_app()` 既有的兩行 shutdown handler 旁加入：

```python
from app.services.stool_classifier_service import load_classifier
...
    application.router.add_event_handler("startup", load_classifier)
```

- 啟動時載入一次，不要每個請求重新載入。
- 未設定 `STOOL_MODEL_DIR` 時只記錄警告、不載入模型，API 回 503，**其他功能與 CI 不受影響**。
- 設定了但檔案錯誤（雜湊不符、類別不符）時會啟動失敗，避免以錯誤模型提供服務。

路由不需修改登入中介層：`/api/pets/{pet_id}/stool-classifications` 會自動要求 JWT，且 query 的 `userId` 必須與 token 一致（multipart 請求的 `userId` 只能放在 query）。

### Step 6：設定環境變數

在根目錄 `.env`（以及 `env.example` 的說明）加入：

```env
# [選填] 照片辨識模型資料夾（含 model.onnx、model_meta.json）；留白則停用照片辨識
STOOL_MODEL_DIR=/絕對路徑/stool-classification/model/efficientnet_b0
# [選填] 每個 worker 的 onnxruntime 執行緒數，預設 1
STOOL_ORT_THREADS=1
```

`app/core/config.py` 匯入時已載入根目錄 `.env`，服務程式以 `os.getenv` 讀取即可。這兩個變數**不可**加 `EXPO_PUBLIC_` 前綴。

執行緒建議：`uvicorn --workers N` 時，`N × STOOL_ORT_THREADS` 不要超過 CPU 核心數；每個 worker 各自載入一份模型（約 150 MB 記憶體）。

### Step 7：執行測試

```bash
# CI 相同條件（不需模型）：2 passed, 7 skipped
PYTHONPATH=backend dog-care/bin/python -m pytest -q backend/tests/test_stool_classifications.py

# 有模型：9 passed
STOOL_MODEL_DIR=/絕對路徑/stool-classification/model/efficientnet_b0 \
PYTHONPATH=backend dog-care/bin/python -m pytest -q backend/tests/test_stool_classifications.py

# 全部後端測試（需 MongoDB，與 CI 相同）
PYTHONPATH=backend dog-care/bin/python -m pytest -q backend/tests
```

測試涵蓋：模型未載入（503）、類別對應完整、範例照片推論、前處理與部署包逐值一致、空檔（422）、非影像（415）、太小（422）、不支援格式 BMP（415）、檔案過大（413）。

### Step 8：以 curl 手動測試

先登入取得 access token，再呼叫：

```bash
curl -s -X POST "http://localhost:8000/api/pets/<petId>/stool-classifications?userId=<userId>" \
     -H "Authorization: Bearer <accessToken>" \
     -F "file=@sample.jpg;type=image/jpeg" | python3 -m json.tool
```

### Step 9：在 server 量測效能

```bash
cd stool-classification/reference/fastapi_integration
python scripts/benchmark.py $STOOL_MODEL_DIR $STOOL_MODEL_DIR/sample.jpg --runs 100 --threads 1
```

也請以實際手機照片（經 App 縮圖後約 1024 px）量測一次，並填入下表，作為論文的部署數據：

| 項目 | Colab CPU | 本機 Kali VM（無 AVX） | 部署 server |
|---|---|---|---|
| 推論 p50 | 13.7 ms | 72.5 ms | |
| 全流程 p50（sample.jpg） | —（前處理 5.7 ms，未含解碼） | 81.3 ms | |
| 全流程 p50（App 縮圖後的手機照片） | — | — | |
| 峰值記憶體 | — | 149 MB | |

---

## 5. 前端移接步驟

### 已整合的前端流程與驗證

實作位置：`frontend/services/stoolClassifierService.ts`、`frontend/screens/DailyLogScreen.tsx`。目前透過既有權限、登入 API client 與圖片處理流程選取／拍攝照片；推論只預選日常大便欄位，飼主可修改，最後由原有儲存操作寫入 `stoolLevel`。

**刻意不新增 `stoolAiSuggestion` 欄位或資料庫欄位**：分類不保存建議與信心資料，避免把模型推測當作照護事實，也避免不必要的個資／schema 變動。研究真實世界效能應採另行同意、人工標註與去識別化的評估流程，不能把飼主接受建議的比例當成模型正確率。

前端型別檢查、分類 service 測試與 ESLint 已通過。手機實機拍照、相簿、取消、弱網與低信心操作尚待人工驗收。

### 自動化檢查命令

```bash
cd frontend
npm run typecheck && npm run lint && npm test
```

---

## 6. API 規格

### `POST /api/pets/{petId}/stool-classifications?userId={userId}`

- 驗證：`Authorization: Bearer <accessToken>`；`userId` 必須與 token 一致，毛孩必須屬於該使用者。
- Content-Type：`multipart/form-data`，欄位 `file`（JPEG 或 PNG；≤ 10 MB；短邊 ≥ 64 px；≤ 40 MP）。
- 照片不保存，不建立任何紀錄。

**成功（高信心）— 200**

```json
{
  "success": true,
  "message": "已產生大便狀況建議",
  "data": {
    "status": "ok",
    "modelLabel": "Diarrhea",
    "suggestedStoolLevel": "watery",
    "suggestedStoolLabel": "水狀",
    "message": null,
    "confidence": 0.9999,
    "probabilities": {"watery": 0.9999, "hard": 0.0, "normal": 0.0, "soft": 0.0},
    "threshold": 0.9,
    "modelVersion": "efficientnet_b0-split_v1-p3v2-dbf9106a",
    "disclaimer": "此為照片外觀的參考建議，請確認或修改後再儲存；不是疾病診斷。"
  }
}
```

（以上為 `sample.jpg` 的實際輸出。）

**成功（低信心）— 200**：`status` 為 `low_confidence`，`modelLabel`、`suggestedStoolLevel`、`suggestedStoolLabel` 為 `null`，`message` 為「無法判斷，請重拍或手動選擇」；`probabilities` 仍提供，App 不應預選。

**錯誤**（MEGO 統一格式 `{"success": false, "message": "...", "detail": ...}`）

| HTTP | 情況 | App 處理 |
|---|---|---|
| 401 | 未登入、token 過期，或未帶 `userId` | 既有 `apiRequest` 會自動 refresh；失敗則回登入頁 |
| 403 | `userId` 與 token 不一致 | 程式錯誤 |
| 404 | 毛孩不存在或不屬於該使用者 | 程式錯誤 |
| 413 | 檔案或像素過大 | App 已縮圖，正常不會發生 |
| 415 | 非 JPEG／PNG | App 已轉 JPEG，正常不會發生 |
| 422 | 空檔、損毀、太小、缺少 `file` | 提示重拍 |
| 503 | 模型未載入 | 提示改為手動選擇 |

---

## 7. 重要注意事項

### 7.1 前處理不可更改

模型只在與訓練相同的前處理下才準確（服務程式已實作，請勿修改）：EXIF 轉正 → RGB → `ImageOps.autocontrast` → **直接縮放**成 224×224（BILINEAR，不裁切）→ `/255` → 依 `model_meta.json` 正規化 → NCHW。測試 `test_preprocess_matches_package` 會檢查與部署包逐值相同。

App 端縮至長邊 1024 px 只是為了減少上傳量；後端仍會再縮放到 224×224，兩者不衝突。

### 7.2 自動對比

訓練資料經 Roboflow 對比拉伸，App 實拍照片未必相同，因此部署前處理依 `model_meta.json` 的設定使用自動對比。此設定在已記錄測試結果中使 Macro-F1 由 0.870 降為 0.853；對實拍照片的影響尚未驗證。若要比較不同前處理，應在固定測試集與另行標註的實拍集重新評估，不能使用飼主是否接受預選作為正確標籤。

### 7.3 低信心門檻

門檻 0.9（`model_meta.json` 的 `low_confidence_threshold`），只依 val 決定。val：接受 89.5%、接受者準確率 93.4%；test：接受 80.2%、準確率 92.5%。仍有高信心錯誤，因此必須由飼主確認。

### 7.4 與既有提醒規則的關係

辨識結果確認後存入 `stoolLevel`，沿用既有規則。目前前後端規則不一致，建議擇一統一：

| | 偏硬／偏軟 | 水狀 |
|---|---|---|
| 前端 `healthTrendEngine.ts` | 連續 2 天「留意」、3 天「持續」 | 第 1 天「留意」、2 天「持續」 |
| 後端 `health_monitor_service.py` | 連續 3 天 | 連續 2 天 |

### 7.5 隱私

- 分類程式不將照片持久化至 `uploads/`、附件或資料庫，亦不送入 LLM；multipart 上傳解析可能使用框架暫存緩衝，請勿將此描述解讀為底層完全不碰暫存空間。
- 若飼主同時想保存照片，應另走既有附件流程（日常紀錄目前不支援附件）。
- log 不記錄影像內容。
- MEGO AI 的資料脈絡只讀取已保存的日常紀錄欄位；分類 API 的照片、機率與建議不會保存或送入 LLM。LLM 只可能取得飼主確認後已保存的 `stoolLevel`。

---

## 8. 驗收清單

- [ ] Step 3 `predict_example.py sample.jpg` 輸出與本文件相同
- [x] 有模型 API 9 項測試通過；無模型降級 2 項通過／7 項略過
- [x] 使用實際 MongoDB、有效 Session 與毛孩所有權驗證分類 API；錯誤 userId 回 403
- [x] 分類前後 `attachments`／`daily_logs` 筆數不變；照片不持久化
- [x] 前端型別、分類 service 測試、ESLint 與 `git diff --check` 通過
- [x] 模型 ONNX 權重不納入 Git
- [ ] iPhone 實機拍照／相簿完整流程、低信心、斷網與取消情境
- [ ] 以實際手機照片完成部署端效能量測；目前既有 VM 基準數字不是本次實機驗收

## 9. 更新與回退模型

1. 新模型解壓到新的版本資料夾（不覆蓋舊的）。
2. 對新資料夾執行 Step 3 與 Step 7。
3. 將 `STOOL_MODEL_DIR` 改指向新資料夾並重啟後端。
4. 確認回應的 `modelVersion` 已更新。
5. 有問題時改回舊資料夾並重啟。

換成 YOLO 部署包時步驟相同，程式不需修改（前處理參數由 `model_meta.json` 決定）。

## 10. 疑難排解

| 症狀 | 可能原因 | 處理 |
|---|---|---|
| 啟動失敗：`model.onnx 雜湊不符` | 檔案不完整或被替換 | 重新下載部署包 |
| 啟動失敗：`模型類別與對應表不符` | 換了不同類別的模型 | 更新 `LABEL_TO_STOOL_LEVEL` |
| 一律回 503 | 未設定 `STOOL_MODEL_DIR` 或未加 startup handler | 見 Step 5、6；看啟動 log |
| 回 401「請重新登入」 | 未帶 token 或未帶 `?userId=` | 使用 `apiRequest`，URL 帶 `userId` |
| 回 403 | `userId` 與 token 不一致 | 使用目前登入者的 id |
| `Illegal instruction` 或 onnxruntime 崩潰 | CPU 或 glibc 與 wheel 不相容 | 確認 Python／glibc 版本，或改裝其他 onnxruntime 版本 |
| 結果與 Colab 不一致 | 前處理被改動 | 執行 `test_preprocess_matches_package` |
| 多 worker 時變慢 | 執行緒過多 | 降低 `STOOL_ORT_THREADS` 或 worker 數 |

## 11. 研究限制

- 分數衡量與 **Roboflow 資料集標籤**的一致程度，不是獸醫正確率。
- test 僅 116 張，信賴區間寬（EfficientNet-B0 Macro-F1 0.80–0.93）。
- 資料多為近距離特寫；App 實拍的遠景、雜亂背景、不同光線可能使表現下降。
- 最容易混淆的是 Normal 與 Soft-Poop。
- Diarrhea 類別中低解析度影像偏多，模型可能部分依賴畫質判斷。

## 12. 參考資料

| 項目 | 位置 |
|---|---|
| 資料集 | Dog poo v1（Roboflow, CC BY 4.0）https://universe.roboflow.com/test-iznis/dog-poo |
| MEGO 專案 | https://github.com/Erieo030/Dog-care-app |
| 部署模型與前處理 metadata | `stool-classification/model/efficientnet_b0/model_meta.json`（ONNX 權重為本機 ignored 檔） |
| MEGO API／App 實作 | `backend/app/services/stool_classifier_service.py`、`backend/app/api/routes/stool_classifications.py`、`frontend/services/stoolClassifierService.ts`、`frontend/screens/DailyLogScreen.tsx` |
| 單體移接範例與 benchmark | `stool-classification/reference/fastapi_integration/`（獨立參考實作，不是 MEGO 執行路徑） |
| 訓練資料切分、Notebook 與完整實驗輸出 | 目前未包含於此工作區；需由原 Colab／研究資料備份提供，才能完整重現訓練與論文表格 |
