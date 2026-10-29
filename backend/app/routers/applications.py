import logging
from typing import NoReturn
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.exc import DBAPIError, IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import ApplicationStatus, User
from app.routers.auth import get_current_user
from app.schemas.applications import (
    ApplicationCreate,
    ApplicationListResponse,
    ApplicationResponse,
    ApplicationUpdate,
)
from app.services.applications import (
    create_application,
    delete_application,
    get_application,
    list_applications,
    update_application,
)

logger = logging.getLogger("jobtrack.applications")
router = APIRouter()


def _handle_database_error(db: Session, exc: SQLAlchemyError) -> NoReturn:
    try:
        db.rollback()
    except DBAPIError as rollback_error:
        logger.error(
            "Application database rollback failed",
            extra={"error_type": type(rollback_error).__name__},
        )
    logger.error(
        "Application database operation failed",
        extra={"error_type": type(exc).__name__},
    )
    if isinstance(exc, IntegrityError):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Application data violates a database constraint",
        ) from None
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Application storage temporarily unavailable",
    ) from None


@router.post(
    "",
    response_model=ApplicationResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_application_endpoint(
    data: ApplicationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApplicationResponse:
    try:
        return create_application(db, current_user, data)
    except SQLAlchemyError as exc:
        _handle_database_error(db, exc)


@router.get("", response_model=ApplicationListResponse)
def list_applications_endpoint(
    q: str | None = Query(default=None, min_length=1, max_length=200),
    status_filter: ApplicationStatus | None = Query(default=None, alias="status"),
    employment_type: str | None = Query(
        default=None,
        min_length=1,
        max_length=50,
    ),
    sort_by: str = Query(default="applied_at", pattern="^(applied_at|company)$"),
    sort_order: str = Query(default="desc", pattern="^(asc|desc)$"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApplicationListResponse:
    if q is not None and not q.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="q must contain non-whitespace characters",
        )
    if employment_type is not None and not employment_type.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="employment_type must contain non-whitespace characters",
        )
    try:
        items, total, total_pages = list_applications(
            db,
            current_user,
            search=q.strip() if q is not None else None,
            status=status_filter,
            employment_type=(
                employment_type.strip() if employment_type is not None else None
            ),
            sort_by=sort_by,
            sort_order=sort_order,
            page=page,
            page_size=page_size,
        )
        return ApplicationListResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )
    except SQLAlchemyError as exc:
        _handle_database_error(db, exc)


@router.get("/{application_id}", response_model=ApplicationResponse)
def get_application_endpoint(
    application_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApplicationResponse:
    try:
        application = get_application(db, current_user, application_id)
    except SQLAlchemyError as exc:
        _handle_database_error(db, exc)
    if application is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found",
        )
    return application


@router.patch("/{application_id}", response_model=ApplicationResponse)
def update_application_endpoint(
    application_id: UUID,
    data: ApplicationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApplicationResponse:
    try:
        application = get_application(db, current_user, application_id)
        if application is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Application not found",
            )
        return update_application(db, application, data)
    except ValueError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from None
    except SQLAlchemyError as exc:
        _handle_database_error(db, exc)


@router.delete(
    "/{application_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
)
def delete_application_endpoint(
    application_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    try:
        application = get_application(db, current_user, application_id)
        if application is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Application not found",
            )
        delete_application(db, application)
    except SQLAlchemyError as exc:
        _handle_database_error(db, exc)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
