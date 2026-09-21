# ExtractAI - PDF Extraction Pipeline & FastAPI Backend

A high-performance Python extraction pipeline and FastAPI service that extracts structured headings and associated body-text pairs from complex PDF documents.

## Key Features

- **Heuristic Heading Detection:** Leverages `pdfplumber` to extract character-level attributes (font name, font size, coordinates). Computes the dominant modal body font size dynamically and identifies section headings based on font size tiers, bold weights, and spatial isolation.
- **Kerning & Encoding Repair:** Automatically fixes font encoding and kerning artifacts common in regulatory/legal PDFs (e.g., repairing single-letter word breaks like `T able` → `Table`, `F iling` → `Filing`).
- **Margin & Noise Filtering:** Identifies and strips running headers, footers, page numbers, and repetitive tracking codes (such as SERFF numbers).
- **Sub-Second Performance:** Processes multi-page complex PDFs (e.g., 15-page AMGN SEC filing) in **~0.7 seconds**, easily exceeding the < 2-second SLA.
- **Clean JSON Output:** Returns structured, predictable JSON:
  ```json
  {
    "success": true,
    "data": [
      {
        "heading": "Table of Contents",
        "text": "User Usage Agreement Attachments..."
      },
      {
        "heading": "Filing at a Glance",
        "text": "Company: American General Life Insurance Company..."
      }
    ],
    "total_pages": 15,
    "processing_time_sec": 0.728
  }
  ```
- **Error Handling:** Returns RFC-compliant HTTP status codes:
  - `400 Bad Request`: Missing file, non-PDF extension, empty file (0 bytes), or invalid magic bytes.
  - `422 Unprocessable Entity`: Corrupt PDF, image-only/scanned PDF without OCR layer.
  - `500 Internal Server Error`: Unhandled server exceptions.
- **CORS Enabled:** Pre-configured with CORS middleware to integrate with React / Vite frontends.

---

## Architecture

```
backend/
├── __init__.py           # Package indicator
├── extractor.py          # Core pdfplumber parsing engine and heuristics
├── main.py               # FastAPI server and API endpoints
├── run_server.py         # Startup script
├── test_api.py           # Automated unit and integration tests
├── requirements.txt      # Python dependencies
└── samples/
    └── AMGN-135003565.pdf # Demo SEC/insurance filing PDF
```

---

## Getting Started

### 1. Install Dependencies
```bash
pip install -r backend/requirements.txt
```

### 2. Start the FastAPI Server
```bash
# Using Python runner:
python backend/run_server.py

# Or directly with Uvicorn:
uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```
The server will be available at:
- **Interactive OpenAPI Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check:** [http://localhost:8000/api/health](http://localhost:8000/api/health)
- **Extract Endpoint:** `POST http://localhost:8000/api/extract`

---

## API Reference

### `POST /api/extract`
Accepts a PDF document via `multipart/form-data` and returns extracted sections.

#### Query Parameters:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `granularity` | `string` | `major` | `major` (~5-15 major sections) or `detailed` (includes subheadings) |

#### Example cURL:
```bash
curl -X POST "http://127.0.0.1:8000/api/extract" \
  -F "file=@backend/samples/AMGN-135003565.pdf"
```

#### Example Response:
```json
{
  "success": true,
  "data": [
    {
      "heading": "Table of Contents",
      "text": "User Usage Agreement Attachments Usage Agreement..."
    },
    {
      "heading": "Filing at a Glance",
      "text": "Company: American General Life Insurance Company Product Name: Expanded SOV..."
    },
    {
      "heading": "General Information",
      "text": "Project Name: Status of Filing in Domicile: Pending..."
    },
    {
      "heading": "Company and Contact",
      "text": "Filing Contact Information Aileen Apuy, Manager, State Filings..."
    },
    {
      "heading": "Filing Fees",
      "text": "State Fees Fee Required? Yes Fee Amount: $125.00..."
    },
    {
      "heading": "Correspondence Summary",
      "text": "Dispositions Status Created By Created On Date Submitted..."
    },
    {
      "heading": "Disposition",
      "text": "Disposition Date: 08/17/2026 Effective Date: Status: Received and filed..."
    },
    {
      "heading": "Objection Letter",
      "text": "Objection Letter Status Objection Letter Sent..."
    },
    {
      "heading": "Response Letter",
      "text": "Response Letter Status Submitted to State..."
    },
    {
      "heading": "Note To Reviewer",
      "text": "Created By: Aileen Apuy on 08/13/2026 10:48 AM..."
    },
    {
      "heading": "Supporting Document Schedules",
      "text": "Bypassed - Item: Actuarial Memorandum Bypass Reason: N/A..."
    }
  ],
  "total_pages": 15,
  "processing_time_sec": 0.728
}
```

---

## Running the Automated Test Suite

Run the full integration test suite:
```bash
python -m unittest backend.test_api
```

This verifies:
1. Root and Health endpoints return 200 OK.
2. AMGN filing PDF returns between 5 and 15 major sections with accurate headings.
3. Response latency is strictly under 2.0 seconds.
4. Non-PDF files, empty files, and corrupt magic bytes are rejected with HTTP 400.
5. Detailed granularity returns fine-grained subheadings.
