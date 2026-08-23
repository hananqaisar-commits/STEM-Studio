from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api.routes.auth import router as auth_router
from backend.app.api.routes.progress import router as progress_router
from backend.app.core.config import get_settings

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

# ─── Register Routers ───────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(progress_router)


# ─── Health Check ────────────────────────────────────────────────────
@app.get("/api/health", tags=["Health"])
def health_check():
    return {"status": "healthy", "service": settings.APP_NAME}
