from datetime import UTC, date, datetime, timedelta
from uuid import UUID

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine
from sqlalchemy.orm import Session

from app.core.security import create_access_token
from app.models import ApplicationStatus, Interview, JobApplication, User


@pytest.fixture
def principals(db_engine: Engine) -> dict[str, tuple[UUID, str]]:
    result: dict[str, tuple[UUID, str]] = {}
    with Session(db_engine) as db:
        for email in ("owner@example.com", "other@example.com"):
            user = User(name=email.split("@")[0], email=email, password_hash="hash")
            db.add(user)
            db.flush()
            result[email] = (user.id, create_access_token(user.id))
        db.commit()
    return result


def _month_start(current: date, offset: int) -> datetime:
    year = current.year
    month = current.month + offset
    while month <= 0:
        year -= 1
        month += 12
    while month > 12:
        year += 1
        month -= 12
    return datetime(year, month, 1, tzinfo=UTC)


def test_summary_aggregates_only_current_users_records(
    client: TestClient,
    db_engine: Engine,
    principals: dict[str, tuple[UUID, str]],
) -> None:
    now = datetime.now(UTC)
    owner_id, token = principals["owner@example.com"]
    other_id, _ = principals["other@example.com"]
    records = [
        (owner_id, ApplicationStatus.OFFER, now),
        (owner_id, ApplicationStatus.REJECTED, now),
        (owner_id, ApplicationStatus.APPLIED, _month_start(now.date(), -1)),
        (owner_id, ApplicationStatus.SAVED, _month_start(now.date(), -5)),
        (
            owner_id,
            ApplicationStatus.WITHDRAWN,
            _month_start(now.date(), -6),
        ),
        (other_id, ApplicationStatus.OFFER, now),
    ]
    with Session(db_engine) as db:
        applications: list[JobApplication] = []
        for user_id, application_status, created_at in records:
            application = JobApplication(
                user_id=user_id,
                company="Example Co",
                job_title="Python developer",
                status=application_status,
                created_at=created_at,
            )
            db.add(application)
            applications.append(application)
        db.flush()
        db.add_all(
            [
                Interview(
                    application=applications[0],
                    scheduled_at=now + timedelta(days=2),
                ),
                Interview(
                    application=applications[1],
                    scheduled_at=now - timedelta(days=2),
                ),
                Interview(
                    application=applications[-1],
                    scheduled_at=now + timedelta(days=2),
                ),
            ]
        )
        db.commit()

    response = client.get(
        "/api/analytics/summary",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["total_applications"] == 5
    assert body["applications_by_status"] == {
        "saved": 1,
        "applied": 1,
        "interviewing": 0,
        "offer": 1,
        "rejected": 1,
        "withdrawn": 1,
    }
    assert body["interviews_scheduled"] == 1
    assert body["offers_received"] == 1
    assert body["rejections"] == 1
    assert body["monthly_applications"] == [
        {"month": month, "count": count}
        for month, count in zip(
            [
                _month_start(now.date(), offset).strftime("%Y-%m")
                for offset in range(-5, 1)
            ],
            [1, 0, 0, 0, 1, 2],
            strict=True,
        )
    ]


def test_summary_returns_stable_zero_values_for_user_without_records(
    client: TestClient,
    principals: dict[str, tuple[UUID, str]],
) -> None:
    token = principals["owner@example.com"][1]

    response = client.get(
        "/api/analytics/summary",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["total_applications"] == 0
    assert all(value == 0 for value in body["applications_by_status"].values())
    assert body["interviews_scheduled"] == 0
    assert body["offers_received"] == 0
    assert body["rejections"] == 0
    assert len(body["monthly_applications"]) == 6
    assert [item["count"] for item in body["monthly_applications"]] == [0] * 6


def test_summary_requires_authentication(client: TestClient) -> None:
    response = client.get("/api/analytics/summary")

    assert response.status_code == 401
