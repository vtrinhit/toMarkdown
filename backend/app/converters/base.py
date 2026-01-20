"""Base converter interface."""

from abc import ABC, abstractmethod
from pathlib import Path
from typing import List


class BaseConverter(ABC):
    """Abstract base class for all converters."""

    name: str = "Base Converter"
    description: str = "Base converter interface"
    supported_extensions: List[str] = []

    def __init__(self):
        """Initialize converter."""
        pass

    @abstractmethod
    async def convert(self, file_path: Path, output_path: Path) -> str:
        """
        Convert file to markdown.

        Args:
            file_path: Path to input file
            output_path: Path to save output markdown

        Returns:
            Path to output markdown file
        """
        pass

    def supports_file(self, file_path: Path) -> bool:
        """Check if converter supports this file type."""
        ext = file_path.suffix.lower().lstrip(".")
        return ext in self.supported_extensions or "*" in self.supported_extensions

    @classmethod
    def get_info(cls) -> dict:
        """Get converter information."""
        return {
            "name": cls.name,
            "description": cls.description,
            "supported_extensions": cls.supported_extensions,
        }
