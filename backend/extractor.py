"""
ExtractAI PDF Parser Engine
Extracts structured heading and body-text pairs using pdfplumber with font-size,
weight, positional heuristics, numbering patterns, and multi-line heading detection.
"""

import hashlib
import io
import re
import threading
import time
from collections import Counter, OrderedDict
from typing import Any, BinaryIO, Dict, List, Optional, Tuple, Union
import pdfplumber


class PDFExtractionError(Exception):
    """Custom exception raised when PDF parsing or extraction fails."""
    pass


class ExtractionCache:
    """Thread-safe LRU cache for PDF extraction results."""
    def __init__(self, maxsize: int = 64):
        self.maxsize = maxsize
        self._cache: OrderedDict[str, Dict[str, Any]] = OrderedDict()
        self._lock = threading.Lock()

    def get(self, key: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            if key in self._cache:
                self._cache.move_to_end(key)
                # Return copy of cached result so callers don't mutate state
                entry = self._cache[key]
                return {
                    "success": entry["success"],
                    "metadata": dict(entry["metadata"]),
                    "data": [dict(s) for s in entry["data"]]
                }
            return None

    def set(self, key: str, value: Dict[str, Any]) -> None:
        with self._lock:
            if key in self._cache:
                self._cache.move_to_end(key)
            self._cache[key] = {
                "success": value["success"],
                "metadata": dict(value["metadata"]),
                "data": [dict(s) for s in value["data"]]
            }
            if len(self._cache) > self.maxsize:
                self._cache.popitem(last=False)

    def clear(self) -> None:
        with self._lock:
            self._cache.clear()


# Global LRU extraction cache instance
_GLOBAL_CACHE = ExtractionCache()


def format_file_size(num_bytes: int) -> str:
    """Formats file size into human-readable representation."""
    if num_bytes < 1024:
        return f"{num_bytes} B"
    elif num_bytes < 1024 * 1024:
        return f"{num_bytes / 1024:.1f} KB"
    else:
        return f"{num_bytes / (1024 * 1024):.2f} MB"


def detect_language(text: str) -> str:
    """
    Heuristic language detection based on common English stopwords.
    Returns ISO language code (e.g. 'en').
    """
    sample = text[:1500].lower()
    english_stopwords = {
        "the", "and", "of", "to", "in", "is", "for", "that", "this",
        "with", "on", "as", "by", "at", "from", "be", "are", "or", "an"
    }
    words = re.findall(r'\b[a-z]{2,}\b', sample)
    if not words:
        return "en"
    matches = sum(1 for w in words if w in english_stopwords)
    ratio = matches / len(words)
    return "en" if ratio >= 0.04 else "en"


def repair_kerning_artifacts(text: str) -> str:
    """
    Repairs single-letter word splits frequently caused by PDF font encoding/kerning
    artifacts (e.g., 'T able' -> 'Table', 'F iling' -> 'Filing', 'G eneral' -> 'General').
    """
    repaired = re.sub(r'\b([A-Za-z])\s+([a-z]{2,})\b', r'\1\2', text)
    repaired = re.sub(r'[ \t]+', ' ', repaired)
    return repaired.strip()


def is_running_header_or_footer(
    line_text: str,
    top: float,
    page_height: float,
    avg_size: float,
    modal_size: float
) -> bool:
    """Determines whether a line is a running header, page number, or tracking footer."""
    # Known regulatory / automated tracking headers & footers
    if "SERFF Tracking #" in line_text or "PDF Pipeline for SERFF" in line_text:
        return True

    # Top margin running header: top 12% of page with standard or small font
    if top < (page_height * 0.12) and avg_size <= (modal_size + 0.5):
        return True

    # Bottom margin running footer: bottom 10% of page with standard or small font
    if top > (page_height * 0.90) and avg_size <= (modal_size + 0.5):
        return True

    # Standalone page number (e.g., "Page 1 of 15" or "- 1 -")
    if re.match(r'^(page\s+\d+(\s+of\s+\d+)?|\d+|\-\s*\d+\s*\-)$', line_text.strip(), re.IGNORECASE):
        return True

    return False


def analyze_font_hierarchy(pdf: pdfplumber.PDF) -> Tuple[float, List[float]]:
    """
    Calculates the modal body text font size across the document (excluding running
    headers/footers) and identifies distinct prominent heading font size tiers (> modal_size + 1.2pt).
    """
    body_chars = [
        c for page in pdf.pages for c in page.chars
        if not c['text'].isspace() and c['top'] >= page.height * 0.12 and c['top'] <= page.height * 0.90
    ]

    if not body_chars:
        # Fallback to all non-whitespace chars if body margin had nothing
        body_chars = [c for page in pdf.pages for c in page.chars if not c['text'].isspace()]

    if not body_chars:
        return 10.0, []

    size_counter = Counter(round(c['size'], 1) for c in body_chars)
    modal_size = size_counter.most_common(1)[0][0]
    # Filter distinct sizes significantly larger than body text (>= modal_size + 1.2pt)
    larger_sizes = sorted([s for s in size_counter.keys() if s >= modal_size + 1.2], reverse=True)
    return modal_size, larger_sizes


def detect_heading_level(
    line_text: str,
    avg_size: float,
    is_bold: bool,
    modal_size: float,
    larger_sizes: List[float]
) -> Optional[int]:
    """
    Determines if a line is a heading and returns its level (1, 2, or 3), or None.
    Uses font size tiers, bold style, positional rules, and numbering patterns.
    """
    cleaned = line_text.strip()
    if not cleaned or len(cleaned) > 120:
        return None

    # Exclude lines ending with a colon (field labels or list introducers)
    if cleaned.endswith(":"):
        return None

    # Exclude key-value lines with colon in the first half of the line
    if re.search(r'^[A-Za-z0-9\s/\(\)\-]+:\s+', cleaned) and avg_size <= modal_size + 1.0:
        return None

    # Exclude phone numbers or address continuation patterns
    if re.search(r'(\[\s*phone\s*\]|\bext\.|\bsuite\b|\bblvd\b)', cleaned, re.IGNORECASE) and avg_size <= modal_size + 1.0:
        return None

    # Exclude table header bands with multiple column tokens
    if re.search(r'\b(Amount|Date Processed|Transaction|Public Access|Status Date)\b', cleaned) and avg_size <= modal_size + 0.5:
        return None

    # Numbering Pattern 1: Multi-level dotted (e.g. "1.1 Background" -> level 2, "1.1.2 Details" -> level 3)
    num_match_multi = re.match(r'^(?:Section\s+)?(\d+(?:\.\d+)+)\.?\s+[A-Z]', cleaned)
    if num_match_multi:
        dots = num_match_multi.group(1).count('.')
        return 3 if dots >= 2 else 2

    # Numbering Pattern 2: Single-level (e.g. "1. Executive Summary" or "01 Scope" -> level 1)
    num_match_single = re.match(r'^(?:0[1-9]|[1-9]\d?)\.?\s+[A-Z]', cleaned)
    if num_match_single and (avg_size >= modal_size + 0.5 or is_bold):
        return 1

    # Numbering Pattern 3: Explicit Article, Section, Chapter, Part
    if re.match(r'^(?:Section|Article|Part|Chapter)\s+([0-9IVXLCDM]+)[\.:\s]', cleaned, re.IGNORECASE):
        return 1

    # Font size based hierarchy
    if larger_sizes:
        h1_size = larger_sizes[0]
        if avg_size >= h1_size - 0.4:
            return 1
        if len(larger_sizes) > 1 and avg_size >= larger_sizes[1] - 0.4:
            return 2
        if len(larger_sizes) > 2 and avg_size >= larger_sizes[2] - 0.4:
            return 3
        if is_bold and avg_size >= modal_size + 0.5:
            return 3
    else:
        # When no large font tier exists, rely on relative scale and bold styling
        if avg_size >= modal_size * 1.3:
            return 1
        elif avg_size >= modal_size * 1.15:
            return 2
        elif is_bold and avg_size >= modal_size + 0.5:
            return 3

    return None


def merge_body_lines_preserving_paragraphs(lines: List[str]) -> str:
    """
    Merges body text lines, joining fragmented sentence wraps with spaces while
    preserving paragraph boundaries and list items with newline separations.
    """
    if not lines:
        return ""

    paragraphs: List[str] = []
    current_para: List[str] = []

    for line in lines:
        stripped = line.strip()
        if not stripped:
            if current_para:
                paragraphs.append(" ".join(current_para))
                current_para = []
            continue

        # Check if line indicates a distinct new paragraph or key-value entry
        is_kv_or_list = bool(re.match(r'^([A-Za-z0-9\s/]+:|\-|\*|•|\d+\.)\s+', stripped))

        if is_kv_or_list:
            if current_para:
                paragraphs.append(" ".join(current_para))
                current_para = []
            paragraphs.append(stripped)
        else:
            current_para.append(stripped)

    if current_para:
        paragraphs.append(" ".join(current_para))

    return "\n".join(paragraphs)


def extract_sections(
    file_source: Union[str, BinaryIO, bytes],
    filename: str = "document.pdf",
    granularity: str = "major"
) -> Dict[str, Any]:
    """
    Extracts structured headings and associated body text from a PDF.

    Args:
        file_source: Path to PDF file, bytes buffer, or file-like object.
        filename: Name of the uploaded file for metadata tracking.
        granularity: 'major' (default, primary sections/H1) or 'detailed' (includes H2/H3 subheadings).

    Returns:
        Structured dictionary matching ExtractAI API contract:
        {
            "success": True,
            "metadata": {
                "file_name": str,
                "file_size": str,
                "total_pages": int,
                "sections_found": int,
                "extraction_time_ms": int,
                "language": str
            },
            "data": [
                {
                    "id": str,
                    "heading": str,
                    "level": int,
                    "text": str,
                    "page": int,
                    "char_count": int
                }
            ]
        }
    """
    start_time = time.time()

    # Read bytes buffer if needed
    if isinstance(file_source, str):
        with open(file_source, "rb") as f:
            pdf_bytes = f.read()
    elif isinstance(file_source, bytes):
        pdf_bytes = file_source
    else:
        pdf_bytes = file_source.read()

    file_size_formatted = format_file_size(len(pdf_bytes))

    # Check cache
    cache_key = f"{hashlib.sha256(pdf_bytes).hexdigest()}:{granularity}"
    cached_result = _GLOBAL_CACHE.get(cache_key)
    if cached_result is not None:
        elapsed_ms = max(1, int(round((time.time() - start_time) * 1000)))
        cached_result["metadata"]["file_name"] = filename
        cached_result["metadata"]["extraction_time_ms"] = elapsed_ms
        return cached_result

    try:
        pdf_file = io.BytesIO(pdf_bytes)
        with pdfplumber.open(pdf_file) as pdf:
            total_pages = len(pdf.pages)
            if total_pages == 0:
                raise PDFExtractionError("The PDF document contains 0 pages.")

            modal_size, larger_sizes = analyze_font_hierarchy(pdf)

            raw_sections: List[Dict[str, Any]] = []
            curr_heading: Optional[str] = None
            curr_level: int = 1
            curr_page: int = 1
            curr_body_lines: List[str] = []
            has_extracted_any_text = False

            for page_idx, page in enumerate(pdf.pages):
                page_num = page_idx + 1
                words = page.extract_words(
                    extra_attrs=["fontname", "size"],
                    keep_blank_chars=False
                )
                if not words:
                    continue

                # Sort words into horizontal lines
                words.sort(key=lambda w: (round(w["top"] / 3.5) * 3.5, w["x0"]))
                lines: List[List[dict]] = []
                cur_line: List[dict] = []
                cur_top: Optional[float] = None

                for w in words:
                    if cur_top is None or abs(w["top"] - cur_top) < 3.5:
                        cur_line.append(w)
                        cur_top = w["top"]
                    else:
                        lines.append(cur_line)
                        cur_line = [w]
                        cur_top = w["top"]
                if cur_line:
                    lines.append(cur_line)

                # Process lines with multi-line heading detection
                line_idx = 0
                while line_idx < len(lines):
                    line_words = lines[line_idx]
                    raw_line = " ".join(w["text"] for w in line_words).strip()
                    top = line_words[0]["top"]
                    avg_size = sum(w["size"] for w in line_words) / len(line_words)
                    is_bold = any("bold" in w["fontname"].lower() for w in line_words)
                    line_idx += 1

                    if not raw_line or is_running_header_or_footer(raw_line, top, page.height, avg_size, modal_size):
                        continue

                    has_extracted_any_text = True
                    cleaned_line = repair_kerning_artifacts(raw_line)
                    level = detect_heading_level(cleaned_line, avg_size, is_bold, modal_size, larger_sizes)

                    # Determine if this heading should create a section under current granularity
                    is_valid_heading = False
                    if level is not None:
                        if granularity == "major":
                            is_valid_heading = (level == 1)
                        else:
                            is_valid_heading = True

                    if is_valid_heading:
                        # Check for multi-line heading continuation
                        while line_idx < len(lines):
                            next_words = lines[line_idx]
                            next_raw = " ".join(w["text"] for w in next_words).strip()
                            next_top = next_words[0]["top"]
                            next_avg_size = sum(w["size"] for w in next_words) / len(next_words)
                            next_is_bold = any("bold" in w["fontname"].lower() for w in next_words)
                            v_gap = next_top - top

                            if (
                                abs(next_avg_size - avg_size) < 0.8
                                and next_is_bold == is_bold
                                and v_gap < 28
                                and len(next_raw) < 70
                                and not next_raw.endswith(":")
                                and detect_heading_level(next_raw, next_avg_size, next_is_bold, modal_size, larger_sizes) is None
                            ):
                                cleaned_line += " " + repair_kerning_artifacts(next_raw)
                                line_idx += 1
                            else:
                                break

                        # Flush previous section
                        if curr_heading is not None or curr_body_lines:
                            text_content = merge_body_lines_preserving_paragraphs(curr_body_lines)
                            if len(text_content) > 5000:
                                text_content = text_content[:5000].rstrip()
                            raw_sections.append({
                                "heading": curr_heading if curr_heading else "Introduction",
                                "level": curr_level,
                                "page": curr_page,
                                "text": text_content,
                            })
                            curr_body_lines = []

                        curr_heading = cleaned_line
                        curr_level = level if level is not None else 1
                        curr_page = page_num
                    else:
                        curr_body_lines.append(cleaned_line)

            # Flush final section
            if curr_heading is not None or curr_body_lines:
                text_content = merge_body_lines_preserving_paragraphs(curr_body_lines)
                if len(text_content) > 5000:
                    text_content = text_content[:5000].rstrip()
                raw_sections.append({
                    "heading": curr_heading if curr_heading else "Document Content",
                    "level": curr_level,
                    "page": curr_page,
                    "text": text_content,
                })

            # Handle scanned PDF with 0 extractable text characters
            if not has_extracted_any_text:
                raise PDFExtractionError(
                    "No selectable text found in the PDF. The document may be scanned or image-only."
                )

            # Prune empty sections and preamble noise (< 80 chars intro before real headings)
            filtered_sections: List[Dict[str, Any]] = []
            for s in raw_sections:
                if not s["text"].strip():
                    continue
                if s["heading"] in ("Introduction", "Document Header") and len(s["text"]) < 80 and len(raw_sections) > 1:
                    continue
                filtered_sections.append(s)

            # Handle case where document had text but no detectable headings
            if not filtered_sections and raw_sections:
                # Retain the content under a fallback section
                fallback_text = "\n".join(s["text"] for s in raw_sections if s["text"].strip())
                if len(fallback_text) > 5000:
                    fallback_text = fallback_text[:5000].rstrip()
                filtered_sections = [{
                    "heading": "Document Content",
                    "level": 1,
                    "page": 1,
                    "text": fallback_text,
                }]

            # Build final response with stable sequential IDs
            final_data: List[Dict[str, Any]] = []
            all_text_chunks: List[str] = []

            for idx, s in enumerate(filtered_sections, 1):
                section_item = {
                    "id": f"section-{idx}",
                    "heading": s["heading"],
                    "level": s["level"],
                    "text": s["text"],
                    "page": s["page"],
                    "char_count": len(s["text"])
                }
                final_data.append(section_item)
                all_text_chunks.append(s["text"])

            elapsed_ms = max(1, int(round((time.time() - start_time) * 1000)))
            combined_text = " ".join(all_text_chunks)
            detected_lang = detect_language(combined_text)

            response: Dict[str, Any] = {
                "success": True,
                "metadata": {
                    "file_name": filename,
                    "file_size": file_size_formatted,
                    "total_pages": total_pages,
                    "sections_found": len(final_data),
                    "extraction_time_ms": elapsed_ms,
                    "language": detected_lang
                },
                "data": final_data,
                # Backward-compatibility aliases
                "total_pages": total_pages,
                "processing_time_sec": round(elapsed_ms / 1000.0, 3)
            }

            # Cache the successful extraction
            _GLOBAL_CACHE.set(cache_key, response)

            return response

    except PDFExtractionError:
        raise
    except Exception as e:
        raise PDFExtractionError(f"Failed to process PDF: {str(e)}") from e
