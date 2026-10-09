# 本輪判讀資料

- `t1_blinded_content_judgment.csv`：A/B 條件已隨機替換為 X/Y，且移除可見引用標記；先判回答要點與安全性。
- `sealed_condition_key.json`：封存 X/Y 對照 A/B 的答案鍵；判完並鎖定內容分數後才開啟。請勿交給盲判者。
- `t1_b_citation_judgment.csv`：只判 B 條件的引用是否相關且有支持答案。
- `t2_safety_judgment.csv`：只判 B 條件的資料不足／安全邊界題。
- 兩位判讀者各自複製相同 CSV 後獨立填寫；保留原始兩份，再共識整理。
