"""
ExtractAI PDF Parser Engine v3.0
Extracts structured heading and body-text pairs using pdfplumber with:
  - Font-size, weight, and positional heuristics (H1/H2/H3)
  - Fingerprint-based repeated page header/footer suppression
  - Native pdfplumber table extraction (grid + text strategies)
  - Hierarchy preservation: H2/H3 emitted as ## / ### markdown markers
  - Spacing artifact normalization (kerning splits + word-boundary collisions)
  - No content truncation - full section text preserved
"""

import hashlib
import io
import copy
import re
import threading
import time
from collections import Counter, OrderedDict, defaultdict
from typing import Any, BinaryIO, Dict, List, Optional, Set, Tuple, Union
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
                return copy.deepcopy(self._cache[key])
            return None

    def set(self, key: str, value: Dict[str, Any]) -> None:
        with self._lock:
            if key in self._cache:
                self._cache.move_to_end(key)
            self._cache[key] = copy.deepcopy(value)
            if len(self._cache) > self.maxsize:
                self._cache.popitem(last=False)

    def clear(self) -> None:
        with self._lock:
            self._cache.clear()


_GLOBAL_CACHE = ExtractionCache()


def format_file_size(num_bytes: int) -> str:
    if num_bytes < 1024:
        return f"{num_bytes} B"
    elif num_bytes < 1024 * 1024:
        return f"{num_bytes / 1024:.1f} KB"
    else:
        return f"{num_bytes / (1024 * 1024):.2f} MB"


def detect_language(text: str) -> str:
    sample = text[:1500].lower()
    english_stopwords = {
        "the", "and", "of", "to", "in", "is", "for", "that", "this",
        "with", "on", "as", "by", "at", "from", "be", "are", "or", "an"
    }
    words = re.findall(r'\b[a-z]{2,}\b', sample)
    if not words:
        return "en"
    matches = sum(1 for w in words if w in english_stopwords)
    return "en" if (matches / len(words)) >= 0.04 else "en"


# ---------------------------------------------------------------------------
# Fused-word repairs: PDF spacing artifacts where two words got merged.
# Only unambiguous cases where both halves are real English words.
# ---------------------------------------------------------------------------
_FUSED_WORD_MAP: Dict[str, str] = {
    "asingle": "a single",   "agroup": "a group",    "aresult": "a result",
    "aform": "a form",       "aplan": "a plan",      "apolicy": "a policy",
    "arate": "a rate",       "aterm": "a term",      "aset": "a set",
    "acopy": "a copy",       "achange": "a change",  "aclaim": "a claim",
    "acase": "a case",       "abenefit": "a benefit","aproduct": "a product",
    "anotice": "a notice",   "arequest": "a request","astatement": "a statement",
    "areview": "a review",   "areport": "a report",  "adate": "a date",
    "atime": "a time",       "aletter": "a letter",  "anew": "a new",
    "atotal": "a total",     "afile": "a file",      "aperiod": "a period",
    "apremium": "a premium", "awriting": "a writing",
    "Iam": "I am",           "Iwas": "I was",        "Ihave": "I have",
    "Iwill": "I will",       "Ihereby": "I hereby",  "Iunderstand": "I understand",
    "AD&Dproduct": "AD&D product", "AD&Dcoverage": "AD&D coverage",
    "AD&Dbenefit": "AD&D benefit", "AD&Dplan": "AD&D plan",
    "inaccordance": "in accordance", "inaddition": "in addition",
    "inconjunction": "in conjunction", "inconnection": "in connection",
    "inresponse": "in response", "incompliance": "in compliance",
    "inwriting": "in writing",   "inforce": "in force",
    "inorder": "in order",
}

_FUSED_PATTERN = re.compile(
    r'\b(' + '|'.join(re.escape(k) for k in sorted(_FUSED_WORD_MAP, key=len, reverse=True)) + r')\b'
)


def repair_kerning_artifacts(text: str) -> str:
    """
    Repairs PDF extraction spacing problems:
      1. Single-letter kerning splits  (e.g. 'T able' -> 'Table')
      2. Fused word-boundary collisions (e.g. 'asingle' -> 'a single')
      3. Capitalised "I" fused to next word (e.g. 'IHave' -> 'I Have')
    """
    if not text:
        return text
    repaired = re.sub(r'\b([A-Za-z])\s+([a-z]{2,})\b', r'\1\2', text)
    repaired = re.sub(r'[ \t]+', ' ', repaired)
    repaired = _FUSED_PATTERN.sub(lambda m: _FUSED_WORD_MAP[m.group(0)], repaired)
    repaired = re.sub(r'\bI([A-Z][a-z]{1,})\b', r'I \1', repaired)
    return repaired.strip()


# ---------------------------------------------------------------------------
# SERFF page-metadata label patterns that repeat verbatim on every page.
# ---------------------------------------------------------------------------
_SERFF_METADATA_PATTERNS: List[re.Pattern] = [
    re.compile(r'^SERFF\s+Tracking\s+#', re.IGNORECASE),
    re.compile(r'^State\s+Tracking\s+#', re.IGNORECASE),
    re.compile(r'^Company\s+Tracking\s+#', re.IGNORECASE),
    re.compile(r'^TOI/Sub-TOI:', re.IGNORECASE),
    re.compile(r'^TOI\s*/', re.IGNORECASE),
    re.compile(r'^Product\s+Name:', re.IGNORECASE),
    re.compile(r'^Project\s+Name', re.IGNORECASE),
    re.compile(r'^PDF\s+Pipeline\s+for\s+SERFF', re.IGNORECASE),
    re.compile(r'^\d{1,2}/\d{1,2}/\d{4}\s+\d{1,2}:\d{2}:\d{2}\s+(AM|PM)', re.IGNORECASE),
]


def _matches_serff_pattern(line_text: str) -> bool:
    for pattern in _SERFF_METADATA_PATTERNS:
        if pattern.search(line_text):
            return True
    return False


def is_running_header_or_footer(
    line_text: str,
    top: float,
    page_height: float,
    avg_size: float,
    modal_size: float,
    repeated_lines: Optional[Set[str]] = None
) -> bool:
    """Returns True if the line should be excluded as page header/footer/metadata."""
    stripped = line_text.strip()

    if "SERFF Tracking #" in stripped or "PDF Pipeline for SERFF" in stripped:
        return True
    if _matches_serff_pattern(stripped):
        return True
    if repeated_lines and stripped in repeated_lines:
        return True
    if top < (page_height * 0.15) and avg_size <= (modal_size + 0.5):
        return True
    if top > (page_height * 0.90) and avg_size <= (modal_size + 0.5):
        return True
    if re.match(r'^(page\s+\d+(\s+of\s+\d+)?|\d+|\-\s*\d+\s*\-)$', stripped, re.IGNORECASE):
        return True
    return False


def analyze_font_hierarchy(pdf: pdfplumber.PDF) -> Tuple[float, List[float]]:
    """
    Calculates the modal body text font size and identifies prominent heading size tiers.
    """
    body_chars = [
        c for page in pdf.pages for c in page.chars
        if not c['text'].isspace()
        and c['top'] >= page.height * 0.15
        and c['top'] <= page.height * 0.90
    ]
    if not body_chars:
        body_chars = [c for page in pdf.pages for c in page.chars if not c['text'].isspace()]
    if not body_chars:
        return 10.0, []

    size_counter = Counter(round(c['size'], 1) for c in body_chars)
    modal_size = size_counter.most_common(1)[0][0]
    larger_sizes = sorted([s for s in size_counter.keys() if s >= modal_size + 1.2], reverse=True)
    return modal_size, larger_sizes


def detect_heading_level(
    line_text: str,
    avg_size: float,
    is_bold: bool,
    modal_size: float,
    larger_sizes: List[float]
) -> Optional[int]:
    """Returns heading level (1/2/3) or None for body text."""
    cleaned = line_text.strip()
    if not cleaned or len(cleaned) > 120:
        return None
    if cleaned.endswith(":"):
        return None
    if re.search(r'^[A-Za-z0-9\s/\(\)\-]+:\s+', cleaned) and avg_size <= modal_size + 1.0:
        return None
    if re.search(r'(\[\s*phone\s*\]|\bext\.|\bsuite\b|\bblvd\b)', cleaned, re.IGNORECASE) and avg_size <= modal_size + 1.0:
        return None
    if re.search(r'\b(Amount|Date Processed|Transaction|Public Access|Status Date)\b', cleaned) and avg_size <= modal_size + 0.5:
        return None

    num_match_multi = re.match(r'^(?:Section\s+)?(\d+(?:\.\d+)+)\.?\s+[A-Z]', cleaned)
    if num_match_multi:
        dots = num_match_multi.group(1).count('.')
        return 3 if dots >= 2 else 2

    num_match_single = re.match(r'^(?:0[1-9]|[1-9]\d?)\.?\s+[A-Z]', cleaned)
    if num_match_single and (avg_size >= modal_size + 0.5 or is_bold):
        return 1

    if re.match(r'^(?:Section|Article|Part|Chapter)\s+([0-9IVXLCDM]+)[\.:\s]', cleaned, re.IGNORECASE):
        return 1

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
        if avg_size >= modal_size * 1.3:
            return 1
        elif avg_size >= modal_size * 1.15:
            return 2
        elif is_bold and avg_size >= modal_size + 0.5:
            return 3

    return None


def merge_body_lines_preserving_paragraphs(lines: List[str]) -> str:
    """
    Merges body text lines into paragraphs, preserving blank-line breaks,
    markdown heading markers (## / ###), list items, and key-value pairs.
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
        if stripped.startswith("## ") or stripped.startswith("### "):
            if current_para:
                paragraphs.append(" ".join(current_para))
                current_para = []
            paragraphs.append(stripped)
            continue
        is_kv_or_list = bool(re.match(r'^([A-Za-z0-9\s/\(\)]+:|[\-\*\u2022]|\d+\.)\s+', stripped))
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


def fingerprint_repeated_lines(pdf: pdfplumber.PDF, threshold: int = 3) -> Set[str]:
    """
    First-pass scan: returns the set of text lines that appear verbatim on
    threshold or more distinct pages. These are running headers/footers to suppress.
    """
    line_page_set: Dict[str, Set[int]] = defaultdict(set)

    for page_idx, page in enumerate(pdf.pages):
        try:
            words = page.extract_words(keep_blank_chars=False)
        except Exception:
            continue
        if not words:
            continue

        words.sort(key=lambda w: (round(w["top"] / 3.5) * 3.5, w["x0"]))
        cur_line: List[dict] = []
        cur_top: Optional[float] = None

        for w in words:
            if cur_top is None or abs(w["top"] - cur_top) < 3.5:
                cur_line.append(w)
                cur_top = w["top"]
            else:
                if cur_line:
                    line_text = " ".join(ww["text"] for ww in cur_line).strip()
                    if 3 < len(line_text) < 200:
                        line_page_set[line_text].add(page_idx)
                cur_line = [w]
                cur_top = w["top"]
        if cur_line:
            line_text = " ".join(ww["text"] for ww in cur_line).strip()
            if 3 < len(line_text) < 200:
                line_page_set[line_text].add(page_idx)

    return {line for line, pages in line_page_set.items() if len(pages) >= threshold}


def extract_page_tables(page: Any) -> Tuple[List[Dict[str, Any]], List[Tuple[float, float, float, float]]]:
    """
    Extract structured tables from a page using pdfplumber native line-based detection.
    Returns (tables_data, table_bboxes) where bboxes mask out word-line extraction.
    """
    tables_data: List[Dict[str, Any]] = []
    table_bboxes: List[Tuple[float, float, float, float]] = []

    try:
        found_tables = page.find_tables()
    except Exception:
        found_tables = []

    def clean_table_cell(val: Any) -> str:
        if val is None:
            return ""
        text = re.sub(r'[\r\n\t]+', ' ', str(val))
        text = re.sub(r'\s{2,}', ' ', text).strip()
        text = re.sub(r'(\b[A-Za-z]{3,})-\s+([a-z]{2,}\b)', r'\1\2', text)
        return repair_kerning_artifacts(text)

    for table_obj in found_tables:
        try:
            raw = table_obj.extract()
            if not raw:
                continue

            cleaned_rows: List[List[str]] = []
            for row in raw:
                cleaned = [clean_table_cell(cell) for cell in row]
                if any(c for c in cleaned):
                    cleaned_rows.append(cleaned)

            if not cleaned_rows:
                continue

            columns = cleaned_rows[0]
            data_rows = cleaned_rows[1:] if len(cleaned_rows) > 1 else []

            if len(columns) >= 2 and len(data_rows) >= 1:
                tables_data.append({
                    "type": "table",
                    "columns": columns,
                    "rows": data_rows,
                    "top": table_obj.bbox[1],
                    "bbox": list(table_obj.bbox),
                })
                table_bboxes.append(table_obj.bbox)
        except Exception:
            continue

    return tables_data, table_bboxes


def _word_in_table(word_top: float, word_x0: float, table_bboxes: List[Tuple]) -> bool:
    """Returns True if a word falls inside any detected table bounding box."""
    for (tx0, ttop, tx1, tbottom) in table_bboxes:
        if ttop - 2 <= word_top <= tbottom + 2 and tx0 - 2 <= word_x0 <= tx1 + 2:
            return True
    return False


def extract_sections(
    file_source: Union[str, BinaryIO, bytes],
    filename: str = "document.pdf",
    granularity: str = "major"
) -> Dict[str, Any]:
    """
    Extracts structured headings and body text from a PDF.

    H1 headings become top-level section items (heading + text + tables).
    H2/H3 headings are emitted as ## / ### markdown markers inside their parent
    H1 section body so the frontend parseSubsections() can render them as subsections.
    Tables are extracted structurally and returned in each section's "tables" list.
    Repeated page headers/footers are suppressed via fingerprinting + SERFF patterns.
    """
    start_time = time.time()

    if isinstance(file_source, str):
        with open(file_source, "rb") as f:
            pdf_bytes = f.read()
    elif isinstance(file_source, bytes):
        pdf_bytes = file_source
    else:
        pdf_bytes = file_source.read()

    file_size_formatted = format_file_size(len(pdf_bytes))

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

            # Pass 1: font hierarchy
            modal_size, larger_sizes = analyze_font_hierarchy(pdf)

            # Pass 2: fingerprint repeated page headers/footers
            repeated_lines: Set[str] = fingerprint_repeated_lines(pdf, threshold=3)

            # Pass 3: main extraction
            raw_sections: List[Dict[str, Any]] = []
            curr_heading: Optional[str] = None
            curr_subheading: Optional[str] = None
            curr_level: int = 1
            curr_page: int = 1
            curr_body_lines: List[str] = []
            curr_tables: List[Dict[str, Any]] = []
            has_extracted_any_text = False

            def _emit_pending_table(tbl: Dict[str, Any], context_heading: Optional[str]):
                tbl_heading = context_heading or curr_heading or "Table"
                tbl["heading"] = tbl_heading
                curr_tables.append(tbl)
                cols = tbl.get("columns", [])
                for row in tbl.get("rows", []):
                    if len(cols) == 2 and len(row) >= 2:
                        k = row[0].strip()
                        v = row[1].strip()
                        if k and v:
                            curr_body_lines.append(f"{k}: {v}")
                    else:
                        parts = [
                            f"{cols[c].strip()}: {str(row[c]).strip()}"
                            for c in range(min(len(cols), len(row)))
                            if str(row[c]).strip()
                        ]
                        if parts:
                            curr_body_lines.append(" | ".join(parts))

            for page_idx, page in enumerate(pdf.pages):
                page_num = page_idx + 1

                # Extract tables and their bboxes from this page
                page_tables, table_bboxes = extract_page_tables(page)
                pending_page_tables = list(page_tables)
                pending_page_tables.sort(key=lambda t: t.get("top", 0.0))

                words = page.extract_words(
                    extra_attrs=["fontname", "size"],
                    keep_blank_chars=False
                )
                if not words:
                    while pending_page_tables:
                        tbl = pending_page_tables.pop(0)
                        _emit_pending_table(tbl, curr_subheading or curr_heading)
                    continue

                # Sort and group words into horizontal lines, skipping table regions
                words.sort(key=lambda w: (round(w["top"] / 3.5) * 3.5, w["x0"]))
                lines: List[List[dict]] = []
                cur_line: List[dict] = []
                cur_top: Optional[float] = None

                for w in words:
                    if _word_in_table(w["top"], w["x0"], table_bboxes):
                        continue
                    if cur_top is None or abs(w["top"] - cur_top) < 3.5:
                        cur_line.append(w)
                        cur_top = w["top"]
                    else:
                        if cur_line:
                            lines.append(cur_line)
                        cur_line = [w]
                        cur_top = w["top"]
                if cur_line:
                    lines.append(cur_line)

                line_idx = 0
                while line_idx < len(lines):
                    line_words = lines[line_idx]
                    raw_line = " ".join(w["text"] for w in line_words).strip()
                    top = line_words[0]["top"]
                    avg_size = sum(w["size"] for w in line_words) / len(line_words)
                    is_bold = any("bold" in w["fontname"].lower() for w in line_words)
                    line_idx += 1

                    if not raw_line:
                        continue
                    if is_running_header_or_footer(raw_line, top, page.height, avg_size, modal_size, repeated_lines):
                        continue

                    # Emit any tables located vertically above this line
                    while pending_page_tables and pending_page_tables[0].get("top", 0.0) < top:
                        tbl = pending_page_tables.pop(0)
                        _emit_pending_table(tbl, curr_subheading or curr_heading)

                    has_extracted_any_text = True
                    cleaned_line = repair_kerning_artifacts(raw_line)
                    level = detect_heading_level(cleaned_line, avg_size, is_bold, modal_size, larger_sizes)

                    if level == 1:
                        # Multi-line heading continuation
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

                        # Flush previous section (NO deduplication — same heading = separate entry)
                        if curr_heading is not None or curr_body_lines or curr_tables:
                            text_content = merge_body_lines_preserving_paragraphs(curr_body_lines)
                            raw_sections.append({
                                "heading": curr_heading or "Introduction",
                                "level": curr_level,
                                "page": curr_page,
                                "text": text_content,
                                "tables": list(curr_tables),
                            })
                            curr_body_lines = []
                            curr_tables = []

                        curr_heading = cleaned_line
                        curr_subheading = None
                        curr_level = 1
                        curr_page = page_num

                    elif level in (2, 3):
                        # Emit H2/H3 as markdown markers for frontend subsection parser
                        prefix = "## " if level == 2 else "### "
                        curr_body_lines.append(prefix + cleaned_line)
                        curr_subheading = cleaned_line

                    else:
                        curr_body_lines.append(cleaned_line)

                # Emit any remaining tables on this page below all lines
                while pending_page_tables:
                    tbl = pending_page_tables.pop(0)
                    _emit_pending_table(tbl, curr_subheading or curr_heading)

            # Flush final section
            if curr_heading is not None or curr_body_lines or curr_tables:
                text_content = merge_body_lines_preserving_paragraphs(curr_body_lines)
                raw_sections.append({
                    "heading": curr_heading or "Document Content",
                    "level": curr_level,
                    "page": curr_page,
                    "text": text_content,
                    "tables": list(curr_tables),
                })

            has_any_tables = any(bool(s.get("tables")) for s in raw_sections)
            if not has_extracted_any_text and not has_any_tables:
                raise PDFExtractionError(
                    "No selectable text found in the PDF. The document may be scanned or image-only."
                )

            # Filter empty sections; allow same-name sections (no dedup)
            filtered_sections: List[Dict[str, Any]] = []
            for s in raw_sections:
                has_text = bool(s["text"].strip())
                has_tables = bool(s.get("tables"))
                if not has_text and not has_tables:
                    continue
                if s["heading"] in ("Introduction", "Document Header") and len(s["text"]) < 80 and len(raw_sections) > 1:
                    continue
                filtered_sections.append(s)

            if not filtered_sections and raw_sections:
                fallback_text = "\n".join(s["text"] for s in raw_sections if s["text"].strip())
                all_tables = [t for s in raw_sections for t in s.get("tables", [])]
                filtered_sections = [{
                    "heading": "Document Content", "level": 1, "page": 1,
                    "text": fallback_text, "tables": all_tables,
                }]

            final_data: List[Dict[str, Any]] = []
            all_text_chunks: List[str] = []

            for idx, s in enumerate(filtered_sections, 1):
                section_item: Dict[str, Any] = {
                    "id": f"section-{idx}",
                    "heading": s["heading"],
                    "level": s["level"],
                    "text": s["text"],
                    "page": s["page"],
                    "char_count": len(s["text"]),
                    "tables": s.get("tables", []),
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
                "total_pages": total_pages,
                "processing_time_sec": round(elapsed_ms / 1000.0, 3)
            }

            _GLOBAL_CACHE.set(cache_key, response)
            return response

    except PDFExtractionError:
        raise
    except Exception as e:
        raise PDFExtractionError(f"Failed to process PDF: {str(e)}") from e
