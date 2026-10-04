from datetime import datetime, timezone, timedelta
import pytest
from pydantic import ValidationError
from app.schemas.weight import WeightRecordRequest
from app.schemas.health_event import HealthEventCreateRequest
from app.schemas.medical_visit import MedicalVisitRequest
from app.schemas.daily_log import DailyLogCreateRequest


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


def test_daily_log_uses_named_stool_and_energy_states():
    record = DailyLogCreateRequest(
        loggedAt=datetime.now(timezone.utc), localDate='2026-09-22',
        energyLevel='slightly_low', stoolLevel='soft',
    )
    assert record.energyLevel == 'slightly_low'
    assert record.stoolLevel == 'soft'
    with pytest.raises(ValidationError):
        DailyLogCreateRequest(loggedAt=datetime.now(timezone.utc), localDate='2026-09-22', stoolLevel=4)


def test_daily_log_rejects_impossible_local_date():
    with pytest.raises(ValidationError):
        DailyLogCreateRequest(loggedAt='2026-10-04T10:00:00+08:00', localDate='2026-09-31')


def test_daily_log_assumes_taipei_timezone_for_naive_timestamp():
    record = DailyLogCreateRequest(loggedAt='2026-10-04T10:00:00', localDate='2026-10-04')
    assert record.loggedAt.utcoffset() == timedelta(hours=8)


def test_daily_log_update_keeps_omitted_optional_fields_unset_and_accepts_null():
    from app.schemas.daily_log import DailyLogUpdateRequest

    patch = DailyLogUpdateRequest(notes='晚餐後精神正常')
    assert patch.model_dump(exclude_unset=True) == {'notes': '晚餐後精神正常'}
    explicit_null = DailyLogUpdateRequest(loggedAt=None, localDate=None)
    assert explicit_null.model_dump(exclude_unset=True) == {'loggedAt': None, 'localDate': None}
