"""add calendar events

Revision ID: e81f0a2b4c6d
Revises: a94f3d2118c7
"""
from alembic import op
import sqlalchemy as sa

revision = "e81f0a2b4c6d"
down_revision = "a94f3d2118c7"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "calendar_event",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("user.id"), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("event_date", sa.String(length=10), nullable=False),
        sa.Column("start_time", sa.String(length=5), nullable=False),
        sa.Column("duration", sa.Integer(), nullable=False, server_default="60"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_calendar_event_user_id", "calendar_event", ["user_id"])
    op.create_index("ix_calendar_event_event_date", "calendar_event", ["event_date"])


def downgrade():
    op.drop_index("ix_calendar_event_event_date", table_name="calendar_event")
    op.drop_index("ix_calendar_event_user_id", table_name="calendar_event")
    op.drop_table("calendar_event")
