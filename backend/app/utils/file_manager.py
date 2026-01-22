"""File management utilities with file-based persistence."""

import json
import os
import sys
import uuid
import mimetypes
import aiofiles
from pathlib import Path
from typing import Dict, Optional

# File locking - platform specific
if sys.platform != 'win32':
    import fcntl
    HAS_FCNTL = True
else:
    HAS_FCNTL = False

from ..config import settings


# Directory for file metadata storage
FILES_META_DIR = Path(settings.upload_dir) / ".meta"
FILES_META_DIR.mkdir(parents=True, exist_ok=True)


def _file_meta_path(file_id: str) -> Path:
    """Get the metadata file path for an uploaded file."""
    return FILES_META_DIR / f"{file_id}.json"


def _save_file_meta(file_info: dict) -> None:
    """Save file metadata to disk."""
    meta_path = _file_meta_path(file_info["id"])
    with open(meta_path, 'w', encoding='utf-8') as f:
        if HAS_FCNTL:
            try:
                fcntl.flock(f.fileno(), fcntl.LOCK_EX)
                json.dump(file_info, f)
            finally:
                fcntl.flock(f.fileno(), fcntl.LOCK_UN)
        else:
            json.dump(file_info, f)


def _load_file_meta(file_id: str) -> Optional[dict]:
    """Load file metadata from disk."""
    meta_path = _file_meta_path(file_id)
    if not meta_path.exists():
        return None

    try:
        with open(meta_path, 'r', encoding='utf-8') as f:
            if HAS_FCNTL:
                try:
                    fcntl.flock(f.fileno(), fcntl.LOCK_SH)
                    data = json.load(f)
                finally:
                    fcntl.flock(f.fileno(), fcntl.LOCK_UN)
            else:
                data = json.load(f)
        return data
    except (json.JSONDecodeError, KeyError):
        return None


def _delete_file_meta(file_id: str) -> None:
    """Delete file metadata from disk."""
    meta_path = _file_meta_path(file_id)
    try:
        meta_path.unlink(missing_ok=True)
    except Exception:
        pass


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

    # Store metadata to disk
    _save_file_meta(file_info)

    return file_info


def get_file_info(file_id: str) -> Optional[dict]:
    """Get file info by ID."""
    return _load_file_meta(file_id)


def delete_file(file_id: str) -> bool:
    """Delete uploaded file."""
    file_info = _load_file_meta(file_id)
    if not file_info:
        return False

    try:
        # Delete the actual file
        file_path = Path(file_info["path"])
        if file_path.exists():
            os.remove(file_path)
        # Delete metadata
        _delete_file_meta(file_id)
        return True
    except Exception:
        return False


def cleanup_old_files(max_age_seconds: int = 3600):
    """Cleanup files older than max_age_seconds."""
    import time

    current_time = time.time()

    for meta_file in FILES_META_DIR.glob("*.json"):
        file_id = meta_file.stem
        file_info = _load_file_meta(file_id)
        if file_info:
            file_path = Path(file_info["path"])
            if file_path.exists():
                file_age = current_time - file_path.stat().st_mtime
                if file_age > max_age_seconds:
                    delete_file(file_id)
            else:
                # File doesn't exist, clean up metadata
                _delete_file_meta(file_id)


# Keep backward compatibility - this is referenced in convert.py
uploaded_files: Dict[str, dict] = {}
