import os
import sys
from contextlib import asynccontextmanager

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

try:
    from backend.app.api.routes.auth import router as auth_router
    from backend.app.api.routes.progress import router as progress_router
    from backend.app.core.config import get_settings
except ModuleNotFoundError:
    from app.api.routes.auth import router as auth_router
    from app.api.routes.progress import router as progress_router
    from app.core.config import get_settings


settings = get_settings()


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
        import traceback
        print(f"❌ CRITICAL DATABASE ERROR during table creation:\n{traceback.format_exc()}")


@asynccontextmanager
async def lifespan(application):
    """Application lifespan handler — runs startup logic."""
    init_db_tables()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    description="STEM Studio - Interactive Algorithm Visualization Platform",
    version="1.0.0",
    lifespan=lifespan,
)

# ─── CORS Middleware ─────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Register Routers ───────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(progress_router)



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
        return {
            "status": "database_connected",
            "success": True,
            "dialect": engine.dialect.name
        }
    except Exception as e:
        import traceback
        return {
            "status": "database_error",
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }, 500

