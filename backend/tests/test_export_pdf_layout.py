from datetime import datetime

from app.schemas.export import ExportCreateRequest
from app.services import export_service
from app.services.export_service import _collect, _write_pdf


def test_pdf_report_builds_with_daily_records_and_dynamic_contents(tmp_path):
    pet_id = "pet-1"
    data = {
        "pets": [{"id": pet_id, "name": "Kuro", "breed": "柴犬", "gender": "male"}],
        "dailyLogs": [
            {
                "petId": pet_id,
                "localDate": "2026-10-03",
                "waterLevel": "normal",
                "foodLevel": "low",
                "energyLevel": "slightly_low",
                "stoolLevel": "soft",
                "notes": "晚餐後精神稍低，持續觀察。",
            }
        ],
        "weights": [
            {"petId": pet_id, "weightKg": 8.1, "measuredAt": "2026-10-02T12:00:00+08:00"},
            {"petId": pet_id, "weightKg": 8.3, "measuredAt": "2026-10-03T12:00:00+08:00"},
        ],
        "healthEvents": [],
        "medicalVisits": [],
        "vaccinations": [],
        "medications": [],
        "dewormings": [],
        "reminders": [],
    }
    job = {
        "cancelRequested": False,
        "request": ExportCreateRequest(format="pdf", petId=pet_id, includeAiSummary=True),
    }
    output = tmp_path / "report.pdf"

    _write_pdf(output, data, job)

    content = output.read_bytes()
    assert content.startswith(b"%PDF-")
    assert content.rstrip().endswith(b"%%EOF")


def test_pdf_report_handles_multiple_pets_many_records_and_long_notes(tmp_path, monkeypatch):
    pets = [
        {"id": "pet-1", "name": "Kuro", "breed": "柴犬"},
        {"id": "pet-2", "name": "Mimi", "breed": "米克斯"},
        {"id": "pet-3", "name": "第三隻毛孩", "breed": "米克斯"},
    ]
    long_note = "這是一段較長的照護補充說明，用來確認文字可以跨頁排版。" * 120
    data = {
        "pets": pets,
        "dailyLogs": [],
        "weights": [],
        "healthEvents": [],
        "medicalVisits": [],
        "vaccinations": [],
        "medications": [],
        "dewormings": [],
        "reminders": [],
    }
    for pet in pets:
        pet["allergies"] = "雞肉、乳製品，" * 50 + "過敏最後標記"
        pet["chronicDiseases"] = "慢性病史補充說明，" * 50 + "慢性病最後標記"
        pet_id = pet["id"]
        data["dailyLogs"].extend(
            {
                "petId": pet_id,
                "localDate": f"2026-09-{day:02d}",
                "waterLevel": "normal",
                "foodLevel": "normal",
                "energyLevel": "normal",
                "stoolLevel": "normal",
                "notes": long_note if day == 30 else f"第 {day} 天日常紀錄",
            }
            for day in range(1, 31)
        )
        data["healthEvents"].append(
            {
                "petId": pet_id,
                "occurredAt": "2026-09-20T09:00:00+08:00",
                "summary": "長備註健康事件",
                "severity": "mild",
                "notes": long_note,
            }
        )
        data["medicalVisits"].append(
            {
                "petId": pet_id,
                "visitedAt": "2026-09-21T10:00:00+08:00",
                "clinicName": "測試動物醫院",
                "reason": "例行檢查",
                "treatmentNotes": long_note,
                "followUpAt": "2026-10-01",
            }
        )
        data["medications"].append(
            {
                "petId": pet_id,
                "startDate": "2026-09-22",
                "name": "長用法藥物",
                "instructions": long_note,
                "timesPerDay": 1,
                "endDate": "2026-09-29",
            }
        )

    job = {
        "cancelRequested": False,
        "request": ExportCreateRequest(
            format="pdf", scope="all_pets", includeAiSummary=True
        ),
    }
    output = tmp_path / "multi-pet-stress-report.pdf"

    pages = []
    original = export_service.MegoReportTemplate.afterFlowable

    def capture(self, flowable):
        if hasattr(flowable, "getPlainText"):
            pages.append((flowable.getPlainText(), self.page))
        original(self, flowable)

    monkeypatch.setattr(export_service.MegoReportTemplate, "afterFlowable", capture)

    _write_pdf(output, data, job)

    content = output.read_bytes()
    assert content.startswith(b"%PDF-")
    assert content.rstrip().endswith(b"%%EOF")
    assert len(content) > 10_000
    assert {page for text, page in pages if text == "看診快速摘要"} == {1}
    assert {page for text, page in pages if text == "報告目錄"} == {2}
    assert any("過敏最後標記" in text for text, _page in pages)
    assert any("慢性病最後標記" in text for text, _page in pages)


def test_weight_chart_dates_match_the_20_points_actually_plotted():
    from reportlab.graphics.shapes import String

    weights = [
        {"weightKg": 8 + day / 100, "measuredAt": f"2026-09-{day:02d}"}
        for day in range(1, 26)
    ]
    chart = export_service._chart(weights, "Helvetica")
    labels = [item.text for item in chart.contents if isinstance(item, String)]
    assert "2026/09/06" in labels
    assert "2026/09/25" in labels
    assert "2026/09/01" not in labels


class QueryCaptureCollection:
    def __init__(self):
        self.query = None

    def find(self, query):
        self.query = query
        return QueryCaptureCursor()


class QueryCaptureCursor(list):
    def sort(self, *_args):
        return self


def test_date_only_record_collections_use_taipei_date_keys(monkeypatch):
    collections = {key: QueryCaptureCollection() for key in export_service.COLLECTIONS}
    monkeypatch.setattr(export_service, "COLLECTIONS", collections)
    request = ExportCreateRequest(
        format="pdf",
        petId="pet-1",
        period="custom",
        startAt=datetime.fromisoformat("2026-10-01T00:00:00+08:00"),
        endAt=datetime.fromisoformat("2026-10-03T23:59:00+08:00"),
    )

    _collect("user-1", request, pet_docs=[{"_id": "pet-1", "name": "Kuro"}])

    expected_range = {"$gte": "2026-10-01", "$lte": "2026-10-03"}
    assert collections["dailyLogs"].query["localDate"] == expected_range
    assert collections["medications"].query["startDate"] == expected_range
