"""用途：建立 MongoDB 連線並提供共用資料庫物件。"""

from pymongo import MongoClient
from pymongo.errors import OperationFailure

from app.core.config import get_settings

settings = get_settings()
client = MongoClient(settings.mongo_uri, serverSelectionTimeoutMS=5000)
db = client[settings.mongo_db]

# Daily Log 以毛孩與裝置本地日期避免同日重複，並支援歷史排序。
db.daily_logs.create_index([ ("userId", 1), ("petId", 1), ("localDate", 1) ], unique=True)
db.daily_logs.create_index([ ("userId", 1), ("petId", 1), ("loggedAt", -1) ])

# 常用毛孩查詢索引；建立索引具冪等性，啟動時可安全重複執行。
def _ensure_index(collection, keys, name):
    try:
        collection.create_index(keys, name=name)
    except OperationFailure as error:
        # 舊版已存在相同 key 但不同名稱時，沿用既有索引即可。
        if error.code not in {85, 86}:
            raise

# Ownership 與各模組列表查詢的共同索引；不建立高風險唯一索引，避免舊資料阻塞啟動。
_ensure_index(db.pets, [("userId", 1), ("_id", 1)], "pets_user_owner")
for collection in (
    db.daily_logs, db.weight_records, db.health_events, db.medical_visits,
    db.vaccinations, db.dewormings, db.medications, db.reminders, db.timeline,
):
    _ensure_index(collection, [("userId", 1), ("petId", 1)], "user_pet_lookup")

for collection, field, name in (
    (db.weight_records, "measuredAt", "dashboard_weight_date"),
    (db.health_events, "occurredAt", "dashboard_health_date"),
    (db.medical_visits, "visitedAt", "dashboard_medical_date"),
    (db.vaccinations, "administeredAt", "pet_vaccination_date"),
    (db.dewormings, "administeredAt", "pet_deworming_date"),
    (db.medications, "startDate", "pet_medication_date"),
    (db.reminders, "scheduledAt", "dashboard_reminder_date_status"),
    (db.timeline, "occurredAt", "dashboard_timeline_date"),
):
    _ensure_index(collection, [("userId", 1), ("petId", 1), (field, -1)], name)

# AI context 以 petId 查詢，補齊和實際查詢條件一致的索引，避免資料量增加後掃描整個 collection。
for collection, field, name in (
    (db.weight_records, "measuredAt", "ai_weight_pet_date"),
    (db.daily_logs, "loggedAt", "ai_daily_pet_date"),
    (db.health_events, "occurredAt", "ai_health_pet_date"),
    (db.medical_visits, "visitedAt", "ai_medical_pet_date"),
    (db.vaccinations, "administeredAt", "ai_vaccination_pet_date"),
    (db.dewormings, "administeredAt", "ai_deworming_pet_date"),
    (db.reminders, "scheduledAt", "ai_reminder_pet_date"),
):
    _ensure_index(collection, [("petId", 1), (field, -1)], name)
_ensure_index(db.medications, [("petId", 1), ("status", 1), ("startDate", -1)], "ai_medication_pet_status")
_ensure_index(db.attachments, [("petId", 1), ("sourceType", 1), ("sourceId", 1)], "search_attachment_source")


def close() -> None:
    """關閉 MongoDB 連線，供應用程式 shutdown 使用。"""
    client.close()
