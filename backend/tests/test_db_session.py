import logging

import pytest
from fastapi import HTTPException
from pydantic import SecretStr, ValidationError
from sqlalchemy.exc import OperationalError

from app.core.config import Settings
from app.db import session as db_session_module


def test_sqlite_engine_omits_postgresql_connection_arguments() -> None:
    engine = db_session_module._create_engine("sqlite+pysqlite://")
    try:
        with engine.connect() as connection:
            assert connection.exec_driver_sql("SELECT 1").scalar_one() == 1
    finally:
        engine.dispose()


def test_database_url_is_loaded_from_environment(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    database_url = "postgresql+psycopg://local-user:local-pass@localhost/jobtrack_test"
    monkeypatch.setenv("DATABASE_URL", database_url)

    assert Settings(_env_file=None).database_url == database_url


@pytest.mark.parametrize(
    "database_url",
    [
        "postgresql+psycopg://db-host:5432/jobtrack_prod",
        "postgresql+psycopg://db-host:5432/jobtrack_prod?sslmode=require",
        "postgresql+psycopg://db-host:5432/jobtrack_prod?sslmode=verify-ca",
        "sqlite+pysqlite:///jobtrack.sqlite",
        "not-a-database-url",
    ],
)
def test_production_database_rejects_unverified_or_non_postgresql_urls(
    database_url: str,
) -> None:
    with pytest.raises(ValidationError):
        Settings(
            _env_file=None,
            environment="production",
            database_url=database_url,
            jwt_secret_key=SecretStr("test-production-secret-" * 2),
        )


def test_production_database_accepts_hostname_verified_tls() -> None:
    configured = Settings(
        _env_file=None,
        environment="production",
        database_url=(
            "postgresql+psycopg://db-host:5432/jobtrack_prod"
            "?sslmode=verify-full"
        ),
        jwt_secret_key=SecretStr("test-production-secret-" * 2),
    )

    assert configured.environment == "production"


class FailingSession:
    def __init__(self) -> None:
        self.rollback_called = False
        self.close_called = False

    def rollback(self) -> None:
        self.rollback_called = True

    def close(self) -> None:
        self.close_called = True


def test_connection_error_returns_safe_503_and_closes_session(
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    session = FailingSession()
    monkeypatch.setattr(db_session_module, "SessionLocal", lambda: session)
    generator = db_session_module.get_db()
    next(generator)
    connection_error = OperationalError(
        "connect",
        {},
        Exception("password=do-not-log"),
    )

    with caplog.at_level(logging.ERROR, logger="jobtrack.database"):
        with pytest.raises(HTTPException) as raised:
            generator.throw(connection_error)

    assert raised.value.status_code == 503
    assert raised.value.detail == "Database temporarily unavailable"
    assert "do-not-log" not in caplog.text
    assert session.rollback_called
    assert session.close_called
