"""Mammoth converter - Semantic DOCX conversion."""

import asyncio
from pathlib import Path
from typing import List

from .base import BaseConverter


class MammothConverter(BaseConverter):
    """
    Mammoth DOCX converter.

    Focuses on semantic conversion of DOCX files,
    preserving document structure and styles.
    """

    name = "Mammoth"
    description = "Semantic DOCX to Markdown converter focusing on document structure and meaning over formatting."
    supported_extensions: List[str] = ["docx"]
    requires_api_key = False

    async def convert(self, file_path: Path, output_path: Path) -> str:
        """Convert DOCX using mammoth."""

        def _convert():
            import mammoth
            import html2text

            # Convert DOCX to HTML first
            with open(file_path, "rb") as docx_file:
                result = mammoth.convert_to_html(docx_file)
                html_content = result.value

            # Convert HTML to Markdown
            h2t = html2text.HTML2Text()
            h2t.ignore_links = False
            h2t.ignore_images = False
            h2t.ignore_emphasis = False
            h2t.body_width = 0  # No wrapping

            markdown_content = h2t.handle(html_content)

            # Save to output file
            output_file = output_path / f"{file_path.stem}.md"
            output_file.write_text(markdown_content, encoding="utf-8")

            return str(output_file)

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, _convert)
