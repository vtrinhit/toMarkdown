"""FastAPI main application."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from .config import settings
from .routers import convert_router, settings_router
from .models import HealthResponse


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup
    print(f"Starting {settings.app_name}")
    print(f"Upload directory: {settings.upload_dir}")
    print(f"Output directory: {settings.output_dir}")

    yield

    # Shutdown
    print("Shutting down...")


app = FastAPI(
    title=settings.app_name,
    description="Convert any file to Markdown using multiple conversion libraries",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(convert_router)
app.include_router(settings_router)


@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse(status="healthy", version="1.0.0")


@app.get("/api")
async def api_info():
    """API information."""
    return {
        "name": settings.app_name,
        "version": "1.0.0",
        "endpoints": {
            "health": "/api/health",
            "converters": "/api/convert/converters",
            "upload": "/api/convert/upload",
            "start": "/api/convert/start",
            "jobs": "/api/convert/jobs",
            "settings": "/api/settings",
        },
    }


# Serve static files (frontend) in production
frontend_path = Path(__file__).parent.parent.parent / "frontend" / "dist"
if frontend_path.exists():
    app.mount("/", StaticFiles(directory=str(frontend_path), html=True), name="frontend")
