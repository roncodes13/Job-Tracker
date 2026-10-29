from datetime import datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Interview, JobApplication, User
from app.schemas.interviews import InterviewCreate, InterviewUpdate


def create_interview(
    db: Session,
    owner: User,
    application_id: UUID,
    data: InterviewCreate,
) -> Interview | None:
    application = db.scalar(
        select(JobApplication).where(
            JobApplication.id == application_id,
            JobApplication.user_id == owner.id,
        )
    )
    if application is None:
        return None

    interview = Interview(
        application_id=application.id,
        scheduled_at=data.scheduled_at,
        interview_type=data.interview_type,
        meeting_url=str(data.meeting_url) if data.meeting_url is not None else None,
        notes=data.notes,
    )
    db.add(interview)
    db.commit()
    db.refresh(interview)
    return interview


def list_interviews(
    db: Session,
    owner: User,
    scheduled_from: datetime | None,
    scheduled_to: datetime | None,
) -> tuple[list[Interview], int]:
    filters = [JobApplication.user_id == owner.id]
    if scheduled_from is not None:
        filters.append(Interview.scheduled_at >= scheduled_from)
    if scheduled_to is not None:
        filters.append(Interview.scheduled_at <= scheduled_to)

    statement = (
        select(Interview)
        .join(Interview.application)
        .where(*filters)
        .order_by(Interview.scheduled_at.asc(), Interview.id.asc())
    )
    interviews = list(db.scalars(statement).all())
    return interviews, len(interviews)


def get_interview(
    db: Session,
    owner: User,
    interview_id: UUID,
) -> Interview | None:
    return db.scalar(
        select(Interview)
        .join(Interview.application)
        .where(
            Interview.id == interview_id,
            JobApplication.user_id == owner.id,
        )
    )


def update_interview(
    db: Session,
    interview: Interview,
    data: InterviewUpdate,
) -> Interview:
    changes = data.model_dump(exclude_unset=True)
    if "meeting_url" in changes and changes["meeting_url"] is not None:
        changes["meeting_url"] = str(changes["meeting_url"])
    for field, value in changes.items():
        setattr(interview, field, value)
    db.commit()
    db.refresh(interview)
    return interview


def delete_interview(db: Session, interview: Interview) -> None:
    db.delete(interview)
    db.commit()
