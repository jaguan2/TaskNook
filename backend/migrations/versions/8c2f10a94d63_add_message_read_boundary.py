"""Keep later messages unread when timestamps tie.

Revision ID: 8c2f10a94d63
Revises: 7b91e4a2c680
"""
from alembic import op
import sqlalchemy as sa


revision = "8c2f10a94d63"
down_revision = "7b91e4a2c680"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("conversation_member", sa.Column("last_read_message_id", sa.Integer(), nullable=False, server_default="0"))
    # Previously every existing line at the read timestamp counted as read.
    # Preserve that boundary while allowing future IDs at that timestamp.
    op.execute(sa.text("""
        UPDATE conversation_member
        SET last_read_message_id = COALESCE((
            SELECT MAX(message.id) FROM message
            WHERE message.conversation_id = conversation_member.conversation_id
        ), 0)
        WHERE last_read_at IS NOT NULL
    """))


def downgrade():
    with op.batch_alter_table("conversation_member") as batch:
        batch.drop_column("last_read_message_id")
