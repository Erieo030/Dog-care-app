# Home Scene 元件與素材

目前首頁使用單一背景素材：`frontend/assets/home-scene/background.webp`。
品牌 Logo：`frontend/assets/home-scene/logo.png`，由 Home Header 顯示。

`HomeBackgroundScene` 僅負責呈現裝飾背景，不處理 API、Pet state、觸控操作或動畫。首頁資料與互動由 `screens/HomeScreen.tsx` 負責；背景素材使用 WebP 以降低首屏載入成本。

若調整背景比例，需維持元件內既有 `resizeMode="stretch"` 與 canvas 計算方式，避免破壞目前首頁構圖。
