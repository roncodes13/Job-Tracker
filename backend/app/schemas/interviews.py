from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from pydantic import (
    AnyHttpUrl,
    BaseModel,
    ConfigDict,
    Field,
    field_serializer,
    field_validator,
    model_validator,
)

from app.models.interview_type import InterviewType


class InterviewCreate(BaseModel):
    scheduled_at: datetime
    interview_type: InterviewType
    meeting_url: AnyHttpUrl | None = Field(default=None, max_length=2048)
    notes: str | None = Field(default=None, max_length=10_000)

    @field_validator("scheduled_at")
    @classmethod
    def require_timezone_and_normalize_utc(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("scheduled_at must include a timezone offset")
        return value.astimezone(UTC)

    @field_validator("notes")
    @classmethod
    def normalize_notes(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None

    model_config = ConfigDict(extra="forbid")


class InterviewUpdate(BaseModel):
    scheduled_at: datetime | None = None
    interview_type: InterviewType | None = None
    meeting_url: AnyHttpUrl | None = Field(default=None, max_length=2048)
    notes: str | None = Field(default=None, max_length=10_000)

    @field_validator("scheduled_at")
    @classmethod
    def require_timezone_and_normalize_utc(
        cls,
        value: datetime | None,
    ) -> datetime | None:
        if value is None:
            raise ValueError("scheduled_at cannot be null")
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("scheduled_at must include a timezone offset")
        return value.astimezone(UTC)

    @field_validator("interview_type")
    @classmethod
    def interview_type_cannot_be_null(
        cls,
        value: InterviewType | None,
    ) -> InterviewType:
        if value is None:
            raise ValueError("interview_type cannot be null")
        return value

    @field_validator("notes")
    @classmethod
    def normalize_notes(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None

    @model_validator(mode="before")
    @classmethod
    def reject_empty_updates(cls, value: object) -> object:
        if isinstance(value, dict) and not value:
            raise ValueError("At least one field must be provided")
        return value

    model_config = ConfigDict(extra="forbid")


class InterviewResponse(BaseModel):
    id: UUID
    application_id: UUID
    scheduled_at: datetime
    interview_type: InterviewType | None
    meeting_url: AnyHttpUrl | None
    notes: str | None
    created_at: datetime
    updated_at: datetime

    @field_serializer("scheduled_at")
    def serialize_scheduled_at(self, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            return value.replace(tzinfo=UTC)
        return value.astimezone(UTC)

    model_config = ConfigDict(from_attributes=True)


class InterviewListResponse(BaseModel):
    items: list[InterviewResponse]
    total: int
    scheduled_from: datetime | None
    scheduled_to: datetime | None
