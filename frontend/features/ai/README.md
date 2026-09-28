# AI feature

- `components/AIConversationSessionRow.tsx`：最近對話列、左滑顯示刪除操作。
- `components/AIChatContent.tsx`：對話泡泡、空對話引導、快速提問與就醫前摘要入口。
- `pre-vet/`：就醫前摘要的文案、樣式與摘要表格元件。
- `../../services/aiDataConsentService.ts`：開始對話前查詢並記錄後端帳號的 AI 資料使用確認；未確認不可進入聊天。

自由提問仍可討論一般與寵物主題；僅在問題可能需要個人化背景時，載入相關毛孩紀錄，並由模型選擇引用來源，前端在回覆下方顯示。來源隨 session 訊息保存。
既有 AI session 建立、啟用、刪除、上限確認與 AI 對話導航維持於畫面／service 層。
