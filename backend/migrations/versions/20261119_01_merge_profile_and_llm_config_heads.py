"""Merge the profile preferences and per-account LLM config migration heads.

Revision ID: 20261119_01
Revises: 20261101_01, 20261111_01
Create Date: 2026-11-19
"""

revision = "20261119_01"
down_revision = ("20261101_01", "20261111_01")
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Join two independent schema branches; both migrations already ran."""


def downgrade() -> None:
    """Keep the merge reversible without changing either branch's schema."""
