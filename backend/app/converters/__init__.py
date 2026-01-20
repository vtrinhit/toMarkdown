"""Converters package."""

from typing import Dict, Type, Optional, List
from pathlib import Path
import logging

from .base import BaseConverter

logger = logging.getLogger(__name__)

# Registry of available converters
CONVERTERS: Dict[str, Type[BaseConverter]] = {}

# Track which converters are available
AVAILABLE_CONVERTERS: List[str] = []
UNAVAILABLE_CONVERTERS: Dict[str, str] = {}


def _register_converter(name: str, module_name: str, class_name: str):
    """Try to register a converter, handling import errors gracefully."""
    try:
        module = __import__(f"app.converters.{module_name}", fromlist=[class_name])
        converter_class = getattr(module, class_name)
        CONVERTERS[name] = converter_class
        AVAILABLE_CONVERTERS.append(name)
        logger.info(f"Loaded converter: {name}")
    except ImportError as e:
        UNAVAILABLE_CONVERTERS[name] = str(e)
        logger.warning(f"Converter {name} not available: {e}")
    except Exception as e:
        UNAVAILABLE_CONVERTERS[name] = str(e)
        logger.error(f"Error loading converter {name}: {e}")


# Register all converters - order matters for priority
_register_converter("custom", "custom_converter", "CustomConverter")
_register_converter("markitdown", "markitdown_converter", "MarkitdownConverter")
_register_converter("pypandoc", "pypandoc_converter", "PypandocConverter")


def get_converter(converter_type: str) -> BaseConverter:
    """Get converter instance by type."""
    if converter_type not in CONVERTERS:
        available = ", ".join(AVAILABLE_CONVERTERS)
        raise ValueError(
            f"Converter '{converter_type}' not available. "
            f"Available converters: {available}"
        )

    return CONVERTERS[converter_type]()


def get_best_converter_for_file(file_path: Path) -> BaseConverter:
    """
    Get the best converter for a given file based on extension.

    Priority order:
    1. Custom converter for files with images (Excel, PDF, PowerPoint)
    2. Universal converters (markitdown, pypandoc)
    """
    ext = file_path.suffix.lower().lstrip(".")

    # Priority mapping - custom converter prioritized for files with images
    priority = {
        "pdf": ["custom", "markitdown", "pypandoc"],
        "docx": ["markitdown", "pypandoc"],
        "doc": ["markitdown", "pypandoc"],
        "pptx": ["custom", "markitdown"],
        "ppt": ["custom", "markitdown"],
        "xlsx": ["custom", "markitdown"],
        "xls": ["custom", "markitdown"],
        "xlsm": ["custom", "markitdown"],
        "xlsb": ["custom", "markitdown"],
        "html": ["markitdown", "pypandoc"],
        "htm": ["markitdown", "pypandoc"],
        "csv": ["markitdown"],
        "json": ["markitdown", "pypandoc"],
        "xml": ["markitdown"],
        "tex": ["pypandoc"],
        "latex": ["pypandoc"],
        "rst": ["pypandoc"],
        "epub": ["pypandoc", "markitdown"],
        "ipynb": ["pypandoc"],
    }

    # Image formats - markitdown with OCR
    image_exts = ["png", "jpg", "jpeg", "gif", "bmp", "webp", "tiff", "heic"]
    for img_ext in image_exts:
        priority[img_ext] = ["markitdown"]

    # Audio formats - markitdown with transcription
    audio_exts = ["mp3", "wav", "m4a", "ogg", "flac"]
    for audio_ext in audio_exts:
        priority[audio_ext] = ["markitdown"]

    # Get priority list or default to available converters
    converter_priority = priority.get(ext, AVAILABLE_CONVERTERS)

    for converter_name in converter_priority:
        if converter_name not in CONVERTERS:
            continue
        try:
            converter = get_converter(converter_name)
            if converter.supports_file(file_path):
                return converter
        except Exception:
            continue

    # Fallback to first available converter
    if AVAILABLE_CONVERTERS:
        return get_converter(AVAILABLE_CONVERTERS[0])

    raise ValueError("No converters available")


def get_all_converter_info() -> list:
    """Get information about all available converters."""
    return [
        {
            "id": name,
            **converter_class.get_info(),
        }
        for name, converter_class in CONVERTERS.items()
    ]


def get_unavailable_converters() -> Dict[str, str]:
    """Get dict of unavailable converters and their error messages."""
    return UNAVAILABLE_CONVERTERS.copy()


__all__ = [
    "BaseConverter",
    "CONVERTERS",
    "AVAILABLE_CONVERTERS",
    "get_converter",
    "get_best_converter_for_file",
    "get_all_converter_info",
    "get_unavailable_converters",
]
