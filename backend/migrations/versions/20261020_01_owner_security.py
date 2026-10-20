"""Add owner MFA credentials, session grants, and audit events.

Revision ID: 20261020_01
Revises:
Create Date: 2026-10-20
"""

from alembic import op
import sqlalchemy as sa

revision = "20261020_01"
down_revision = None
branch_labels = None
depends_on = None


def _tables():
    return set(sa.inspect(op.get_bind()).get_table_names())


def upgrade() -> None:
    tables = _tables()
    if "owner_accounts" not in tables:
        op.create_table(
            "owner_accounts",
            sa.Column("owner_slot", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["users.user_id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("owner_slot"),
            sa.CheckConstraint("owner_slot = 1", name="ck_owner_accounts_singleton_slot"),
            sa.UniqueConstraint("user_id"),
        )
    if "owner_mfa_credentials" not in tables:
        op.create_table(
            "owner_mfa_credentials",
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("encrypted_secret", sa.String(length=512), nullable=False),
            sa.Column("enabled", sa.Boolean(), nullable=False),
            sa.Column("last_used_counter", sa.Integer(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["users.user_id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("user_id"),
        )
    if "owner_session_grants" not in tables:
        op.create_table(
            "owner_session_grants",
            sa.Column("session_id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("mfa_verified_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["session_id"], ["user_sessions.session_id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["user_id"], ["users.user_id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("session_id"),
        )
        op.create_index("ix_owner_session_grants_user_id", "owner_session_grants", ["user_id"])
    if "admin_audit_events" not in tables:
        op.create_table(
            "admin_audit_events",
            sa.Column("event_id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("actor_user_id", sa.Integer(), nullable=True),
            sa.Column("target_user_id", sa.Integer(), nullable=True),
            sa.Column("action", sa.String(length=80), nullable=False),
            sa.Column("outcome", sa.String(length=16), nullable=False),
            sa.Column("details_json", sa.String(length=2000), nullable=False),
            sa.Column("ip_address", sa.String(length=45), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["actor_user_id"], ["users.user_id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["target_user_id"], ["users.user_id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("event_id"),
        )
        op.create_index("ix_admin_audit_events_actor_user_id", "admin_audit_events", ["actor_user_id"])
        op.create_index("ix_admin_audit_events_target_user_id", "admin_audit_events", ["target_user_id"])
        op.create_index("ix_admin_audit_events_action", "admin_audit_events", ["action"])
        op.create_index("ix_admin_audit_events_created_at", "admin_audit_events", ["created_at"])


def downgrade() -> None:
    tables = _tables()
    if "admin_audit_events" in tables:
        op.drop_table("admin_audit_events")
    if "owner_session_grants" in tables:
        op.drop_index("ix_owner_session_grants_user_id", table_name="owner_session_grants")
        op.drop_table("owner_session_grants")
    if "owner_mfa_credentials" in tables:
        op.drop_table("owner_mfa_credentials")
    if "owner_accounts" in tables:
        op.drop_table("owner_accounts")
