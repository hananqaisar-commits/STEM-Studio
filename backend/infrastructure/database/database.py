from typing import Generator

import ssl
import time

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.pool import QueuePool

from backend.app.core.config import get_settings

settings = get_settings()

# ─── Engine with Connection Pooling & SSL Support ────────────────────
db_url = settings.DATABASE_URL.lower()
connect_args: dict = {}
engine_kwargs: dict = {
    "echo": settings.DEBUG,
}

if db_url.startswith("sqlite"):
    connect_args["check_same_thread"] = False
else:
    connect_args["connect_timeout"] = 10  # fast fail for MySQL/Postgres

    # Keep a small, bounded pool per process. NullPool caused a new TCP/TLS
    # handshake for every request on hosted Postgres, adding latency and
    # unnecessary pressure to Supabase/Render. Pre-ping and recycling handle
    # stale connections after a host or database has been idle.
    engine_kwargs.update({
        "poolclass": QueuePool,
        "pool_size": settings.DB_POOL_SIZE,
        "max_overflow": settings.DB_MAX_OVERFLOW,
        "pool_pre_ping": True,
        "pool_recycle": settings.DB_POOL_RECYCLE_SECONDS,
        "pool_timeout": settings.DB_POOL_TIMEOUT_SECONDS,
        "pool_use_lifo": True,
    })

    # Configure SSL for remote cloud databases (Aiven / Render / Supabase)
    if "localhost" not in db_url and "127.0.0.1" not in db_url:
        if "mysql" in db_url:
            ssl_ctx = ssl.create_default_context()
            ssl_ctx.check_hostname = False
            ssl_ctx.verify_mode = ssl.CERT_NONE
            connect_args["ssl"] = ssl_ctx
        elif "postgres" in db_url:
            connect_args["sslmode"] = "require"

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    **engine_kwargs,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy declarative models."""
    pass


# ─── Dependency Injection for FastAPI ────────────────────────────────

def get_db() -> Generator[Session, None, None]:
    """
    Yield a database session for each request.
    Automatically closes the session when the request is done.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def verify_connection(retries: int = 3, delay: float = 2.0) -> bool:
    """
    Verify the database connection is alive.  Retries on failure.
    Used during startup to catch cold-start connection issues early.
    """
    for attempt in range(1, retries + 1):
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            return True
        except Exception as exc:
            print(f"⚠️  DB connection attempt {attempt}/{retries} failed: {exc}")
            if attempt < retries:
                time.sleep(delay * attempt)
    return False
