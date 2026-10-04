from datetime import datetime, timezone

from app.services import dashboard_service


class AggregateCollection:
    def __init__(self, records):
        self.records = records

    def aggregate(self, pipeline):
        match = pipeline[0]["$match"]
        date_field, date_filter = next(
            (field, condition)
            for field, condition in match.items()
            if isinstance(condition, dict)
        )
        filtered = []
        for record in self.records:
            if any(record.get(key) != value for key, value in match.items() if key != date_field):
                continue
            date_value = record.get(date_field)
            if date_value is None or date_value < date_filter["$gte"]:
                continue
            if "$lte" in date_filter and date_value > date_filter["$lte"]:
                continue
            filtered.append(record)

        group_field = pipeline[1]["$group"]["_id"][1:]
        grouped = {}
        for record in filtered:
            key = record.get(group_field)
            grouped[key] = grouped.get(key, 0) + 1
        return [{"_id": key, "count": count} for key, count in grouped.items()]


class FakeDB:
    pass


def test_health_category_aggregation_preserves_counts(monkeypatch):
    since = datetime(2026, 9, 1, tzinfo=timezone.utc)
    fake_db = FakeDB()
    fake_db.health_events = AggregateCollection([
        {"petId": "pet-1", "occurredAt": since, "type": "vomiting"},
        {"petId": "pet-1", "occurredAt": since, "type": "abnormal_stool"},
        {"petId": "pet-1", "occurredAt": since, "type": "skin_issue"},
        {"petId": "pet-1", "occurredAt": since, "type": "new_type"},
        {"petId": "pet-2", "occurredAt": since, "type": "vomiting"},
        {"petId": "pet-1", "occurredAt": datetime(2026, 8, 31, tzinfo=timezone.utc), "type": "vomiting"},
    ])
    monkeypatch.setattr(dashboard_service, "db", fake_db)

    total, counts = dashboard_service._health_category_counts("pet-1", since)

    assert total == 4
    assert counts == {"digestive": 2, "skin": 1, "eye_ear": 0, "injury": 0, "other": 1}


def test_reminder_aggregation_counts_all_statuses_and_completed(monkeypatch):
    since = datetime(2026, 9, 1, tzinfo=timezone.utc)
    until = datetime(2026, 9, 30, tzinfo=timezone.utc)
    fake_db = FakeDB()
    fake_db.reminders = AggregateCollection([
        {"petId": "pet-1", "scheduledAt": since, "status": "completed"},
        {"petId": "pet-1", "scheduledAt": until, "status": "pending"},
        {"petId": "pet-1", "scheduledAt": since, "status": "snoozed"},
        {"petId": "pet-2", "scheduledAt": since, "status": "completed"},
        {"petId": "pet-1", "scheduledAt": datetime(2026, 8, 31, tzinfo=timezone.utc), "status": "completed"},
    ])
    monkeypatch.setattr(dashboard_service, "db", fake_db)

    assert dashboard_service._reminder_counts("pet-1", since, until) == (3, 1)
