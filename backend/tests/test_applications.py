from uuid import UUID

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, select
from sqlalchemy.orm import Session

from app.core.security import create_access_token
from app.models import JobApplication, User


@pytest.fixture
def users_and_tokens(
    db_engine: Engine,
) -> dict[str, tuple[UUID, str]]:
    result: dict[str, tuple[UUID, str]] = {}
    with Session(db_engine) as db:
        for email in ("owner@example.com", "other@example.com"):
            user = User(
                name=email.split("@")[0],
                email=email,
                password_hash="test-hash",
            )
            db.add(user)
            db.flush()
            result[email] = (user.id, create_access_token(user.id))
        db.commit()
    return result


def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def valid_application_payload() -> dict[str, object]:
    return {
        "company": "Example Corp",
        "job_title": "Python Engineer",
        "job_url": "https://jobs.example.com/123",
        "location": "Remote",
        "employment_type": "Full-time",
        "salary_min": "90000.00",
        "salary_max": "120000.00",
        "status": "applied",
        "applied_at": "2026-10-28",
        "notes": "Applied through company careers page.",
    }


def test_create_and_list_applications_for_authenticated_owner(
    client: TestClient,
    db_engine: Engine,
    users_and_tokens: dict[str, tuple[UUID, str]],
) -> None:
    owner_id, owner_token = users_and_tokens["owner@example.com"]
    response = client.post(
        "/api/applications",
        json=valid_application_payload(),
        headers=auth_headers(owner_token),
    )

    assert response.status_code == 201
    created = response.json()
    assert created["company"] == "Example Corp"
    assert created["employment_type"] == "Full-time"
    assert "user_id" not in created

    with Session(db_engine) as db:
        application = db.scalar(
            select(JobApplication).where(
                JobApplication.id == UUID(str(created["id"]))
            )
        )
        assert application is not None
        assert application.user_id == owner_id

    list_response = client.get(
        "/api/applications",
        headers=auth_headers(owner_token),
    )
    assert list_response.status_code == 200
    assert list_response.json()["total"] == 1
    assert [item["id"] for item in list_response.json()["items"]] == [created["id"]]


def test_client_cannot_choose_application_owner(
    client: TestClient,
    users_and_tokens: dict[str, tuple[UUID, str]],
) -> None:
    owner_token = users_and_tokens["owner@example.com"][1]
    payload = valid_application_payload()
    payload["user_id"] = str(users_and_tokens["other@example.com"][0])

    response = client.post(
        "/api/applications",
        json=payload,
        headers=auth_headers(owner_token),
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"


def test_list_is_scoped_to_authenticated_user(
    client: TestClient,
    users_and_tokens: dict[str, tuple[UUID, str]],
) -> None:
    owner_token = users_and_tokens["owner@example.com"][1]
    other_token = users_and_tokens["other@example.com"][1]
    created = client.post(
        "/api/applications",
        json=valid_application_payload(),
        headers=auth_headers(owner_token),
    )
    assert created.status_code == 201

    other_response = client.get(
        "/api/applications",
        headers=auth_headers(other_token),
    )

    assert other_response.status_code == 200
    assert other_response.json() == {
        "items": [],
        "total": 0,
        "page": 1,
        "page_size": 20,
        "total_pages": 0,
    }


def test_get_patch_and_delete_application_crud(
    client: TestClient,
    users_and_tokens: dict[str, tuple[UUID, str]],
) -> None:
    token = users_and_tokens["owner@example.com"][1]
    headers = auth_headers(token)
    created = client.post(
        "/api/applications",
        json=valid_application_payload(),
        headers=headers,
    )
    application_id = created.json()["id"]

    get_response = client.get(f"/api/applications/{application_id}", headers=headers)
    assert get_response.status_code == 200

    patch_response = client.patch(
        f"/api/applications/{application_id}",
        json={"status": "interviewing", "notes": None},
        headers=headers,
    )
    assert patch_response.status_code == 200
    assert patch_response.json()["status"] == "interviewing"
    assert patch_response.json()["notes"] is None

    delete_response = client.delete(
        f"/api/applications/{application_id}",
        headers=headers,
    )
    assert delete_response.status_code == 204
    missing_response = client.get(
        f"/api/applications/{application_id}",
        headers=headers,
    )
    assert missing_response.status_code == 404


@pytest.mark.parametrize(
    ("method", "payload"),
    [
        ("get", None),
        ("patch", {"company": "Updated"}),
        ("delete", None),
    ],
)
def test_missing_application_is_not_found_for_item_operations(
    client: TestClient,
    users_and_tokens: dict[str, tuple[UUID, str]],
    method: str,
    payload: dict[str, str] | None,
) -> None:
    token = users_and_tokens["owner@example.com"][1]
    request = getattr(client, method)
    kwargs: dict[str, object] = {"headers": auth_headers(token)}
    if payload is not None:
        kwargs["json"] = payload

    response = request(
        "/api/applications/11111111-1111-4111-8111-111111111111",
        **kwargs,
    )

    assert response.status_code == 404
    assert response.json()["error"]["message"] == "Application not found"


@pytest.mark.parametrize("method", ["get", "patch", "delete"])
def test_other_users_cannot_access_application(
    client: TestClient,
    users_and_tokens: dict[str, tuple[UUID, str]],
    method: str,
) -> None:
    owner_token = users_and_tokens["owner@example.com"][1]
    other_token = users_and_tokens["other@example.com"][1]
    created = client.post(
        "/api/applications",
        json=valid_application_payload(),
        headers=auth_headers(owner_token),
    )
    application_id = created.json()["id"]
    request = getattr(client, method)
    kwargs = {"headers": auth_headers(other_token)}
    if method == "patch":
        kwargs["json"] = {"company": "Hijacked"}

    response = request(f"/api/applications/{application_id}", **kwargs)

    assert response.status_code == 404
    assert response.json()["error"]["message"] == "Application not found"


@pytest.mark.parametrize(
    "overrides",
    [
        {"company": " "},
        {"company": "x" * 201},
        {"job_title": "x" * 201},
        {"job_url": "javascript:alert(1)"},
        {"job_url": "not-a-url"},
        {"employment_type": "x" * 51},
        {"salary_min": "-1"},
        {"salary_min": "130000", "salary_max": "120000"},
        {"status": "unknown"},
        {"user_id": "some-user"},
    ],
)
def test_create_rejects_invalid_application_fields(
    client: TestClient,
    users_and_tokens: dict[str, tuple[UUID, str]],
    overrides: dict[str, object],
) -> None:
    payload = valid_application_payload()
    payload.update(overrides)

    response = client.post(
        "/api/applications",
        json=payload,
        headers=auth_headers(users_and_tokens["owner@example.com"][1]),
    )

    assert response.status_code == 422


def test_patch_rejects_invalid_final_salary_range(
    client: TestClient,
    users_and_tokens: dict[str, tuple[UUID, str]],
) -> None:
    token = users_and_tokens["owner@example.com"][1]
    created = client.post(
        "/api/applications",
        json=valid_application_payload(),
        headers=auth_headers(token),
    )
    response = client.patch(
        f"/api/applications/{created.json()['id']}",
        json={"salary_min": "130000"},
        headers=auth_headers(token),
    )

    assert response.status_code == 422


@pytest.mark.parametrize(
    "payload",
    [
        {},
        {"company": None},
        {"company": " "},
        {"status": "invalid"},
        {"job_url": "javascript:alert(1)"},
        {"salary_min": "-1"},
        {"salary_max": "-1"},
        {"notes": "x" * 10_001},
    ],
)
def test_patch_rejects_invalid_application_fields(
    client: TestClient,
    users_and_tokens: dict[str, tuple[UUID, str]],
    payload: dict[str, object],
) -> None:
    token = users_and_tokens["owner@example.com"][1]
    created = client.post(
        "/api/applications",
        json=valid_application_payload(),
        headers=auth_headers(token),
    )

    response = client.patch(
        f"/api/applications/{created.json()['id']}",
        json=payload,
        headers=auth_headers(token),
    )

    assert response.status_code == 422


@pytest.mark.parametrize("method", ["post", "get"])
def test_application_routes_require_authentication(
    client: TestClient,
    method: str,
) -> None:
    request = getattr(client, method)
    if method == "post":
        response = request("/api/applications", json=valid_application_payload())
    else:
        response = request("/api/applications")

    assert response.status_code == 401


@pytest.mark.parametrize(
    ("method", "path", "payload"),
    [
        ("get", "/api/applications/11111111-1111-4111-8111-111111111111", None),
        (
            "patch",
            "/api/applications/11111111-1111-4111-8111-111111111111",
            {"company": "Updated"},
        ),
        ("delete", "/api/applications/11111111-1111-4111-8111-111111111111", None),
    ],
)
def test_item_routes_require_authentication(
    client: TestClient,
    method: str,
    path: str,
    payload: dict[str, object] | None,
) -> None:
    request = getattr(client, method)
    if payload is None:
        response = request(path)
    else:
        response = request(path, json=payload)

    assert response.status_code == 401


def create_application(
    client: TestClient,
    token: str,
    *,
    company: str,
    job_title: str,
    status: str,
    employment_type: str,
    applied_at: str,
) -> dict[str, object]:
    payload = valid_application_payload()
    payload.update(
        {
            "company": company,
            "job_title": job_title,
            "status": status,
            "employment_type": employment_type,
            "applied_at": applied_at,
        }
    )
    response = client.post(
        "/api/applications",
        json=payload,
        headers=auth_headers(token),
    )
    assert response.status_code == 201
    return response.json()


def test_list_combines_search_status_and_employment_type(
    client: TestClient,
    users_and_tokens: dict[str, tuple[UUID, str]],
) -> None:
    token = users_and_tokens["owner@example.com"][1]
    match = create_application(
        client,
        token,
        company="Northwind Systems",
        job_title="Python Developer",
        status="interviewing",
        employment_type="Full-time",
        applied_at="2026-10-10",
    )
    create_application(
        client,
        token,
        company="Northwind Systems",
        job_title="Product Analyst",
        status="interviewing",
        employment_type="Contract",
        applied_at="2026-10-11",
    )
    create_application(
        client,
        token,
        company="Other Company",
        job_title="Python Engineer",
        status="applied",
        employment_type="Full-time",
        applied_at="2026-10-12",
    )

    response = client.get(
        "/api/applications",
        params={
            "q": "northwind",
            "status": "interviewing",
            "employment_type": "full-time",
        },
        headers=auth_headers(token),
    )

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["total_pages"] == 1
    assert [item["id"] for item in body["items"]] == [match["id"]]


def test_search_checks_company_and_job_title_and_escapes_wildcards(
    client: TestClient,
    users_and_tokens: dict[str, tuple[UUID, str]],
) -> None:
    token = users_and_tokens["owner@example.com"][1]
    match = create_application(
        client,
        token,
        company="Acme",
        job_title="Data_Engineer",
        status="applied",
        employment_type="Full-time",
        applied_at="2026-10-10",
    )
    create_application(
        client,
        token,
        company="DataWorks",
        job_title="Analyst",
        status="applied",
        employment_type="Full-time",
        applied_at="2026-10-11",
    )

    response = client.get(
        "/api/applications",
        params={"q": "Data_"},
        headers=auth_headers(token),
    )

    assert response.status_code == 200
    assert [item["id"] for item in response.json()["items"]] == [match["id"]]


def test_list_sorts_deterministically_by_company_and_applied_date(
    client: TestClient,
    users_and_tokens: dict[str, tuple[UUID, str]],
) -> None:
    token = users_and_tokens["owner@example.com"][1]
    first = create_application(
        client,
        token,
        company="Beta",
        job_title="Role One",
        status="applied",
        employment_type="Full-time",
        applied_at="2026-10-10",
    )
    second = create_application(
        client,
        token,
        company="Alpha",
        job_title="Role Two",
        status="applied",
        employment_type="Full-time",
        applied_at="2026-10-12",
    )
    third = create_application(
        client,
        token,
        company="Alpha",
        job_title="Role Three",
        status="applied",
        employment_type="Full-time",
        applied_at="2026-10-12",
    )

    company_response = client.get(
        "/api/applications",
        params={"sort_by": "company", "sort_order": "asc"},
        headers=auth_headers(token),
    )
    assert [item["id"] for item in company_response.json()["items"]] == [
        *sorted([second["id"], third["id"]]),
        first["id"],
    ]

    date_response = client.get(
        "/api/applications",
        params={"sort_by": "applied_at", "sort_order": "desc"},
        headers=auth_headers(token),
    )
    assert [item["id"] for item in date_response.json()["items"]] == [
        *sorted([second["id"], third["id"]]),
        first["id"],
    ]


def test_list_paginates_and_reports_metadata(
    client: TestClient,
    users_and_tokens: dict[str, tuple[UUID, str]],
) -> None:
    token = users_and_tokens["owner@example.com"][1]
    created = [
        create_application(
            client,
            token,
            company=f"Company {index}",
            job_title=f"Role {index}",
            status="applied",
            employment_type="Full-time",
            applied_at=f"2026-10-{index + 10:02d}",
        )
        for index in range(3)
    ]

    page_one = client.get(
        "/api/applications",
        params={"page": 1, "page_size": 2, "sort_by": "company", "sort_order": "asc"},
        headers=auth_headers(token),
    )
    page_two = client.get(
        "/api/applications",
        params={"page": 2, "page_size": 2, "sort_by": "company", "sort_order": "asc"},
        headers=auth_headers(token),
    )
    out_of_range = client.get(
        "/api/applications",
        params={"page": 3, "page_size": 2},
        headers=auth_headers(token),
    )

    assert page_one.json()["total"] == 3
    assert page_one.json()["total_pages"] == 2
    assert page_one.json()["page"] == 1
    assert page_one.json()["page_size"] == 2
    assert len(page_one.json()["items"]) == 2
    assert page_two.json()["page"] == 2
    assert len(page_two.json()["items"]) == 1
    assert page_one.json()["items"][0]["id"] != page_two.json()["items"][0]["id"]
    assert out_of_range.json()["items"] == []
    assert out_of_range.json()["total"] == len(created)


@pytest.mark.parametrize(
    "params",
    [
        {"page": 0},
        {"page": -1},
        {"page_size": 0},
        {"page_size": 101},
        {"page": "not-a-number"},
        {"sort_by": "salary_min"},
        {"sort_order": "sideways"},
        {"status": "unknown"},
        {"employment_type": "x" * 51},
        {"q": " "},
        {"q": "x" * 201},
    ],
)
def test_list_rejects_invalid_query_parameters(
    client: TestClient,
    users_and_tokens: dict[str, tuple[UUID, str]],
    params: dict[str, object],
) -> None:
    response = client.get(
        "/api/applications",
        params=params,
        headers=auth_headers(users_and_tokens["owner@example.com"][1]),
    )

    assert response.status_code == 422


def test_combined_filters_never_return_another_users_records(
    client: TestClient,
    users_and_tokens: dict[str, tuple[UUID, str]],
) -> None:
    owner_token = users_and_tokens["owner@example.com"][1]
    other_token = users_and_tokens["other@example.com"][1]
    other_application = create_application(
        client,
        other_token,
        company="Shared Search Target",
        job_title="Python Engineer",
        status="interviewing",
        employment_type="Full-time",
        applied_at="2026-10-10",
    )
    create_application(
        client,
        owner_token,
        company="Shared Search Target",
        job_title="Python Engineer",
        status="interviewing",
        employment_type="Full-time",
        applied_at="2026-10-11",
    )

    response = client.get(
        "/api/applications",
        params={
            "q": "Shared Search",
            "status": "interviewing",
            "employment_type": "Full-time",
            "page": 1,
            "page_size": 100,
        },
        headers=auth_headers(owner_token),
    )

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert all(item["id"] != other_application["id"] for item in body["items"])
