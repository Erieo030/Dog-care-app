# MEGO 糞便外觀分類模型計畫

> 狀態：研究與 EfficientNet-B0 部署整合已完成；App 實機端到端驗收及持續蒐集真實使用情境仍待進行。  
> 更新日期：2026-10-03

## 目前進度摘要（2026-10-03）

- YOLO 與 EfficientNet 的資料集比較、三種子評估與模型選擇摘要見 `FASTAPI_MIGRATION.md`；目前工作區未包含原始 `results/`、Notebook 或訓練 checkpoint，因此本計畫不把它們列為可由本 repo 重現的內容。MEGO 部署採用已驗證的 EfficientNet-B0 ONNX 包。
- 模型已整理至本機 `stool-classification/model/efficientnet_b0/`，不提交大型 ONNX 權重至 Git。根目錄 `.env` 以 `STOOL_MODEL_DIR` 指向模型目錄；不設定時照片分類停用，其他日常紀錄仍可手動使用。
- FastAPI 分類 endpoint、登入與毛孩所有權檢查、影像檢查、CPU 推論及降級處理已整合；前端日常表單可拍照／選相片、顯示建議並讓飼主確認或修改。只有既有日常儲存動作會寫入飼主選擇的 `stoolLevel`。
- 已以實際 MongoDB、有效登入 Session 和毛孩驗證 endpoint：成功分類回 200；不相符使用者識別回 403；分類前後附件與日常紀錄筆數不變。後端模型測試 9 項通過，無模型降級測試 2 項通過、7 項略過；前端型別、分類 service 測試、ESLint、`git diff --check` 通過。
- 尚未完成：iPhone 實機拍照／相簿全流程驗收、弱網／取消等實機情境、真實手機照片的分類效能與模型可信度評估。現有資料集測試指標不等同真實世界或獸醫診斷效能。

## 1. 目標與範圍

以 `/home/erieo/Desktop/Dog poo.v1i.multiclass` 的 Roboflow 資料集進行糞便影像分類研究，使用 Google Colab GPU 訓練，將選出的模型檔下載至本機 Ubuntu VMware，由 FastAPI 在 CPU 上推論，MEGO App 上傳照片並呈現分類結果。

本研究辨識的是資料集定義的影像外觀類別，不是獸醫診斷。資料集標籤只能作為初期實驗的暫定標準；模型結果不得直接推論疾病、脫水原因或治療方式。

```text
Roboflow 資料集
      ↓ 上傳／掛載
Google Colab GPU：資料檢查、訓練、評估、匯出
      ↓ 下載模型產物
本機 Ubuntu VMware：FastAPI 載入模型，以 CPU 推論
      ↑ 照片                         ↓ 分類結果
MEGO App ─────────────────────────────┘
```

## 2. 模型比較範圍與已選模型

三種模型使用相同資料切分及類別順序進行比較：

| 模型 | 研究角色 | 預期產物 |
|---|---|---|
| YOLO26n-cls | 較新的 YOLO 整圖分類模型 | 最佳 checkpoint、ONNX 匯出檔、訓練紀錄 |
| YOLO11n-cls | 成熟的 YOLO 分類對照組 | 最佳 checkpoint、ONNX 匯出檔、訓練紀錄 |
| EfficientNet-B0 | 非 YOLO 影像分類基準 | checkpoint、ONNX 匯出檔、訓練紀錄 |

模型新舊不代表在本資料集上必然更準；最後依保留測試集的分類表現、CPU 推論速度及模型大小選擇。

後續比較實驗另測 YOLO11s-cls、YOLO26s-cls 與 EfficientNet-B0（三個 random seeds），結果摘要在 `FASTAPI_MIGRATION.md`。現行 MEGO API 部署 EfficientNet-B0，不代表其研究指標已證明優於所有 YOLO 變體；選擇依已完成匯出與部署驗證、模型可在目前 CPU 服務環境運作等因素決定。要完整重現訓練，仍需另行保存／提供原始 Notebook、資料切分清單和實驗產物。

## 3. 分階段工作

### Phase 0 — 環境與資料準備

- 確認資料集檔案格式、類別目錄、原始 train/validation/test 切分及授權／引用資訊。
- 將資料集放在不會提交到 Git 的位置；不要將個人或寵物照片、原始資料集或大型模型權重直接提交到程式碼儲存庫。
- 在 Colab 選擇 GPU runtime，確認 GPU、Python、PyTorch、Torchvision、Ultralytics 版本並記錄。
- 建立固定版本的安裝清單，避免三個模型因環境版本不同而無法重現。

**負責方式**：Codex 可建立檢查程式、Notebook 與安裝說明；使用者需登入 Colab、選擇可用 GPU，並上傳資料或掛載自己的 Google Drive。

**完成條件**：Colab 能讀取資料集，並產生每一類的樣本數與資料切分摘要。

### Phase 1 — 標籤與資料品質檢查

- 統計四類原始標籤及各 split 數量，檢查空類別、壞檔、重複或近似重複圖片。
- 確認重複／近似照片不會同時落在訓練與測試資料，避免測試分數虛高。
- 初期保留來源標籤進行基準實驗；建立標籤對照表，不把 `Lack-of-Water` 直接解讀成「狗狗缺水」。
- 抽樣查看易混淆類別，特別是 `Soft-Poop` 與 `Diarrhea`；標註不明的樣本列為待人工確認，不由模型自行裁定真實性。

**負責方式**：Codex 可寫資料稽核與重複檢查程式；使用者／指導者需決定是否接受來源標籤作為初期 ground truth，並協助覆核有疑慮的樣本。

**完成條件**：有可重現的類別分布、資料切分與需注意樣本清單。

### Phase 2 — 固定實驗資料與設定

- 優先保留合理的原始測試集；如有資料洩漏或 split 不完整，再建立一份固定的分層切分。
- 三個模型使用相同訓練／驗證／測試清單、類別順序與輸入尺寸基準。
- 訓練集才可做資料增強；驗證集用於選 checkpoint／調參；測試集只在選模後評估，避免反覆用測試集調參。
- 記錄 random seed、模型版本、影像前處理、訓練參數與資料版本。

**完成條件**：三種模型共用同一份資料清單及可追溯的實驗設定。

### Phase 3 — Colab GPU 訓練

- 使用遷移學習，不從零開始訓練。
- YOLO26n-cls、YOLO11n-cls 使用相同資料及對應分類訓練流程。
- EfficientNet-B0 使用 Torchvision 預訓練權重，替換分類輸出層為資料集類別數，再進行微調。
- 使用合理的亮度、對比、輕微旋轉等訓練增強；避免會改變糞便外觀語意的變換。
- 儲存最佳 checkpoint、每輪指標、超參數、訓練曲線及 Colab 套件版本。
- 若 Colab runtime 中斷，從 Drive 或已下載 checkpoint 恢復；不可只把模型留在暫時 runtime 磁碟。

**負責方式**：Codex 可撰寫完整 Notebook／訓練腳本與 checkpoint 管理；使用者需在自己的 Colab 工作階段執行並保管 Drive／下載產物。

**完成條件**：三個模型各有成功的訓練紀錄與最佳 checkpoint。

### Phase 4 — 模型評估與錯誤分析

- 在同一保留測試集產生 Accuracy、各類別 Precision／Recall／F1、Macro-F1 及混淆矩陣。
- 逐類檢查漏判與誤判，不以總 Accuracy 單獨選模。
- 比較模型檔案大小及 Ubuntu VM CPU 上單張推論時間；記錄 warm-up 後延遲。
- 若時間允許，以多個 random seed 重跑主要模型，回報平均與變異；測試資料仍保持固定。
- 清楚註明：這些分數衡量模型與資料集標籤的一致程度，不等於獸醫正確率或真實世界臨床效能。

**負責方式**：Codex 可寫評估、圖表和報告彙整工具；使用者提供實際 Colab 結果，並協助覆核有爭議的影像／標籤。

**完成條件**：產生三模型比較表、各類別錯誤分析，以及選擇部署模型的理由。

### Phase 5 — 匯出模型並搬回 Ubuntu VM（部署包已完成；跨框架實機比對未完整留存於本工作區）

- 對候選模型匯出 ONNX，並保留原始 checkpoint 作為回退與重現依據。
- 一起保存類別順序、輸入尺寸、resize/crop、像素正規化方式、模型版本與訓練參數；只搬權重而沒有前處理設定不足以正確部署。
- 在 Colab 與 Ubuntu VM 對相同測試圖片比較原生模型與 ONNX 輸出，確認類別順序及結果一致。
- 模型產物放在專案本機模型目錄，例如 `backend/models/stool_classifier/`；將大型權重與私有資料加入 `.gitignore`，文件只記錄取得與放置方式。

**完成條件**：模型可在 Ubuntu VM 的 CPU 上成功載入，匯出前後結果差異在預先訂定容許範圍內。

### Phase 6 — FastAPI CPU 推論（已整合與自動測試）

- 新增獨立模型載入與推論模組；服務啟動時載入模型一次，不要每次請求重新載入。
- 新增影像推論 endpoint：檢查檔案格式、尺寸及大小，執行必要前處理，回傳類別、各類信心分數、模型版本及是否低信心。
- 加入低信心／不合格影像處理；照片不清楚或模型信心不足時回覆「無法判斷，請重拍或手動選擇」，不硬猜類別。
- 預設不永久保存上傳照片；推論後清理暫存檔。若日後需要留存，須另訂使用者告知、權限與保存期限。
- 在 VM CPU 上以實際照片量測單張延遲、記憶體使用與多請求行為。

**完成條件**：API 能在無 CUDA 的 Ubuntu VM 上穩定推論，並有錯誤、格式不符及低信心測試。

### Phase 7 — MEGO App 串接（已整合；實機驗收待進行）

- 使用既有相機／相簿選圖流程；使用者先預覽及確認照片，再送到 MEGO 自己的 FastAPI，不把此分類步驟送到 LLM。
- 顯示溫和的外觀描述、信心／不確定狀態及手動修正入口，不顯示疾病診斷或缺水判斷。
- 使用者確認或修改類別後才寫入日常紀錄；取消或推論失敗時不新增紀錄。
- 測試 Wi-Fi／手機熱點 API 網址、逾時、重試、取消上傳及無網路狀態。

**負責方式**：Codex 可完成 API 與 App 程式修改和自動化測試；使用者需用實際 iPhone／Expo 環境測試拍照、選圖、網路和操作流程。

**完成條件**：從選照片到確認保存紀錄的流程可用；失敗時可重試或手動記錄，且不會產生錯誤紀錄。

### Phase 8 — 文件與展示（系統文件已更新；研究展示資料待整理）

- 記錄資料集來源／授權、類別定義、環境版本、訓練設定、資料切分、指標與錯誤案例。
- 展示 Colab GPU 訓練、模型匯出、FastAPI CPU 推論及 App 操作流程。
- 將系統定位為照護紀錄的影像輔助，不宣稱疾病診斷或已達獸醫級準確度。

**完成條件**：可從文件重現主要訓練和推論步驟，並清楚說明研究限制。

## 4. 初期安裝需求

### Colab 訓練環境

- Google Colab GPU runtime。
- `torch`、`torchvision`、`ultralytics`、`scikit-learn`、`pandas`、`Pillow`、`matplotlib`、`seaborn`。
- 以 Notebook 記錄並固定實際使用版本；不先猜測或固定未驗證的 CUDA／套件版本。

### Ubuntu VM 推論環境

- CPU 推論所需套件與訓練環境分開。
- 若採 ONNX：加入相容版本的 `onnxruntime`；YOLO 若使用 Ultralytics API 載入 ONNX，則需保留相容版本的 `ultralytics`。
- FastAPI 上傳 endpoint 若專案尚未安裝 multipart 解析依賴，再加入對應套件。
- 不需要在 Ubuntu VMware 安裝 NVIDIA CUDA driver；目前 VM 沒有 NVIDIA GPU passthrough。

實際版本會在環境盤點後鎖定，避免破壞既有後端環境或把訓練用大型套件帶入正式服務依賴。

## 5. 資料與模型產物管理

- 原始資料集、Colab cache、checkpoint、ONNX 權重與推論測試照片不納入 Git。
- 版本控制只保存程式碼、Notebook、依賴清單、模型 metadata 範本與結果摘要。
- 每個模型產物需記錄：來源資料版本、類別順序、訓練日期、random seed、套件版本、前處理及測試指標。
- Colab GPU 是訓練資源；下載權重後在 VM CPU 執行，不代表本機取得 Colab GPU。

## 6. 驗收清單

- [x] 已有模型比較與評估摘要；詳細原始實驗產物未包含在目前 repo，完整重現性仍需補齊 Notebook／manifest／指標輸出。
- [x] EfficientNet-B0 ONNX 可由 Ubuntu VM CPU 載入；部署 metadata／雜湊與服務前處理有驗證。
- [x] 低信心、錯誤格式、檔案大小限制、模型未設定及登入／毛孩授權等 API 路徑有自動測試。
- [x] App 只預選建議；飼主確認後才以既有流程儲存，分類 API 不建立附件／日常紀錄、不持久化影像。
- [x] 文件說明資料集標籤一致性不等於獸醫診斷正確率。
- [ ] iPhone 實機拍照／相簿端到端驗收及弱網、取消、低信心操作。
- [ ] 使用多樣的真實手機照片做人工標註與外部效度評估；不得以飼主接受模型建議的比例替代正確率。
