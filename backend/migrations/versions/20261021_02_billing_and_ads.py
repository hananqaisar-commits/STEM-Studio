"""Add dynamic feature definitions, recurring subscriptions, payment records and ads."""

from alembic import op
import sqlalchemy as sa

revision = "20261021_02"
down_revision = "20261021_01"
branch_labels = None
depends_on = None


def _tables() -> set[str]:
    return set(sa.inspect(op.get_bind()).get_table_names())


def _columns(table: str) -> set[str]:
    return {column["name"] for column in sa.inspect(op.get_bind()).get_columns(table)}


def _indexes(table: str) -> set[str]:
    return {index["name"] for index in sa.inspect(op.get_bind()).get_indexes(table)}


def _add_column(table: str, column: sa.Column) -> None:
    if table in _tables() and column.name not in _columns(table):
        op.add_column(table, column)


def _index(table: str, name: str, columns: list[str], unique: bool = False) -> None:
    if table in _tables() and name not in _indexes(table):
        op.create_index(name, table, columns, unique=unique)


def upgrade() -> None:
    tables = _tables()
    if "feature_policies" in tables:
        _add_column("feature_policies", sa.Column("description", sa.String(500), server_default="", nullable=False))
        _add_column("feature_policies", sa.Column("is_archived", sa.Boolean(), server_default=sa.false(), nullable=False))
        _add_column("feature_policies", sa.Column("disabled_until", sa.DateTime(timezone=True), nullable=True))

    tables = _tables()
    if "subscription_plans" in tables:
        _add_column("subscription_plans", sa.Column("list_price_minor", sa.Integer(), server_default="0", nullable=False))
        _add_column("subscription_plans", sa.Column("discount_label", sa.String(80), nullable=True))
    if "subscription_plans" not in tables:
        op.create_table(
            "subscription_plans",
            sa.Column("plan_id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("code", sa.String(80), nullable=False),
            sa.Column("name", sa.String(120), nullable=False),
            sa.Column("description", sa.String(1000), server_default="", nullable=False),
            sa.Column("price_minor", sa.Integer(), server_default="0", nullable=False),
            sa.Column("list_price_minor", sa.Integer(), server_default="0", nullable=False),
            sa.Column("discount_label", sa.String(80), nullable=True),
            sa.Column("currency", sa.String(3), server_default="PKR", nullable=False),
            sa.Column("billing_interval", sa.String(12), server_default="monthly", nullable=False),
            sa.Column("is_free", sa.Boolean(), server_default=sa.false(), nullable=False),
            sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
            sa.Column("is_public", sa.Boolean(), server_default=sa.true(), nullable=False),
            sa.Column("is_featured", sa.Boolean(), server_default=sa.false(), nullable=False),
            sa.Column("safepay_plan_id", sa.String(120), nullable=True),
            sa.Column("created_by_user_id", sa.Integer(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["created_by_user_id"], ["users.user_id"], ondelete="SET NULL"),
            sa.UniqueConstraint("code", name="uq_subscription_plans_code"),
            sa.UniqueConstraint("safepay_plan_id", name="uq_subscription_plans_safepay_plan_id"),
        )
    _index("subscription_plans", "ix_subscription_plans_code", ["code"], unique=True)

    tables = _tables()
    if "plan_features" not in tables:
        op.create_table(
            "plan_features",
            sa.Column("plan_id", sa.Integer(), nullable=False),
            sa.Column("feature_key", sa.String(80), nullable=False),
            sa.Column("included", sa.Boolean(), server_default=sa.true(), nullable=False),
            sa.ForeignKeyConstraint(["plan_id"], ["subscription_plans.plan_id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["feature_key"], ["feature_policies.feature_key"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("plan_id", "feature_key"),
        )

    tables = _tables()
    if "subscriptions" not in tables:
        op.create_table(
            "subscriptions",
            sa.Column("subscription_id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("plan_id", sa.Integer(), nullable=False),
            sa.Column("provider", sa.String(24), server_default="safepay", nullable=False),
            sa.Column("status", sa.String(24), server_default="pending", nullable=False),
            sa.Column("reference", sa.String(80), nullable=False),
            sa.Column("provider_subscription_id", sa.String(120), nullable=True),
            sa.Column("current_period_start", sa.DateTime(timezone=True), nullable=True),
            sa.Column("current_period_end", sa.DateTime(timezone=True), nullable=True),
            sa.Column("past_due_since", sa.DateTime(timezone=True), nullable=True),
            sa.Column("premium_hold_until", sa.DateTime(timezone=True), nullable=True),
            sa.Column("cancel_at_period_end", sa.Boolean(), server_default=sa.false(), nullable=False),
            sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("last_payment_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("last_provider_transaction_id", sa.String(120), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["users.user_id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["plan_id"], ["subscription_plans.plan_id"], ondelete="RESTRICT"),
            sa.UniqueConstraint("reference", name="uq_subscriptions_reference"),
            sa.UniqueConstraint("provider_subscription_id", name="uq_subscriptions_provider_subscription_id"),
            sa.UniqueConstraint("last_provider_transaction_id", name="uq_subscriptions_last_provider_transaction_id"),
        )
    for col in ("user_id", "plan_id", "status", "current_period_end"):
        _index("subscriptions", f"ix_subscriptions_{col}", [col])
    _index("subscriptions", "ix_subscriptions_reference", ["reference"], unique=True)

    tables = _tables()
    if "payment_records" not in tables:
        op.create_table(
            "payment_records",
            sa.Column("payment_id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("user_id", sa.Integer(), nullable=True),
            sa.Column("plan_id", sa.Integer(), nullable=True),
            sa.Column("subscription_id", sa.Integer(), nullable=True),
            sa.Column("provider", sa.String(24), nullable=False),
            sa.Column("provider_transaction_id", sa.String(120), nullable=True),
            sa.Column("amount_minor", sa.Integer(), nullable=False),
            sa.Column("currency", sa.String(3), nullable=False),
            sa.Column("status", sa.String(20), server_default="pending", nullable=False),
            sa.Column("payment_method", sa.String(32), nullable=True),
            sa.Column("external_reference", sa.String(160), nullable=True),
            sa.Column("reviewed_by_user_id", sa.Integer(), nullable=True),
            sa.Column("failure_code", sa.String(64), nullable=True),
            sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["users.user_id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["plan_id"], ["subscription_plans.plan_id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["subscription_id"], ["subscriptions.subscription_id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["reviewed_by_user_id"], ["users.user_id"], ondelete="SET NULL"),
            sa.UniqueConstraint("provider_transaction_id", name="uq_payment_records_provider_transaction_id"),
        )
    for col in ("user_id", "subscription_id", "status", "external_reference", "created_at"):
        _index("payment_records", f"ix_payment_records_{col}", [col])

    tables = _tables()
    if "payment_webhook_events" not in tables:
        op.create_table(
            "payment_webhook_events",
            sa.Column("event_id", sa.String(160), primary_key=True),
            sa.Column("event_type", sa.String(100), nullable=False),
            sa.Column("reference", sa.String(80), nullable=True),
            sa.Column("payload_summary", sa.String(4000), server_default="{}", nullable=False),
            sa.Column("status", sa.String(20), server_default="queued", nullable=False),
            sa.Column("attempts", sa.Integer(), server_default="0", nullable=False),
            sa.Column("last_error_code", sa.String(64), nullable=True),
            sa.Column("received_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
        )
    _index("payment_webhook_events", "ix_payment_webhook_events_reference", ["reference"])
    _index("payment_webhook_events", "ix_payment_webhook_events_status", ["status"])

    tables = _tables()
    if "manual_payment_methods" not in tables:
        op.create_table(
            "manual_payment_methods",
            sa.Column("payment_method_id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("provider_key", sa.String(32), nullable=False),
            sa.Column("label", sa.String(100), nullable=False),
            sa.Column("account_name", sa.String(120), nullable=False),
            sa.Column("account_identifier", sa.String(160), nullable=False),
            sa.Column("instructions", sa.String(1000), server_default="", nullable=False),
            sa.Column("currency", sa.String(3), server_default="PKR", nullable=False),
            sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
            sa.Column("updated_by_user_id", sa.Integer(), nullable=True),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["updated_by_user_id"], ["users.user_id"], ondelete="SET NULL"),
        )

    tables = _tables()
    if "manual_payment_claims" not in tables:
        op.create_table(
            "manual_payment_claims",
            sa.Column("claim_id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("plan_id", sa.Integer(), nullable=False),
            sa.Column("payment_method_id", sa.Integer(), nullable=False),
            sa.Column("transaction_reference", sa.String(160), nullable=False),
            sa.Column("amount_minor", sa.Integer(), server_default="0", nullable=False),
            sa.Column("currency", sa.String(3), server_default="PKR", nullable=False),
            sa.Column("status", sa.String(20), server_default="pending", nullable=False),
            sa.Column("owner_note", sa.String(500), nullable=True),
            sa.Column("reviewed_by_user_id", sa.Integer(), nullable=True),
            sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("payment_id", sa.Integer(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["users.user_id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["plan_id"], ["subscription_plans.plan_id"], ondelete="RESTRICT"),
            sa.ForeignKeyConstraint(["payment_method_id"], ["manual_payment_methods.payment_method_id"], ondelete="RESTRICT"),
            sa.ForeignKeyConstraint(["reviewed_by_user_id"], ["users.user_id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["payment_id"], ["payment_records.payment_id"], ondelete="SET NULL"),
        )
    else:
        _add_column("manual_payment_claims", sa.Column("amount_minor", sa.Integer(), server_default="0", nullable=False))
        _add_column("manual_payment_claims", sa.Column("currency", sa.String(3), server_default="PKR", nullable=False))
        op.execute(sa.text(
            "UPDATE manual_payment_claims SET amount_minor = "
            "COALESCE((SELECT price_minor FROM subscription_plans "
            "WHERE subscription_plans.plan_id = manual_payment_claims.plan_id), 0) "
            "WHERE amount_minor = 0"
        ))
        op.execute(sa.text(
            "UPDATE manual_payment_claims SET currency = "
            "COALESCE((SELECT currency FROM subscription_plans "
            "WHERE subscription_plans.plan_id = manual_payment_claims.plan_id), 'PKR')"
        ))
    for col in ("user_id", "status", "transaction_reference"):
        _index("manual_payment_claims", f"ix_manual_payment_claims_{col}", [col])
    if "manual_payment_claims" in _tables():
        unique_constraints = {item["name"] for item in sa.inspect(op.get_bind()).get_unique_constraints("manual_payment_claims")}
        if "uq_manual_payment_claim_reference" not in unique_constraints and "uq_manual_payment_claim_reference" not in _indexes("manual_payment_claims"):
            # A unique index works on both PostgreSQL and SQLite legacy tables;
            # SQLite cannot add a table-level unique constraint with ALTER TABLE.
            op.create_index("uq_manual_payment_claim_reference", "manual_payment_claims", ["transaction_reference"], unique=True)

    tables = _tables()
    if "billing_notices" not in tables:
        op.create_table(
            "billing_notices",
            sa.Column("notice_id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("subscription_id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("cycle_key", sa.String(80), nullable=False),
            sa.Column("stage", sa.String(32), nullable=False),
            sa.Column("title", sa.String(140), server_default="Subscription reminder", nullable=False),
            sa.Column("message", sa.String(1000), server_default="", nullable=False),
            sa.Column("email_status", sa.String(20), server_default="pending", nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(["subscription_id"], ["subscriptions.subscription_id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["user_id"], ["users.user_id"], ondelete="CASCADE"),
            sa.UniqueConstraint("subscription_id", "cycle_key", "stage", name="uq_billing_notice_stage"),
        )
    else:
        _add_column("billing_notices", sa.Column("title", sa.String(140), server_default="Subscription reminder", nullable=False))
        _add_column("billing_notices", sa.Column("message", sa.String(1000), server_default="", nullable=False))
        _add_column("billing_notices", sa.Column("read_at", sa.DateTime(timezone=True), nullable=True))
    for col in ("subscription_id", "user_id"):
        _index("billing_notices", f"ix_billing_notices_{col}", [col])
    _index("billing_notices", "ix_billing_notices_stage", ["stage"])

    if "ad_configuration" not in _tables():
        op.create_table(
            "ad_configuration",
            sa.Column("config_id", sa.Integer(), primary_key=True),
            sa.Column("is_enabled", sa.Boolean(), server_default=sa.false(), nullable=False),
            sa.Column("publisher_id", sa.String(40), server_default="", nullable=False),
            sa.Column("landing_slot_id", sa.String(40), server_default="", nullable=False),
            sa.Column("learner_slot_id", sa.String(40), server_default="", nullable=False),
            sa.Column("updated_by_user_id", sa.Integer(), nullable=True),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["updated_by_user_id"], ["users.user_id"], ondelete="SET NULL"),
        )


def downgrade() -> None:
    for table in (
        "ad_configuration", "billing_notices", "manual_payment_claims", "manual_payment_methods",
        "payment_webhook_events", "payment_records", "subscriptions", "plan_features", "subscription_plans",
    ):
        if table in _tables():
            op.drop_table(table)
    if "feature_policies" in _tables():
        columns = _columns("feature_policies")
        if "disabled_until" in columns:
            op.drop_column("feature_policies", "disabled_until")
        if "is_archived" in columns:
            op.drop_column("feature_policies", "is_archived")
        if "description" in columns:
            op.drop_column("feature_policies", "description")
