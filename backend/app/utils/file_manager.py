"""File management utilities."""

import os
import uuid
import mimetypes
import aiofiles
from pathlib import Path
from typing import Dict, Optional

from ..config import settings


# In-memory storage for uploaded files (use Redis/DB in production)
uploaded_files: Dict[str, dict] = {}


def get_mime_type(file_path: Path) -> str:
    """Get MIME type of file."""
    mime_type, _ = mimetypes.guess_type(str(file_path))
    return mime_type or "application/octet-stream"


def get_extension(filename: str) -> str:
    """Get file extension."""
    return Path(filename).suffix.lower().lstrip(".")


async def save_upload_file(file_content: bytes, filename: str) -> dict:
    """
    Save uploaded file and return file info.

    Returns:
        dict with file_id, name, size, mime_type, extension, path
    """
    file_id = str(uuid.uuid4())
    extension = get_extension(filename)

    # Create unique filename
    safe_filename = f"{file_id}_{filename}"
    file_path = Path(settings.upload_dir) / safe_filename

    # Save file
    async with aiofiles.open(file_path, "wb") as f:
        await f.write(file_content)

    # Get file info
    file_info = {
        "id": file_id,
        "name": filename,
        "size": len(file_content),
        "mime_type": get_mime_type(file_path),
        "extension": extension,
        "path": str(file_path),
    }

    # Store in memory
    uploaded_files[file_id] = file_info

    return file_info


def get_file_info(file_id: str) -> Optional[dict]:
    """Get file info by ID."""
    return uploaded_files.get(file_id)


def delete_file(file_id: str) -> bool:
    """Delete uploaded file."""
    file_info = uploaded_files.get(file_id)
    if not file_info:
        return False

    try:
        os.remove(file_info["path"])
        del uploaded_files[file_id]
        return True
    except Exception:
        return False


def cleanup_old_files(max_age_seconds: int = 3600):
    """Cleanup files older than max_age_seconds."""
    import time

    current_time = time.time()

    for file_id, info in list(uploaded_files.items()):
        file_path = Path(info["path"])
        if file_path.exists():
            file_age = current_time - file_path.stat().st_mtime
            if file_age > max_age_seconds:
                delete_file(file_id)
