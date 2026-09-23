# TheExtractor — Automated PDF Document Extraction & Structured Analysis

> **High-precision, deterministic PDF extraction pipeline and interactive compliance workspace built for complex regulatory filings, contracts, and unstructured multi-page documents.**

---

## 🎯 Executive Summary & Prompt Overview

Regulatory filings (SEC filings, SERFF insurance documents, financial disclosures, contracts) are notoriously difficult to ingest programmatically. They often contain:
- Inconsistent font sizes, bolding, and styling for titles vs. boilerplate text
- Broken kerning and character-encoding artifacts (e.g., `T able` instead of `Table`, `F iling` instead of `Filing`)
- Margin noise: repeating running headers, footers, page numbering, and tracking numbers
- Mixed tabular schedules, key-value pairs, and multi-line clause headings

**TheExtractor** solves this challenge with an **automated, deterministic Python extraction engine** paired with an **enterprise-grade React 19 compliance studio**. It replaces slow, error-prone, and hallucinating LLM-based scraping with character-level spatial heuristics, modal font-size analysis, and sub-second performance (~0.7s for 15+ page documents).

---

## 🧭 Interactive Guided Tour (Recommended for Moderators & Evaluators)

The application features a built-in **Interactive Guided Tour** that walks evaluators step-by-step through every core capability and architectural layer of the application.

### How to Launch the Tour:
1. Open the application in your browser (`http://localhost:5173/`).
2. Navigate to the dashboard (or click **Open Studio** / **Dashboard** from the top bar).
3. In the top-right header, click the **"Guided Tour"** button (with the compass icon).
4. The tour will highlight and explain each component in sequence, with an action button that automatically loads and extracts the bundled sample document (`AMGN-135003565.pdf`).

### Tour Steps & Capabilities Covered:
1. **Upload & File Selection**: Drag-and-drop file ingestion, local file browsing, and instant 1-click sample document loading.
2. **Document Structure & H1 Hierarchy**: Live heading tree showing major sections, page numbers, character counts, and nesting.
3. **Source Traceability & Audit Trail**: Direct link to the source PDF page for instant audit verification by compliance analysts.
4. **Section Controls & Quick Copy**: Quick accordion expand/collapse and 1-click Markdown copy of individual provisions.
5. **Multi-View Explorer & Structured Tables**: Toggle between Structured Explorer, Isolated Tables View (with 1-click TSV export for Excel), and raw JSON code view.
6. **Bulk Copy & JSON Export**: One-click bulk Markdown export or full standardized JSON payload download for downstream ETL pipelines.
7. **Real-Time Search & Match Highlighting**: Instant multi-keyword search across all extracted headings, body paragraphs, and table rows with visual highlighted matches.
8. **Enterprise Batch Processing**: Multi-document queue for bulk processing dozens of filings concurrently.

---

## 🚀 Quickstart Guide for Moderators & Evaluators

Follow these straightforward steps to get both the Python FastAPI backend and the React frontend running locally.

### Prerequisites
- **Node.js**: `v18.0.0` or higher (`v20+` recommended)
- **Python**: `3.10` or higher
- **Package Managers**: `npm` and `pip`

---

### Step 1: Clone & Navigate to Repository
```bash
git clone https://github.com/thepratik4/thecomply-content-extraction.git
cd thecomply-content-extraction
```

---

### Step 2: Backend Setup (FastAPI + PDF Extraction Engine)

1. **Create and activate a virtual environment (optional but recommended):**
   ```bash
   # Windows (PowerShell)
   python -m venv venv
   .\venv\Scripts\Activate.ps1

   # macOS / Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

2. **Install backend dependencies:**
   ```bash
   pip install -r backend/requirements.txt
   ```

3. **Start the FastAPI backend server:**
   ```bash
   python backend/run_server.py
   ```
   *The backend will start at: `http://127.0.0.1:8000`*
   - Interactive OpenAPI/Swagger Documentation: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
   - Health Check Endpoint: [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)

---

### Step 3: Frontend Setup (React 19 + TypeScript + Vite)

In a separate terminal window:

1. **Install Node dependencies:**
   ```bash
   npm install
   ```

2. **Start the frontend development server:**
   ```bash
   npm run dev
   ```
   *The frontend will launch at: `http://localhost:5173`*

---

### Step 4: Verification & First Test

1. Visit [http://localhost:5173](http://localhost:5173) in your browser.
2. In the hero section, click **"Open Studio"** or **"Launch Tour"**.
3. In the studio, click the sample document card **`AMGN-135003565.pdf`** (located at `backend/samples/AMGN-135003565.pdf`) or drag and drop any PDF file.
4. Watch the pipeline process and render the structured section hierarchy, tables, and audit details in real time.

---

## 🏗️ System Architecture & Tech Stack

```
thecomply-content-extraction/
├── backend/
│   ├── extractor.py        # Core pdfplumber extraction heuristics, kerning repair & noise filters
│   ├── main.py             # FastAPI REST endpoints (/api/extract, /api/health)
│   ├── run_server.py       # Standalone Uvicorn runner
│   ├── test_api.py         # Automated integration and performance test suite
│   ├── requirements.txt    # Python dependencies (FastAPI, pdfplumber, uvicorn, pydantic)
│   └── samples/
│       └── AMGN-135003565.pdf # 15-page SEC/SERFF filing sample document
├── src/
│   ├── components/
│   │   ├── app-sidebar.tsx        # Dashboard navigation shell, mobile drawer, pinned settings
│   │   ├── SidebarGreeting.tsx   # Dynamic Indian Standard Time (IST) greeting widget
│   │   ├── mode-toggle.tsx       # iOS/macOS-style sliding pill theme switch (Dark / Light)
│   │   ├── TheExtractorLogo.tsx  # Vector SVG brand icon with hover micro-animations
│   │   ├── PdfExtractor.tsx      # Main Studio: upload, section viewer, tables, audit trail
│   │   ├── DocumentsPage.tsx     # Historical documents explorer with searchable sections & tables
│   │   ├── BatchExtractionPage.tsx # Multi-file bulk processing queue
│   │   ├── Tour.tsx              # Portal-based interactive onboarding engine
│   │   └── TourConfirmModal.tsx  # Tour restart & workspace confirmation dialog
│   ├── hooks/
│   │   └── useRouter.ts          # Pathname-based history routing with hash backward compatibility
│   ├── App.tsx                   # Main root view & route orchestrator
│   └── main.tsx                  # Application mount point & theme provider
└── package.json                  # React 19, TypeScript, Vite, GSAP, Lucide icons
```

### Key Technical Innovations:
1. **Character-Level Heuristics (`backend/extractor.py`)**:
   - Calculates the **dominant modal font size** of the document to establish the baseline body size.
   - Identifies candidate headings using font size multipliers, bold font weights, and structural line breaks.
   - Reconstructs multi-line headings while ignoring false-positive section breaks.
2. **Kerning & Encoding Fixer**:
   - Detects single-letter fragmented glyphs caused by embedded PDF font encodings (`T able` → `Table`, `F iling` → `Filing`).
3. **Margin & Running Noise Stripping**:
   - Automatically detects top and bottom running margins, stripping recurring page numbers, SERFF tracking codes, and legal disclaimers from content blocks.
4. **Sliding Pill Theme Switch**:
   - Custom iOS/macOS-style sliding toggle switch with spring transitions and WCAG-accessible `role="switch"` semantics.
5. **Pathname-Based Router with Hash Compatibility**:
   - Provides clean URLs (`/`, `/studio`, `/documents`, `/batch`, `/settings`) with full browser history Back/Forward synchronization and seamless hash fallback support.

---

## 📡 API Contract Reference

### `POST /api/extract`
Uploads a PDF file via `multipart/form-data` and returns the structured extraction payload.

#### Request:
- **Headers:** `Content-Type: multipart/form-data`
- **Body:** `file` (binary PDF data)
- **Query Params:**
  - `granularity`: `major` (default, ~5–15 primary sections) or `detailed` (sub-clauses included)

#### Response Schema (`200 OK`):
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
      "char_count": 263,
      "tables": []
    }
  ]
}
```

#### Error Responses:
- `400 Bad Request`: Empty file or missing upload.
- `422 Unprocessable Entity`: Non-PDF file, missing `%PDF-` signature, or corrupted binary stream.
- `504 Gateway Timeout`: Processing exceeded the 30-second execution threshold.

---

## 🧪 Testing & Validation

### Run Backend Integration & Performance Tests:
```bash
python -m unittest backend/test_api.py
```
This tests:
- Root metadata endpoint and health check
- Sub-second performance against the 15-page `AMGN-135003565.pdf` filing
- Heading hierarchy verification and schema conformance
- Error boundaries (empty files, invalid extensions, non-PDF payloads)

### Run Frontend Build & Linter:
```bash
npm run build
npm run lint
```

---

## 📄 License

This project is licensed under the MIT License. Developed for automated document extraction and regulatory compliance workflows.
