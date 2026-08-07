"""用途：提供具毛孩所有權檢查的健康異常與專屬快速紀錄 API。"""
from fastapi import APIRouter, Query, Response, status

from app.schemas.health_event import (
    HealthEventCreateRequest,
    HealthEventUpdateRequest,
    StoolHealthEventRequest,
    ObservationHealthEventRequest,
    VomitingHealthEventRequest,
)
from app.services import health_event_service

router = APIRouter(tags=["health-events"])


@router.post("/pets/{pet_id}/observation-events", status_code=status.HTTP_201_CREATED)
def create_observation_event(
    pet_id: str, data: ObservationHealthEventRequest,
    user_id: str = Query(alias="userId"),
):
    return {"success": True, "event": health_event_service.create_event(pet_id, user_id, data)}


@router.patch("/observation-events/{event_id}")
def update_observation_event(
    event_id: str, data: ObservationHealthEventRequest,
    user_id: str = Query(alias="userId"),
):
    return {"success": True, "event": health_event_service.update_observation_event(event_id, user_id, data)}


@router.post("/pets/{pet_id}/vomiting-events", status_code=status.HTTP_201_CREATED)
def create_vomiting_event(
    pet_id: str,
    data: VomitingHealthEventRequest,
    user_id: str = Query(alias="userId"),
):
    return {
        "success": True,
        "event": health_event_service.create_event(pet_id, user_id, data),
    }


@router.patch("/vomiting-events/{event_id}")
def update_vomiting_event(
    event_id: str,
    data: VomitingHealthEventRequest,
    user_id: str = Query(alias="userId"),
):
    return {
        "success": True,
        "event": health_event_service.update_vomiting_event(
            event_id, user_id, data
        ),
    }


@router.post("/pets/{pet_id}/stool-events", status_code=status.HTTP_201_CREATED)
def create_stool_event(
    pet_id: str,
    data: StoolHealthEventRequest,
    user_id: str = Query(alias="userId"),
):
    return {
        "success": True,
        "event": health_event_service.create_event(pet_id, user_id, data),
    }


@router.patch("/stool-events/{event_id}")
def update_stool_event(
    event_id: str,
    data: StoolHealthEventRequest,
    user_id: str = Query(alias="userId"),
):
    return {
        "success": True,
        "event": health_event_service.update_stool_event(
            event_id, user_id, data
        ),
    }


@router.get("/pets/{pet_id}/health-events")
def list_health_events(pet_id: str, user_id: str = Query(alias="userId")):
    return {
        "success": True,
        "events": health_event_service.list_events(pet_id, user_id),
    }


@router.post("/pets/{pet_id}/health-events", status_code=status.HTTP_201_CREATED)
def create_health_event(
    pet_id: str,
    data: HealthEventCreateRequest,
    user_id: str = Query(alias="userId"),
):
    return {
        "success": True,
        "event": health_event_service.create_event(pet_id, user_id, data),
    }


@router.get("/health-events/{event_id}")
def get_health_event(event_id: str, user_id: str = Query(alias="userId")):
    return {
        "success": True,
        "event": health_event_service.get_event(event_id, user_id),
    }


@router.patch("/health-events/{event_id}")
def update_health_event(
    event_id: str,
    data: HealthEventUpdateRequest,
    user_id: str = Query(alias="userId"),
):
    return {
        "success": True,
        "event": health_event_service.update_event(event_id, user_id, data),
    }


@router.delete("/health-events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_health_event(event_id: str, user_id: str = Query(alias="userId")):
    health_event_service.delete_event(event_id, user_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
