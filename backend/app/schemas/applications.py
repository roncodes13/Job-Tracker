from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import (
    AnyHttpUrl,
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
)

from app.models.enums import ApplicationStatus


class ApplicationFields(BaseModel):
    company: str = Field(min_length=1, max_length=200)
    job_title: str = Field(min_length=1, max_length=200)
    job_url: AnyHttpUrl | None = Field(default=None, max_length=2048)
    location: str | None = Field(default=None, max_length=200)
    employment_type: str | None = Field(default=None, max_length=50)
    salary_min: Decimal | None = Field(
        default=None,
        ge=0,
        max_digits=12,
        decimal_places=2,
    )
    salary_max: Decimal | None = Field(
        default=None,
        ge=0,
        max_digits=12,
        decimal_places=2,
    )
    status: ApplicationStatus = ApplicationStatus.SAVED
    applied_at: date | None = None
    notes: str | None = Field(default=None, max_length=10_000)

    @field_validator("company", "job_title")
    @classmethod
    def normalize_required_text(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("This field must not be blank")
        return normalized

    @field_validator("location", "employment_type", "notes")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None

    @model_validator(mode="after")
    def validate_salary_range(self) -> ApplicationFields:
        if (
            self.salary_min is not None
            and self.salary_max is not None
            and self.salary_min > self.salary_max
        ):
            raise ValueError("salary_min must not exceed salary_max")
        return self

    model_config = ConfigDict(extra="forbid")


class ApplicationCreate(ApplicationFields):
    pass


class ApplicationUpdate(BaseModel):
    company: str | None = Field(default=None, min_length=1, max_length=200)
    job_title: str | None = Field(default=None, min_length=1, max_length=200)
    job_url: AnyHttpUrl | None = Field(default=None, max_length=2048)
    location: str | None = Field(default=None, max_length=200)
    employment_type: str | None = Field(default=None, max_length=50)
    salary_min: Decimal | None = Field(
        default=None,
        ge=0,
        max_digits=12,
        decimal_places=2,
    )
    salary_max: Decimal | None = Field(
        default=None,
        ge=0,
        max_digits=12,
        decimal_places=2,
    )
    status: ApplicationStatus | None = None
    applied_at: date | None = None
    notes: str | None = Field(default=None, max_length=10_000)

    @model_validator(mode="before")
    @classmethod
    def reject_empty_or_null_required_updates(cls, value: object) -> object:
        if not isinstance(value, dict):
            return value
        if not value:
            raise ValueError("At least one field must be provided")
        for field in ("company", "job_title", "status"):
            if field in value and value[field] is None:
                raise ValueError(f"{field} cannot be null")
        return value

    @field_validator("company", "job_title")
    @classmethod
    def normalize_required_text(cls, value: str | None) -> str | None:
        if value is None:
            return value
        normalized = value.strip()
        if not normalized:
            raise ValueError("This field must not be blank")
        return normalized

    @field_validator("location", "employment_type", "notes")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None

    @model_validator(mode="after")
    def validate_salary_range(self) -> ApplicationUpdate:
        if (
            self.salary_min is not None
            and self.salary_max is not None
            and self.salary_min > self.salary_max
        ):
            raise ValueError("salary_min must not exceed salary_max")
        return self

    model_config = ConfigDict(extra="forbid")


class ApplicationResponse(BaseModel):
    id: UUID
    company: str
    job_title: str
    job_url: AnyHttpUrl | None
    location: str | None
    employment_type: str | None
    salary_min: Decimal | None
    salary_max: Decimal | None
    status: ApplicationStatus
    applied_at: date | None
    notes: str | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ApplicationListResponse(BaseModel):
    items: list[ApplicationResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
