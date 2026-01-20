"""Settings API router."""

from fastapi import APIRouter

from ..models import SettingsUpdate, SettingsResponse
from ..config import settings


router = APIRouter(prefix="/api/settings", tags=["settings"])

# Runtime settings storage
runtime_settings = {
    "openai_api_key": settings.openai_api_key,
    "openai_base_url": settings.openai_base_url,
}


@router.get("", response_model=SettingsResponse)
async def get_settings():
    """Get current settings."""
    return SettingsResponse(
        openai_api_key_set=bool(runtime_settings.get("openai_api_key")),
        openai_base_url=runtime_settings.get("openai_base_url"),
    )


@router.put("")
async def update_settings(update: SettingsUpdate):
    """Update settings."""
    if update.openai_api_key is not None:
        runtime_settings["openai_api_key"] = update.openai_api_key
        settings.openai_api_key = update.openai_api_key

    if update.openai_base_url is not None:
        runtime_settings["openai_base_url"] = update.openai_base_url
        settings.openai_base_url = update.openai_base_url

    return SettingsResponse(
        openai_api_key_set=bool(runtime_settings.get("openai_api_key")),
        openai_base_url=runtime_settings.get("openai_base_url"),
    )


@router.delete("/api-key")
async def clear_api_key():
    """Clear OpenAI API key."""
    runtime_settings["openai_api_key"] = None
    settings.openai_api_key = None

    return {"status": "cleared"}
