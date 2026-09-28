# 就醫前摘要模組

入口：`../../../screens/PreVetSummaryScreen.tsx`。

資料流：`PreVetSummaryScreen → services/aiService.ts → /api/ai/vet-brief → backend AI / 摘要服務`。

- `preVetContent.ts`：天數、資料區段、中文標籤、日期／年齡格式。
- `preVetStyles.ts`：摘要頁與表格的共用樣式。
- `components/PreVetBriefSections.tsx`：基本資料、健康、體重、用藥、就醫、提醒等摘要表格。
- `components/PreVetNarrativeCard.tsx`：將看診開場重點、近期紀錄脈絡、獸醫確認問題與明確資料缺漏分段呈現。

`PreVetSummaryScreen` 保留資料讀取、篩選狀態、手動產生溝通摘要、分享與畫面組裝。進入頁面只載入結構化紀錄，不會自動呼叫 AI；AI 輸入限於所選資料區段及相關毛孩基本資料，並帶入日期序列以整理趨勢。分享內容會包含已產生的溝通摘要。
