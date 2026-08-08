"""add task notes and due_date

Revision ID: c5a91e2f70b4
Revises: b2f4a91c7d33
Create Date: 2026-08-08 00:41:02.118447

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c5a91e2f70b4'
down_revision = 'b2f4a91c7d33'
branch_labels = None
depends_on = None


def upgrade():
    # One batch block PER column. Both are nullable, so neither needs a
    # server_default — but the split still matters: when the batch recreates the
    # table (which is what happens on a legacy-adopted database), two added
    # columns in one block give Alembic's column-reordering a cycle and the
    # upgrade dies. The schema tests cover exactly that path.
    with op.batch_alter_table('task', schema=None) as batch_op:
        batch_op.add_column(sa.Column('notes', sa.Text(), nullable=True))
    with op.batch_alter_table('task', schema=None) as batch_op:
        batch_op.add_column(sa.Column('due_date', sa.String(length=10), nullable=True))


def downgrade():
    with op.batch_alter_table('task', schema=None) as batch_op:
        batch_op.drop_column('due_date')
        batch_op.drop_column('notes')
