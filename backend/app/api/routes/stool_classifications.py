"""提供日常紀錄使用的糞便外觀照片分類建議；不建立或保存紀錄。"""
from fastapi import APIRouter, File, HTTPException, Query, UploadFile
from fastapi.concurrency import run_in_threadpool

from app.services import stool_classifier_service as classifier_service

router = APIRouter(tags=["stool-classifications"])


def ensure_owned_pet(pet_id: str, user_id: str) -> None:
    # Lazy import avoids opening the MongoDB client merely by importing this route module.
    from app.services.attachment_service import ensure_owned_pet as verify_pet_owner

    verify_pet_owner(pet_id, user_id)


@router.post("/pets/{pet_id}/stool-classifications")
async def classify_stool_photo(
    pet_id: str,
    file: UploadFile = File(...),
    user_id: str = Query(alias="userId"),
):
    try:
        ensure_owned_pet(pet_id, user_id)
        classifier = classifier_service.get_classifier()
        content = await file.read(classifier_service.MAX_FILE_BYTES + 1)
    finally:
        await file.close()
    if len(content) > classifier_service.MAX_FILE_BYTES:
        max_mb = classifier_service.MAX_FILE_BYTES // (1024 * 1024)
        raise HTTPException(status_code=413, detail=f"圖片不可超過 {max_mb} MB")
    result = await run_in_threadpool(classifier.predict, content)
    return {"success": True, "message": "已產生大便狀況建議", "data": result}
