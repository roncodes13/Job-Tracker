import logging
from datetime import UTC, datetime
from typing import NoReturn
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.exc import DBAPIError, IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import Interview, User
from app.routers.auth import get_current_user
from app.schemas.interviews import (
    InterviewCreate,
    InterviewListResponse,
    InterviewResponse,
    InterviewUpdate,
)
from app.services.interviews import (
    create_interview,
    delete_interview,
    get_interview,
    list_interviews,
    update_interview,
)

logger = logging.getLogger("jobtrack.interviews")
router = APIRouter()
application_interviews_router = APIRouter()


def _handle_database_error(db: Session, exc: SQLAlchemyError) -> NoReturn:
    try:
        db.rollback()
    except DBAPIError as rollback_error:
        logger.error(
            "Interview database rollback failed",
            extra={"error_type": type(rollback_error).__name__},
        )
    logger.error(
        "Interview database operation failed",
        extra={"error_type": type(exc).__name__},
    )
    if isinstance(exc, IntegrityError):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Interview data violates a database constraint",
        ) from None
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Interview storage temporarily unavailable",
    ) from None


def _normalize_filter_datetime(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None or value.utcoffset() is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Date filters must include a timezone offset",
        )
    return value.astimezone(UTC)


def _get_owned_interview(
    db: Session,
    owner: User,
    interview_id: UUID,
) -> Interview:
    interview = get_interview(db, owner, interview_id)
    if interview is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview not found",
        )
    return interview


@application_interviews_router.post(
    "/applications/{application_id}/interviews",
    response_model=InterviewResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_interview_endpoint(
    application_id: UUID,
    data: InterviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> InterviewResponse:
    try:
        interview = create_interview(db, current_user, application_id, data)
    except SQLAlchemyError as exc:
        _handle_database_error(db, exc)
    if interview is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found",
        )
    return interview


@router.get("", response_model=InterviewListResponse)
def list_interviews_endpoint(
    scheduled_from: datetime | None = Query(default=None),
    scheduled_to: datetime | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> InterviewListResponse:
    start = _normalize_filter_datetime(scheduled_from)
    end = _normalize_filter_datetime(scheduled_to)
    if start is not None and end is not None and start > end:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="scheduled_from must not be after scheduled_to",
        )
    try:
        interviews, total = list_interviews(db, current_user, start, end)
        return InterviewListResponse(
            items=interviews,
            total=total,
            scheduled_from=start,
            scheduled_to=end,
        )
    except SQLAlchemyError as exc:
        _handle_database_error(db, exc)


@router.get("/{interview_id}", response_model=InterviewResponse)
def read_interview_endpoint(
    interview_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> InterviewResponse:
    try:
        return _get_owned_interview(db, current_user, interview_id)
    except SQLAlchemyError as exc:
        _handle_database_error(db, exc)


@router.patch("/{interview_id}", response_model=InterviewResponse)
def update_interview_endpoint(
    interview_id: UUID,
    data: InterviewUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> InterviewResponse:
    try:
        interview = _get_owned_interview(db, current_user, interview_id)
        return update_interview(db, interview, data)
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        _handle_database_error(db, exc)


@router.delete(
    "/{interview_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
)
def delete_interview_endpoint(
    interview_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    try:
        interview = _get_owned_interview(db, current_user, interview_id)
        delete_interview(db, interview)
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        _handle_database_error(db, exc)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
