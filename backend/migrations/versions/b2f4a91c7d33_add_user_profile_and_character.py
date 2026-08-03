"""add user.profile and user.character

Revision ID: b2f4a91c7d33
Revises: 8e4ff58e1be2
Create Date: 2026-08-01 15:40:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b2f4a91c7d33'
down_revision = '8e4ff58e1be2'
branch_labels = None
depends_on = None


def upgrade():
    # TWO separate batch blocks on purpose. Both add_columns in one block work
    # on an ordinary upgrade but die with a column-ordering cycle when the
    # batch has to RECREATE the table, which is exactly what a legacy-adopted
    # DB does. test_schema.py's legacy path is what catches this.
    #
    # Both nullable: absent reads as "hasn't filled this in yet", so existing
    # rows need no backfill and no server_default.
    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.add_column(sa.Column('profile', sa.Text(), nullable=True))

    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.add_column(sa.Column('character', sa.Text(), nullable=True))


def downgrade():
    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.drop_column('character')

    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.drop_column('profile')
