"""Persist per-account Octa provider settings with encrypted API keys."""

from alembic import op
import sqlalchemy as sa


revision = "20261111_01"
down_revision = "20261101_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    if "user_llm_configs" in inspector.get_table_names():
        return
    op.create_table(
        "user_llm_configs",
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("provider", sa.String(length=24), nullable=False, server_default="dashscope"),
        sa.Column("encrypted_api_key", sa.Text(), nullable=True),
        sa.Column("base_url", sa.String(length=1000), nullable=False),
        sa.Column("model_name", sa.String(length=160), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.user_id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id"),
    )


def downgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    if "user_llm_configs" in inspector.get_table_names():
        op.drop_table("user_llm_configs")
