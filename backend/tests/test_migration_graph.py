from pathlib import Path

from alembic.config import Config
from alembic.script import ScriptDirectory


def test_alembic_migrations_have_a_single_head():
    repo_root = Path(__file__).resolve().parents[2]
    config = Config(str(repo_root / "backend" / "alembic.ini"))
    scripts = ScriptDirectory.from_config(config)

    assert len(scripts.get_heads()) == 1
    assert scripts.get_current_head() is not None
