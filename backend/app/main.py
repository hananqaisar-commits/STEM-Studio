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
    """Create tables with retry logic for cold-start connection issues."""
    import time

    try:
        try:
            from backend.infrastructure.database.database import engine, Base, verify_connection
            import backend.infrastructure.database.models  # noqa: F401
        except ModuleNotFoundError:
            from infrastructure.database.database import engine, Base, verify_connection
            import infrastructure.database.models  # noqa: F401

        # Step 1: Verify connection is alive (with retries)
        print("🔌 Verifying database connection...")
        if not verify_connection(retries=3, delay=2.0):
            print("❌ CRITICAL: Cannot connect to database after 3 retries.")
            print("   Check DATABASE_URL in Render environment variables.")
            print("   Current URL host: " + engine.url.host)
            return

        # Step 2: Create tables
        print("📦 Creating database tables...")
        Base.metadata.create_all(bind=engine)

        # Step 3: Verify tables actually exist
        from sqlalchemy import inspect
        inspector = inspect(engine)
        table_names = inspector.get_table_names()
        expected = {"users", "user_sessions", "email_verifications", "password_resets",
                    "roles", "permissions", "user_roles", "role_permissions",
                    "login_attempts", "quiz_attempts", "module_progress",
                    "user_streaks", "saved_sessions"}
        missing = expected - set(table_names)
        if missing:
            print(f"⚠️  Missing tables after create_all: {missing}")
        else:
            print(f"✅ All {len(expected)} tables verified. Database ready.")

        # Step 4: Count users for debugging persistence
        from sqlalchemy import text
        with engine.connect() as conn:
            result = conn.execute(text("SELECT COUNT(*) FROM users"))
            user_count = result.scalar()
            print(f"👥 Current user count: {user_count}")

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
    """Comprehensive database health check — connection, tables, user count."""
    try:
        try:
            from backend.infrastructure.database.database import engine
        except ModuleNotFoundError:
            from infrastructure.database.database import engine
        from sqlalchemy import text, inspect

        # Connection test
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))

        # Table inspection
        inspector = inspect(engine)
        table_names = inspector.get_table_names()

        # User count
        user_count = 0
        if "users" in table_names:
            with engine.connect() as conn:
                user_count = conn.execute(text("SELECT COUNT(*) FROM users")).scalar() or 0

        # Pool info
        pool_info = {
            "pool_class": type(engine.pool).__name__,
            "pool_size": engine.pool.size() if hasattr(engine.pool, "size") else "NullPool",
        }

        return {
            "status": "database_connected",
            "success": True,
            "dialect": engine.dialect.name,
            "host": engine.url.host,
            "database": engine.url.database,
            "tables": table_names,
            "table_count": len(table_names),
            "user_count": user_count,
            "pool": pool_info,
        }
    except Exception as e:
        import traceback
        return {
            "status": "database_error",
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }, 500

