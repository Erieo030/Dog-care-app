"""用途：提供具使用者所有權檢查的提醒 CRUD、完成、略過與延後 API。"""
from fastapi import APIRouter, Query, Response, status

from app.schemas.reminder import ReminderCreateRequest, ReminderSnoozeRequest, ReminderUpdateRequest
from app.services import reminder_service

router = APIRouter(tags=["reminders"])


@router.get("/pets/{pet_id}/reminders")
def get_reminders(pet_id: str, user_id: str = Query(alias="userId")):
    return {"success": True, "message": "取得提醒成功", "data": {"reminders": reminder_service.list_reminders(pet_id, user_id)}}


@router.get("/pets/{pet_id}/reminders/today")
def get_today_reminders(pet_id: str, user_id: str = Query(alias="userId")):
    return {"success": True, "message": "取得今日提醒成功", "data": {"reminders": reminder_service.list_reminders(pet_id, user_id, today=True)}}


@router.post("/pets/{pet_id}/reminders", status_code=status.HTTP_201_CREATED)
def create_reminder(pet_id: str, data: ReminderCreateRequest, user_id: str = Query(alias="userId")):
    return {"success": True, "message": "提醒已建立", "data": {"reminder": reminder_service.create_reminder(pet_id, user_id, data)}}


@router.patch("/reminders/{reminder_id}")
def update_reminder(reminder_id: str, data: ReminderUpdateRequest, user_id: str = Query(alias="userId")):
    return {"success": True, "message": "提醒已更新", "data": {"reminder": reminder_service.update_reminder(reminder_id, user_id, data)}}


def _action_response(result: tuple[dict, dict | None, bool]) -> dict:
    reminder, next_reminder, changed = result
    return {"success": True, "message": "提醒狀態已更新", "data": {"reminder": reminder, "nextReminder": next_reminder, "changed": changed}}


@router.post("/reminders/{reminder_id}/complete")
def complete_reminder(reminder_id: str, user_id: str = Query(alias="userId")):
    return _action_response(reminder_service.complete_reminder(reminder_id, user_id))


@router.post("/reminders/{reminder_id}/skip")
def skip_reminder(reminder_id: str, user_id: str = Query(alias="userId")):
    return _action_response(reminder_service.skip_reminder(reminder_id, user_id))


@router.post("/reminders/{reminder_id}/snooze")
def snooze_reminder(reminder_id: str, data: ReminderSnoozeRequest, user_id: str = Query(alias="userId")):
    return {"success": True, "message": "提醒已延後", "data": {"reminder": reminder_service.snooze_reminder(reminder_id, user_id, data)}}


@router.delete("/reminders/{reminder_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_reminder(reminder_id: str, user_id: str = Query(alias="userId")):
    reminder_service.delete_reminder(reminder_id, user_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
