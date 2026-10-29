from __future__ import annotations

import secrets
from pathlib import Path
from typing import Literal
from urllib.parse import urlsplit

from pydantic import (
    AnyHttpUrl,
    Field,
    SecretStr,
    TypeAdapter,
    ValidationInfo,
    field_validator,
    model_validator,
)
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import make_url
from sqlalchemy.exc import ArgumentError

BACKEND_DIR = Path(__file__).resolve().parents[2]
http_url_adapter = TypeAdapter(AnyHttpUrl)


class Settings(BaseSettings):
    app_name: str = "JobTrack API"
    environment: Literal["development", "testing", "production"] = "development"
    frontend_origins: list[str] = ["http://localhost:5173"]
    database_url: str = "postgresql+psycopg://localhost:5432/jobtrack_dev"
    jwt_secret_key: SecretStr = Field(
        default_factory=lambda: SecretStr(secrets.token_urlsafe(48))
    )
    access_token_expire_minutes: int = Field(default=15, gt=0, le=1440)

    @field_validator("app_name")
    @classmethod
    def app_name_must_not_be_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("app_name must not be blank")
        return value

    @field_validator("database_url")
    @classmethod
    def production_database_must_use_verified_tls(
        cls,
        value: str,
        info: ValidationInfo,
    ) -> str:
        if info.data.get("environment") != "production":
            return value

        try:
            database_url = make_url(value)
        except ArgumentError:
            raise ValueError(
                "Production DATABASE_URL must be a valid PostgreSQL URL"
            ) from None
        if database_url.get_backend_name() != "postgresql":
            raise ValueError("Production DATABASE_URL must use PostgreSQL")
        sslmode = database_url.query.get("sslmode")
        if not isinstance(sslmode, str) or sslmode.lower() != "verify-full":
            raise ValueError(
                "Production PostgreSQL DATABASE_URL must set sslmode=verify-full"
            )
        return value

    @field_validator("jwt_secret_key")
    @classmethod
    def production_secret_must_be_strong(
        cls,
        value: SecretStr,
        info: ValidationInfo,
    ) -> SecretStr:
        secret = value.get_secret_value()
        if not secret:
            if info.data.get("environment") == "production":
                raise ValueError("JWT_SECRET_KEY must be configured in production")
            return SecretStr(secrets.token_urlsafe(48))
        if len(secret) < 32:
            raise ValueError("JWT_SECRET_KEY must contain at least 32 characters")
        return value

    @model_validator(mode="after")
    def production_requires_explicit_jwt_secret(self) -> Settings:
        if (
            self.environment == "production"
            and "jwt_secret_key" not in self.model_fields_set
        ):
            raise ValueError("JWT_SECRET_KEY must be configured in production")
        return self

    @field_validator("frontend_origins")
    @classmethod
    def validate_frontend_origins(cls, origins: list[str]) -> list[str]:
        validated_origins = []
        for origin in origins:
            if origin == "*":
                raise ValueError("Wildcard frontend origins are not allowed")

            url = http_url_adapter.validate_python(origin)
            parts = urlsplit(str(url))
            if (
                parts.path not in ("", "/")
                or parts.query
                or parts.fragment
                or url.username
                or url.password
            ):
                raise ValueError(
                    "Frontend origins must contain only a scheme, host, and port"
                )
            validated_origins.append(f"{parts.scheme}://{parts.netloc}")

        return validated_origins

    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
