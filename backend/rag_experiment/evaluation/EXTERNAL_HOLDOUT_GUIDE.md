# 外部盲測題集準備方式

目前的 `questions.jsonl`、`questions_v2.jsonl` 與 `questions_v3_dev.jsonl` 都由 MEGO 開發研究者撰寫，不能宣稱為獨立盲測。請邀請未撰寫知識文件、未看過模型排序結果的人（例如指導老師／獸醫顧問）協助建立新的評估集。

## 建議工作流程

1. 先凍結待評估的知識文件版本、模型 ID、檢索設定與評分程式。
2. 評估者根據實際飼主可能提出的問法自行寫題，開發者不要先提供本專案已使用的題目或錯誤案例。
3. 由評估者標註目標文件與段落，或標為 `NONE`（目前知識庫沒有可直接支持答案的內容）。`NONE` 不等於應拒絕一般聊天。
4. 將題目分成公開 dev 與封存 test。開發者只用 dev 調整文件、檢索和門檻；確認設定凍結後，再一次執行全題集並查看 test。
5. 若根據 test 錯誤改動文件／模型／門檻，該 test 即視為已使用，需再收集一批新的封存題。

## 題型建議

- 覆蓋每份照護與 App 說明文件，混合正式說法、台灣飼主口語、同義詞、錯字／簡寫。
- 刻意加入相似主題的 hard negatives，例如一般嘔吐 vs 誤食、食慾變化 vs 腹瀉、藥物安全 vs 個別劑量。
- 涵蓋安全邊界：疾病診斷、個別用藥／劑量、缺少毛孩紀錄的私人資訊，以及非知識庫範圍問題。
- 建議至少 100 題（dev/test 約 60/40），並另外報告各類別指標。若本階段只評估檢索與引用出處，標註目標文件／段落即可，不宣稱醫療正確率；若日後要評估臨床建議正確性，才另安排相應專業審查。
- 只使用自行撰寫的合成問題，不要貼入真實飼主對話、姓名、電話、病歷或其他個人資料。

## JSONL 格式

每一行一個 JSON 物件，目標文件與段落必須存在於凍結版 Markdown front matter／`##` 標題中：

```json
{"id":"ext-dev-001","split":"dev","question":"狗狗把無糖口香糖吞了，現在看起來正常，要怎麼辦？","expected_doc":"care-toxic-ingestion","expected_section":"懷疑誤食時的處理"}
{"id":"ext-test-001","split":"test","question":"我的狗八公斤，這款藥要給多少？","expected_doc":"NONE","expected_section":""}
```

先把收到的題目保存為新檔，不覆蓋既有題集。以新知識文件版本執行前，可先只看 dev：

```bash
dog-care/bin/python backend/rag_experiment/run_embedding_experiment.py \\
  --knowledge-dir backend/rag_experiment/knowledge \\
  --questions backend/rag_experiment/evaluation/external_questions.jsonl \\
  --split dev
```

知識庫與設定凍結後才執行完整評估，並將 test 結果視為一次性保留結果。

`questions_v4_internal_provisional.jsonl` 是開發端自行撰寫的壓力測試題，只能作為內部 smoke test，不是獨立盲測，也不能據此宣稱泛化表現。正式盲測仍須由未參與知識文件整理與系統調整的人員獨立出題、標註；引用出處測試只需標註段落關聯，不需要把它描述成獸醫審核或臨床正確率測試。
