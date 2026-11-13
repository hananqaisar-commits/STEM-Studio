"""Add profile, language, and Octa learning preferences."""

from alembic import op
import sqlalchemy as sa

revision = "20261101_01"
down_revision = "20261021_03"
branch_labels = None
depends_on = None


def _columns() -> set[str]:
    inspector = sa.inspect(op.get_bind())
    if "user_preferences" not in inspector.get_table_names():
        return set()
    return {column["name"] for column in inspector.get_columns("user_preferences")}


def upgrade() -> None:
    columns = _columns()
    if not columns:
        return
    additions = [
        sa.Column("preferred_language", sa.String(length=80), nullable=True),
        sa.Column("display_name", sa.String(length=80), nullable=True),
        sa.Column("avatar_data_url", sa.Text(), nullable=True),
        sa.Column("learning_prompt", sa.Text(), nullable=True),
    ]
    for column in additions:
        if column.name not in columns:
            op.add_column("user_preferences", column)


def downgrade() -> None:
    columns = _columns()
    for name in ("learning_prompt", "avatar_data_url", "display_name", "preferred_language"):
        if name in columns:
            op.drop_column("user_preferences", name)
