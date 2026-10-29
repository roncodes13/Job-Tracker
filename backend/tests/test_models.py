from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID, uuid4

import pytest
from sqlalchemy import func, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import ApplicationStatus, Interview, JobApplication, User


def test_model_relationships_and_defaults(db_session: Session) -> None:
    user = User(name="Taylor", email="  TAYLOR@example.com ", password_hash="hash")
    application = JobApplication(
        company="Example Co",
        job_title="Python Developer",
        user=user,
        salary_min=Decimal("90000.00"),
    )
    interview = Interview(
        scheduled_at=datetime(2026, 11, 1, 15, 0, tzinfo=UTC),
        application=application,
        interview_type="video",
    )
    db_session.add(user)
    db_session.flush()

    assert isinstance(user.id, UUID)
    assert user.email == "taylor@example.com"
    assert application.status is ApplicationStatus.SAVED
    assert application.user is user
    assert interview.application is application
    assert application.interviews == [interview]
    assert interview.application.user is user
    assert user.created_at is not None
    assert application.salary_max is None


def test_email_is_unique_case_insensitively(db_session: Session) -> None:
    db_session.add_all(
        [
            User(name="First", email="person@example.com", password_hash="hash"),
            User(name="Second", email="PERSON@example.com", password_hash="hash"),
        ]
    )

    with pytest.raises(IntegrityError):
        db_session.flush()


def test_user_rejects_blank_password_hash(db_session: Session) -> None:
    db_session.add(
        User(name="Taylor", email="taylor@example.com", password_hash=" ")
    )

    with pytest.raises(IntegrityError):
        db_session.flush()


def test_application_constraints(db_session: Session) -> None:
    user = User(name="Taylor", email="taylor@example.com", password_hash="hash")
    application = JobApplication(
        company="Example Co",
        job_title="Python Developer",
        salary_min=Decimal("120000"),
        salary_max=Decimal("90000"),
        user=user,
    )
    db_session.add(application)

    with pytest.raises(IntegrityError):
        db_session.flush()


def test_application_rejects_blank_company(db_session: Session) -> None:
    user = User(name="Taylor", email="taylor@example.com", password_hash="hash")
    db_session.add(
        JobApplication(company=" ", job_title="Python Developer", user=user)
    )

    with pytest.raises(IntegrityError):
        db_session.flush()


def test_application_status_is_constrained_in_database(db_session: Session) -> None:
    user = User(name="Taylor", email="taylor@example.com", password_hash="hash")
    db_session.add(user)
    db_session.flush()
    db_session.commit()

    with pytest.raises(IntegrityError):
        db_session.execute(
            text(
                "INSERT INTO job_applications "
                "(id, user_id, company, job_title, status) "
                "VALUES (:id, :user_id, :company, :job_title, :status)"
            ),
            {
                "id": str(uuid4()),
                "user_id": str(user.id),
                "company": "Example Co",
                "job_title": "Python Developer",
                "status": "not-a-status",
            },
        )


def test_interview_foreign_key_and_type_constraints(db_session: Session) -> None:
    user = User(name="Taylor", email="taylor@example.com", password_hash="hash")
    db_session.add(user)
    db_session.flush()
    db_session.commit()

    db_session.add(
        JobApplication(
            user_id=uuid4(),
            company="Example Co",
            job_title="Python Developer",
        )
    )
    with pytest.raises(IntegrityError):
        db_session.flush()
    db_session.rollback()

    application = JobApplication(
        company="Example Co",
        job_title="Python Developer",
        user_id=user.id,
    )
    db_session.add(application)
    db_session.flush()
    db_session.commit()

    with pytest.raises(IntegrityError):
        db_session.execute(
            text(
                "INSERT INTO interviews "
                "(id, application_id, scheduled_at, interview_type) "
                "VALUES (:id, :application_id, :scheduled_at, 'invalid')"
            ),
            {
                "id": str(uuid4()),
                "application_id": str(application.id),
                "scheduled_at": "2026-11-01 15:00:00",
            },
        )


def test_deleting_application_cascades_to_interviews(db_session: Session) -> None:
    user = User(name="Taylor", email="taylor@example.com", password_hash="hash")
    application = JobApplication(
        company="Example Co",
        job_title="Python Developer",
        user=user,
    )
    application.interviews.append(
        Interview(scheduled_at=datetime(2026, 11, 1, 15, 0, tzinfo=UTC))
    )
    db_session.add(user)
    db_session.flush()
    application_id = application.id

    db_session.delete(application)
    db_session.flush()

    assert db_session.scalar(
        select(func.count()).select_from(Interview).where(
            Interview.application_id == application_id
        )
    ) == 0


def test_deleting_user_cascades_to_applications_and_interviews(
    db_session: Session,
) -> None:
    user = User(name="Taylor", email="taylor@example.com", password_hash="hash")
    application = JobApplication(
        company="Example Co",
        job_title="Python Developer",
        user=user,
    )
    application.interviews.append(
        Interview(scheduled_at=datetime(2026, 11, 1, 15, 0, tzinfo=UTC))
    )
    db_session.add(user)
    db_session.flush()
    user_id = user.id

    db_session.delete(user)
    db_session.flush()

    assert db_session.scalar(
        select(func.count()).select_from(JobApplication).where(
            JobApplication.user_id == user_id
        )
    ) == 0
    assert db_session.scalar(select(func.count()).select_from(Interview)) == 0
