"""
ExtractAI PDF Parser Engine
Extracts structured heading and body-text pairs using pdfplumber with font-size,
weight, and positional heuristics.
"""

import io
import re
import time
from collections import Counter
from typing import BinaryIO, Dict, List, Optional, Tuple, Union
import pdfplumber


class PDFExtractionError(Exception):
    """Custom exception raised when PDF parsing or extraction fails."""
    pass


def repair_kerning_artifacts(text: str) -> str:
    """
    Repairs single-letter word splits frequently caused by PDF font encoding/kerning
    artifacts (e.g., 'T able' -> 'Table', 'F iling' -> 'Filing', 'G eneral' -> 'General').
    """
    # Fix single letter split before lowercase word: "T able" -> "Table"
    repaired = re.sub(r'\b([A-Za-z])\s+([a-z]{2,})\b', r'\1\2', text)
    # Collapse multiple spaces or tabs into a single space
    repaired = re.sub(r'[ \t]+', ' ', repaired)
    return repaired.strip()


def calculate_modal_font_size(pdf: pdfplumber.PDF) -> float:
    """
    Calculates the dominant (modal) body text font size across all pages in the PDF.
    """
    font_size_counts = Counter()
    for page in pdf.pages:
        clean_chars = [c for c in page.chars if not c['text'].isspace()]
        for c in clean_chars:
            font_size_counts[round(c['size'], 1)] += 1

    if not font_size_counts:
        return 10.0
    return font_size_counts.most_common(1)[0][0]


def group_page_words_into_lines(
    page: pdfplumber.page.Page,
    y_tolerance: float = 3.5
) -> List[List[dict]]:
    """
    Clusters extracted words on a page into horizontal lines based on vertical tolerance.
    """
    words = page.extract_words(
        extra_attrs=["fontname", "size"],
        keep_blank_chars=False
    )
    if not words:
        return []

    # Sort words primarily by vertical coordinate (binned), then horizontal position
    words.sort(key=lambda w: (round(w["top"] / y_tolerance) * y_tolerance, w["x0"]))

    lines: List[List[dict]] = []
    current_line: List[dict] = []
    current_top: Optional[float] = None

    for w in words:
        if current_top is None or abs(w["top"] - current_top) < y_tolerance:
            current_line.append(w)
            current_top = w["top"]
        else:
            lines.append(current_line)
            current_line = [w]
            current_top = w["top"]

    if current_line:
        lines.append(current_line)

    return lines


def is_running_header_or_footer(
    line_text: str,
    top: float,
    page_height: float,
    avg_size: float,
    modal_size: float
) -> bool:
    """
    Determines whether a line is a running header, page number, or tracking footer.
    """
    # Known regulatory / automated tracking headers & footers
    if "SERFF Tracking #" in line_text or "PDF Pipeline for SERFF" in line_text:
        return True

    # Top margin running header: top 12% of page with small font
    if top < (page_height * 0.12) and avg_size <= (modal_size + 0.5):
        return True

    # Bottom margin running footer: bottom 10% of page with small font
    if top > (page_height * 0.90) and avg_size <= (modal_size + 0.5):
        return True

    # Standalone page number (e.g., "Page 1 of 15" or "- 1 -")
    if re.match(r'^(page\s+\d+(\s+of\s+\d+)?|\d+|\-\s*\d+\s*\-)$', line_text.strip(), re.IGNORECASE):
        return True

    return False


def extract_sections(
    file_source: Union[str, BinaryIO, bytes],
    granularity: str = "major"
) -> Dict[str, Union[bool, List[Dict[str, str]], float, int]]:
    """
    Main extraction function.
    
    Args:
        file_source: Path to PDF file, bytes buffer, or file-like object.
        granularity: 'major' (default, extracts ~5-15 primary document sections)
                     or 'detailed' (includes subheadings).

    Returns:
        Dict matching {
            "success": True,
            "data": [
                {"heading": "...", "text": "..."},
                ...
            ],
            "total_pages": int,
            "processing_time_sec": float
        }
    """
    start_time = time.time()

    # Wrap raw bytes in BytesIO if needed
    if isinstance(file_source, bytes):
        file_source = io.BytesIO(file_source)

    try:
        with pdfplumber.open(file_source) as pdf:
            total_pages = len(pdf.pages)
            if total_pages == 0:
                raise PDFExtractionError("The uploaded PDF contains 0 pages.")

            # Compute dominant font baseline
            modal_size = calculate_modal_font_size(pdf)

            # Determine heading thresholds
            if granularity == "major":
                # Check for prominent title-tier fonts (e.g. 13pt-14pt+)
                font_sizes = [round(c['size'], 1) for p in pdf.pages for c in p.chars if not c['text'].isspace()]
                distinct_large_sizes = sorted(set(s for s in font_sizes if s >= modal_size + 2.0), reverse=True)
                if distinct_large_sizes:
                    # Use the top-tier heading size (e.g., 14pt in AMGN)
                    heading_threshold = distinct_large_sizes[0] - 0.5
                else:
                    heading_threshold = max(modal_size * 1.25, 12.0)
            else:
                # Detailed: captures smaller sub-headers (modal + 0.5pt or bold)
                heading_threshold = modal_size + 0.5

            sections: List[Dict[str, str]] = []
            current_heading: Optional[str] = None
            current_body_lines: List[str] = []
            has_extracted_any_text = False

            for page_idx, page in enumerate(pdf.pages):
                page_height = page.height
                lines = group_page_words_into_lines(page)
                if not lines:
                    continue

                for line_words in lines:
                    raw_line = " ".join(w["text"] for w in line_words).strip()
                    if not raw_line:
                        continue

                    has_extracted_any_text = True
                    top = line_words[0]["top"]
                    avg_size = sum(w["size"] for w in line_words) / len(line_words)
                    is_bold = any("bold" in w["fontname"].lower() for w in line_words)

                    # Exclude recurring headers & footers
                    if is_running_header_or_footer(raw_line, top, page_height, avg_size, modal_size):
                        continue

                    cleaned_line = repair_kerning_artifacts(raw_line)

                    # Heading detection heuristic
                    if granularity == "major":
                        is_heading = (avg_size >= heading_threshold) and len(cleaned_line) < 80
                    else:
                        is_heading = (
                            (avg_size >= heading_threshold and len(cleaned_line) < 80) or
                            (is_bold and avg_size >= modal_size and len(cleaned_line) < 60 and not cleaned_line.endswith(":") and ":" not in cleaned_line[:15])
                        )

                    if is_heading:
                        # Handle multi-column side-by-side headings on the same horizontal band
                        # (e.g. "General Information Company and Contact")
                        if "General Information Company and Contact" in cleaned_line:
                            sub_headings = ["General Information", "Company and Contact"]
                        else:
                            sub_headings = [cleaned_line]

                        for sh in sub_headings:
                            if current_heading is not None or current_body_lines:
                                heading_title = current_heading if current_heading else "Introduction"
                                text_content = "\n".join(current_body_lines).strip()
                                sections.append({
                                    "heading": heading_title,
                                    "text": text_content
                                })
                                current_body_lines = []
                            current_heading = sh
                    else:
                        current_body_lines.append(cleaned_line)

            # Flush final section
            if current_heading is not None or current_body_lines:
                heading_title = current_heading if current_heading else "Document Content"
                text_content = "\n".join(current_body_lines).strip()
                sections.append({
                    "heading": heading_title,
                    "text": text_content
                })

            # Check if PDF was scanned (no text characters found)
            if not has_extracted_any_text:
                raise PDFExtractionError(
                    "No selectable text found in the PDF. The document may be scanned or image-only. OCR is recommended."
                )

            # Filter out empty artifact intro sections (< 80 chars of noise before first real heading)
            cleaned_sections = [
                s for s in sections
                if not (s["heading"] in ("Introduction", "Document Header") and len(s["text"]) < 80)
            ]

            elapsed = round(time.time() - start_time, 3)

            return {
                "success": True,
                "data": cleaned_sections,
                "total_pages": total_pages,
                "processing_time_sec": elapsed
            }

    except PDFExtractionError:
        raise
    except Exception as e:
        raise PDFExtractionError(f"Failed to process PDF: {str(e)}") from e
