from datetime import UTC, datetime, timedelta
from uuid import uuid4

import jwt
import pytest
from fastapi.testclient import TestClient
from pydantic import SecretStr, ValidationError
from sqlalchemy import Engine, select
from sqlalchemy.orm import Session

from app.core.config import Settings, settings
from app.models import User


def register_account(client: TestClient) -> dict[str, object]:
    response = client.post(
        "/api/auth/register",
        json={
            "name": "  Alex Example  ",
            "email": "  ALEX@example.com ",
            "password": "a-very-long-test-password",
        },
    )
    assert response.status_code == 201
    return response.json()


def create_test_token(
    *,
    secret: str | None = None,
    expired: bool = False,
) -> str:
    now = datetime.now(UTC)
    expires_at = now - timedelta(minutes=1) if expired else now + timedelta(minutes=5)
    return jwt.encode(
        {
            "sub": str(uuid4()),
            "iat": now - timedelta(minutes=10),
            "exp": expires_at,
            "token_type": "access",
        },
        secret or settings.jwt_secret_key.get_secret_value(),
        algorithm="HS256",
    )


def test_registration_normalizes_email_and_never_returns_password_hash(
    client: TestClient,
) -> None:
    user_data = register_account(client)

    assert user_data["name"] == "Alex Example"
    assert user_data["email"] == "alex@example.com"
    assert "password" not in user_data
    assert "password_hash" not in user_data


def test_registration_stores_argon2_hash(
    client: TestClient,
    db_engine: Engine,
) -> None:
    register_account(client)
    with Session(db_engine) as db:
        user = db.scalar(select(User).where(User.email == "alex@example.com"))
        assert user is not None
        assert user.password_hash.startswith("$argon2")
        assert user.password_hash != "a-very-long-test-password"


def test_duplicate_registration_returns_conflict(client: TestClient) -> None:
    register_account(client)

    response = client.post(
        "/api/auth/register",
        json={
            "name": "Alex Again",
            "email": "alex@EXAMPLE.com",
            "password": "another-long-password",
        },
    )

    assert response.status_code == 409
    assert response.json()["error"]["message"] == (
        "An account with this email already exists"
    )


def test_registration_rejects_short_password(client: TestClient) -> None:
    response = client.post(
        "/api/auth/register",
        json={
            "name": "Alex",
            "email": "alex@example.com",
            "password": "short",
        },
    )

    assert response.status_code == 422


def test_registration_rejects_invalid_email(client: TestClient) -> None:
    response = client.post(
        "/api/auth/register",
        json={
            "name": "Alex",
            "email": "not-an-email",
            "password": "a-very-long-test-password",
        },
    )

    assert response.status_code == 422


def test_valid_login_and_current_user(client: TestClient) -> None:
    user_data = register_account(client)
    response = client.post(
        "/api/auth/login",
        json={"email": " ALEX@EXAMPLE.COM ", "password": "a-very-long-test-password"},
    )

    assert response.status_code == 200
    token_data = response.json()
    assert token_data["token_type"] == "bearer"
    assert token_data["expires_in"] == settings.access_token_expire_minutes * 60
    claims = jwt.decode(
        token_data["access_token"],
        settings.jwt_secret_key.get_secret_value(),
        algorithms=["HS256"],
    )
    assert claims["exp"] - claims["iat"] == settings.access_token_expire_minutes * 60

    me_response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token_data['access_token']}"},
    )
    assert me_response.status_code == 200
    assert me_response.json()["id"] == user_data["id"]
    assert "password_hash" not in me_response.json()


def test_invalid_password_returns_generic_unauthorized(
    client: TestClient,
) -> None:
    register_account(client)
    response = client.post(
        "/api/auth/login",
        json={"email": "alex@example.com", "password": "incorrect-password"},
    )

    assert response.status_code == 401
    assert response.json()["error"]["message"] == "Invalid email or password"


def test_unknown_email_returns_same_login_error(client: TestClient) -> None:
    response = client.post(
        "/api/auth/login",
        json={"email": "unknown@example.com", "password": "incorrect-password"},
    )

    assert response.status_code == 401
    assert response.json()["error"]["message"] == "Invalid email or password"


def test_authentication_failures_do_not_log_credentials(
    client: TestClient,
    caplog: pytest.LogCaptureFixture,
) -> None:
    password = "sensitive-password-should-not-be-logged"
    response = client.post(
        "/api/auth/login",
        json={"email": "unknown@example.com", "password": password},
    )

    assert response.status_code == 401
    assert password not in caplog.text


@pytest.mark.parametrize(
    "token",
    [
        "not-a-jwt",
        create_test_token(secret=f"different-key-{'x' * 40}"),
        create_test_token(expired=True),
    ],
    ids=["malformed", "bad-signature", "expired"],
)
def test_invalid_or_expired_tokens_are_rejected(
    client: TestClient,
    token: str,
) -> None:
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 401
    assert response.json()["error"]["message"] == "Invalid or expired access token"


def test_current_user_requires_bearer_token(client: TestClient) -> None:
    response = client.get("/api/auth/me")

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


def test_current_user_rejects_token_for_deleted_or_unknown_user(
    client: TestClient,
) -> None:
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {create_test_token()}"},
    )

    assert response.status_code == 401
    assert response.json()["error"]["message"] == "Invalid or expired access token"


def test_production_settings_require_explicit_strong_jwt_secret() -> None:
    production_database_url = (
        "postgresql+psycopg://localhost:5432/jobtrack_prod?sslmode=verify-full"
    )
    with pytest.raises(ValidationError):
        Settings(
            _env_file=None,
            environment="production",
            database_url=production_database_url,
        )
    with pytest.raises(ValidationError):
        Settings(
            _env_file=None,
            environment="production",
            database_url=production_database_url,
            jwt_secret_key=SecretStr(""),
        )
    with pytest.raises(ValidationError):
        Settings(
            _env_file=None,
            environment="production",
            database_url=production_database_url,
            jwt_secret_key=SecretStr("too-short"),
        )
    settings_with_secret = Settings(
        _env_file=None,
        environment="production",
        database_url=production_database_url,
        jwt_secret_key=SecretStr("x" * 48),
    )
    assert settings_with_secret.environment == "production"
