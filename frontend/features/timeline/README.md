# Timeline feature

- `timelineContent.ts`: 時間軸篩選、排序、清單分頁大小與篩選文案。
- `components/TimelineHeader.tsx`：毛孩摘要、篩選列與目前清單標題。
- `components/TimelineCard.tsx`：單筆時間軸紀錄。
- `components/TimelineStates.tsx`：切換、錯誤重試、空清單狀態。

既有 `TimelineScreen` 保留 navigator route、載入狀態、分頁、重新整理與來源畫面導航。
