# 1.第一步 Frontend start

- 打開 VScode
- 打開 Terminal，確認位置是在 frontend
- 輸入 : npx expo start
  
# 2.第二步 Backend start
- 打開 VScode
- 打開 Terminal，確認位置是在 backend
- 輸入 : uvicorn main:app --reload --host 0.0.0.0 --port 3000

# 3.第三部 確認 docker 有無啟動
- 查看 docker : docker ps
- 關閉 docker : docker compose down -v
- 啟動 docker : docker compose up -d
- 進去 docker : docker exec -it app-postgres psql -U erieo -d app_dog_db
