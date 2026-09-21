import React, { useState, useRef } from "react";
import { MOCK_EXTRACTION_DATA, type ExtractedSection } from "../mockData";
import "./PdfExtractor.css";

interface ExtractionMeta {
  totalPages?: number;
  extractionTimeMs?: number;
  processingTimeSec?: number;
  fileName?: string;
  fileSize?: string | number;
  sectionsFound?: number;
  language?: string;
}

export const PdfExtractor: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>("Preparing document...");
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ExtractedSection[] | null>(null);
  const [meta, setMeta] = useState<ExtractionMeta | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [allCopied, setAllCopied] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"cards" | "json">("cards");
  const [useMockMode, setUseMockMode] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Format file size utility
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === "application/pdf" || droppedFile.name.toLowerCase().endsWith(".pdf")) {
        setFile(droppedFile);
        setError(null);
      } else {
        setError("Please upload a valid PDF document (.pdf).");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === "application/pdf" || selectedFile.name.toLowerCase().endsWith(".pdf")) {
        setFile(selectedFile);
        setError(null);
      } else {
        setError("Please select a valid PDF document (.pdf).");
      }
    }
  };

  const handleChooseFileClick = () => {
    fileInputRef.current?.click();
  };

  // Load sample data instantly for testing
  const handleLoadSample = () => {
    setFile(new File(["sample-binary-content"], "AMGN-135003565.pdf", { type: "application/pdf" }));
    setIsLoading(true);
    setError(null);
    setLoadingStep("Reading PDF layout and character streams...");

    setTimeout(() => {
      setLoadingStep("Extracting headings and clustering body text...");
      setTimeout(() => {
        setResults(MOCK_EXTRACTION_DATA);
        setMeta({
          totalPages: 15,
          extractionTimeMs: 740,
          processingTimeSec: 0.74,
          fileName: "AMGN-135003565.pdf",
          fileSize: "30.2 KB",
          sectionsFound: 11,
          language: "en"
        });
        setIsLoading(false);
        // Scroll smoothly to results
        setTimeout(() => {
          resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      }, 500);
    }, 400);
  };

  // Run extraction via API or mock
  const handleExtract = async () => {
    if (!file) {
      setError("Please select or drop a PDF file first.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setLoadingStep("Uploading document to extraction pipeline...");

    // Simulated progress transitions
    const stepTimer1 = setTimeout(() => {
      setLoadingStep("Analyzing font sizes, weights, and margins...");
    }, 350);

    const stepTimer2 = setTimeout(() => {
      setLoadingStep("Parsing headings and associating section text...");
    }, 700);

    // If Mock Mode is explicitly toggled, use mock data immediately
    if (useMockMode) {
      setTimeout(() => {
        clearTimeout(stepTimer1);
        clearTimeout(stepTimer2);
        setResults(MOCK_EXTRACTION_DATA);
        setMeta({
          totalPages: 15,
          extractionTimeMs: 680,
          processingTimeSec: 0.68,
          fileName: file.name,
          fileSize: formatFileSize(file.size),
          sectionsFound: 11,
          language: "en"
        });
        setIsLoading(false);
        setTimeout(() => {
          resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      }, 900);
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      // Try local relative proxy first, fallback to localhost:8000
      let response: Response;
      try {
        response = await fetch("/api/extract", {
          method: "POST",
          body: formData,
        });
      } catch (networkErr) {
        // Retry direct to backend port 8000 if proxy failed
        response = await fetch("http://127.0.0.1:8000/api/extract", {
          method: "POST",
          body: formData,
        });
      }

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.detail || `Extraction failed with status ${response.status} (${response.statusText})`
        );
      }

      const json = await response.json();
      if (json.success && Array.isArray(json.data)) {
        setResults(json.data);
        const m = json.metadata || {};
        setMeta({
          totalPages: m.total_pages ?? json.total_pages,
          extractionTimeMs: m.extraction_time_ms ?? (json.processing_time_sec ? Math.round(json.processing_time_sec * 1000) : undefined),
          processingTimeSec: m.extraction_time_ms ? (m.extraction_time_ms / 1000) : json.processing_time_sec,
          fileName: m.file_name ?? file.name,
          fileSize: m.file_size ?? formatFileSize(file.size),
          sectionsFound: m.sections_found ?? json.data.length,
          language: m.language ?? "en"
        });
        setTimeout(() => {
          resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      } else {
        throw new Error("Unexpected API response format.");
      }
    } catch (err: any) {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      console.warn("Backend API connection error:", err);
      setError(
        `${err.message || "Failed to connect to extraction server."} (Tip: Toggle 'Use Mock Data' below or ensure FastAPI server is running on port 8000)`
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Copy individual section
  const handleCopySection = (index: number, section: ExtractedSection) => {
    const formatted = `## ${section.heading}\n\n${section.text}`;
    navigator.clipboard.writeText(formatted);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Copy all results as JSON
  const handleCopyAllJSON = () => {
    if (!results) return;
    const jsonStr = JSON.stringify({ success: true, data: results }, null, 2);
    navigator.clipboard.writeText(jsonStr);
    setAllCopied(true);
    setTimeout(() => setAllCopied(false), 2000);
  };

  // Download all results as JSON
  const handleDownloadJSON = () => {
    if (!results) return;
    const exportData = {
      success: true,
      meta: {
        exportedAt: new Date().toISOString(),
        ...meta,
      },
      data: results,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const baseName = meta?.fileName?.replace(/\.pdf$/i, "") || "document";
    link.download = `${baseName}_extracted_data.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Reset state
  const handleReset = () => {
    setFile(null);
    setResults(null);
    setMeta(null);
    setError(null);
    setSearchQuery("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Filtered results
  const filteredResults = (results || []).filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.heading.toLowerCase().includes(q) || s.text.toLowerCase().includes(q)
    );
  });

  return (
    <section className="extractor-section" id="extractor">
      <div className="extractor-container">
        {/* Section Header */}
        <div className="extractor-header">
          <p className="extractor-eyebrow">
            <span className="extractor-eyebrow-dot" />
            Interactive Workspace
          </p>
          <h2 className="extractor-title">Document Extraction Studio</h2>
          <p className="extractor-subtitle">
            Upload your PDF and extract headings, clauses, and corresponding text
            into structured JSON in seconds.
          </p>
        </div>

        {/* ── 1. Upload Zone ────────────────────────────────────────── */}
        <div className="upload-wrapper">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileChange}
            className="file-input-hidden"
            aria-label="Upload PDF File"
          />

          <div
            className={`dropzone ${isDragging ? "dropzone--dragging" : ""} ${file ? "dropzone--has-file" : ""}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={!file ? handleChooseFileClick : undefined}
          >
            <div className="dropzone-icon-wrap">
              {file ? (
                <svg className="dropzone-icon dropzone-icon--file" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points="14 2 14 8 20 8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="16" y1="13" x2="8" y2="13" strokeWidth="1.8" strokeLinecap="round"/>
                  <line x1="16" y1="17" x2="8" y2="17" strokeWidth="1.8" strokeLinecap="round"/>
                  <line x1="10" y1="9" x2="8" y2="9" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              ) : (
                <svg className="dropzone-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points="17 8 12 3 7 8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="12" y1="3" x2="12" y2="15" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>

            {file ? (
              <div className="file-info-container">
                <div className="file-info-header">
                  <span className="file-badge">PDF Document</span>
                  <button
                    type="button"
                    className="file-remove-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReset();
                    }}
                    title="Remove file"
                  >
                    ✕
                  </button>
                </div>
                <div className="file-info-name" title={file.name}>
                  {file.name}
                </div>
                <div className="file-info-size">{formatFileSize(file.size)}</div>
              </div>
            ) : (
              <div className="dropzone-text-group">
                <p className="dropzone-prompt">
                  <strong>Drag & drop your PDF here</strong>, or{" "}
                  <button
                    type="button"
                    className="dropzone-browse-link"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleChooseFileClick();
                    }}
                  >
                    browse files
                  </button>
                </p>
                <p className="dropzone-subtext">Supports SEC filings, agreements, contracts, and regulatory filings</p>
              </div>
            )}
          </div>

          {/* Action Row */}
          <div className="upload-controls">
            <div className="upload-options">
              <label className="mock-toggle" title="Toggle between local Mock Data and live FastAPI server">
                <input
                  type="checkbox"
                  checked={useMockMode}
                  onChange={(e) => setUseMockMode(e.target.checked)}
                />
                <span className="mock-toggle-label">Use Mock Data Mode</span>
              </label>

              {!file && (
                <button
                  type="button"
                  className="btn-sample"
                  onClick={handleLoadSample}
                  disabled={isLoading}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                  </svg>
                  Try AMGN Sample Filing
                </button>
              )}
            </div>

            <div className="upload-cta-group">
              {file && (
                <button
                  type="button"
                  className="btn-clear"
                  onClick={handleReset}
                  disabled={isLoading}
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                className={`btn-extract ${isLoading ? "btn-extract--loading" : ""}`}
                onClick={handleExtract}
                disabled={!file || isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="spinner" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>Extract Sections</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="5" y1="12" x2="19" y2="12"/>
                      <polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="error-banner">
              <svg className="error-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <div className="error-content">
                <p className="error-msg">{error}</p>
                <div className="error-actions">
                  <button type="button" className="error-btn-mock" onClick={handleLoadSample}>
                    View with Sample Data
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Loading Spinner & Status Indicator */}
          {isLoading && (
            <div className="loading-card">
              <div className="loading-spinner-ring" />
              <div className="loading-text-group">
                <p className="loading-step-title">{loadingStep}</p>
                <p className="loading-step-subtitle">pdfplumber is evaluating font sizes, kerning, and line clusters</p>
              </div>
            </div>
          )}
        </div>

        {/* ── 2. Extraction Results Display ─────────────────────────── */}
        {results && results.length > 0 && (
          <div className="results-wrapper" ref={resultsRef}>
            {/* Results Meta & Control Bar */}
            <div className="results-header-bar">
              <div className="results-meta">
                <span className="results-count-badge">
                  {meta?.sectionsFound ?? results.length} Sections Found
                </span>
                {meta?.extractionTimeMs !== undefined ? (
                  <span className="results-stat">
                    ⚡ {meta.extractionTimeMs}ms roundtrip
                  </span>
                ) : meta?.processingTimeSec !== undefined ? (
                  <span className="results-stat">
                    ⚡ {meta.processingTimeSec.toFixed(2)}s roundtrip
                  </span>
                ) : null}
                {meta?.totalPages && (
                  <span className="results-stat">
                    📄 {meta.totalPages} pages
                  </span>
                )}
                {meta?.language && (
                  <span className="results-stat">
                    🌐 {meta.language.toUpperCase()}
                  </span>
                )}
              </div>

              {/* View & Export Actions */}
              <div className="results-actions">
                <div className="view-toggle">
                  <button
                    type="button"
                    className={`view-btn ${viewMode === "cards" ? "view-btn--active" : ""}`}
                    onClick={() => setViewMode("cards")}
                  >
                    Cards
                  </button>
                  <button
                    type="button"
                    className={`view-btn ${viewMode === "json" ? "view-btn--active" : ""}`}
                    onClick={() => setViewMode("json")}
                  >
                    JSON
                  </button>
                </div>

                <button
                  type="button"
                  className="action-btn"
                  onClick={handleCopyAllJSON}
                  title="Copy entire JSON payload to clipboard"
                >
                  {allCopied ? (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#27ae60" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      <span>Copied JSON</span>
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                      </svg>
                      <span>Copy JSON</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className="action-btn action-btn--primary"
                  onClick={handleDownloadJSON}
                  title="Download results as formatted JSON file"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  <span>Download JSON</span>
                </button>

                <button
                  type="button"
                  className="action-btn action-btn--reset"
                  onClick={handleReset}
                  title="Clear results and upload a new document"
                >
                  <span>New File</span>
                </button>
              </div>
            </div>

            {/* Search / Filter Filter Input */}
            <div className="search-filter-bar">
              <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                className="search-input"
                placeholder="Filter sections by heading or keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={() => setSearchQuery("")}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Content: Cards View or JSON View */}
            {viewMode === "cards" ? (
              <div className="cards-container">
                {filteredResults.length === 0 ? (
                  <div className="no-matches">
                    <p>No sections matched "{searchQuery}".</p>
                    <button type="button" className="btn-link" onClick={() => setSearchQuery("")}>
                      Clear filter
                    </button>
                  </div>
                ) : (
                  filteredResults.map((section, idx) => (
                    <article key={idx} className="section-card">
                      <div className="card-top-row">
                        <div className="card-heading-group">
                          <span className="section-index-pill">
                            {String(idx + 1).padStart(2, "0")}
                          </span>
                          {section.level !== undefined && (
                            <span className={`heading-level-pill heading-level-pill--h${section.level}`}>
                              H{section.level}
                            </span>
                          )}
                          {section.page !== undefined && (
                            <span className="section-page-pill">
                              Page {section.page}
                            </span>
                          )}
                          <h3 className="section-heading-title">{section.heading}</h3>
                        </div>

                        <div className="card-actions">
                          <span className="card-char-count">
                            {section.text.length} chars
                          </span>
                          <button
                            type="button"
                            className={`btn-copy-card ${copiedIndex === idx ? "btn-copy-card--copied" : ""}`}
                            onClick={() => handleCopySection(idx, section)}
                            title="Copy this section to clipboard"
                          >
                            {copiedIndex === idx ? (
                              <>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#27ae60" strokeWidth="2.5">
                                  <polyline points="20 6 9 17 4 12"/>
                                </svg>
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                                </svg>
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="card-divider" />

                      <div className="card-body">
                        {section.text.trim() ? (
                          section.text.split("\n").map((paragraph, pIdx) => (
                            <p key={pIdx} className="card-paragraph">
                              {paragraph}
                            </p>
                          ))
                        ) : (
                          <p className="card-empty-text">[No body text under this heading]</p>
                        )}
                      </div>
                    </article>
                  ))
                )}
              </div>
            ) : (
              <div className="json-viewer-container">
                <div className="json-viewer-header">
                  <span className="json-viewer-tag">schema: {"{ heading: string, text: string }[]"}</span>
                  <button type="button" className="btn-copy-small" onClick={handleCopyAllJSON}>
                    {allCopied ? "✓ Copied" : "Copy Raw JSON"}
                  </button>
                </div>
                <pre className="json-code-block">
                  <code>{JSON.stringify({ success: true, data: results }, null, 2)}</code>
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default PdfExtractor;
