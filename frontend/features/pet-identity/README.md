# 毛孩身份 QR 模組

- `screens/PetIdentityScreens.tsx`：身份資料設定與身份 QR 顯示，保留既有 `LostPetSettings`、`LostPetQr` route。
- `identityFields.ts`：聯絡欄位、公開開關與預設公開範圍。
- `components/IdentityPresentation.tsx`：身份頁標頭、提示與共用樣式。
- `screens/index.ts`：導航匯出入口。

公開欄位、QR token 更新、分享內容與後端 API 均維持原行為。
設定頁與 QR 頁的讀取失敗顯示錯誤與重試；未建立身份資料、缺少公開網址、缺少 token 分別提示。分享與更新連結失敗會顯示原因。
`navigation/MainTabs.tsx` 直接匯入此模組；無引用的舊 `../../screens/LostPetScreens.tsx` 相容入口已移除。
