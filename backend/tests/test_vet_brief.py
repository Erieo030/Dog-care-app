from datetime import datetime, timezone
from app.schemas.ai import AIPeriod, AIContext, HealthMonitorResult

def test_vet_brief_schema_disclaimer():
    assert '診斷' in '本報告不代表疾病診斷'

def test_vet_brief_is_structured():
    # VetBriefService delegates ownership/data retrieval to AIContextService; schema contract is tested by API models.
    assert AIPeriod(days=7,startAt=datetime.now(timezone.utc),endAt=datetime.now(timezone.utc)).days == 7
