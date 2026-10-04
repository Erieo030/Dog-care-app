import json
import logging

from fastapi.testclient import TestClient

from app.factory import create_app


def test_request_id_header_is_added_to_responses():
    client = TestClient(create_app())

    response = client.get("/")

    assert response.status_code == 200
    request_id = response.headers["x-request-id"]
    assert len(request_id) == 32
    assert all(character in "0123456789abcdef" for character in request_id)


def test_unhandled_error_is_logged_without_exception_or_query_text(caplog):
    application = create_app()

    @application.get("/observability-test/{record_id}")
    def fail(record_id: str):
        sensitive_message = "secret-token-and-user-text"
        raise RuntimeError(sensitive_message)

    client = TestClient(application, raise_server_exceptions=False)
    caplog.set_level(logging.ERROR, logger="mego.api")

    response = client.get("/observability-test/record-123?private=value")

    assert response.status_code == 500
    request_id = response.headers["x-request-id"]
    event_message = next(record.getMessage().splitlines()[0] for record in caplog.records if '"event": "request_failed"' in record.getMessage())
    event = json.loads(event_message)
    assert event["request_id"] == request_id
    assert event["route"] == "/observability-test/{record_id}"
    assert event["status_code"] == 500
    assert "secret-token-and-user-text" not in caplog.text
    assert "private=value" not in caplog.text
    assert response.json()["detail"] == "internal_server_error"
