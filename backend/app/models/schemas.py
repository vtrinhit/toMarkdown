"""Pydantic schemas for API."""

from datetime import datetime
from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field


class ConverterType(str, Enum):
    """Available converter types."""
    MARKITDOWN = "markitdown"
    PYPANDOC = "pypandoc"
    CUSTOM = "custom"
    AUTO = "auto"


class ConversionStatus(str, Enum):
    """Conversion job status."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class FileInfo(BaseModel):
    """File information."""
    id: str
    name: str
    size: int
    mime_type: str
    extension: str


class ConversionJob(BaseModel):
    """Conversion job information."""
    id: str
    file_info: FileInfo
    converter: ConverterType
    status: ConversionStatus = ConversionStatus.PENDING
    progress: int = 0
    created_at: datetime = Field(default_factory=datetime.now)
    completed_at: Optional[datetime] = None
    output_file: Optional[str] = None
    output_size: Optional[int] = None
    error: Optional[str] = None
    processing_time: Optional[float] = None


class ConversionRequest(BaseModel):
    """Request to convert files."""
    converter: ConverterType = ConverterType.AUTO
    file_ids: List[str]


class ConversionResponse(BaseModel):
    """Response after starting conversion."""
    jobs: List[ConversionJob]


class ConverterInfo(BaseModel):
    """Converter information."""
    id: ConverterType
    name: str
    description: str
    supported_extensions: List[str]


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    version: str = "1.0.0"
