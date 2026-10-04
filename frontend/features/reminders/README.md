# Reminders feature

- `reminderListContent.ts`: 提醒清單的插圖、狀態文案、日期篩選與分組；預設保留未來一年清單，收到 `scheduledDate` 時改篩選所選本地日期的所有狀態。
- `components/ReminderListHeader.tsx`：新增按鈕與清單範圍摘要。
- `components/ReminderListCard.tsx`：單筆提醒展示與操作列。
- `components/ReminderListState.tsx`：空白、錯誤、載入狀態。
- 畫面入口仍在 `../../screens/ReminderListScreen.tsx` 與 `../../screens/CreateReminderScreen.tsx`，維持既有 navigator routes。

`ReminderListScreen` 目前保留既有 navigator route；由時間軸開啟提醒來源會帶入選取日期，直接進入提醒分頁仍顯示全年排程。提醒卡片直接呈現完成／延後；編輯、略過、刪除由「更多」選單提供。操作 handler、通知同步與 API 不變。
