# Health events feature

- `components/HealthEventOptions.tsx`：嘔吐與排便快速表單共用的單選／複選 chips；保持原尺寸與顏色。
- `components/HealthEventScreenState.tsx`：三種快速表單共用的載入與錯誤重試畫面。
- `createHealthEventContent.ts`：新增健康紀錄的快速問題與嚴重程度選項。
- `components/CreateHealthEventChoices.tsx`：新增畫面的快速選項欄位與嘔吐補充資訊。

各異常類型的欄位、驗證、安全提醒與 API 仍各自留在對應畫面，避免錯誤合併不同醫療紀錄規則。
