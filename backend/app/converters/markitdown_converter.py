"""Microsoft Markitdown converter - Universal file converter."""

import asyncio
from pathlib import Path
from typing import List, Optional

from .base import BaseConverter


class MarkitdownConverter(BaseConverter):
    """
    Microsoft Markitdown converter.

    Supports: PDF, Word, Excel, PowerPoint, Images (OCR), Audio (transcription),
    HTML, CSV, JSON, XML, ZIP, EPUB, and more.
    """

    name = "Markitdown (Microsoft)"
    description = "Universal converter by Microsoft. Supports PDF, Office docs, images (OCR), audio, HTML, CSV, JSON, XML, and more."
    supported_extensions: List[str] = [
        "pdf", "docx", "doc", "xlsx", "xls", "pptx", "ppt",
        "html", "htm", "csv", "json", "xml",
        "png", "jpg", "jpeg", "gif", "bmp", "webp", "tiff",
        "mp3", "wav", "m4a", "ogg", "flac",
        "zip", "epub", "txt", "md", "rst", "rtf"
    ]
    requires_api_key = False  # Optional for enhanced features

    async def convert(self, file_path: Path, output_path: Path) -> str:
        """Convert file using markitdown."""

        def _convert():
            from markitdown import MarkItDown

            # Initialize with optional LLM for enhanced features
            if self.api_key:
                try:
                    from openai import OpenAI

                    client = OpenAI(
                        api_key=self.api_key,
                        base_url=self.base_url if self.base_url else None,
                    )
                    md = MarkItDown(llm_client=client, llm_model="gpt-4o-mini")
                except Exception:
                    md = MarkItDown()
            else:
                md = MarkItDown()

            result = md.convert(str(file_path))
            markdown_content = result.text_content

            # Save to output file
            output_file = output_path / f"{file_path.stem}.md"
            output_file.write_text(markdown_content, encoding="utf-8")

            return str(output_file)

        # Run in thread pool to avoid blocking
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, _convert)
