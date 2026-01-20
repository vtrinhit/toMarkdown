"""HTML2Text converter - Lightweight HTML to Markdown."""

import asyncio
from pathlib import Path
from typing import List

from .base import BaseConverter


class Html2textConverter(BaseConverter):
    """
    HTML2Text converter.

    Lightweight and fast HTML to Markdown conversion.
    """

    name = "HTML2Text"
    description = "Fast and lightweight HTML to Markdown converter."
    supported_extensions: List[str] = ["html", "htm", "xhtml", "xml"]
    requires_api_key = False

    async def convert(self, file_path: Path, output_path: Path) -> str:
        """Convert HTML using html2text."""

        def _convert():
            import html2text

            # Read HTML content
            html_content = file_path.read_text(encoding="utf-8", errors="replace")

            # Convert to markdown
            h2t = html2text.HTML2Text()
            h2t.ignore_links = False
            h2t.ignore_images = False
            h2t.ignore_emphasis = False
            h2t.body_width = 0  # No wrapping
            h2t.unicode_snob = True
            h2t.protect_links = True
            h2t.wrap_links = False

            markdown_content = h2t.handle(html_content)

            # Save to output file
            output_file = output_path / f"{file_path.stem}.md"
            output_file.write_text(markdown_content, encoding="utf-8")

            return str(output_file)

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, _convert)
