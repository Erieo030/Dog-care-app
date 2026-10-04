# 設定模組

設定子頁位於 `screens/`，由 `navigation/MainTabs.tsx` 的 ProfileStack 直接匯入。無引用的舊 `../../screens/SettingsScreens.tsx` 相容入口已移除。

- `components/SettingsLayout.tsx`：共用 `SettingsPage`、`SettingsRow` 與色彩 token。
- `components/SettingsHomeRows.tsx`：設定首頁分組與可點擊資料列。
- 毛孩身份卡統一使用 `../pets/components/PetIdentityCarousel.tsx`，由設定與首頁選擇器共用同一套卡片、滑動與切換行為。
- `screens/SettingsScreens.tsx`：毛孩管理、通知、關於 MEGO、隱私政策、使用條款。
- `screens/AIUsageScreen.tsx`：顯示今天的 AI 使用次數與近 7 天每日用量，由 `getAIUsage`、`getAIUsageHistory` 讀取；僅供查看，不改額度規則。
- `screens/AIDataUseInfoScreen.tsx`：唯讀呈現 MEGO AI 問答及毛孩資料使用方式；同意於首次啟動對話時記錄，不在此頁切換。
- `components/SettingsLayout.tsx`：共用設定文件的標題區、章節卡與段落元件，供 AI 資料使用說明、隱私政策與使用條款維持一致的閱讀層級。
- `screens/AccountInfoScreen.tsx`：登入帳號資訊，沿用既有 `useAuth` Session。
- `screens/index.ts`：導航匯出入口。

設定首頁位於 `../../screens/SettingsHomeScreen.tsx`，只保留設定入口、AI 用量摘要與登出；AI 使用狀況及帳號資訊由 ProfileStack 原本的 `AIUsage`、`AccountInfo` route 開啟。

AI 用量讀取失敗時，首頁顯示「暫時無法取得」，用量頁顯示錯誤與重試；不再把失敗誤顯示為「不限次數」或 0 次。用量頁顯示今天的額度狀態及後端按台灣日期回傳的近 7 天每日次數（包含 0 次日期）。

每個設定頁仍維持原 route 與導航目的地。
