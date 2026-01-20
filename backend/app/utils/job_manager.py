"""Conversion job manager."""

import asyncio
import time
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
from concurrent.futures import ThreadPoolExecutor

from ..config import settings
from ..models import ConversionJob, ConversionStatus, FileInfo, ConverterType
from ..converters import get_converter, get_best_converter_for_file


# In-memory job storage (use Redis/DB in production)
jobs: Dict[str, ConversionJob] = {}

# Thread pool for parallel processing
executor = ThreadPoolExecutor(max_workers=settings.max_workers)


async def create_job(
    file_info: dict,
    converter_type: ConverterType,
) -> ConversionJob:
    """Create a new conversion job."""
    job_id = str(uuid.uuid4())

    job = ConversionJob(
        id=job_id,
        file_info=FileInfo(**{k: v for k, v in file_info.items() if k != "path"}),
        converter=converter_type,
        status=ConversionStatus.PENDING,
        created_at=datetime.now(),
    )

    jobs[job_id] = job

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
    job = jobs.get(job_id)
    if not job:
        return

    job.status = ConversionStatus.PROCESSING
    job.progress = 10
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

        # Convert
        output_file = await converter.convert(input_path, output_path)

        job.progress = 90

        # Update job with results
        job.status = ConversionStatus.COMPLETED
        job.completed_at = datetime.now()
        job.output_file = output_file
        job.output_size = Path(output_file).stat().st_size
        job.processing_time = time.time() - start_time
        job.progress = 100

    except Exception as e:
        job.status = ConversionStatus.FAILED
        job.error = str(e)
        job.completed_at = datetime.now()
        job.processing_time = time.time() - start_time


def get_job(job_id: str) -> Optional[ConversionJob]:
    """Get job by ID."""
    return jobs.get(job_id)


def get_all_jobs() -> List[ConversionJob]:
    """Get all jobs sorted by creation time (newest first)."""
    return sorted(jobs.values(), key=lambda j: j.created_at, reverse=True)


def delete_job(job_id: str) -> bool:
    """Delete job and its output file."""
    job = jobs.get(job_id)
    if not job:
        return False

    # Delete output file if exists
    if job.output_file:
        try:
            Path(job.output_file).unlink(missing_ok=True)
        except Exception:
            pass

    del jobs[job_id]
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
