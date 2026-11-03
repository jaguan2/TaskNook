"""Index conversation history and its timestamp/id cursor.

Revision ID: 7b91e4a2c680
Revises: d4e5f6a7b8c9
"""
from alembic import op


revision = "7b91e4a2c680"
down_revision = "d4e5f6a7b8c9"
branch_labels = None
depends_on = None


def upgrade():
    # SQLite scans this index backwards for newest-first pages. Its leading
    # column also serves the conversation-only queries covered by the old index.
    op.create_index("ix_message_conversation_created_id", "message", ["conversation_id", "created_at", "id"])
    op.drop_index("ix_message_conversation_id", table_name="message")


def downgrade():
    op.create_index("ix_message_conversation_id", "message", ["conversation_id"])
    op.drop_index("ix_message_conversation_created_id", table_name="message")
