"""Securely remove a user and every app-owned record associated with the account."""
from __future__ import annotations

from bson import ObjectId
from fastapi import HTTPException

from app.db import db
from app.services.auth_service import _verify_password


def delete_account(user_id: str, password: str) -> None:
    """Re-check credentials, erase dependent data, then remove the account last.

    The operation is deliberately idempotent until the final user deletion so a
    retry can finish cleanup if storage or MongoDB becomes temporarily unavailable.
    """
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=401, detail="登入狀態無效，請重新登入")

    user_object_id = ObjectId(user_id)
    user = db.users.find_one({"_id": user_object_id})
    if not user or not _verify_password(password, user.get("passwordHash", "")):
        # Keep this distinct from 401: the mobile API client refreshes the login
        # session on 401, which would otherwise log out a valid user on a typo.
        raise HTTPException(status_code=403, detail="密碼不正確，請重新確認")

    pet_ids = [str(pet["_id"]) for pet in db.pets.find({"userId": user_id}, {"_id": 1})]
    pet_query = {"petId": {"$in": pet_ids}} if pet_ids else {"petId": {"$in": []}}

    # Stop queued/running report tasks before removing their data and files.
    from app.services.export_service import delete_user_exports

    delete_user_exports(user_id)

    # Attachments are stored as files; delete those before their metadata.
    from app.services import attachment_service

    for attachment in db.attachments.find(pet_query):
        attachment_service.storage.delete(attachment["storageKey"])
    db.attachments.delete_many(pet_query)

    for collection in (
        db.daily_logs,
        db.weight_records,
        db.health_events,
        db.medical_visits,
        db.vaccinations,
        db.dewormings,
        db.medications,
        db.reminders,
        db.timeline,
    ):
        collection.delete_many(pet_query)
    db.lost_pet_profiles.delete_many(pet_query)
    db.ai_usage.delete_many({"userId": user_id})
    db.auth_sessions.delete_many({"userId": user_id})
    db.pets.delete_many({"userId": user_id})

    # Keep the account row until all dependent cleanup above has succeeded.
    db.users.delete_one({"_id": user_object_id})
