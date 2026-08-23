from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from backend.app.core.config import get_settings

settings = get_settings()

# ─── Engine with Connection Pooling & SSL Support ────────────────────
connect_args = {}
if "localhost" not in settings.DATABASE_URL and "127.0.0.1" not in settings.DATABASE_URL:
    connect_args = {"ssl": {"check_hostname": False}}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
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
