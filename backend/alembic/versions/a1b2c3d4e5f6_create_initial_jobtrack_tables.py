"""Create initial JobTrack tables.

Revision ID: a1b2c3d4e5f6
Revises:
Create Date: 2026-10-28

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "a1b2c3d4e5f6"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint("length(trim(name)) > 0", name="name_nonempty"),
        sa.CheckConstraint("length(trim(email)) > 0", name="email_nonempty"),
        sa.CheckConstraint(
            "length(trim(password_hash)) > 0",
            name="password_hash_nonempty",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_users"),
    )
    op.create_index(
        "uq_users_email_lower",
        "users",
        [sa.text("lower(email)")],
        unique=True,
    )

    op.create_table(
        "job_applications",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("company", sa.String(length=200), nullable=False),
        sa.Column("job_title", sa.String(length=200), nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "saved",
                "applied",
                "interviewing",
                "offer",
                "rejected",
                "withdrawn",
                name="application_status",
                native_enum=False,
                create_constraint=False,
                validate_strings=True,
            ),
            server_default="saved",
            nullable=False,
        ),
        sa.Column("location", sa.String(length=200), nullable=True),
        sa.Column("job_url", sa.String(length=2048), nullable=True),
        sa.Column("source", sa.String(length=120), nullable=True),
        sa.Column("salary_min", sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column("salary_max", sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column("applied_at", sa.Date(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint(
            "status IN "
            "('saved', 'applied', 'interviewing', 'offer', 'rejected', 'withdrawn')",
            name="application_status",
        ),
        sa.CheckConstraint(
            "length(trim(company)) > 0",
            name="company_nonempty",
        ),
        sa.CheckConstraint(
            "length(trim(job_title)) > 0",
            name="job_title_nonempty",
        ),
        sa.CheckConstraint(
            "salary_min IS NULL OR salary_max IS NULL OR salary_min <= salary_max",
            name="salary_range",
        ),
        sa.CheckConstraint(
            "(salary_min IS NULL OR salary_min >= 0) "
            "AND (salary_max IS NULL OR salary_max >= 0)",
            name="salary_nonnegative",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name="fk_job_applications_user_id_users",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_job_applications"),
    )
    op.create_index(
        "ix_job_applications_user_id_applied_at",
        "job_applications",
        ["user_id", "applied_at"],
    )
    op.create_index(
        "ix_job_applications_user_id_status",
        "job_applications",
        ["user_id", "status"],
    )

    op.create_table(
        "interviews",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("application_id", sa.Uuid(), nullable=False),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("interview_type", sa.String(length=50), nullable=True),
        sa.Column("location_or_link", sa.String(length=2048), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["application_id"],
            ["job_applications.id"],
            name="fk_interviews_application_id_job_applications",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_interviews"),
    )
    op.create_index(
        "ix_interviews_application_id_scheduled_at",
        "interviews",
        ["application_id", "scheduled_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_interviews_application_id_scheduled_at",
        table_name="interviews",
    )
    op.drop_table("interviews")
    op.drop_index(
        "ix_job_applications_user_id_status",
        table_name="job_applications",
    )
    op.drop_index(
        "ix_job_applications_user_id_applied_at",
        table_name="job_applications",
    )
    op.drop_table("job_applications")
    op.drop_index("uq_users_email_lower", table_name="users")
    op.drop_table("users")
