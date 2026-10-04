# 驅蟲紀錄模組

入口：`screens/DewormingListScreen.tsx`。新增／編輯：`screens/DewormingFormScreen.tsx`。詳細頁：`screens/DewormingDetailScreen.tsx`。

資料流：`Screen → services/dewormingService.ts → /api/dewormings → backend service → MongoDB`。

`types.ts` 管理表單預設值、類型文字與日期防呆；`dewormingStyles.ts` 管理共用樣式。詳細頁不重複頁首已展示的使用日期，空白選填劑量／備註不顯示，編輯／複製按鈕等高。既有建立提醒、附件、編輯、複製與刪除 payload 保持不變。
