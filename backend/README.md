# ExtractAI - PDF Extraction Pipeline & FastAPI Backend

A high-performance Python extraction pipeline and FastAPI service that extracts structured headings and associated body-text pairs from complex PDF documents.

## Key Features

- **Heuristic Heading Detection & Hierarchy:** Leverages `pdfplumber` to extract character-level attributes (font name, font size, coordinates). Computes the dominant modal body font size dynamically, identifies H1, H2, and H3 tiers, handles numbered patterns (e.g. `1`, `1.1`, `01`, `02`), and accurately joins multi-line headings.
- **Kerning & Encoding Repair:** Automatically fixes font encoding and kerning artifacts common in regulatory/legal PDFs (e.g., repairing single-letter word breaks like `T able` → `Table`, `F iling` → `Filing`).
- **Margin & Noise Filtering:** Identifies and strips running headers, footers, page numbers, and repetitive tracking codes (such as SERFF numbers).
- **Sub-Second Performance & Caching:** Processes multi-page complex PDFs (e.g., 15-page AMGN SEC filing) in **~0.7 seconds**, with thread-safe LRU caching delivering sub-millisecond repeated responses.
- **Clean JSON Output:** Returns structured, predictable JSON adhering to the ExtractAI contract:
  ```json
  {
    "success": true,
    "metadata": {
      "file_name": "AMGN-135003565.pdf",
      "file_size": "30.2 KB",
      "total_pages": 15,
      "sections_found": 11,
      "extraction_time_ms": 740,
      "language": "en"
    },
    "data": [
      {
        "id": "section-1",
        "heading": "Table of Contents",
        "level": 1,
        "text": "User Usage Agreement\nAttachments...",
        "page": 1,
        "char_count": 263
      },
      {
        "id": "section-2",
        "heading": "Filing at a Glance",
        "level": 1,
        "text": "Company: American General Life Insurance Company...",
        "page": 2,
        "char_count": 607
      }
    ]
  }
  ```
- **Error Handling & Protection:**
  - `400 Bad Request`: No file uploaded or empty file (0 bytes).
  - `422 Unprocessable Entity`: File is not a PDF (invalid extension or missing `%PDF-` header), corrupted PDF, or unparseable stream.
  - `504 Gateway Timeout`: Prevents requests from running longer than 30 seconds.
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
  "metadata": {
    "file_name": "AMGN-135003565.pdf",
    "file_size": "30.2 KB",
    "total_pages": 15,
    "sections_found": 11,
    "extraction_time_ms": 740,
    "language": "en"
  },
  "data": [
    {
      "id": "section-1",
      "heading": "Table of Contents",
      "level": 1,
      "text": "User Usage Agreement\nAttachments: Usage Agreement Usage Agreement.pdf...",
      "page": 1,
      "char_count": 263
    },
    {
      "id": "section-2",
      "heading": "Filing at a Glance",
      "level": 1,
      "text": "Company: American General Life Insurance Company\nProduct Name: Expanded SOV...",
      "page": 2,
      "char_count": 607
    },
    {
      "id": "section-3",
      "heading": "General Information",
      "level": 1,
      "text": "Project Name: Status of Filing in Domicile: Pending...",
      "page": 3,
      "char_count": 1607
    }
  ]
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
