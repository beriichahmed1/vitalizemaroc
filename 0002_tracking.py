"""Add tracking consent/context and the CAPI outbox.

Revision ID: 0002_tracking
"""
from alembic import op
import sqlalchemy as sa

revision = "0002_tracking"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "orders",
        sa.Column("tracking_consent", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column("orders", sa.Column("tracking_context", sa.JSON(), nullable=True))
    op.create_index("ix_orders_customer_phone_created", "orders", ["customer_phone", "created_at"])
    op.create_table(
        "tracking_outbox",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("order_id", sa.String(length=36), sa.ForeignKey("orders.id", ondelete="CASCADE"), nullable=False),
        sa.Column("platform", sa.String(length=16), nullable=False),
        sa.Column("state", sa.String(length=20), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("next_attempt_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_error_code", sa.String(length=80), nullable=True),
        sa.Column("delivered_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("order_id", "platform", name="uq_tracking_order_platform"),
    )


def downgrade() -> None:
    op.drop_table("tracking_outbox")
    op.drop_index("ix_orders_customer_phone_created", table_name="orders")
    op.drop_column("orders", "tracking_context")
    op.drop_column("orders", "tracking_consent")
