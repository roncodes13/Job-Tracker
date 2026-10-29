from collections.abc import Iterator
from pathlib import Path
from uuid import uuid4

import pytest
from alembic.config import Config
from sqlalchemy import Connection, create_engine, inspect, text
from sqlalchemy.exc import IntegrityError

from alembic import command
from app.core.config import settings

BACKEND_DIR = Path(__file__).resolve().parents[1]


@pytest.fixture
def migration_database(tmp_path: Path) -> Iterator[tuple[Config, Connection]]:
    database_path = tmp_path / "jobtrack_migrations.sqlite"
    engine = create_engine(f"sqlite+pysqlite:///{database_path}")
    config = Config(str(BACKEND_DIR / "alembic.ini"))
    config.set_main_option("script_location", str(BACKEND_DIR / "alembic"))

    with engine.connect() as connection:
        config.attributes["connection"] = connection
        yield config, connection

    engine.dispose()


def test_migrations_upgrade_downgrade_and_reupgrade(
    migration_database: tuple[Config, Connection],
) -> None:
    config, connection = migration_database
    inspector = inspect(connection)

    command.upgrade(config, "a1b2c3d4e5f6")
    assert "employment_type" not in {
        column["name"] for column in inspector.get_columns("job_applications")
    }

    command.upgrade(config, "b7c8d9e0f1a2")
    inspector.clear_cache()
    assert "employment_type" in {
        column["name"] for column in inspector.get_columns("job_applications")
    }

    command.upgrade(config, "head")
    inspector.clear_cache()
    interview_columns = {
        column["name"] for column in inspector.get_columns("interviews")
    }
    assert "meeting_url" in interview_columns
    assert "ix_interviews_scheduled_at" in {
        index["name"] for index in inspector.get_indexes("interviews")
    }
    assert "ck_interviews_interview_type_valid" in {
        constraint["name"]
        for constraint in inspector.get_check_constraints("interviews")
    }

    command.downgrade(config, "b7c8d9e0f1a2")
    inspector.clear_cache()
    interview_columns = {
        column["name"] for column in inspector.get_columns("interviews")
    }
    assert "meeting_url" not in interview_columns
    assert "ck_interviews_interview_type_valid" not in {
        constraint["name"]
        for constraint in inspector.get_check_constraints("interviews")
    }

    command.upgrade(config, "head")
    inspector.clear_cache()
    assert connection.scalar(
        text("SELECT version_num FROM alembic_version")
    ) == "c3d4e5f6a7b8"


def test_head_migration_enforces_application_and_interview_constraints(
    migration_database: tuple[Config, Connection],
) -> None:
    config, connection = migration_database
    command.upgrade(config, "head")

    email_index = connection.scalar(
        text(
            "SELECT sql FROM sqlite_master "
            "WHERE type = 'index' AND name = 'uq_users_email_lower'"
        )
    )
    assert email_index is not None
    assert "lower(email)" in email_index.lower()

    user_id = uuid4()
    connection.execute(
        text(
            "INSERT INTO users (id, name, email, password_hash) "
            "VALUES (:id, 'Test', 'test@example.com', 'test-hash')"
        ),
        {"id": str(user_id)},
    )
    connection.commit()
    application_id = uuid4()
    with pytest.raises(IntegrityError):
        connection.execute(
            text(
                "INSERT INTO job_applications "
                "(id, user_id, company, job_title, status) "
                "VALUES (:id, :user_id, 'Test Co', 'Engineer', 'invalid')"
            ),
            {"id": str(application_id), "user_id": str(user_id)},
        )
    connection.rollback()

    connection.execute(
        text(
            "INSERT INTO job_applications (id, user_id, company, job_title) "
            "VALUES (:id, :user_id, 'Test Co', 'Engineer')"
        ),
        {"id": str(application_id), "user_id": str(user_id)},
    )
    with pytest.raises(IntegrityError):
        connection.execute(
            text(
                "INSERT INTO interviews "
                "(id, application_id, scheduled_at, interview_type) "
                "VALUES (:id, :application_id, '2026-10-29 12:00:00', 'invalid')"
            ),
            {"id": str(uuid4()), "application_id": str(application_id)},
        )
    connection.rollback()


def test_migrated_schema_matches_orm_metadata(
    migration_database: tuple[Config, Connection],
) -> None:
    config, _ = migration_database
    command.upgrade(config, "head")

    command.check(config)


def test_alembic_environment_runs_against_temporary_sqlite_url(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    database_path = tmp_path / "alembic_environment.sqlite"
    database_url = f"sqlite+pysqlite:///{database_path}"
    monkeypatch.setattr(settings, "database_url", database_url)
    config = Config(str(BACKEND_DIR / "alembic.ini"))
    config.set_main_option("script_location", str(BACKEND_DIR / "alembic"))

    command.upgrade(config, "head")

    engine = create_engine(database_url)
    try:
        assert inspect(engine).has_table("interviews")
        with engine.connect() as connection:
            assert connection.scalar(
                text("SELECT version_num FROM alembic_version")
            ) == "c3d4e5f6a7b8"
    finally:
        engine.dispose()
