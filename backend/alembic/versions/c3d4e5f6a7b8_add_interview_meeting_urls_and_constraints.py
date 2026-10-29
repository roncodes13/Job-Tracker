"""Add meeting URLs and interview type constraints.

Revision ID: c3d4e5f6a7b8
Revises: b7c8d9e0f1a2
Create Date: 2026-10-28

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "c3d4e5f6a7b8"
down_revision: str | None = "b7c8d9e0f1a2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("interviews") as batch_op:
        batch_op.add_column(
            sa.Column("meeting_url", sa.String(length=2048), nullable=True),
        )
        batch_op.create_check_constraint(
            "interview_type_valid",
            "interview_type IS NULL OR interview_type IN "
            "('phone', 'video', 'onsite', 'technical', 'behavioral', 'other')",
        )
    op.create_index(
        "ix_interviews_scheduled_at",
        "interviews",
        ["scheduled_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_interviews_scheduled_at", table_name="interviews")
    with op.batch_alter_table("interviews") as batch_op:
        batch_op.drop_constraint(
            op.f("ck_interviews_interview_type_valid"),
            type_="check",
        )
        batch_op.drop_column("meeting_url")
