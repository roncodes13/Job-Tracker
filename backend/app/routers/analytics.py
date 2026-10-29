import logging
from typing import NoReturn

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import DBAPIError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import User
from app.routers.auth import get_current_user
from app.schemas.analytics import AnalyticsSummaryResponse
from app.services.analytics import get_analytics_summary

logger = logging.getLogger("jobtrack.analytics")
router = APIRouter()


def _handle_database_error(db: Session, exc: SQLAlchemyError) -> NoReturn:
    try:
        db.rollback()
    except DBAPIError as rollback_error:
        logger.error(
            "Analytics database rollback failed",
            extra={"error_type": type(rollback_error).__name__},
        )
    logger.error(
        "Analytics database query failed",
        extra={"error_type": type(exc).__name__},
    )
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Analytics temporarily unavailable",
    ) from None


@router.get("/summary", response_model=AnalyticsSummaryResponse)
def read_analytics_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AnalyticsSummaryResponse:
    try:
        return get_analytics_summary(db, current_user)
    except SQLAlchemyError as exc:
        _handle_database_error(db, exc)
