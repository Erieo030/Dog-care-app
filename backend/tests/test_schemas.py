from datetime import datetime, timezone, timedelta
import pytest
from pydantic import ValidationError
from app.schemas.weight import WeightRecordRequest
from app.schemas.health_event import HealthEventCreateRequest
from app.schemas.medical_visit import MedicalVisitRequest


def test_weight_rejects_invalid_precision():
    with pytest.raises(ValidationError):
        WeightRecordRequest(weightKg=8.123, measuredAt=datetime.now(timezone.utc))


def test_vomiting_details_are_whitelisted():
    with pytest.raises(ValidationError):
        HealthEventCreateRequest(
            type='vomiting', occurredAt=datetime.now(timezone.utc), severity='mild',
            summary='test', details={'vomitCount': 'once', 'energyCondition': 'normal', 'unsafe': True}
        )


def test_follow_up_cannot_precede_visit():
    visited = datetime.now(timezone.utc)
    with pytest.raises(ValidationError):
        MedicalVisitRequest(visitedAt=visited, reason='test', followUpAt=visited - timedelta(days=1))
