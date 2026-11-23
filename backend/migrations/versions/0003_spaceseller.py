"""Add the SpaceSeller lead outbox.

Revision ID: 0003_spaceseller
"""
from alembic import op
import sqlalchemy as sa

revision = "0003_spaceseller"
down_revision = "0002_tracking"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "spaceseller_outbox",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("order_id", sa.String(length=36), sa.ForeignKey("orders.id", ondelete="CASCADE"), nullable=False),
        sa.Column("state", sa.String(length=20), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("next_attempt_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_error_code", sa.String(length=80), nullable=True),
        sa.Column("space_seller_id", sa.String(length=80), nullable=True),
        sa.Column("delivered_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("order_id", name="uq_spaceseller_order"),
    )


def downgrade() -> None:
    op.drop_table("spaceseller_outbox")
