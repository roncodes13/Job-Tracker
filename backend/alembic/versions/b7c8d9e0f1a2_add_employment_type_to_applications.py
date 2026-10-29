"""Add employment type to job applications.

Revision ID: b7c8d9e0f1a2
Revises: a1b2c3d4e5f6
Create Date: 2026-10-28

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "b7c8d9e0f1a2"
down_revision: str | None = "a1b2c3d4e5f6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "job_applications",
        sa.Column("employment_type", sa.String(length=50), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("job_applications", "employment_type")
