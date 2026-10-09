"""照護相簿：以原始紀錄日期整理已綁定照片，不複製紀錄或圖片。"""
from datetime import datetime, timezone
from typing import Literal

from fastapi import HTTPException

from app.db import db
from app.services import attachment_service
from app.timezone import TAIPEI

PhotoCategory = Literal["all", "health", "weight", "medical"]
SOURCES = {
    "health_event": ("health_events", "occurredAt", "health", "健康異常"),
    "weight": ("weight_records", "measuredAt", "weight", "體重"),
    "medical_visit": ("medical_visits", "visitedAt", "medical", "就醫照片"),
}


def month_bounds(month: str) -> tuple[datetime, datetime]:
    try:
        start = datetime.strptime(month, "%Y-%m").replace(tzinfo=TAIPEI)
        if start.strftime("%Y-%m") != month or not 2000 <= start.year <= 9998:
            raise ValueError()
        end = datetime(start.year + (start.month == 12), start.month % 12 + 1, 1, tzinfo=TAIPEI)
        return start, end
    except ValueError as error:
        raise HTTPException(422, "月份請使用有效的 YYYY-MM，年份範圍為 2000–9998") from error


def _record_date(value: datetime) -> str:
    # PyMongo 預設傳回 naive UTC；不可將它當成台灣本地時間。
    aware = value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    return aware.astimezone(TAIPEI).isoformat()


def list_care_photos(
    pet_id: str, user_id: str, month: str, category: PhotoCategory = "all",
    limit: int = 50, skip: int = 0,
) -> dict:
    attachment_service.ensure_owned_pet(pet_id, user_id)
    start, end = month_bounds(month)
    photos = []
    for source_type, (collection_name, date_field, source_category, label) in SOURCES.items():
        if category not in {"all", source_category}:
            continue
        records = list(getattr(db, collection_name).find(
            {"petId": pet_id, date_field: {"$gte": start, "$lt": end}},
            {date_field: 1, "attachmentIds": 1, "summary": 1, "notes": 1,
             "reason": 1, "weightKg": 1, "type": 1},
        ))
        # 尚未綁定、已刪除來源、頭像都不會混入相簿。
        by_id = {str(record["_id"]): record for record in records if record.get("attachmentIds")}
        if not by_id:
            continue
        attachments = db.attachments.find({
            "petId": pet_id, "sourceType": source_type, "sourceId": {"$in": list(by_id)},
        })
        for item in attachments:
            record = by_id[item["sourceId"]]
            if str(item["_id"]) not in record["attachmentIds"]:
                continue
            record_at = _record_date(record[date_field])
            title = record.get("summary") or record.get("reason") or label
            if source_type == "weight":
                title = f"體重 {record.get('weightKg', '')} kg"
            photos.append({
                **attachment_service._serialize(item),
                "createdAt": _record_date(item["createdAt"]) if isinstance(item.get("createdAt"), datetime) else None,
                "recordAt": record_at, "recordDate": record_at[:10],
                "category": source_category, "categoryLabel": label,
                "title": title, "notes": record.get("notes") or "",
                # 健康事件可能含傷口、便便等；預設全部遮罩，由飼主點選查看。
                "sensitive": source_type == "health_event",
            })
    photos.sort(key=lambda item: (item["recordAt"], item["id"]), reverse=True)
    page = photos[skip:skip + limit]
    return {"items": page, "total": len(photos), "hasMore": skip + len(page) < len(photos)}
