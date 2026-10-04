# Weights feature

- `weightListContent.ts`: 體重期間篩選、日期與差異文案。
- `components/WeightSummaryCard.tsx`: 最新體重摘要。
- `components/WeightLineChart.tsx`: 純 React Native 折線趨勢圖。
- `weightListStyles.ts`: 體重清單與展示元件共用樣式。

`WeightLineChart` 以內層繪圖容器的實際寬度定位圖點，保留邊緣空間避免節點裁切。`WeightListScreen` 的歷史紀錄預設顯示最新 3 筆，可展開全部；篩選仍同時套用趨勢圖及清單。

既有 `WeightListScreen` 保留 navigator route、資料載入、刪除、重新整理與表單導航。
