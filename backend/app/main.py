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

# ─── CORS Middleware ─────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Auto-create database tables on startup ─────────────────────────
@app.on_event("startup")
def on_startup():
    try:
        from backend.infrastructure.database.database import engine, Base
        import backend.infrastructure.database.models  # noqa: F401
    except ModuleNotFoundError:
        from infrastructure.database.database import engine, Base
        import infrastructure.database.models  # noqa: F401
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created/verified successfully!")

# ─── Register Routers ───────────────────────────────────────────────
app.include_router(auth_router)


# ─── Health Check ────────────────────────────────────────────────────
@app.get("/api/health", tags=["Health"])
def health_check():
    return {"status": "healthy", "service": settings.APP_NAME}
