# 就醫前摘要模組

入口：`../../../screens/PreVetSummaryScreen.tsx`。

資料流：`PreVetSummaryScreen → services/aiService.ts → /api/ai/vet-brief → backend AI / 摘要服務`。

- `preVetContent.ts`：天數、資料區段、中文標籤、日期／年齡格式。
- `preVetStyles.ts`：摘要頁與表格的共用樣式。
- `usePreVetBrief.ts`：集中讀取系統摘要與手動 AI 整理；切換毛孩、天數、類別或離開頁面會取消請求，忽略晚到的舊結果。
- `preVetOnePage.ts`：將勾選的資料整理成單頁重點與分享文字；未勾選類別不會出現。
- `components/PreVetOnePageCard.tsx`：畫面首先呈現的看診快速摘要與飼主自填詢問事項。
- `components/PreVetBriefSections.tsx`：展開後查看基本資料、健康、體重、用藥、就醫、提醒等原始紀錄。
- `components/PreVetNarrativeCard.tsx`：將看診開場重點、近期紀錄脈絡、獸醫確認問題與明確資料缺漏分段呈現。

`PreVetSummaryScreen` 保留篩選狀態、手動產生溝通摘要、分享與畫面組裝。畫面先顯示近期重點、過敏／慢性病與飼主自填的看診詢問事項；資料範圍、AI 整理和原始表格預設收合。進入頁面只載入結構化紀錄，不會自動呼叫 AI；AI 輸入限於所選資料區段及相關毛孩基本資料。分享內容採精簡摘要，完整紀錄仍可在 MEGO 展開查看。

日期固定以台灣時區呈現，分享文字列出完整起迄日期。已產生的 AI 聚合敘述只有在來源類別與目前勾選範圍一致時才分享，避免帶出取消勾選的資料。AI 失敗時保留系統摘要與原始資料，並顯示失敗原因；快速摘要的筆數採完整資料數，而非預覽筆數。

`__tests__/` 覆蓋 7／15／30 天、類別排除與分享、切換範圍時取消舊請求、AI 失敗後保留資料及避免重複送出。這些是模擬服務測試，不代表實際 AI 回覆正確率或實機鍵盤行為已驗證。
