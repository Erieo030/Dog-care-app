---
id: app-health-observation
title: MEGO 首頁健康觀察如何判讀
category: app_guide
audience: owner
species: dog
tags: [健康觀察, 日常紀錄, 喝水, 飼料, 精神, 便便]
synonyms:
  health_observation: [健康趨勢, 健康狀況提示]
source:
  - frontend/utils/healthTrendEngine.ts
reviewed_by: MEGO 開發團隊
reviewed_at: 2026-10-03
version: 1.0
status: published
jurisdiction: MEGO app behavior
editorial_review_status: reviewed
editorial_reviewed_by: MEGO project maintainers
editorial_reviewed_at: 2026-10-03
clinical_review_status: not_applicable
---

## 健康觀察使用哪些資料
<!-- sources:
- frontend/utils/healthTrendEngine.ts
-->

首頁健康觀察只整理日常紀錄中的喝水量、飼料量、精神狀態與便便狀態，觀察最近連續出現的相同變化。單日一般變化多半不會觸發趨勢提示；中間出現正常紀錄或日期中斷會打斷連續天數。健康異常事件（例如嘔吐或受傷）不會併入這套趨勢規則，需在健康異常紀錄中查看。

## 穩定、近期留意與持續留意
<!-- sources:
- frontend/utils/healthTrendEngine.ts
-->

「今天狀況穩定」表示目前沒有符合程式門檻的日常趨勢，不代表獸醫檢查結果或保證沒有健康問題。「近期有幾項需留意」代表部分變化達到觀察門檻；「有幾項持續需留意」代表某些變化連續多日。首頁只顯示簡短狀態，點入健康觀察頁可查看觸發項目與紀錄天數。若毛孩有急速惡化或明顯不適，應直接聯絡獸醫，不要等待 App 趨勢提示。
