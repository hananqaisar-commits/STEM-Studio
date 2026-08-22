from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from backend.app.core.config import get_settings

settings = get_settings()

# ─── Engine with Connection Pooling ──────────────────────────────────
# pool_size: Number of persistent connections kept in the pool
# max_overflow: Extra connections allowed beyond pool_size under load
# pool_pre_ping: Test connections before using them (detects stale/dead connections)
# pool_recycle: Recycle connections after N seconds to avoid MySQL timeout issues

engine = create_engine(
    settings.DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    pool_recycle=3600,
    echo=settings.DEBUG,
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
