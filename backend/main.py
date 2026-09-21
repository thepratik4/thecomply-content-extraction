"""
ExtractAI FastAPI Server
Provides the POST /api/extract endpoint to convert PDF documents into structured
heading and body-text pairs.
"""

from typing import List, Optional
import os
from fastapi import FastAPI, File, HTTPException, Query, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from backend.extractor import PDFExtractionError, extract_sections


# --- Response Schemas ---
class SectionItem(BaseModel):
    heading: str = Field(..., description="Detected section heading")
    text: str = Field(..., description="Associated body text under the heading")


class ExtractionResponse(BaseModel):
    success: bool = Field(True, description="Indicates whether extraction succeeded")
    data: List[SectionItem] = Field(..., description="List of extracted heading-text pairs")
    total_pages: Optional[int] = Field(None, description="Total number of pages processed")
    processing_time_sec: Optional[float] = Field(None, description="Execution time in seconds")


class ErrorResponse(BaseModel):
    success: bool = Field(False, description="Indicates failure")
    error: str = Field(..., description="Error description")
    detail: Optional[str] = Field(None, description="Detailed error information")


# --- App Initialization ---
app = FastAPI(
    title="ExtractAI PDF Extraction API",
    description="High-performance pipeline converting complex PDF documents into structured heading and body-text pairs.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# --- CORS Middleware ---
# Configured to support Vite / React frontends and external clients
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
        "version": "1.0.0",
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
        "version": "1.0.0"
    }


@app.post(
    "/api/extract",
    response_model=ExtractionResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid file or non-PDF input"},
        422: {"model": ErrorResponse, "description": "Unprocessable or corrupt PDF"},
        500: {"model": ErrorResponse, "description": "Internal server processing error"}
    },
    tags=["Extraction"]
)
async def extract_pdf(
    file: UploadFile = File(..., description="The PDF file to extract text from"),
    granularity: str = Query(
        default="major",
        regex="^(major|detailed)$",
        description="Extraction granularity: 'major' (~5-15 main sections) or 'detailed' (includes subheadings)"
    )
):
    """
    Extracts structured headings and associated body text from an uploaded PDF.
    
    - Accepts multipart/form-data with a PDF file.
    - Uses pdfplumber with font size/weight and spatial heuristics.
    - Returns structured JSON with heading + associated text pairs.
    """
    # 1. Validate file presence and filename extension
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No filename provided in upload."
        )

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type '{file.filename}'. Only .pdf files are accepted."
        )

    # 2. Read file contents into memory
    try:
        content = await file.read()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read uploaded file: {str(e)}"
        )

    if len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is empty (0 bytes)."
        )

    # 3. Validate PDF magic bytes (%PDF-)
    if not content.startswith(b"%PDF-"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file does not start with valid PDF header magic bytes ('%PDF-')."
        )

    # 4. Run extraction engine
    try:
        result = extract_sections(content, granularity=granularity)
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content=result
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
