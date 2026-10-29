from datetime import datetime
from uuid import UUID

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, event, select
from sqlalchemy.orm import Session

from app.core.security import create_access_token
from app.models import Interview, JobApplication, User


@pytest.fixture
def users_applications_and_tokens(
    db_engine: Engine,
) -> dict[str, tuple[UUID, UUID, str]]:
    result: dict[str, tuple[UUID, UUID, str]] = {}
    with Session(db_engine) as db:
        for email in ("owner@example.com", "other@example.com"):
            user = User(name=email.split("@")[0], email=email, password_hash="hash")
            application = JobApplication(
                user=user,
                company=f"{email} company",
                job_title="Python developer",
            )
            db.add(user)
            db.flush()
            result[email] = (
                user.id,
                application.id,
                create_access_token(user.id),
            )
        db.commit()
    return result


def headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def create_payload(
    scheduled_at: str = "2026-11-15T10:30:00-05:00",
) -> dict[str, str]:
    return {
        "scheduled_at": scheduled_at,
        "interview_type": "video",
        "meeting_url": "https://meet.example.com/room-123",
        "notes": "Prepare project examples.",
    }


def create_interview_response(
    client: TestClient,
    application_id: UUID,
    token: str,
) -> dict[str, object]:
    response = client.post(
        f"/api/applications/{application_id}/interviews",
        json=create_payload(),
        headers=headers(token),
    )
    assert response.status_code == 201
    return response.json()


def test_create_interview_checks_application_owner_and_normalizes_time(
    client: TestClient,
    users_applications_and_tokens: dict[str, tuple[UUID, UUID, str]],
) -> None:
    _, application_id, token = users_applications_and_tokens["owner@example.com"]
    response = client.post(
        f"/api/applications/{application_id}/interviews",
        json=create_payload(),
        headers=headers(token),
    )

    assert response.status_code == 201
    body = response.json()
    assert body["application_id"] == str(application_id)
    assert body["scheduled_at"] == "2026-11-15T15:30:00Z"
    assert body["interview_type"] == "video"
    assert body["meeting_url"] == "https://meet.example.com/room-123"


def test_create_rejects_naive_datetime_invalid_type_and_meeting_url(
    client: TestClient,
    users_applications_and_tokens: dict[str, tuple[UUID, UUID, str]],
) -> None:
    _, application_id, token = users_applications_and_tokens["owner@example.com"]
    for overrides in (
        {"scheduled_at": "2026-11-15T10:30:00"},
        {"interview_type": "informal"},
        {"meeting_url": "javascript:alert(1)"},
        {"meeting_url": "not a url"},
    ):
        payload = create_payload()
        payload.update(overrides)
        response = client.post(
            f"/api/applications/{application_id}/interviews",
            json=payload,
            headers=headers(token),
        )
        assert response.status_code == 422


def test_create_returns_404_for_missing_or_other_users_application(
    client: TestClient,
    users_applications_and_tokens: dict[str, tuple[UUID, UUID, str]],
) -> None:
    _, owner_application_id, _ = users_applications_and_tokens["owner@example.com"]
    _, other_application_id, _ = users_applications_and_tokens[
        "other@example.com"
    ]
    owner_token = users_applications_and_tokens["owner@example.com"][2]
    missing_id = UUID("11111111-1111-4111-8111-111111111111")

    for application_id in (missing_id, other_application_id):
        response = client.post(
            f"/api/applications/{application_id}/interviews",
            json=create_payload(),
            headers=headers(owner_token),
        )
        assert response.status_code == 404
        assert response.json()["error"]["message"] == "Application not found"

    assert owner_application_id != other_application_id


def test_list_interviews_and_filter_by_timezone_aware_range(
    client: TestClient,
    users_applications_and_tokens: dict[str, tuple[UUID, UUID, str]],
) -> None:
    _, application_id, token = users_applications_and_tokens["owner@example.com"]
    first = create_interview_response(client, application_id, token)
    second_response = client.post(
        f"/api/applications/{application_id}/interviews",
        json=create_payload("2026-11-20T10:30:00-05:00"),
        headers=headers(token),
    )
    assert second_response.status_code == 201

    filtered = client.get(
        "/api/interviews",
        params={
            "scheduled_from": "2026-11-15T15:00:00Z",
            "scheduled_to": "2026-11-16T00:00:00Z",
        },
        headers=headers(token),
    )

    assert filtered.status_code == 200
    assert filtered.json()["total"] == 1
    assert filtered.json()["items"][0]["id"] == first["id"]
    assert filtered.json()["scheduled_from"] == "2026-11-15T15:00:00Z"


def test_list_interviews_uses_one_query_for_items_and_total(
    client: TestClient,
    db_engine: Engine,
    users_applications_and_tokens: dict[str, tuple[UUID, UUID, str]],
) -> None:
    _, application_id, token = users_applications_and_tokens["owner@example.com"]
    create_interview_response(client, application_id, token)
    interview_selects: list[str] = []

    def record_interview_select(
        connection: object,
        cursor: object,
        statement: str,
        parameters: object,
        context: object,
        executemany: bool,
    ) -> None:
        normalized_statement = statement.lower()
        if (
            normalized_statement.lstrip().startswith("select")
            and "from interviews" in normalized_statement
        ):
            interview_selects.append(normalized_statement)

    event.listen(db_engine, "before_cursor_execute", record_interview_select)
    try:
        response = client.get("/api/interviews", headers=headers(token))
    finally:
        event.remove(db_engine, "before_cursor_execute", record_interview_select)

    assert response.status_code == 200
    assert response.json()["total"] == 1
    assert len(interview_selects) == 1


def test_date_filters_reject_naive_and_reversed_ranges(
    client: TestClient,
    users_applications_and_tokens: dict[str, tuple[UUID, UUID, str]],
) -> None:
    token = users_applications_and_tokens["owner@example.com"][2]

    naive = client.get(
        "/api/interviews",
        params={"scheduled_from": "2026-11-15T10:30:00"},
        headers=headers(token),
    )
    reversed_range = client.get(
        "/api/interviews",
        params={
            "scheduled_from": "2026-11-16T00:00:00Z",
            "scheduled_to": "2026-11-15T00:00:00Z",
        },
        headers=headers(token),
    )

    assert naive.status_code == 422
    assert reversed_range.status_code == 422


def test_get_update_delete_interview(
    client: TestClient,
    users_applications_and_tokens: dict[str, tuple[UUID, UUID, str]],
) -> None:
    _, application_id, token = users_applications_and_tokens["owner@example.com"]
    created = create_interview_response(client, application_id, token)
    interview_id = created["id"]

    detail = client.get(
        f"/api/interviews/{interview_id}",
        headers=headers(token),
    )
    assert detail.status_code == 200

    updated = client.patch(
        f"/api/interviews/{interview_id}",
        json={
            "scheduled_at": "2026-11-16T09:00:00+01:00",
            "interview_type": "onsite",
            "meeting_url": None,
            "notes": "Bring ID.",
        },
        headers=headers(token),
    )
    assert updated.status_code == 200
    assert updated.json()["scheduled_at"] == "2026-11-16T08:00:00Z"
    assert updated.json()["interview_type"] == "onsite"
    assert updated.json()["meeting_url"] is None

    deleted = client.delete(
        f"/api/interviews/{interview_id}",
        headers=headers(token),
    )
    assert deleted.status_code == 204
    missing = client.get(
        f"/api/interviews/{interview_id}",
        headers=headers(token),
    )
    assert missing.status_code == 404


@pytest.mark.parametrize(
    "payload",
    [
        {},
        {"scheduled_at": None},
        {"scheduled_at": "2026-11-16T09:00:00"},
        {"interview_type": None},
        {"interview_type": "informal"},
        {"meeting_url": "javascript:alert(1)"},
        {"notes": "x" * 10_001},
    ],
)
def test_patch_rejects_invalid_interview_fields(
    client: TestClient,
    users_applications_and_tokens: dict[str, tuple[UUID, UUID, str]],
    payload: dict[str, object],
) -> None:
    _, application_id, token = users_applications_and_tokens["owner@example.com"]
    created = create_interview_response(client, application_id, token)

    response = client.patch(
        f"/api/interviews/{created['id']}",
        json=payload,
        headers=headers(token),
    )

    assert response.status_code == 422


@pytest.mark.parametrize("method", ["get", "patch", "delete"])
def test_other_users_cannot_access_interview(
    client: TestClient,
    users_applications_and_tokens: dict[str, tuple[UUID, UUID, str]],
    method: str,
) -> None:
    _, application_id, owner_token = users_applications_and_tokens["owner@example.com"]
    other_token = users_applications_and_tokens["other@example.com"][2]
    created = create_interview_response(client, application_id, owner_token)
    request = getattr(client, method)
    kwargs: dict[str, object] = {"headers": headers(other_token)}
    if method == "patch":
        kwargs["json"] = {"notes": "Unauthorized edit"}

    response = request(f"/api/interviews/{created['id']}", **kwargs)

    assert response.status_code == 404
    assert response.json()["error"]["message"] == "Interview not found"


def test_list_interviews_is_scoped_to_user(
    client: TestClient,
    users_applications_and_tokens: dict[str, tuple[UUID, UUID, str]],
) -> None:
    _, application_id, owner_token = users_applications_and_tokens["owner@example.com"]
    other_token = users_applications_and_tokens["other@example.com"][2]
    created = create_interview_response(client, application_id, owner_token)

    response = client.get("/api/interviews", headers=headers(other_token))

    assert response.status_code == 200
    assert response.json()["total"] == 0
    assert response.json()["items"] == []
    assert response.json()["items"] != [created]


def test_missing_interview_returns_404(
    client: TestClient,
    users_applications_and_tokens: dict[str, tuple[UUID, UUID, str]],
) -> None:
    token = users_applications_and_tokens["owner@example.com"][2]
    missing_id = UUID("11111111-1111-4111-8111-111111111111")

    response = client.get(
        f"/api/interviews/{missing_id}",
        headers=headers(token),
    )

    assert response.status_code == 404


@pytest.mark.parametrize(
    ("method", "path", "payload"),
    [
        ("post", "/api/applications/{application_id}/interviews", create_payload()),
        ("get", "/api/interviews", None),
        ("get", "/api/interviews/{interview_id}", None),
        ("patch", "/api/interviews/{interview_id}", {"notes": "Updated"}),
        ("delete", "/api/interviews/{interview_id}", None),
    ],
)
def test_every_interview_endpoint_requires_authentication(
    client: TestClient,
    users_applications_and_tokens: dict[str, tuple[UUID, UUID, str]],
    method: str,
    path: str,
    payload: dict[str, str] | None,
) -> None:
    _, application_id, _ = users_applications_and_tokens["owner@example.com"]
    interview_id = "11111111-1111-4111-8111-111111111111"
    path = path.format(
        application_id=application_id,
        interview_id=interview_id,
    )
    request = getattr(client, method)
    kwargs: dict[str, object] = {}
    if payload is not None:
        kwargs["json"] = payload

    response = request(path, **kwargs)

    assert response.status_code == 401


def test_interview_schema_database_column_and_timezone(
    client: TestClient,
    db_engine: Engine,
    users_applications_and_tokens: dict[str, tuple[UUID, UUID, str]],
) -> None:
    _, application_id, token = users_applications_and_tokens["owner@example.com"]
    created = create_interview_response(client, application_id, token)

    with Session(db_engine) as db:
        interview = db.scalar(
            select(Interview).where(Interview.id == UUID(created["id"]))
        )
        assert interview is not None
        assert interview.meeting_url == "https://meet.example.com/room-123"
        assert interview.scheduled_at == datetime(2026, 11, 15, 15, 30)
