"""Converters package."""

from typing import Dict, Type, Optional
from pathlib import Path

from .base import BaseConverter
from .markitdown_converter import MarkitdownConverter
from .docling_converter import DoclingConverter
from .marker_converter import MarkerConverter
from .pypandoc_converter import PypandocConverter
from .unstructured_converter import UnstructuredConverter
from .mammoth_converter import MammothConverter
from .html2text_converter import Html2textConverter


# Registry of all converters
CONVERTERS: Dict[str, Type[BaseConverter]] = {
    "markitdown": MarkitdownConverter,
    "docling": DoclingConverter,
    "marker": MarkerConverter,
    "pypandoc": PypandocConverter,
    "unstructured": UnstructuredConverter,
    "mammoth": MammothConverter,
    "html2text": Html2textConverter,
}


def get_converter(
    converter_type: str,
    api_key: Optional[str] = None,
    base_url: Optional[str] = None,
) -> BaseConverter:
    """Get converter instance by type."""
    if converter_type not in CONVERTERS:
        raise ValueError(f"Unknown converter type: {converter_type}")

    return CONVERTERS[converter_type](api_key=api_key, base_url=base_url)


def get_best_converter_for_file(
    file_path: Path,
    api_key: Optional[str] = None,
    base_url: Optional[str] = None,
) -> BaseConverter:
    """
    Get the best converter for a given file based on extension.

    Priority order:
    1. File-specific converters (marker for PDF, mammoth for DOCX)
    2. Universal converters (markitdown, docling)
    """
    ext = file_path.suffix.lower().lstrip(".")

    # Priority mapping
    priority = {
        "pdf": ["marker", "docling", "markitdown", "pypandoc", "unstructured"],
        "docx": ["mammoth", "markitdown", "docling", "pypandoc", "unstructured"],
        "doc": ["markitdown", "pypandoc", "unstructured"],
        "pptx": ["docling", "markitdown", "unstructured"],
        "ppt": ["markitdown", "unstructured"],
        "xlsx": ["docling", "markitdown", "unstructured"],
        "xls": ["markitdown", "unstructured"],
        "html": ["html2text", "markitdown", "pypandoc", "unstructured"],
        "htm": ["html2text", "markitdown", "pypandoc", "unstructured"],
        "csv": ["markitdown", "unstructured"],
        "json": ["markitdown", "pypandoc"],
        "xml": ["markitdown", "html2text", "unstructured"],
        "tex": ["pypandoc"],
        "latex": ["pypandoc"],
        "rst": ["pypandoc", "unstructured"],
        "epub": ["pypandoc", "markitdown"],
        "ipynb": ["pypandoc"],
    }

    # Image formats - markitdown with OCR
    image_exts = ["png", "jpg", "jpeg", "gif", "bmp", "webp", "tiff", "heic"]
    for img_ext in image_exts:
        priority[img_ext] = ["markitdown", "docling", "unstructured"]

    # Audio formats - markitdown with transcription
    audio_exts = ["mp3", "wav", "m4a", "ogg", "flac"]
    for audio_ext in audio_exts:
        priority[audio_ext] = ["markitdown"]

    # Get priority list or default to markitdown
    converter_priority = priority.get(ext, ["markitdown", "unstructured", "pypandoc"])

    for converter_name in converter_priority:
        try:
            converter = get_converter(converter_name, api_key, base_url)
            if converter.supports_file(file_path):
                return converter
        except Exception:
            continue

    # Fallback to markitdown
    return get_converter("markitdown", api_key, base_url)


def get_all_converter_info() -> list:
    """Get information about all available converters."""
    return [
        {
            "id": name,
            **converter_class.get_info(),
        }
        for name, converter_class in CONVERTERS.items()
    ]


__all__ = [
    "BaseConverter",
    "MarkitdownConverter",
    "DoclingConverter",
    "MarkerConverter",
    "PypandocConverter",
    "UnstructuredConverter",
    "MammothConverter",
    "Html2textConverter",
    "CONVERTERS",
    "get_converter",
    "get_best_converter_for_file",
    "get_all_converter_info",
]
