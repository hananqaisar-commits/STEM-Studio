"""Add owner-managed feature access, user email consent, and email delivery records."""

from alembic import op
import sqlalchemy as sa

revision = "20261021_01"
down_revision = "20261020_01"
branch_labels = None
depends_on = None


def _tables() -> set[str]:
    return set(sa.inspect(op.get_bind()).get_table_names())


def _columns(table: str) -> set[str]:
    return {column["name"] for column in sa.inspect(op.get_bind()).get_columns(table)}


def upgrade() -> None:
    tables = _tables()

    if "user_preferences" in tables and "marketing_email_opt_in" not in _columns("user_preferences"):
        op.add_column(
            "user_preferences",
            sa.Column("marketing_email_opt_in", sa.Boolean(), server_default=sa.false(), nullable=False),
        )

    if "announcements" in tables:
        columns = _columns("announcements")
        if "email_audience_size" not in columns:
            op.add_column("announcements", sa.Column("email_audience_size", sa.Integer(), server_default="0", nullable=False))
        if "email_requested" not in columns:
            op.add_column("announcements", sa.Column("email_requested", sa.Boolean(), server_default=sa.false(), nullable=False))
        if "email_status" not in columns:
            op.add_column("announcements", sa.Column("email_status", sa.String(length=20), server_default="not_requested", nullable=False))
        if "email_sent_count" not in columns:
            op.add_column("announcements", sa.Column("email_sent_count", sa.Integer(), server_default="0", nullable=False))
        if "email_failed_count" not in columns:
            op.add_column("announcements", sa.Column("email_failed_count", sa.Integer(), server_default="0", nullable=False))

    if "feature_policies" not in tables:
        op.create_table(
            "feature_policies",
            sa.Column("feature_key", sa.String(length=80), primary_key=True),
            sa.Column("label", sa.String(length=120), nullable=False),
            sa.Column("is_premium", sa.Boolean(), server_default=sa.false(), nullable=False),
            sa.Column("is_enabled", sa.Boolean(), server_default=sa.true(), nullable=False),
            sa.Column("updated_by_user_id", sa.Integer(), nullable=True),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["updated_by_user_id"], ["users.user_id"], ondelete="SET NULL"),
        )

    if "user_feature_overrides" not in tables:
        op.create_table(
            "user_feature_overrides",
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("feature_key", sa.String(length=80), nullable=False),
            sa.Column("granted", sa.Boolean(), nullable=False),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("updated_by_user_id", sa.Integer(), nullable=True),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["users.user_id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["feature_key"], ["feature_policies.feature_key"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["updated_by_user_id"], ["users.user_id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("user_id", "feature_key"),
        )
        op.create_index("ix_user_feature_overrides_feature_key", "user_feature_overrides", ["feature_key"])

    if "announcement_email_deliveries" not in tables:
        op.create_table(
            "announcement_email_deliveries",
            sa.Column("delivery_id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("announcement_id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("status", sa.String(length=16), server_default="queued", nullable=False),
            sa.Column("error_type", sa.String(length=64), nullable=True),
            sa.Column("attempted_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["announcement_id"], ["announcements.announcement_id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["user_id"], ["users.user_id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("delivery_id"),
            sa.UniqueConstraint("announcement_id", "user_id", name="uq_announcement_email_recipient"),
        )
        op.create_index("ix_announcement_email_deliveries_announcement_id", "announcement_email_deliveries", ["announcement_id"])
        op.create_index("ix_announcement_email_deliveries_user_id", "announcement_email_deliveries", ["user_id"])


def downgrade() -> None:
    tables = _tables()
    if "announcement_email_deliveries" in tables:
        op.drop_table("announcement_email_deliveries")
    if "user_feature_overrides" in tables:
        op.drop_table("user_feature_overrides")
    if "feature_policies" in tables:
        op.drop_table("feature_policies")
    if "announcements" in tables:
        columns = _columns("announcements")
        for name in ("email_failed_count", "email_sent_count", "email_status", "email_requested", "email_audience_size"):
            if name in columns:
                op.drop_column("announcements", name)
    if "user_preferences" in tables and "marketing_email_opt_in" in _columns("user_preferences"):
        op.drop_column("user_preferences", "marketing_email_opt_in")
