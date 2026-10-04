from bson import ObjectId
from fastapi import HTTPException

from app.timezone import now_taipei

AI_DATA_CONSENT_VERSION = "2026-10-04-v2"


def _users_collection():
    # Defer DB initialization until an endpoint actually needs to read or write consent.
    from app.db import db
    return db.users


def get_consent(user_id: str) -> dict:
    try:
        object_id = ObjectId(user_id)
    except Exception as exc:
        raise HTTPException(status_code=404, detail="找不到使用者資料") from exc
    user = _users_collection().find_one({"_id": object_id}, {"aiDataConsentVersion": 1, "aiDataConsentAt": 1})
    if not user:
        raise HTTPException(status_code=404, detail="找不到使用者資料")
    accepted = user.get("aiDataConsentVersion") == AI_DATA_CONSENT_VERSION
    return {
        "accepted": accepted,
        "version": user.get("aiDataConsentVersion"),
        "acceptedAt": user.get("aiDataConsentAt"),
        "currentVersion": AI_DATA_CONSENT_VERSION,
    }


def accept_consent(user_id: str) -> dict:
    try:
        object_id = ObjectId(user_id)
    except Exception as exc:
        raise HTTPException(status_code=404, detail="找不到使用者資料") from exc
    accepted_at = now_taipei()
    result = _users_collection().update_one(
        {"_id": object_id},
        {"$set": {"aiDataConsentVersion": AI_DATA_CONSENT_VERSION, "aiDataConsentAt": accepted_at}},
    )
    if not result.matched_count:
        raise HTTPException(status_code=404, detail="找不到使用者資料")
    return {"accepted": True, "version": AI_DATA_CONSENT_VERSION, "acceptedAt": accepted_at, "currentVersion": AI_DATA_CONSENT_VERSION}


def require_current_consent(user_id: str) -> None:
    if not get_consent(user_id)["accepted"]:
        raise HTTPException(status_code=403, detail="使用 MEGO AI 前，請先閱讀並確認 AI 資料使用說明。")
