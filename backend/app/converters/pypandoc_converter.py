"""Pypandoc converter - Pandoc wrapper for 40+ formats."""

import asyncio
from pathlib import Path
from typing import List

from .base import BaseConverter


class PypandocConverter(BaseConverter):
    """
    Pypandoc converter (Pandoc wrapper).

    Supports 40+ document formats including LaTeX,
    reStructuredText, MediaWiki, and more.
    """

    name = "Pypandoc (Pandoc)"
    description = "Universal document converter supporting 40+ formats including LaTeX, RST, MediaWiki, Org-mode, and more."
    supported_extensions: List[str] = [
        "pdf", "docx", "doc", "odt", "rtf",
        "html", "htm", "xhtml",
        "tex", "latex",
        "rst", "txt",
        "epub", "fb2",
        "mediawiki", "mw",
        "org",
        "textile",
        "json",
        "ipynb"
    ]

    async def convert(self, file_path: Path, output_path: Path) -> str:
        """Convert file using pypandoc."""

        def _convert():
            import pypandoc

            # Ensure pandoc is available
            try:
                pypandoc.get_pandoc_version()
            except OSError:
                pypandoc.download_pandoc()

            # Determine input format
            ext = file_path.suffix.lower().lstrip(".")
            format_map = {
                "tex": "latex",
                "htm": "html",
                "mw": "mediawiki",
            }
            input_format = format_map.get(ext, ext)

            # Convert to markdown
            markdown_content = pypandoc.convert_file(
                str(file_path),
                to="markdown",
                format=input_format,
                extra_args=["--wrap=none"]
            )

            # Save to output file
            output_file = output_path / f"{file_path.stem}.md"
            output_file.write_text(markdown_content, encoding="utf-8")

            return str(output_file)

        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, _convert)
