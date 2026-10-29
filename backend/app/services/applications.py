from collections.abc import Sequence
from decimal import Decimal
from math import ceil
from uuid import UUID

from sqlalchemy import case, func, or_, select
from sqlalchemy.orm import Session

from app.models import ApplicationStatus, JobApplication, User
from app.schemas.applications import ApplicationCreate, ApplicationUpdate


def create_application(
    db: Session,
    owner: User,
    data: ApplicationCreate,
) -> JobApplication:
    fields = data.model_dump()
    if fields["job_url"] is not None:
        fields["job_url"] = str(fields["job_url"])
    application = JobApplication(user_id=owner.id, **fields)
    db.add(application)
    db.commit()
    db.refresh(application)
    return application


def list_applications(
    db: Session,
    owner: User,
    *,
    search: str | None,
    status: ApplicationStatus | None,
    employment_type: str | None,
    sort_by: str,
    sort_order: str,
    page: int,
    page_size: int,
) -> tuple[Sequence[JobApplication], int, int]:
    filters = [JobApplication.user_id == owner.id]
    if search is not None:
        escaped_search = (
            search.replace("\\", "\\\\")
            .replace("%", "\\%")
            .replace("_", "\\_")
        )
        search_pattern = f"%{escaped_search}%"
        filters.append(
            or_(
                JobApplication.company.ilike(search_pattern, escape="\\"),
                JobApplication.job_title.ilike(search_pattern, escape="\\"),
            )
        )
    if status is not None:
        filters.append(JobApplication.status == status)
    if employment_type is not None:
        filters.append(
            func.lower(JobApplication.employment_type)
            == employment_type.lower()
        )

    ordering = (
        (
            case(
                (JobApplication.applied_at.is_(None), 1),
                else_=0,
            ),
            JobApplication.applied_at.asc()
            if sort_order == "asc"
            else JobApplication.applied_at.desc(),
        )
        if sort_by == "applied_at"
        else (
            JobApplication.company.asc()
            if sort_order == "asc"
            else JobApplication.company.desc(),
        )
    )
    statement = (
        select(JobApplication)
        .where(*filters)
        .order_by(*ordering, JobApplication.id.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    items = db.scalars(statement).all()
    total = db.scalar(
        select(func.count()).select_from(JobApplication).where(*filters)
    )
    total = total or 0
    total_pages = ceil(total / page_size)
    return items, total, total_pages


def get_application(
    db: Session,
    owner: User,
    application_id: UUID,
) -> JobApplication | None:
    return db.scalar(
        select(JobApplication).where(
            JobApplication.id == application_id,
            JobApplication.user_id == owner.id,
        )
    )


def update_application(
    db: Session,
    application: JobApplication,
    data: ApplicationUpdate,
) -> JobApplication:
    changes = data.model_dump(exclude_unset=True)
    minimum: Decimal | None = changes.get("salary_min", application.salary_min)
    maximum: Decimal | None = changes.get("salary_max", application.salary_max)
    if minimum is not None and maximum is not None and minimum > maximum:
        raise ValueError("salary_min must not exceed salary_max")

    if "job_url" in changes and changes["job_url"] is not None:
        changes["job_url"] = str(changes["job_url"])
    for field, value in changes.items():
        setattr(application, field, value)
    db.commit()
    db.refresh(application)
    return application


def delete_application(db: Session, application: JobApplication) -> None:
    db.delete(application)
    db.commit()
