"""用途：建立、查詢、取消與下載匯出工作。"""
from fastapi import APIRouter, Query
from fastapi.responses import FileResponse
from app.schemas.export import ExportCreateRequest
from app.services import export_service

router = APIRouter(prefix="/exports", tags=["exports"])

@router.post("")
def create_export(request: ExportCreateRequest, user_id: str = Query(alias="userId")):
    return {"success": True, "message": "匯出工作已建立", "data": export_service.create_job(user_id, request)}

@router.get("/{job_id}")
def get_export(job_id: str, user_id: str = Query(alias="userId")):
    return {"success": True, "message": "已取得匯出狀態", "data": export_service.get_job(job_id, user_id)}

@router.delete("/{job_id}")
def cancel_export(job_id: str, user_id: str = Query(alias="userId")):
    return {"success": True, "message": "匯出已取消", "data": export_service.cancel_job(job_id, user_id)}

@router.get("/{job_id}/download")
def download_export(job_id: str, user_id: str = Query(alias="userId")):
    path, filename, mime = export_service.download_job(job_id, user_id)
    return FileResponse(path, filename=filename, media_type=mime)
