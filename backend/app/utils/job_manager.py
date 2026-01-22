"""Conversion job manager with file-based persistence."""

import asyncio
import json
import time
import uuid
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
from concurrent.futures import ThreadPoolExecutor

# File locking - platform specific
if sys.platform != 'win32':
    import fcntl
    HAS_FCNTL = True
else:
    HAS_FCNTL = False

from ..config import settings
from ..models import ConversionJob, ConversionStatus, FileInfo, ConverterType


# Directory for job storage
JOBS_DIR = Path(settings.output_dir) / ".jobs"
JOBS_DIR.mkdir(parents=True, exist_ok=True)

# Thread pool for parallel processing
executor = ThreadPoolExecutor(max_workers=settings.max_workers)


def _job_file_path(job_id: str) -> Path:
    """Get the file path for a job."""
    return JOBS_DIR / f"{job_id}.json"


def _job_to_dict(job: ConversionJob) -> dict:
    """Convert job to dictionary for JSON serialization."""
    return {
        "id": job.id,
        "file_info": {
            "id": job.file_info.id,
            "name": job.file_info.name,
            "size": job.file_info.size,
            "mime_type": job.file_info.mime_type,
            "extension": job.file_info.extension,
        },
        "converter": job.converter.value if isinstance(job.converter, ConverterType) else job.converter,
        "status": job.status.value if isinstance(job.status, ConversionStatus) else job.status,
        "created_at": job.created_at.isoformat() if job.created_at else None,
        "completed_at": job.completed_at.isoformat() if job.completed_at else None,
        "output_file": job.output_file,
        "output_size": job.output_size,
        "error": job.error,
        "progress": job.progress,
        "processing_time": job.processing_time,
    }


def _dict_to_job(data: dict) -> ConversionJob:
    """Convert dictionary to ConversionJob."""
    # Handle backward compatibility for file_info field name changes
    file_info_data = data["file_info"].copy()
    # Handle 'type' -> 'mime_type' migration
    if "type" in file_info_data and "mime_type" not in file_info_data:
        file_info_data["mime_type"] = file_info_data.pop("type")
    # Ensure extension field exists
    if "extension" not in file_info_data:
        file_info_data["extension"] = ""

    return ConversionJob(
        id=data["id"],
        file_info=FileInfo(**file_info_data),
        converter=ConverterType(data["converter"]),
        status=ConversionStatus(data["status"]),
        created_at=datetime.fromisoformat(data["created_at"]) if data.get("created_at") else None,
        completed_at=datetime.fromisoformat(data["completed_at"]) if data.get("completed_at") else None,
        output_file=data.get("output_file"),
        output_size=data.get("output_size"),
        error=data.get("error"),
        progress=data.get("progress", 0),
        processing_time=data.get("processing_time"),
    )


def _save_job(job: ConversionJob) -> None:
    """Save job to file with file locking."""
    job_path = _job_file_path(job.id)
    job_data = _job_to_dict(job)

    # Write with file locking for concurrency safety
    with open(job_path, 'w', encoding='utf-8') as f:
        if HAS_FCNTL:
            try:
                fcntl.flock(f.fileno(), fcntl.LOCK_EX)
                json.dump(job_data, f)
            finally:
                fcntl.flock(f.fileno(), fcntl.LOCK_UN)
        else:
            json.dump(job_data, f)


def _load_job(job_id: str) -> Optional[ConversionJob]:
    """Load job from file."""
    job_path = _job_file_path(job_id)
    if not job_path.exists():
        return None

    try:
        with open(job_path, 'r', encoding='utf-8') as f:
            if HAS_FCNTL:
                try:
                    fcntl.flock(f.fileno(), fcntl.LOCK_SH)
                    data = json.load(f)
                finally:
                    fcntl.flock(f.fileno(), fcntl.LOCK_UN)
            else:
                data = json.load(f)
        return _dict_to_job(data)
    except (json.JSONDecodeError, KeyError, ValueError):
        return None


async def create_job(
    file_info: dict,
    converter_type: ConverterType,
) -> ConversionJob:
    """Create a new conversion job."""
    job_id = str(uuid.uuid4())

    # Prepare file_info dict for FileInfo model
    file_info_clean = {k: v for k, v in file_info.items() if k != "path"}
    # Handle 'type' -> 'mime_type' for backward compatibility
    if "type" in file_info_clean and "mime_type" not in file_info_clean:
        file_info_clean["mime_type"] = file_info_clean.pop("type")

    job = ConversionJob(
        id=job_id,
        file_info=FileInfo(**file_info_clean),
        converter=converter_type,
        status=ConversionStatus.PENDING,
        created_at=datetime.now(),
    )

    _save_job(job)

    # Start conversion in background
    asyncio.create_task(
        process_job(job_id, file_info["path"], converter_type)
    )

    return job


async def process_job(
    job_id: str,
    file_path: str,
    converter_type: ConverterType,
):
    """Process a conversion job."""
    from ..converters import get_converter, get_best_converter_for_file

    job = _load_job(job_id)
    if not job:
        return

    job.status = ConversionStatus.PROCESSING
    job.progress = 10
    _save_job(job)

    start_time = time.time()

    try:
        input_path = Path(file_path)
        output_path = Path(settings.output_dir)

        # Get converter
        if converter_type == ConverterType.AUTO:
            converter = get_best_converter_for_file(input_path)
            # Try to get converter name for display
            converter_name = getattr(converter, 'name', '').lower().replace(' ', '_').replace('(', '').replace(')', '')
            if 'custom' in converter_name:
                job.converter = ConverterType.CUSTOM
            elif 'markitdown' in converter_name:
                job.converter = ConverterType.MARKITDOWN
            elif 'pypandoc' in converter_name:
                job.converter = ConverterType.PYPANDOC
        else:
            converter = get_converter(converter_type.value)

        job.progress = 30
        _save_job(job)

        # Convert
        output_file = await converter.convert(input_path, output_path)

        job.progress = 90
        _save_job(job)

        # Update job with results
        job.status = ConversionStatus.COMPLETED
        job.completed_at = datetime.now()
        job.output_file = output_file
        job.output_size = Path(output_file).stat().st_size
        job.processing_time = time.time() - start_time
        job.progress = 100
        _save_job(job)

    except Exception as e:
        job.status = ConversionStatus.FAILED
        job.error = str(e)
        job.completed_at = datetime.now()
        job.processing_time = time.time() - start_time
        _save_job(job)


def get_job(job_id: str) -> Optional[ConversionJob]:
    """Get job by ID."""
    return _load_job(job_id)


def get_all_jobs() -> List[ConversionJob]:
    """Get all jobs sorted by creation time (newest first)."""
    jobs = []

    for job_file in JOBS_DIR.glob("*.json"):
        job_id = job_file.stem
        job = _load_job(job_id)
        if job:
            jobs.append(job)

    return sorted(jobs, key=lambda j: j.created_at or datetime.min, reverse=True)


def delete_job(job_id: str) -> bool:
    """Delete job and its output file."""
    job = _load_job(job_id)
    if not job:
        return False

    # Delete output file if exists
    if job.output_file:
        try:
            Path(job.output_file).unlink(missing_ok=True)
        except Exception:
            pass

    # Delete job file
    job_path = _job_file_path(job_id)
    try:
        job_path.unlink(missing_ok=True)
    except Exception:
        pass

    return True


async def process_multiple_jobs(
    file_infos: List[dict],
    converter_type: ConverterType,
) -> List[ConversionJob]:
    """Create and process multiple jobs concurrently."""
    created_jobs = []

    for file_info in file_infos:
        job = await create_job(file_info, converter_type)
        created_jobs.append(job)

    return created_jobs
