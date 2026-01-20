"""Application configuration."""

import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""

    # App settings
    app_name: str = "toMD - File to Markdown Converter"
    debug: bool = False

    # Upload settings
    max_upload_size: int = 100 * 1024 * 1024  # 100MB
    upload_dir: str = "/tmp/tomd_uploads"
    output_dir: str = "/tmp/tomd_outputs"

    # Worker settings
    max_workers: int = 4

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()

# Ensure directories exist
os.makedirs(settings.upload_dir, exist_ok=True)
os.makedirs(settings.output_dir, exist_ok=True)
