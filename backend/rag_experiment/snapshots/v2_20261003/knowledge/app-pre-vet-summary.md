---
id: app-pre-vet-summary
title: MEGO 就醫前摘要的資料範圍與使用方式
category: app_guide
audience: owner
species: dog
tags: [就醫前摘要, 看獸醫, 照護紀錄, 分享]
synonyms:
  pre_vet_summary: [看醫生摘要, 看診整理, 給獸醫看的資料]
source:
  - frontend/features/ai/pre-vet/README.md
  - frontend/features/ai/pre-vet/preVetContent.ts
  - backend/app/services/ai/vet_brief_service.py
reviewed_by: MEGO 開發團隊
reviewed_at: 2026-10-03
version: 1.0
---

## 摘要可整理什麼

就醫前摘要可選擇近 7、15 或 30 天，並勾選要整理的健康異常、體重趨勢、日常觀察、目前用藥、近期就醫、疫苗、驅蟲與提醒。毛孩基本資料會協助辨認摘要對象。取消選取的紀錄類別不應進入該次摘要或分享內容；摘要用途是幫飼主回顧與和獸醫溝通，不是診斷或病歷替代品。

## 系統整理與 AI 補充

頁面進入時先載入結構化紀錄；文字整理由飼主操作產生。系統可用已記錄的事件、體重與日常趨勢整理重點。若另外啟用 AI 補充，須遵循 App 的 AI 資料使用確認，且內容會標示由 AI 或系統整理。資料不足時應明確呈現資料缺口，不應推測未記錄的症狀、病因或治療；看診時仍由獸醫檢查判斷。
