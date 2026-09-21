"""
Automated Integration and Unit Tests for ExtractAI Backend
Tests POST /api/extract, GET /api/health, error handling, and performance benchmarking.
"""

import os
import time
import unittest
from fastapi.testclient import TestClient

from backend.main import app

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

    def test_extract_amgn_pdf_performance_and_accuracy(self):
        """
        Test POST /api/extract with the AMGN filing PDF:
        - Response time must be < 2 seconds
        - Must extract between 5 and 15 major sections accurately
        - Must return valid schema {success: true, data: [{heading, text}]}
        """
        self.assertTrue(os.path.exists(SAMPLE_PDF_PATH), f"Sample PDF missing at {SAMPLE_PDF_PATH}")

        start_time = time.time()
        with open(SAMPLE_PDF_PATH, "rb") as f:
            response = client.post(
                "/api/extract",
                files={"file": ("AMGN-135003565.pdf", f, "application/pdf")}
            )
        elapsed = time.time() - start_time

        # Validate HTTP status and latency
        self.assertEqual(response.status_code, 200, f"Expected 200, got {response.status_code}: {response.text}")
        self.assertLess(elapsed, 2.0, f"Extraction took {elapsed:.2f}s, exceeding 2.0s requirement")

        payload = response.json()
        self.assertTrue(payload["success"])
        self.assertIn("data", payload)
        self.assertIsInstance(payload["data"], list)

        sections = payload["data"]
        # Fulfills: "Extract ~5-10 major sections accurately"
        self.assertGreaterEqual(len(sections), 5, f"Expected at least 5 sections, got {len(sections)}")
        self.assertLessEqual(len(sections), 15, f"Expected at most 15 major sections, got {len(sections)}")

        # Validate structure of each section
        for s in sections:
            self.assertIn("heading", s)
            self.assertIn("text", s)
            self.assertIsInstance(s["heading"], str)
            self.assertIsInstance(s["text"], str)
            self.assertGreater(len(s["heading"]), 0)

        # Check that prominent expected sections from the AMGN filing are present
        headings_found = [s["heading"] for s in sections]
        print("\n[TEST OUTPUT] Extracted Headings:")
        for idx, h in enumerate(headings_found, 1):
            print(f"  {idx}. {h}")
        print(f"[TEST OUTPUT] API Roundtrip Time: {elapsed:.3f}s (Internal parse: {payload.get('processing_time_sec', 'N/A')}s)\n")

        self.assertTrue(any("Table of Contents" in h for h in headings_found), "Table of Contents not found")
        self.assertTrue(any("Filing at a Glance" in h for h in headings_found), "Filing at a Glance not found")
        self.assertTrue(any("General Information" in h for h in headings_found), "General Information not found")
        self.assertTrue(any("Disposition" in h for h in headings_found), "Disposition not found")

    def test_extract_detailed_granularity(self):
        """Test POST /api/extract?granularity=detailed returns subheadings as well."""
        with open(SAMPLE_PDF_PATH, "rb") as f:
            response = client.post(
                "/api/extract?granularity=detailed",
                files={"file": ("AMGN-135003565.pdf", f, "application/pdf")}
            )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        sections = payload["data"]
        # Detailed should find more sections (including sub-items)
        self.assertGreater(len(sections), 10)

    def test_reject_non_pdf_extension(self):
        """Test POST /api/extract rejects non-pdf file extensions with HTTP 400."""
        response = client.post(
            "/api/extract",
            files={"file": ("document.txt", b"Hello text file", "text/plain")}
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("Only .pdf files are accepted", response.json()["detail"])

    def test_reject_empty_file(self):
        """Test POST /api/extract rejects empty files with HTTP 400."""
        response = client.post(
            "/api/extract",
            files={"file": ("empty.pdf", b"", "application/pdf")}
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("empty", response.json()["detail"].lower())

    def test_reject_invalid_magic_bytes(self):
        """Test POST /api/extract rejects files that do not start with %PDF- header."""
        response = client.post(
            "/api/extract",
            files={"file": ("fake.pdf", b"NOT_A_REAL_PDF_DATA", "application/pdf")}
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("%PDF-", response.json()["detail"])


if __name__ == "__main__":
    unittest.main()
