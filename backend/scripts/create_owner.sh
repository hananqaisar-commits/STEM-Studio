#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_DIR"

if [[ -x "$PROJECT_DIR/backend/.venv/bin/python" ]]; then
  PYTHON_BIN="$PROJECT_DIR/backend/.venv/bin/python"
else
  PYTHON_BIN="${PYTHON_BIN:-python3}"
fi

"$PYTHON_BIN" -m alembic -c backend/alembic.ini upgrade head
exec "$PYTHON_BIN" -m backend.app.cli create-owner
