"""add user.unlocked

Revision ID: 8e4ff58e1be2
Revises: 14b481df1b5d
Create Date: 2026-07-28 01:46:26.579162

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '8e4ff58e1be2'
down_revision = '14b481df1b5d'
branch_labels = None
depends_on = None


def upgrade():
    # Nullable on purpose: an absent value reads as "only the free starter
    # pieces", so existing rows need no backfill and no server_default.
    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.add_column(sa.Column('unlocked', sa.Text(), nullable=True))


def downgrade():
    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.drop_column('unlocked')
