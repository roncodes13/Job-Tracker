import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.core.config import Settings
from app.db.session import get_db
from app.main import api_app, app


def test_health_check(client: TestClient) -> None:
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_unknown_route_returns_structured_error(client: TestClient) -> None:
    response = client.get("/api/unknown")

    assert response.status_code == 404
    assert response.json() == {
        "error": {"code": "http_error", "message": "Not Found"}
    }


def test_configured_frontend_origin_is_allowed(client: TestClient) -> None:
    response = client.options(
        "/api/health",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_unhandled_server_error_includes_cors_headers() -> None:
    def fail_database_dependency():
        raise RuntimeError("test-only failure")

    original_dependency = api_app.dependency_overrides.get(get_db)
    api_app.dependency_overrides[get_db] = fail_database_dependency
    try:
        with TestClient(app, raise_server_exceptions=False) as test_client:
            response = test_client.get(
                "/api/auth/me",
                headers={
                    "Origin": "http://localhost:5173",
                    "Authorization": "Bearer invalid",
                },
            )
    finally:
        if original_dependency is None:
            api_app.dependency_overrides.pop(get_db, None)
        else:
            api_app.dependency_overrides[get_db] = original_dependency

    assert response.status_code == 500
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
    assert response.json()["error"]["message"] == "An unexpected error occurred"


def test_frontend_origins_reject_wildcard_and_paths() -> None:
    with pytest.raises(ValidationError):
        Settings(frontend_origins=["*"])
    with pytest.raises(ValidationError):
        Settings(frontend_origins=["https://example.com/app"])


def test_api_documentation_is_available(client: TestClient) -> None:
    response = client.get("/docs")

    assert response.status_code == 200
