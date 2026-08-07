"""用途：建立 MongoDB 連線並提供共用資料庫物件。"""

from pymongo import MongoClient

from app.core.config import get_settings

settings = get_settings()
client = MongoClient(settings.mongo_uri, serverSelectionTimeoutMS=5000)
db = client[settings.mongo_db]
