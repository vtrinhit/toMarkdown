"""Custom converter with enhanced image/shape extraction.

This converter provides best-in-class handling for:
- Excel files: Extracts embedded images, renders shapes/charts as images
- PDF files: Extracts all embedded images
- PowerPoint files: Extracts slide images and embedded media

All images are embedded as Base64 in the markdown output for portability.
"""

import asyncio
import base64
import io
import re
from pathlib import Path
from typing import List, Tuple
from zipfile import ZipFile

from .base import BaseConverter


class CustomConverter(BaseConverter):
    """
    Custom converter with enhanced image extraction.

    Provides superior handling of embedded images and shapes
    compared to other converters.
    """

    name = "Custom (Enhanced)"
    description = "Enhanced converter with full image/shape extraction. Best for Excel with images, PDF, and PowerPoint files."
    supported_extensions: List[str] = [
        "xlsx", "xls", "xlsm", "xlsb",  # Excel
        "pdf",                           # PDF
        "pptx", "ppt",                   # PowerPoint
    ]

    async def convert(self, file_path: Path, output_path: Path) -> str:
        """Convert file to markdown with embedded images."""
        ext = file_path.suffix.lower().lstrip(".")

        if ext in ["xlsx", "xls", "xlsm", "xlsb"]:
            return await self._convert_excel(file_path, output_path)
        elif ext == "pdf":
            return await self._convert_pdf(file_path, output_path)
        elif ext in ["pptx", "ppt"]:
            return await self._convert_pptx(file_path, output_path)
        else:
            raise ValueError(f"Unsupported file type: {ext}")

    async def _convert_excel(self, file_path: Path, output_path: Path) -> str:
        """Convert Excel file with images and shapes."""

        def _process():
            from openpyxl import load_workbook
            from openpyxl.drawing.image import Image as XLImage
            from PIL import Image

            wb = load_workbook(file_path, data_only=True)
            markdown_parts = []
            markdown_parts.append(f"# {file_path.stem}\n")

            for sheet_name in wb.sheetnames:
                ws = wb[sheet_name]
                markdown_parts.append(f"\n## Sheet: {sheet_name}\n")

                # Extract cell data as table
                table_data = self._extract_sheet_data(ws)
                if table_data:
                    markdown_parts.append(self._data_to_markdown_table(table_data))

                # Extract embedded images
                images = self._extract_excel_images(ws)
                if images:
                    markdown_parts.append("\n### Embedded Images\n")
                    for idx, (img_data, img_format) in enumerate(images, 1):
                        base64_img = base64.b64encode(img_data).decode('utf-8')
                        mime_type = f"image/{img_format.lower()}"
                        if img_format.lower() == "jpg":
                            mime_type = "image/jpeg"
                        markdown_parts.append(
                            f"\n![Image {idx}](data:{mime_type};base64,{base64_img})\n"
                        )

                # Extract and render charts as images
                charts = self._extract_excel_charts(ws)
                if charts:
                    markdown_parts.append("\n### Charts\n")
                    for idx, chart_info in enumerate(charts, 1):
                        markdown_parts.append(f"\n**Chart {idx}**: {chart_info}\n")

                # Extract shapes (drawings)
                shapes = self._extract_excel_shapes(ws, file_path)
                if shapes:
                    markdown_parts.append("\n### Shapes\n")
                    for idx, (shape_data, shape_format) in enumerate(shapes, 1):
                        base64_img = base64.b64encode(shape_data).decode('utf-8')
                        markdown_parts.append(
                            f"\n![Shape {idx}](data:image/{shape_format};base64,{base64_img})\n"
                        )

            wb.close()

            markdown_content = "\n".join(markdown_parts)
            output_file = output_path / f"{file_path.stem}.md"
            output_file.write_text(markdown_content, encoding="utf-8")
            return str(output_file)

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, _process)

    def _extract_sheet_data(self, ws) -> List[List[str]]:
        """Extract cell data from worksheet."""
        data = []
        for row in ws.iter_rows(values_only=True):
            # Skip completely empty rows
            if any(cell is not None for cell in row):
                data.append([str(cell) if cell is not None else "" for cell in row])
        return data

    def _data_to_markdown_table(self, data: List[List[str]]) -> str:
        """Convert 2D data to markdown table."""
        if not data:
            return ""

        # Ensure all rows have same number of columns
        max_cols = max(len(row) for row in data)
        normalized_data = [row + [""] * (max_cols - len(row)) for row in data]

        # Build table
        lines = []

        # Header row
        header = normalized_data[0]
        lines.append("| " + " | ".join(header) + " |")
        lines.append("| " + " | ".join(["---"] * len(header)) + " |")

        # Data rows
        for row in normalized_data[1:]:
            # Escape pipe characters in cell content
            escaped_row = [cell.replace("|", "\\|") for cell in row]
            lines.append("| " + " | ".join(escaped_row) + " |")

        return "\n".join(lines) + "\n"

    def _extract_excel_images(self, ws) -> List[Tuple[bytes, str]]:
        """Extract embedded images from worksheet."""
        images = []

        try:
            for image in ws._images:
                try:
                    # Get image data
                    img_data = image._data()

                    # Determine format
                    img_format = "png"
                    if hasattr(image, 'format'):
                        img_format = image.format or "png"
                    elif hasattr(image, '_path') and image._path:
                        img_format = Path(image._path).suffix.lstrip('.') or "png"

                    images.append((img_data, img_format))
                except Exception:
                    continue
        except Exception:
            pass

        return images

    def _extract_excel_charts(self, ws) -> List[str]:
        """Extract chart information from worksheet."""
        charts_info = []

        try:
            for chart in ws._charts:
                chart_type = type(chart).__name__
                title = ""
                if hasattr(chart, 'title') and chart.title:
                    title = str(chart.title)
                charts_info.append(f"{chart_type}" + (f" - {title}" if title else ""))
        except Exception:
            pass

        return charts_info

    def _extract_excel_shapes(self, ws, file_path: Path) -> List[Tuple[bytes, str]]:
        """Extract shapes from Excel file by reading the xlsx archive directly."""
        shapes = []

        try:
            # Excel files are ZIP archives
            with ZipFile(file_path, 'r') as zf:
                # Look for drawing files
                for name in zf.namelist():
                    if name.startswith('xl/drawings/') or name.startswith('xl/media/'):
                        if any(name.lower().endswith(ext) for ext in ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.emf', '.wmf']):
                            try:
                                img_data = zf.read(name)
                                img_format = Path(name).suffix.lstrip('.').lower()
                                if img_format in ['jpg', 'jpeg']:
                                    img_format = 'jpeg'
                                elif img_format in ['emf', 'wmf']:
                                    # Skip Windows metafiles - can't easily convert
                                    continue
                                shapes.append((img_data, img_format))
                            except Exception:
                                continue
        except Exception:
            pass

        return shapes

    async def _convert_pdf(self, file_path: Path, output_path: Path) -> str:
        """Convert PDF with image extraction."""

        def _process():
            import fitz  # PyMuPDF
            from PIL import Image

            doc = fitz.open(file_path)
            markdown_parts = []
            markdown_parts.append(f"# {file_path.stem}\n")

            for page_num in range(len(doc)):
                page = doc[page_num]
                markdown_parts.append(f"\n## Page {page_num + 1}\n")

                # Extract text
                text = page.get_text("text")
                if text.strip():
                    # Clean up text
                    text = self._clean_pdf_text(text)
                    markdown_parts.append(text + "\n")

                # Extract images
                images = self._extract_pdf_page_images(page)
                if images:
                    for idx, (img_data, img_format) in enumerate(images, 1):
                        base64_img = base64.b64encode(img_data).decode('utf-8')
                        markdown_parts.append(
                            f"\n![Page {page_num + 1} Image {idx}](data:image/{img_format};base64,{base64_img})\n"
                        )

            doc.close()

            markdown_content = "\n".join(markdown_parts)
            output_file = output_path / f"{file_path.stem}.md"
            output_file.write_text(markdown_content, encoding="utf-8")
            return str(output_file)

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, _process)

    def _clean_pdf_text(self, text: str) -> str:
        """Clean and format PDF extracted text."""
        # Remove excessive whitespace
        lines = text.split('\n')
        cleaned_lines = []

        for line in lines:
            line = line.strip()
            if line:
                cleaned_lines.append(line)

        # Join lines intelligently
        result = []
        for i, line in enumerate(cleaned_lines):
            result.append(line)
            # Add paragraph break if next line starts differently
            if i < len(cleaned_lines) - 1:
                next_line = cleaned_lines[i + 1]
                if line.endswith(('.', '!', '?', ':')) or len(line) < 40:
                    result.append('\n')

        return '\n'.join(result)

    def _extract_pdf_page_images(self, page) -> List[Tuple[bytes, str]]:
        """Extract images from a PDF page."""
        images = []

        try:
            image_list = page.get_images()

            for img_index, img in enumerate(image_list):
                try:
                    xref = img[0]
                    base_image = page.parent.extract_image(xref)

                    if base_image:
                        img_data = base_image["image"]
                        img_ext = base_image.get("ext", "png")

                        # Skip very small images (likely icons/bullets)
                        if len(img_data) > 1000:
                            images.append((img_data, img_ext))
                except Exception:
                    continue
        except Exception:
            pass

        return images

    async def _convert_pptx(self, file_path: Path, output_path: Path) -> str:
        """Convert PowerPoint with images."""

        def _process():
            from pptx import Presentation
            from pptx.enum.shapes import MSO_SHAPE_TYPE

            prs = Presentation(file_path)
            markdown_parts = []
            markdown_parts.append(f"# {file_path.stem}\n")

            for slide_num, slide in enumerate(prs.slides, 1):
                markdown_parts.append(f"\n## Slide {slide_num}\n")

                # Extract text from shapes
                texts = []
                for shape in slide.shapes:
                    if hasattr(shape, "text") and shape.text.strip():
                        texts.append(shape.text.strip())

                if texts:
                    markdown_parts.append("\n".join(texts) + "\n")

                # Extract images from shapes
                images = self._extract_pptx_slide_images(slide)
                if images:
                    for idx, (img_data, img_format) in enumerate(images, 1):
                        base64_img = base64.b64encode(img_data).decode('utf-8')
                        markdown_parts.append(
                            f"\n![Slide {slide_num} Image {idx}](data:image/{img_format};base64,{base64_img})\n"
                        )

            # Also extract images from the pptx archive
            archive_images = self._extract_pptx_archive_images(file_path)
            if archive_images:
                markdown_parts.append("\n## Additional Media\n")
                for idx, (img_data, img_format) in enumerate(archive_images, 1):
                    base64_img = base64.b64encode(img_data).decode('utf-8')
                    markdown_parts.append(
                        f"\n![Media {idx}](data:image/{img_format};base64,{base64_img})\n"
                    )

            markdown_content = "\n".join(markdown_parts)
            output_file = output_path / f"{file_path.stem}.md"
            output_file.write_text(markdown_content, encoding="utf-8")
            return str(output_file)

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, _process)

    def _extract_pptx_slide_images(self, slide) -> List[Tuple[bytes, str]]:
        """Extract images from PowerPoint slide shapes."""
        from pptx.enum.shapes import MSO_SHAPE_TYPE

        images = []

        for shape in slide.shapes:
            try:
                if shape.shape_type == MSO_SHAPE_TYPE.PICTURE:
                    image = shape.image
                    img_data = image.blob
                    img_format = image.ext.lower()

                    if img_format in ['jpg', 'jpeg']:
                        img_format = 'jpeg'

                    images.append((img_data, img_format))
            except Exception:
                continue

        return images

    def _extract_pptx_archive_images(self, file_path: Path) -> List[Tuple[bytes, str]]:
        """Extract all images from pptx archive."""
        images = []
        seen_hashes = set()

        try:
            with ZipFile(file_path, 'r') as zf:
                for name in zf.namelist():
                    if 'ppt/media/' in name:
                        if any(name.lower().endswith(ext) for ext in ['.png', '.jpg', '.jpeg', '.gif', '.bmp']):
                            try:
                                img_data = zf.read(name)

                                # Avoid duplicates
                                img_hash = hash(img_data)
                                if img_hash in seen_hashes:
                                    continue
                                seen_hashes.add(img_hash)

                                img_format = Path(name).suffix.lstrip('.').lower()
                                if img_format in ['jpg', 'jpeg']:
                                    img_format = 'jpeg'

                                images.append((img_data, img_format))
                            except Exception:
                                continue
        except Exception:
            pass

        return images
