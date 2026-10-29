import logging
from collections.abc import Generator

from fastapi import HTTPException, status
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine, make_url
from sqlalchemy.exc import DBAPIError, OperationalError
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings

logger = logging.getLogger("jobtrack.database")


def _create_engine(database_url: str) -> Engine:
    connect_args = (
        {"connect_timeout": 5}
        if make_url(database_url).get_backend_name() == "postgresql"
        else {}
    )
    return create_engine(
        database_url,
        pool_pre_ping=True,
        connect_args=connect_args,
    )


engine = _create_engine(settings.database_url)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    session = SessionLocal()
    try:
        yield session
    except OperationalError as exc:
        try:
            session.rollback()
        except DBAPIError as rollback_error:
            logger.warning(
                "Database rollback failed after a connection error",
                extra={"error_type": type(rollback_error).__name__},
            )
        logger.error(
            "Database connection failed",
            extra={"error_type": type(exc).__name__},
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database temporarily unavailable",
        ) from None
    finally:
        try:
            session.close()
        except DBAPIError as close_error:
            logger.warning(
                "Database session close failed",
                extra={"error_type": type(close_error).__name__},
            )
