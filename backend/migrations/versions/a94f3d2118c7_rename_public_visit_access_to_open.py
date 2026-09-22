"""rename public visit access to open

Revision ID: a94f3d2118c7
Revises: 6d53f00fb564
Create Date: 2026-08-27 00:00:00.000000

"""
from alembic import op


# revision identifiers, used by Alembic.
revision = "a94f3d2118c7"
down_revision = "6d53f00fb564"
branch_labels = None
depends_on = None


def upgrade():
    # "Public" implied unrestricted entry. The feature is actually an Open
    # room shared with friends and simulated neighbours, so migrate the value
    # rather than leaving a misleading internal contract behind the new label.
    op.execute("UPDATE user SET visit_access = 'open' WHERE visit_access = 'public'")


def downgrade():
    op.execute("UPDATE user SET visit_access = 'public' WHERE visit_access = 'open'")
