# 用藥管理模組

## 入口

- 列表：`screens/MedicationListScreen.tsx`
- 新增／編輯：`screens/MedicationFormScreen.tsx`
- 詳細資料：`screens/MedicationDetailScreen.tsx`

## 資料流

`Screen → services/medicationService.ts → /api/medications → backend service → MongoDB`

## 對應職責

- `types.ts`：表單型別、預設值與顯示文字。
- `medicationStyles.ts`：三個畫面共用樣式。
- `components/MedicationDetailRow.tsx`：詳細資料列。
- `screens/`：只負責畫面組裝、導航與使用者操作。

詳細頁的編輯／複製按鈕使用一致尺寸；選填補充備註未填時不顯示。完成、停止、刪除療程與提醒的既有確認和資料流程不變。

## 保留行為

新增、編輯、複製新增、完成療程、停止療程、刪除、提醒時間與既有 API payload 均維持不變。
