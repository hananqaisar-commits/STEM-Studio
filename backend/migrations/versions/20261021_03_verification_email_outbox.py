"""Add a durable, encrypted verification-email outbox."""

from alembic import op
import sqlalchemy as sa

revision = "20261021_03"
down_revision = "20261021_02"
branch_labels = None
depends_on = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    if "email_outbox" not in inspector.get_table_names():
        op.create_table(
            "email_outbox",
            sa.Column("job_id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("verification_id", sa.Integer(), nullable=False),
            sa.Column("encrypted_token", sa.Text(), nullable=False),
            sa.Column("status", sa.String(length=16), server_default="pending", nullable=False),
            sa.Column("attempts", sa.Integer(), server_default="0", nullable=False),
            sa.Column("available_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("lease_expires_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("last_error_category", sa.String(length=64), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("delivered_at", sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(["user_id"], ["users.user_id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(
                ["verification_id"], ["email_verifications.verification_id"], ondelete="CASCADE"
            ),
            sa.PrimaryKeyConstraint("job_id"),
        )
        op.create_index("ix_email_outbox_user_id", "email_outbox", ["user_id"])
        op.create_index("ix_email_outbox_verification_id", "email_outbox", ["verification_id"])
        op.create_index("ix_email_outbox_status", "email_outbox", ["status"])
        op.create_index(
            "ix_email_outbox_queue",
            "email_outbox",
            ["status", "available_at", "created_at"],
        )
    else:
        indexes = {index["name"] for index in inspector.get_indexes("email_outbox")}
        if "ix_email_outbox_queue" not in indexes:
            op.create_index(
                "ix_email_outbox_queue",
                "email_outbox",
                ["status", "available_at", "created_at"],
            )


def downgrade() -> None:
    if "email_outbox" in sa.inspect(op.get_bind()).get_table_names():
        op.drop_table("email_outbox")
