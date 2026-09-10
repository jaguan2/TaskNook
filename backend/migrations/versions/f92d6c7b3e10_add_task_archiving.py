"""add task archiving

Revision ID: f92d6c7b3e10
Revises: e81f0a2b4c6d
"""
from alembic import op
import sqlalchemy as sa

revision = "f92d6c7b3e10"
down_revision = "e81f0a2b4c6d"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("task") as batch_op:
        batch_op.add_column(sa.Column("archived_at", sa.DateTime(), nullable=True))


def downgrade():
    with op.batch_alter_table("task") as batch_op:
        batch_op.drop_column("archived_at")
