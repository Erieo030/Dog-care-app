"""保留帳號，清除其餘資料後依現行服務層建立展示測試資料。

在 backend 目錄執行：PYTHONPATH=. ../dog-care/bin/python scripts/reset_and_seed_demo_data.py
"""

from datetime import timedelta

from app.db import close, db
from app.schemas.daily_log import DailyLogCreateRequest
from app.schemas.deworming import DewormingRequest
from app.schemas.health_event import HealthEventCreateRequest
from app.schemas.medical_visit import MedicalVisitRequest
from app.schemas.medication import MedicationRequest
from app.schemas.pet import PetCreateRequest
from app.schemas.reminder import ReminderCreateRequest
from app.schemas.vaccination import VaccinationRequest
from app.schemas.weight import WeightRecordRequest
from app.services.daily_log_service import create as create_daily_log
from app.services.deworming_service import create as create_deworming
from app.services.health_event_service import create_event
from app.services.medical_visit_service import create_visit
from app.services.medication_service import create as create_medication
from app.services.pet_service import create_pet
from app.services.reminder_service import create_reminder
from app.services.vaccination_service import create as create_vaccination
from app.services.weight_service import create_record
from app.timezone import now_taipei


CARE_COLLECTIONS = (
    "pets", "lost_pet_profiles", "daily_logs", "weight_records", "health_events",
    "medical_visits", "vaccinations", "dewormings", "medications", "reminders",
    "timeline", "attachments", "ai_usage", "export_jobs",
)


def clear_non_account_data() -> dict[str, int]:
    """只刪除照護資料，不刪 users，也保留既有 collection indexes。"""
    deleted = {}
    for name in db.list_collection_names():
        if name == "users" or name.startswith("system."):
            continue
        deleted[name] = db[name].delete_many({}).deleted_count
    return deleted


def health_payload(index: int, occurred_at):
    variants = (
        ("vomiting", {"vomitCount": "once", "energyCondition": "normal"}),
        ("abnormal_stool", {"stoolConsistency": "soft", "stoolColor": "normal"}),
        ("low_appetite", {"appetiteLevel": "slightly_reduced", "duration": "one_meal"}),
        ("low_energy", {"energyLevel": "slightly_low", "movementCondition": "reduced_movement"}),
        ("abnormal_drinking", {"drinkingLevel": "more_than_usual", "duration": "few_hours"}),
    )
    event_type, details = variants[index % len(variants)]
    return HealthEventCreateRequest(
        type=event_type,
        occurredAt=occurred_at,
        severity=("mild", "moderate", "mild", "moderate", "mild")[index % 5],
        summary="日常健康觀察",
        details=details,
        notes="展示用照護紀錄，僅供測試畫面與流程。",
    )


def seed_pet(user_id: str, ordinal: int) -> str:
    today = now_taipei().date()
    pet = create_pet(PetCreateRequest(
        userId=user_id,
        name=f"MEGO 測試犬 {ordinal}",
        gender="male" if ordinal % 2 else "female",
        breed="柴犬" if ordinal % 2 else "米克斯",
        breedType="purebred" if ordinal % 2 else "mixed",
        birthday=(today - timedelta(days=ordinal * 365 + 180)).isoformat(),
        arrivalDate=(today - timedelta(days=ordinal * 365)).isoformat(),
        neutered=True,
        coatColor="赤色" if ordinal % 2 else "奶油色",
        distinctiveFeatures="耳朵豎立、親人",
    ))
    return pet["petData"]["_id"]


def seed_records(user_id: str, pet_id: str) -> None:
    now = now_taipei().replace(second=0, microsecond=0)
    # 最後三天刻意保留可辨識的日常趨勢，方便驗證首頁「健康觀察」。
    daily_samples = (
        ("low", "normal", "normal", "hard"),
        ("normal", "high", "normal", "normal"),
        ("high", "low", "slightly_low", "soft"),
        ("normal", "normal", "normal", "normal"),
        ("high", "high", "normal", "watery"),
        ("normal", "low", "normal", "normal"),
        ("normal", "normal", "normal", "normal"),
        ("low", "high", "normal", "normal"),
        ("low", "high", "slightly_low", "soft"),
        ("low", "high", "slightly_low", "soft"),
    )

    for index in range(10):
        logged_at = now - timedelta(days=9 - index, hours=1)
        water_level, food_level, energy_level, stool_level = daily_samples[index]
        create_daily_log(pet_id, user_id, DailyLogCreateRequest(
            loggedAt=logged_at,
            localDate=logged_at.date().isoformat(),
            waterLevel=water_level,
            foodLevel=food_level,
            energyLevel=energy_level,
            stoolLevel=stool_level,
            notes="展示用日常觀察" if index % 3 == 0 else "",
        ))
        create_record(pet_id, user_id, WeightRecordRequest(
            weightKg=round(8.1 + index * 0.03, 2),
            measuredAt=now - timedelta(days=(9 - index) * 4),
            notes="展示用體重紀錄" if index % 2 == 0 else "",
        ))
        create_event(pet_id, user_id, health_payload(index, now - timedelta(days=29 - index * 2)))

    for index in range(10):
        visit_date = now - timedelta(days=300 - index * 25)
        create_visit(pet_id, user_id, MedicalVisitRequest(
            visitedAt=visit_date,
            reason=("例行健康檢查", "皮膚搔癢觀察", "腸胃不適追蹤")[index % 3],
            clinicName="MEGO 動物醫院",
            veterinarianName="王醫師",
            treatmentNotes="依獸醫建議進行日常照護與觀察。",
            notes="展示用就醫紀錄",
        ))
        administered_at = now - timedelta(days=330 - index * 30)
        create_vaccination(pet_id, user_id, VaccinationRequest(
            vaccineName=("八合一疫苗", "狂犬病疫苗")[index % 2],
            administeredAt=administered_at,
            hospitalName="MEGO 動物醫院",
            nextDueAt=administered_at + timedelta(days=365),
            notes="展示用疫苗紀錄",
            createReminder=False,
        ))
        deworming_at = now - timedelta(days=270 - index * 25)
        create_deworming(pet_id, user_id, DewormingRequest(
            type=("internal", "external", "heartworm")[index % 3],
            productName=("定期驅蟲", "外用驅蟲滴劑", "心絲蟲預防藥")[index % 3],
            administeredAt=deworming_at,
            nextDueAt=deworming_at + timedelta(days=30),
            dosageText="依產品包裝與獸醫建議使用",
            notes="展示用驅蟲紀錄",
            createReminder=False,
        ))
        start_date = (now - timedelta(days=20 - index)).date().isoformat()
        create_medication(pet_id, user_id, MedicationRequest(
            name=("皮膚保養藥", "腸胃保健藥")[index % 2],
            instructions="依獸醫建議餵食",
            timesPerDay=1,
            startDate=start_date,
            endDate="" if index == 9 else (now - timedelta(days=10 - index)).date().isoformat(),
            mealTiming="after_meal",
            notes="展示用用藥紀錄",
            status="active" if index == 9 else "completed",
            reminderEnabled=False,
        ))

    reminder_types = ("vaccine", "deworming", "medication", "follow_up", "other")
    reminder_titles = ("疫苗接種提醒", "定期驅蟲提醒", "用藥提醒", "回診提醒", "補充照護用品")
    for index in range(10):
        create_reminder(pet_id, user_id, ReminderCreateRequest(
            type=reminder_types[index % len(reminder_types)],
            title=reminder_titles[index % len(reminder_titles)],
            scheduledAt=now + timedelta(days=index + 1, hours=9),
            recurrenceRule="monthly" if index in {1, 4, 7} else "none",
            notes="展示用待辦提醒",
        ))


def seed_ai_usage(user_id: str) -> None:
    """建立歷史用量測試列，不呼叫模型，也不影響今天的用量。"""
    now = now_taipei()
    db.ai_usage.insert_many([
        {
            "userId": user_id,
            "day": (now.date() - timedelta(days=offset)).isoformat(),
            "count": (offset % 3) + 1,
            "tokens": 0,
            "updatedAt": now - timedelta(days=offset),
            "testData": True,
        }
        for offset in range(1, 6)
    ])


def main() -> None:
    deleted = clear_non_account_data()
    users = list(db.users.find({}, {"_id": 1}).sort("_id", 1))
    if not users:
        print("找不到帳號；未建立測試資料。")
        return
    for ordinal, user in enumerate(users, start=1):
        user_id = str(user["_id"])
        # 每帳號建立 5 隻測試毛孩，以涵蓋多寵物切換與各自的身份 QR 資料。
        pet_ids = [seed_pet(user_id, ordinal * 10 + pet_number) for pet_number in range(1, 6)]
        # 其餘照護紀錄集中在第一隻測試毛孩，讓各功能都有完整可檢視的歷史。
        seed_records(user_id, pet_ids[0])
        seed_ai_usage(user_id)
    counts = {name: db[name].count_documents({}) for name in CARE_COLLECTIONS}
    per_account = []
    for ordinal, user in enumerate(users, start=1):
        user_id = str(user["_id"])
        pet_ids = [str(item["_id"]) for item in db.pets.find({"userId": user_id}, {"_id": 1})]
        account_counts = {"pets": len(pet_ids)}
        for name in CARE_COLLECTIONS:
            if name == "pets":
                continue
            account_counts[name] = db[name].count_documents(
                {"userId": user_id}
                if name in {"ai_usage", "export_jobs"}
                else {"petId": {"$in": pet_ids}}
            )
        per_account.append({"account": ordinal, "seeded": account_counts})
    print({"users": len(users), "deleted": deleted, "seeded": counts, "perAccount": per_account})


if __name__ == "__main__":
    try:
        main()
    finally:
        close()
