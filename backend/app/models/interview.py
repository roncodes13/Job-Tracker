from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.interview_type import InterviewType

if TYPE_CHECKING:
    from app.models.job_application import JobApplication


class Interview(Base):
    __tablename__ = "interviews"
    __table_args__ = (
        CheckConstraint(
            "interview_type IS NULL OR interview_type IN "
            "('phone', 'video', 'onsite', 'technical', 'behavioral', 'other')",
            name="interview_type_valid",
        ),
        Index(
            "ix_interviews_application_id_scheduled_at",
            "application_id",
            "scheduled_at",
        ),
        Index("ix_interviews_scheduled_at", "scheduled_at"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    application_id: Mapped[UUID] = mapped_column(
        ForeignKey("job_applications.id", ondelete="CASCADE"),
        nullable=False,
    )
    scheduled_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    interview_type: Mapped[InterviewType | None] = mapped_column(
        Enum(
            InterviewType,
            name="interview_type",
            length=50,
            native_enum=False,
            create_constraint=False,
            values_callable=lambda enum_type: [item.value for item in enum_type],
            validate_strings=True,
        )
    )
    meeting_url: Mapped[str | None] = mapped_column(String(2048))
    location_or_link: Mapped[str | None] = mapped_column(String(2048))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    application: Mapped[JobApplication] = relationship(back_populates="interviews")
