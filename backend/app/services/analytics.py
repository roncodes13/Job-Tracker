from datetime import UTC, datetime

from sqlalchemy import extract, func, select
from sqlalchemy.orm import Session

from app.models import ApplicationStatus, Interview, JobApplication, User
from app.schemas.analytics import (
    AnalyticsSummaryResponse,
    MonthlyApplicationCount,
)


def _six_month_window(now: datetime) -> tuple[datetime, datetime, list[str]]:
    current_month = now.date().replace(day=1)
    months: list[str] = []
    for offset in range(5, -1, -1):
        year = current_month.year
        month = current_month.month - offset
        while month <= 0:
            year -= 1
            month += 12
        months.append(f"{year:04d}-{month:02d}")

    start_month = datetime.strptime(months[0], "%Y-%m").replace(tzinfo=UTC)
    end_month = datetime(
        current_month.year,
        current_month.month,
        1,
        tzinfo=UTC,
    )
    end_year = end_month.year + (1 if end_month.month == 12 else 0)
    next_month = 1 if end_month.month == 12 else end_month.month + 1
    end_exclusive = end_month.replace(year=end_year, month=next_month)
    return start_month, end_exclusive, months


def get_analytics_summary(
    db: Session,
    owner: User,
    *,
    now: datetime | None = None,
) -> AnalyticsSummaryResponse:
    current_time = now or datetime.now(UTC)
    if current_time.tzinfo is None or current_time.utcoffset() is None:
        raise ValueError("Analytics reference time must be timezone-aware")
    current_time = current_time.astimezone(UTC)
    start, end, month_labels = _six_month_window(current_time)

    status_rows = db.execute(
        select(JobApplication.status, func.count(JobApplication.id))
        .where(JobApplication.user_id == owner.id)
        .group_by(JobApplication.status)
    ).all()
    status_counts = {status: 0 for status in ApplicationStatus}
    for application_status, count in status_rows:
        status_counts[application_status] = count
    total_applications = sum(status_counts.values())

    interviews_scheduled = db.scalar(
        select(func.count(Interview.id))
        .join(Interview.application)
        .where(
            JobApplication.user_id == owner.id,
            Interview.scheduled_at >= current_time,
        )
    ) or 0

    month_rows = db.execute(
        select(
            extract("year", JobApplication.created_at).label("year"),
            extract("month", JobApplication.created_at).label("month"),
            func.count(JobApplication.id),
        )
        .where(
            JobApplication.user_id == owner.id,
            JobApplication.created_at >= start,
            JobApplication.created_at < end,
        )
        .group_by(
            extract("year", JobApplication.created_at),
            extract("month", JobApplication.created_at),
        )
    ).all()
    monthly_counts = {
        f"{int(year):04d}-{int(month):02d}": count
        for year, month, count in month_rows
    }

    return AnalyticsSummaryResponse(
        total_applications=total_applications,
        applications_by_status=status_counts,
        interviews_scheduled=interviews_scheduled,
        offers_received=status_counts[ApplicationStatus.OFFER],
        rejections=status_counts[ApplicationStatus.REJECTED],
        monthly_applications=[
            MonthlyApplicationCount(
                month=month,
                count=monthly_counts.get(month, 0),
            )
            for month in month_labels
        ],
    )
