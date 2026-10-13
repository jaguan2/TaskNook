"""remove the retired furniture unlock ledger

Revision ID: d4e5f6a7b8c9
Revises: f92d6c7b3e10
"""
from alembic import op
import sqlalchemy as sa


revision = "d4e5f6a7b8c9"
down_revision = "f92d6c7b3e10"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("user") as batch_op:
        batch_op.drop_column("unlocked")


def downgrade():
    with op.batch_alter_table("user") as batch_op:
        batch_op.add_column(sa.Column("unlocked", sa.Text(), nullable=True))
