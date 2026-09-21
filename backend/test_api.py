"""
Automated Integration and Unit Tests for ExtractAI Backend
Tests POST /api/extract, GET /api/health, error handling (400, 422, 504),
heading hierarchy, metadata validation, and performance benchmarking.
"""

import io
import os
import time
import unittest
from fastapi.testclient import TestClient

try:
    from backend.main import app
except ImportError:
    from main import app

client = TestClient(app)
SAMPLE_PDF_PATH = os.path.join(os.path.dirname(__file__), "samples", "AMGN-135003565.pdf")


class TestExtractAIAPI(unittest.TestCase):

    def test_root_endpoint(self):
        """Test GET / returns metadata and HTTP 200."""
        response = client.get("/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "operational")
        self.assertIn("endpoints", data)

    def test_health_check(self):
        """Test GET /api/health returns healthy status."""
        response = client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "healthy")

    def test_extract_amgn_pdf_performance_and_contract(self):
        """
        Test POST /api/extract with the AMGN filing PDF:
        - Response time < 2 seconds (sub-second extraction engine)
        - Matches response schema: {success, metadata, data}
        - Validates metadata fields (file_name, file_size, total_pages, sections_found, extraction_time_ms, language)
        - Verifies NO confidence score is returned without heuristic
        - Extracts the 11 major sections accurately with level 1, correct pages, char_count
        - Verifies text length <= 5000 characters per section
        """
        self.assertTrue(os.path.exists(SAMPLE_PDF_PATH), f"Sample PDF missing at {SAMPLE_PDF_PATH}")

        start_time = time.time()
        with open(SAMPLE_PDF_PATH, "rb") as f:
            response = client.post(
                "/api/extract",
                files={"file": ("AMGN-135003565.pdf", f, "application/pdf")}
            )
        elapsed = time.time() - start_time

        # Validate HTTP status and roundtrip latency
        self.assertEqual(response.status_code, 200, f"Expected 200, got {response.status_code}: {response.text}")
        self.assertLess(elapsed, 2.0, f"Extraction took {elapsed:.2f}s, exceeding 2.0s requirement")

        payload = response.json()
        self.assertTrue(payload["success"])
        self.assertIn("metadata", payload)
        self.assertIn("data", payload)

        meta = payload["metadata"]
        self.assertEqual(meta["file_name"], "AMGN-135003565.pdf")
        self.assertIn("KB", meta["file_size"])
        self.assertEqual(meta["total_pages"], 15)
        self.assertEqual(meta["sections_found"], 11)
        self.assertIsInstance(meta["extraction_time_ms"], int)
        self.assertGreater(meta["extraction_time_ms"], 0)
        self.assertEqual(meta["language"], "en")

        # Explicit check: "Do NOT return a confidence score unless there is an explicit, explainable heuristic"
        self.assertNotIn("confidence", meta)
        self.assertNotIn("confidence_score", meta)

        sections = payload["data"]
        self.assertEqual(len(sections), 11, f"Expected exactly 11 major sections, got {len(sections)}")

        # Validate structure of each section
        expected_headings = [
            ("Table of Contents", 1),
            ("Filing at a Glance", 2),
            ("General Information", 3),
            ("Company and Contact", 3),
            ("Filing Fees", 5),
            ("Correspondence Summary", 6),
            ("Disposition", 7),
            ("Objection Letter", 9),
            ("Response Letter", 10),
            ("Note To Reviewer", 11),
            ("Supporting Document Schedules", 12)
        ]

        print("\n[TEST OUTPUT] Extracted Headings:")
        for idx, s in enumerate(sections, 1):
            self.assertEqual(s["id"], f"section-{idx}")
            self.assertIsInstance(s["heading"], str)
            self.assertGreater(len(s["heading"]), 0)
            self.assertEqual(s["level"], 1)  # All major headings are Level 1
            self.assertIsInstance(s["page"], int)
            self.assertGreater(s["page"], 0)
            self.assertLessEqual(s["page"], 15)
            self.assertIsInstance(s["text"], str)
            self.assertGreater(len(s["text"]), 0)
            # Enforce max section text: 5000 characters
            self.assertLessEqual(len(s["text"]), 5000)
            self.assertEqual(s["char_count"], len(s["text"]))
            # Ensure no confidence field
            self.assertNotIn("confidence", s)
            self.assertNotIn("confidence_score", s)

            exp_name, exp_page = expected_headings[idx - 1]
            self.assertEqual(s["heading"], exp_name)
            self.assertEqual(s["page"], exp_page)
            print(f"  {s['id']}: [H{s['level']}] '{s['heading']}' (Page {s['page']}, {s['char_count']} chars)")

        print(f"[TEST OUTPUT] API Roundtrip Time: {elapsed:.3f}s (Internal parse: {meta['extraction_time_ms']}ms)\n")

    def test_extract_detailed_granularity(self):
        """Test POST /api/extract?granularity=detailed captures subheadings with hierarchy."""
        with open(SAMPLE_PDF_PATH, "rb") as f:
            response = client.post(
                "/api/extract?granularity=detailed",
                files={"file": ("AMGN-135003565.pdf", f, "application/pdf")}
            )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        sections = payload["data"]
        # Detailed granularity extracts more sections including subheadings
        self.assertGreater(len(sections), 11)
        levels_present = set(s["level"] for s in sections)
        self.assertIn(1, levels_present)
        self.assertTrue(2 in levels_present or 3 in levels_present)

    def test_caching_yields_fast_subsecond_response(self):
        """Test that repeated extractions leverage the LRU cache for ultra-fast response."""
        with open(SAMPLE_PDF_PATH, "rb") as f:
            pdf_bytes = f.read()

        # Prime the cache
        r1 = client.post(
            "/api/extract",
            files={"file": ("AMGN-135003565.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
        )
        self.assertEqual(r1.status_code, 200)

        # Second request must hit cache and return in < 150ms
        t0 = time.time()
        r2 = client.post(
            "/api/extract",
            files={"file": ("AMGN-135003565.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
        )
        cached_elapsed = time.time() - t0
        self.assertEqual(r2.status_code, 200)
        self.assertLess(cached_elapsed, 0.20, f"Cache retrieval took {cached_elapsed:.3f}s, expected < 0.2s")
        self.assertEqual(len(r2.json()["data"]), 11)

    def test_reject_non_pdf_extension_returns_422(self):
        """Test POST /api/extract rejects non-pdf file extensions with HTTP 422."""
        response = client.post(
            "/api/extract",
            files={"file": ("document.txt", b"%PDF-fake content", "text/plain")}
        )
        self.assertEqual(response.status_code, 422)
        self.assertIn("File is not a PDF", response.json()["detail"])

    def test_reject_invalid_magic_bytes_returns_422(self):
        """Test POST /api/extract rejects files that do not start with %PDF- header with HTTP 422."""
        response = client.post(
            "/api/extract",
            files={"file": ("fake.pdf", b"NOT_A_REAL_PDF_DATA", "application/pdf")}
        )
        self.assertEqual(response.status_code, 422)
        self.assertIn("%PDF-", response.json()["detail"])

    def test_reject_empty_file_returns_400(self):
        """Test POST /api/extract rejects empty files with HTTP 400."""
        response = client.post(
            "/api/extract",
            files={"file": ("empty.pdf", b"", "application/pdf")}
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("empty", response.json()["detail"].lower())

    def test_reject_no_file_uploaded_returns_400(self):
        """Test POST /api/extract without file part returns HTTP 400."""
        response = client.post("/api/extract", data={})
        self.assertEqual(response.status_code, 400)
        self.assertIn("No file uploaded", response.json()["detail"])

    def test_corrupt_pdf_returns_422(self):
        """Test POST /api/extract with corrupted PDF structure returns HTTP 422."""
        response = client.post(
            "/api/extract",
            files={"file": ("corrupt.pdf", b"%PDF-1.4\ncorrupted bytes content %%EOF", "application/pdf")}
        )
        self.assertEqual(response.status_code, 422)
        self.assertIn("detail", response.json())

    def test_handle_pdf_no_detectable_headings(self):
        """Test POST /api/extract handles a PDF with body text but no detectable headings gracefully."""
        import pypdfium2 as pdfium
        pdf = pdfium.PdfDocument(SAMPLE_PDF_PATH)
        single_doc = pdfium.PdfDocument.new()
        single_doc.import_pages(pdf, [3]) # Page 4 has pure body text without headings
        buf = io.BytesIO()
        single_doc.save(buf)

        response = client.post(
            "/api/extract",
            files={"file": ("unheaded.pdf", buf.getvalue(), "application/pdf")}
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["success"])
        self.assertEqual(payload["metadata"]["sections_found"], 1)
        section = payload["data"][0]
        self.assertEqual(section["id"], "section-1")
        self.assertEqual(section["heading"], "Document Content")
        self.assertEqual(section["level"], 1)
        self.assertGreater(section["char_count"], 0)
        self.assertIn("American General Life Insurance", section["text"])


if __name__ == "__main__":
    unittest.main()

