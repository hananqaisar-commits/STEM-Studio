import os
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

# Load from environment variable, NEVER hardcoded!
# Example format in .env: DATABASE_URL="mysql+pymysql://user:password@localhost/stem_studio"
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./fallback.db")

engine = create_engine(DATABASE_URL, echo=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    """Base class for all SQLAlchemy declarative models."""
    pass
