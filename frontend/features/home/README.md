# 首頁模組

入口：`../../screens/HomeScreen.tsx`。首頁負責資料載入、通知同步與導航。

- `homeContent.ts`：固定操作清單與毛孩年齡文案。
- `components/HomePetHeader.tsx`：品牌標頭、毛孩摘要與毛孩切換。
- `components/HomeAction.tsx`：日常與健康管理入口。
- `components/HomeTodayOverview.tsx`：今日待辦與健康觀察摘要。

資料來源：`dashboardService.ts`、`reminderService.ts`、`healthTrendEngine.ts`。背景由 `components/home/HomeBackgroundScene.tsx` 管理。
