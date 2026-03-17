"""add post_views table

Revision ID: 0002_post_views
Revises: 0001_initial
Create Date: 2026-03-17 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002_post_views"
down_revision: Union[str, None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "post_views",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("post_id", sa.BigInteger(), nullable=False),
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column(
            "viewed_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        # ISO week start (Monday) – dedup bucket for the 7-day rule.
        sa.Column("week_bucket", sa.Date(), nullable=False),
        sa.ForeignKeyConstraint(["post_id"], ["posts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["app_users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "post_id", "user_id", "week_bucket", name="uq_post_views_post_user_week"
        ),
    )
    op.create_index("ix_post_views_post_id", "post_views", ["post_id"])
    op.create_index(
        "ix_post_views_user_id_viewed_at", "post_views", ["user_id", "viewed_at"]
    )


def downgrade() -> None:
    op.drop_index("ix_post_views_user_id_viewed_at", table_name="post_views")
    op.drop_index("ix_post_views_post_id", table_name="post_views")
    op.drop_table("post_views")
