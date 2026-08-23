import os
import sys

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

try:
    from backend.app.api.routes.auth import router as auth_router
    from backend.app.core.config import get_settings
except ModuleNotFoundError:
    from app.api.routes.auth import router as auth_router
    from app.core.config import get_settings


settings = get_settings()

app = FastAPI(
    title=settings.APP_NAME,
    description="STEM Studio - Interactive Algorithm Visualization Platform",
    version="1.0.0",
)

from backend.infrastructure.database.database import Base, engine
import backend.infrastructure.database.models # Keep models imported

# ─── CORS Middleware ─────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Auto-create database tables ─────────────────────────────────────
def init_db_tables():
    try:
        try:
            from backend.infrastructure.database.database import engine, Base
            import backend.infrastructure.database.models  # noqa: F401
        except ModuleNotFoundError:
            from infrastructure.database.database import engine, Base
            import infrastructure.database.models  # noqa: F401
        Base.metadata.create_all(bind=engine)
        print("✅ Database tables created/verified successfully! Production deployment ready.")
    except Exception as e:
        print(f"⚠️ Table creation notice: {e}")

# Create tables immediately on module import
init_db_tables()

@app.on_event("startup")
def on_startup():
    init_db_tables()



# ─── Register Routers ───────────────────────────────────────────────
app.include_router(auth_router)


# ─── Health & DB Check ───────────────────────────────────────────────
@app.get("/api/health", tags=["Health"])
def health_check():
    return {"status": "healthy", "service": settings.APP_NAME}


@app.get("/api/db-check", tags=["Health"])
def db_check():
    try:
        try:
            from backend.infrastructure.database.database import engine
        except ModuleNotFoundError:
            from infrastructure.database.database import engine
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "database_connected", "success": True}
    except Exception as e:
        return {"status": "database_error", "error": str(e)}, 500

