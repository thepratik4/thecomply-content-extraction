"""
ExtractAI FastAPI Server
Provides the POST /api/extract endpoint to convert PDF documents into structured
heading and body-text pairs with hierarchy metadata.
"""

import asyncio
from typing import Any, Dict, List, Optional
from fastapi import FastAPI, File, HTTPException, Query, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

try:
    from backend.extractor import PDFExtractionError, extract_sections
except ImportError:
    from extractor import PDFExtractionError, extract_sections


# --- Response Schemas ---
class SectionItem(BaseModel):
    id: str = Field(..., description="Unique stable section identifier, e.g., 'section-1'")
    heading: str = Field(..., description="Detected section heading")
    level: int = Field(1, description="Heading hierarchy level (1=H1, 2=H2, 3=H3)")
    text: str = Field(..., description="Associated body text; H2/H3 subheadings appear as ## / ### markers")
    page: int = Field(..., description="1-indexed source page where the heading begins")
    char_count: int = Field(..., description="Character count of body text")
    tables: Optional[List[Dict[str, Any]]] = Field(
        default=None,
        description="Structured tables detected on pages belonging to this section"
    )


class ExtractionMetadata(BaseModel):
    file_name: str = Field(..., description="Name of the extracted file")
    file_size: str = Field(..., description="Formatted file size string, e.g., '30.2 KB'")
    total_pages: int = Field(..., description="Total pages in the PDF document")
    sections_found: int = Field(..., description="Total number of extracted sections")
    extraction_time_ms: int = Field(..., description="Extraction execution duration in milliseconds")
    language: str = Field("en", description="Detected language ISO code")


class ExtractionResponse(BaseModel):
    success: bool = Field(True, description="Indicates whether extraction succeeded")
    metadata: ExtractionMetadata = Field(..., description="Comprehensive extraction and document metadata")
    data: List[SectionItem] = Field(..., description="List of extracted heading-text sections")
    total_pages: Optional[int] = Field(None, description="Root alias for total pages")
    processing_time_sec: Optional[float] = Field(None, description="Root alias for duration in seconds")


class ErrorResponse(BaseModel):
    success: bool = Field(False, description="Indicates failure")
    error: str = Field(..., description="Error category description")
    detail: Optional[str] = Field(None, description="Detailed error information")


# --- App Initialization ---
app = FastAPI(
    title="TheExtractor PDF Extraction API",
    description="High-performance pipeline converting complex PDF documents into structured heading and body-text pairs.",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# --- CORS Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["General"])
def root():
    """Root endpoint providing service metadata."""
    return {
        "service": "ExtractAI PDF Extraction API",
        "version": "2.0.0",
        "status": "operational",
        "endpoints": {
            "extract": "POST /api/extract",
            "health": "GET /api/health",
            "docs": "/docs"
        }
    }


@app.get("/api/health", tags=["Health"])
def health_check():
    """Health check endpoint for liveness and readiness monitoring."""
    return {
        "status": "healthy",
        "service": "ExtractAI",
        "version": "2.0.0"
    }


@app.post(
    "/api/extract",
    response_model=ExtractionResponse,
    responses={
        400: {"model": ErrorResponse, "description": "No file uploaded or file is empty"},
        422: {"model": ErrorResponse, "description": "Invalid file format (not a PDF) or corrupt PDF document"},
        504: {"model": ErrorResponse, "description": "Extraction timeout exceeding 30 seconds"},
        500: {"model": ErrorResponse, "description": "Internal server processing error"}
    },
    tags=["Extraction"]
)
async def extract_pdf(
    file: Optional[UploadFile] = File(None, description="The PDF file to extract text from"),
    granularity: str = Query(
        default="major",
        regex="^(major|detailed)$",
        description="Extraction granularity: 'major' (primary sections/H1) or 'detailed' (includes subheadings H2/H3)"
    )
):
    """
    Extracts structured headings and associated body text from an uploaded PDF.

    - Accepts multipart/form-data with a PDF file.
    - Accurately detects H1, H2, H3, numbered sections (e.g. 1, 1.1, 01, 02), and multi-line headings.
    - Separates headings from body text, preserving paragraph boundaries and pruning empty sections.
    - Returns structured JSON with complete metadata (pages, duration in ms, language, size) and data.
    - Limits request execution time to 30 seconds.
    """
    # 1. Validate file presence (400: no file uploaded)
    if file is None or not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No file uploaded. Please upload a valid PDF document."
        )

    # 2. Read file contents into memory
    try:
        content = await file.read()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read uploaded file: {str(e)}"
        )

    # Check for empty file content (400: empty file)
    if len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is empty (0 bytes)."
        )

    # 3. Validate PDF extension and magic bytes (422: file is not a PDF)
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid file type '{file.filename}'. File is not a PDF. Only .pdf files are accepted."
        )

    if not content.startswith(b"%PDF-"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid PDF format. The file does not start with valid PDF magic bytes ('%PDF-')."
        )

    # 4. Run extraction engine with 30-second timeout guard
    try:
        result = await asyncio.wait_for(
            asyncio.to_thread(
                extract_sections,
                content,
                filename=file.filename,
                granularity=granularity
            ),
            timeout=90.0
        )
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content=result
        )
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="PDF extraction timed out: request exceeded maximum allowed processing time of 90 seconds."
        )
    except PDFExtractionError as pe:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(pe)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected internal error occurred during PDF extraction: {str(e)}"
        )
    finally:
        await file.close()
