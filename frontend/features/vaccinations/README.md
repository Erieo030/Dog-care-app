# 疫苗紀錄模組

入口：`screens/VaccinationListScreen.tsx`；表單：`screens/VaccinationFormScreen.tsx`；詳細頁：`screens/VaccinationDetailScreen.tsx`。

資料流：`Screen → services/vaccinationService.ts → /api/vaccinations → backend service → MongoDB`。

`types.ts` 負責日期防呆與表單預設值；`vaccinationStyles.ts` 集中共用樣式。詳細頁頁首展示接種日期，資料區不重複該日期；未填醫院與備註不顯示。編輯／複製按鈕等高。接種日期、下次接種日期、提醒、附件、編輯、複製與刪除行為均保留。
