"""用途：提供統一健康附件上傳、受 ownership 保護的內容讀取與刪除。"""
from fastapi import APIRouter, File, Form, Query, Response, UploadFile, status
from fastapi.responses import FileResponse

from app.services import attachment_service

router = APIRouter(tags=["attachments"])


@router.post("/pets/{pet_id}/attachments", status_code=status.HTTP_201_CREATED)
async def upload_attachment(
    pet_id: str, file: UploadFile = File(...),
    width: int | None = Form(default=None), height: int | None = Form(default=None),
    user_id: str = Query(alias="userId"),
):
    item = await attachment_service.upload_attachment(pet_id, user_id, file, width, height)
    return {"success": True, "message": "附件已上傳", "data": item}


@router.get("/attachments/{attachment_id}/content")
def get_attachment_content(attachment_id: str, user_id: str = Query(alias="userId")):
    path, mime_type = attachment_service.attachment_content(attachment_id, user_id)
    return FileResponse(path, media_type=mime_type, headers={"Cache-Control": "private, max-age=3600"})


@router.delete("/attachments/{attachment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_attachment(attachment_id: str, user_id: str = Query(alias="userId")):
    attachment_service.delete_attachment(attachment_id, user_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
