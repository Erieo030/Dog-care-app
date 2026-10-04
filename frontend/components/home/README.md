# Home Scene 元件與素材

首頁背景由 `frontend/constants/HomeThemes.ts` 依目前主題載入 `background-v2.webp`，不再使用舊的 `home-scene/background.webp`。
設定頁品牌 Logo 使用 `frontend/assets/home-scene/logo.webp`。

`HomeBackgroundScene` 僅負責呈現裝飾背景，不處理 API、Pet state、觸控操作或動畫。首頁資料與互動由 `screens/HomeScreen.tsx` 負責；背景素材使用 WebP 以降低首屏載入成本。

主題背景與裝飾插圖使用已壓縮的 WebP 素材。若調整背景比例，需維持元件內既有 `resizeMode="stretch"` 與 canvas 計算方式，避免破壞目前首頁構圖。
