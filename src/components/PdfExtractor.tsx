import React, { useState, useRef, useEffect } from "react";
import { type ExtractedSection } from "../mockData";
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
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [extractProgress, setExtractProgress] = useState<number>(0);
  const [loadingStep, setLoadingStep] = useState<string>("Analyzing document structure...");
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ExtractedSection[] | null>(null);
  const [rawApiResponse, setRawApiResponse] = useState<any>(null);
  const [meta, setMeta] = useState<ExtractionMeta | null>(null);
  const [viewMode, setViewMode] = useState<"structured" | "table" | "json">("structured");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [allCopied, setAllCopied] = useState<boolean>(false);
  const [jsonCopied, setJsonCopied] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const uploadTimerRef = useRef<any>(null);

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Trigger smooth upload animation when a file is selected
  const startUploadAnimation = (selectedFile: File) => {
    if (uploadTimerRef.current) {
      clearInterval(uploadTimerRef.current);
    }

    setFile(selectedFile);
    setResults(null);
    setRawApiResponse(null);
    setMeta(null);
    setError(null);
    setSearchQuery("");
    setIsUploading(true);
    setUploadProgress(0);

    let progress = 0;
    uploadTimerRef.current = setInterval(() => {
      progress += Math.floor(Math.random() * 9) + 6;
      if (progress >= 100) {
        progress = 100;
        setUploadProgress(100);
        setIsUploading(false);
        clearInterval(uploadTimerRef.current);
      } else {
        setUploadProgress(progress);
      }
    }, 45);
  };

  // Drag and drop handlers for upload zone
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
        startUploadAnimation(droppedFile);
      } else {
        setError("Please upload a valid PDF document (.pdf).");
      }
    }
  };

  // File input change (selecting or changing file)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === "application/pdf" || selectedFile.name.toLowerCase().endsWith(".pdf")) {
        startUploadAnimation(selectedFile);
      } else {
        setError("Please select a valid PDF document (.pdf).");
      }
    }
    if (e.target) {
      e.target.value = "";
    }
  };

  // Trigger file picker
  const handleChooseFileClick = () => {
    fileInputRef.current?.click();
  };

  // Change file handler
  const handleChangeFile = () => {
    fileInputRef.current?.click();
  };

  // Execute extraction via backend POST /api/extract
  const handleExtract = async () => {
    if (!file) {
      setError("Please select a PDF document first.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setExtractProgress(15);
    setLoadingStep("Processing PDF layout & extracting headings...");

    // Simulated progress transitions
    const stepTimer1 = setTimeout(() => {
      setExtractProgress(50);
      setLoadingStep("Parsing layout hierarchy, font sizes, and character clusters...");
    }, 300);

    const stepTimer2 = setTimeout(() => {
      setExtractProgress(85);
      setLoadingStep("Associating body text and building structured sections...");
    }, 600);

    const formData = new FormData();
    formData.append("file", file);

    try {
      let response: Response;
      try {
        response = await fetch("/api/extract", {
          method: "POST",
          body: formData,
        });
      } catch {
        response = await fetch("http://127.0.0.1:8000/api/extract", {
          method: "POST",
          body: formData,
        });
      }

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setExtractProgress(100);

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.detail || `Extraction failed with status ${response.status}`
        );
      }

      const json = await response.json();
      setRawApiResponse(json);

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
          language: m.language ?? "en",
        });

        // Persist authentic extraction to localStorage for Documents view
        if (json.data.length > 0) {
          try {
            const docRecord = {
              id: `doc-${Date.now()}`,
              fileName: m.file_name ?? file.name,
              uploadDate: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
              sectionsCount: json.data.length,
              totalPages: m.total_pages ?? json.total_pages ?? 1,
              fileSize: m.file_size ?? formatFileSize(file.size),
              status: "Processed",
              sections: json.data,
            };
            const existing = JSON.parse(localStorage.getItem("extractai_processed_documents") || "[]");
            const filtered = existing.filter((d: any) => d.fileName !== (m.file_name ?? file.name));
            localStorage.setItem("extractai_processed_documents", JSON.stringify([docRecord, ...filtered]));
          } catch {
            // ignore storage errors
          }
        }

        setTimeout(() => {
          resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      } else {
        throw new Error("Unexpected response format from extraction engine.");
      }
    } catch (err: any) {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      console.warn("Extraction failed:", err);
      setError(err?.message || "Failed to extract document. Ensure the PDF is not password protected.");
    } finally {
      setIsLoading(false);
    }
  };

  // Copy individual section
  const handleCopySection = (index: number, section: ExtractedSection) => {
    const formatted = `## ${section.heading}\n\n${section.text}`;
    navigator.clipboard.writeText(formatted);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1800);
  };

  // Copy all results (Structured text)
  const handleCopyAll = () => {
    if (!results || results.length === 0) return;
    const formatted = results
      .map((s, idx) => `## ${String(idx + 1).padStart(2, "0")} ${s.heading}\n\n${s.text}`)
      .join("\n\n---\n\n");
    navigator.clipboard.writeText(formatted);
    setAllCopied(true);
    setTimeout(() => setAllCopied(false), 1800);
  };

  // Copy raw JSON view
  const handleCopyJSONView = () => {
    const payload = rawApiResponse || { success: true, data: results };
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setJsonCopied(true);
    setTimeout(() => setJsonCopied(false), 1800);
  };

  // Download results as JSON file
  const handleDownloadJSON = () => {
    if (!results) return;
    const payload = rawApiResponse || {
      success: true,
      metadata: {
        file_name: file?.name,
        file_size: file ? formatFileSize(file.size) : undefined,
        sections_found: results.length,
        ...meta,
      },
      data: results,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const baseName = file?.name?.replace(/\.pdf$/i, "") || "document";
    link.download = `${baseName}_extracted_results.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Search filtering across Structured and Table views
  const filteredResults = (results || []).filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return s.heading.toLowerCase().includes(q) || s.text.toLowerCase().includes(q);
  });

  return (
    <section className="extractor-section" id="extractor">
      <div className="extractor-container">
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileChange}
          className="file-input-hidden"
          aria-label="Upload PDF File"
        />

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            STATE 1: No document selected → Large upload zone
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {!file && (
          <div className="upload-wrapper">
            <div
              className={`dropzone ${isDragging ? "dropzone--dragging" : ""}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={handleChooseFileClick}
            >
              <div className="dropzone-icon-wrap">
                <svg className="dropzone-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points="17 8 12 3 7 8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="12" y1="3" x2="12" y2="15" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>

              <div className="dropzone-text-group">
                <p className="dropzone-prompt">
                  <strong>Drop PDF here</strong>, or{" "}
                  <button
                    type="button"
                    className="dropzone-browse-link"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleChooseFileClick();
                    }}
                  >
                    Browse files
                  </button>
                </p>
                <p className="dropzone-subtext">Accepted file type: PDF</p>
              </div>
            </div>

            {error && (
              <div className="error-banner">
                <svg className="error-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <div className="error-content">
                  <p className="error-msg">{error}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            STATE 2: Document selected/extracted
            → Compact document bar + large results workspace
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {file && (
          <div className="studio-workspace">
            {/* Compact Document Bar (with animated progress fill) */}
            <div className={`compact-document-bar ${isUploading ? "compact-document-bar--uploading" : ""}`}>
              {/* Progress Fill Background Layer */}
              <div
                className="compact-bar-progress-bg"
                style={{
                  width: `${isUploading ? uploadProgress : isLoading ? extractProgress : 100}%`,
                  opacity: isUploading || isLoading ? 1 : 0,
                }}
              />

              {/* Progress Fill Bottom Line */}
              <div className="compact-bar-progress-line">
                <div
                  className={`compact-bar-progress-fill ${uploadProgress === 100 && !isLoading ? "compact-bar-progress-fill--complete" : ""}`}
                  style={{
                    width: `${isUploading ? uploadProgress : isLoading ? extractProgress : 100}%`,
                  }}
                />
              </div>

              <div className="compact-doc-info">
                <div className={`compact-doc-icon-box ${isUploading ? "compact-doc-icon-box--pulsing" : ""}`}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <line x1="10" y1="9" x2="8" y2="9" />
                  </svg>
                </div>

                <div className="compact-doc-details">
                  <div className="compact-doc-title-row">
                    <span className="compact-doc-filename" title={file.name}>
                      {file.name}
                    </span>
                  </div>
                  <div className="compact-doc-meta-row">
                    <span className="compact-doc-size">{formatFileSize(file.size)}</span>
                    <span className="compact-doc-sep">•</span>
                    <span className="compact-doc-status">
                      {isUploading ? (
                        <span className="status-badge status-badge--uploading">
                          <span className="compact-status-spinner" />
                          Uploading... {uploadProgress}%
                        </span>
                      ) : isLoading ? (
                        <span className="status-badge status-badge--loading">
                          <span className="compact-status-spinner" />
                          Extracting sections... {extractProgress}%
                        </span>
                      ) : results ? (
                        <span className="status-badge status-badge--ready">
                          <span className="status-dot status-dot--green" />
                          Extracted ({results.length} sections)
                        </span>
                      ) : (
                        <span className="status-badge status-badge--ready">
                          <span className="status-dot status-dot--green" />
                          Ready to extract
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="compact-doc-actions">
                <button
                  type="button"
                  className="btn-change-file"
                  onClick={handleChangeFile}
                  disabled={isLoading}
                  title="Reopen file picker and replace current PDF"
                >
                  Change file
                </button>

                {!results && (
                  <button
                    type="button"
                    className={`btn-extract-primary ${isLoading ? "btn-extract-primary--loading" : ""}`}
                    onClick={handleExtract}
                    disabled={isLoading || isUploading}
                  >
                    {isLoading ? (
                      <>
                        <span className="spinner-inline" />
                        <span>Extracting...</span>
                      </>
                    ) : (
                      <>
                        <span>Extract Document</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                          <line x1="5" y1="12" x2="19" y2="12"/>
                          <polyline points="12 5 19 12 12 19"/>
                        </svg>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Error Banner when extraction fails */}
            {error && (
              <div className="error-banner" style={{ marginTop: 16 }}>
                <svg className="error-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <div className="error-content">
                  <p className="error-msg">{error}</p>
                  <button type="button" className="error-retry-link" onClick={handleExtract}>
                    Retry extraction
                  </button>
                </div>
              </div>
            )}

            {/* Loading Indicator while extracting */}
            {isLoading && (
              <div className="extract-loading-box">
                <div className="loading-spinner-ring" />
                <div className="loading-text-wrap">
                  <p className="loading-step-heading">{loadingStep}</p>
                  <p className="loading-step-note">Analyzing layout hierarchy, font sizes, and character clusters</p>
                </div>
              </div>
            )}

            {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                Results Workspace (Directly below compact document bar)
                ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
            {results !== null && !isLoading && (
              results.length === 0 ? (
                /* Empty State: Zero sections extracted */
                <div className="results-empty-state">
                  <div className="empty-icon-wrap">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted, #a1a1aa)" strokeWidth="1.8">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="9" y1="15" x2="15" y2="15" />
                    </svg>
                  </div>
                  <h3 className="empty-state-title">No sections could be extracted from this document.</h3>
                  <p className="empty-state-desc">The document may not contain recognized headings or text streams.</p>
                  <button type="button" className="btn-try-another" onClick={handleChangeFile}>
                    Try another PDF
                  </button>
                </div>
              ) : (
                <div className="results-workspace" ref={resultsRef}>
                  {/* Results Header */}
                  <div className="results-top-bar">
                    <div className="results-header-info">
                      <h3 className="results-main-title">Extraction Results</h3>
                      <span className="results-count-summary">
                        {searchQuery.trim()
                          ? `${filteredResults.length} of ${results.length} sections`
                          : `${results.length} sections extracted`}
                      </span>
                    </div>

                    {/* View Switcher & Actions */}
                    <div className="results-nav-and-actions">
                      {/* View Tabs: [ Structured ] [ Table ] [ JSON ] */}
                      <div className="view-tabs-group" role="tablist">
                        <button
                          type="button"
                          role="tab"
                          aria-selected={viewMode === "structured"}
                          className={`view-tab-btn ${viewMode === "structured" ? "view-tab-btn--active" : ""}`}
                          onClick={() => setViewMode("structured")}
                        >
                          Structured
                        </button>
                        <button
                          type="button"
                          role="tab"
                          aria-selected={viewMode === "table"}
                          className={`view-tab-btn ${viewMode === "table" ? "view-tab-btn--active" : ""}`}
                          onClick={() => setViewMode("table")}
                        >
                          Table
                        </button>
                        <button
                          type="button"
                          role="tab"
                          aria-selected={viewMode === "json"}
                          className={`view-tab-btn ${viewMode === "json" ? "view-tab-btn--active" : ""}`}
                          onClick={() => setViewMode("json")}
                        >
                          JSON
                        </button>
                      </div>

                      {/* Result Actions (visually secondary) */}
                      <div className="results-secondary-actions">
                        <button
                          type="button"
                          className="btn-action-subtle"
                          onClick={handleCopyAll}
                          title="Copy all extracted sections"
                        >
                          {allCopied ? (
                            <>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
                                <polyline points="20 6 9 17 4 12"/>
                              </svg>
                              <span style={{ color: "#16a34a" }}>Copied All</span>
                            </>
                          ) : (
                            <>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                              </svg>
                              <span>Copy All</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          className="btn-action-subtle"
                          onClick={handleDownloadJSON}
                          title="Download results as JSON file"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="7 10 12 15 17 10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                          </svg>
                          <span>Download JSON</span>
                        </button>

                        <button
                          type="button"
                          className="btn-action-subtle"
                          onClick={handleChangeFile}
                          title="Select another PDF file"
                        >
                          <span>Change File</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Search / Filter Bar (applicable across Structured & Table) */}
                  <div className="results-filter-strip">
                    <div className="results-filter-input-wrap">
                      <svg className="filter-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8"/>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                      </svg>
                      <input
                        type="text"
                        className="results-filter-input"
                        placeholder="Search sections by heading or body text..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          className="filter-clear-btn"
                          onClick={() => setSearchQuery("")}
                          aria-label="Clear search"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <span className="filter-matches-badge">
                      {searchQuery.trim()
                        ? `${filteredResults.length} of ${results.length} sections`
                        : `${results.length} sections`}
                    </span>
                  </div>

                  {/* ── View 1: Structured View (Default) ─────────────── */}
                  {viewMode === "structured" && (
                    <div className="structured-view-list">
                      {filteredResults.length === 0 ? (
                        <div className="results-no-match">
                          <p>No sections matched "{searchQuery}"</p>
                          <button type="button" className="btn-text-link" onClick={() => setSearchQuery("")}>
                            Clear search filter
                          </button>
                        </div>
                      ) : (
                        filteredResults.map((section, idx) => (
                          <article key={section.id || idx} className="structured-card">
                            <div className="structured-card-top">
                              <div className="structured-card-title-wrap">
                                <span className="structured-index-tag">
                                  {String(idx + 1).padStart(2, "0")}
                                </span>
                                <h4 className="structured-heading-text">
                                  {section.heading}
                                </h4>
                              </div>

                              <button
                                type="button"
                                className={`btn-copy-section ${copiedIndex === idx ? "btn-copy-section--copied" : ""}`}
                                onClick={() => handleCopySection(idx, section)}
                                title="Copy section heading and body"
                              >
                                {copiedIndex === idx ? (
                                  <>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
                                      <polyline points="20 6 9 17 4 12"/>
                                    </svg>
                                    <span>Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                                    </svg>
                                    <span>Copy</span>
                                  </>
                                )}
                              </button>
                            </div>

                            <div className="structured-card-body">
                              {section.text?.trim() ? (
                                section.text.split("\n").map((line, lIdx) => (
                                  <p key={lIdx} className="structured-body-para">
                                    {line}
                                  </p>
                                ))
                              ) : (
                                <p className="structured-empty-body">[No body text under this heading]</p>
                              )}
                            </div>
                          </article>
                        ))
                      )}
                    </div>
                  )}

                  {/* ── View 2: Table View ────────────────────────────── */}
                  {viewMode === "table" && (
                    <div className="table-view-wrap">
                      {filteredResults.length === 0 ? (
                        <div className="results-no-match">
                          <p>No sections matched "{searchQuery}"</p>
                          <button type="button" className="btn-text-link" onClick={() => setSearchQuery("")}>
                            Clear search filter
                          </button>
                        </div>
                      ) : (
                        <div className="table-container-card">
                          <table className="results-data-table">
                            <thead>
                              <tr>
                                <th style={{ width: 46 }}>#</th>
                                <th style={{ width: 260 }}>Heading</th>
                                <th>Extracted Text</th>
                                <th style={{ width: 80, textAlign: "right" }}>Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredResults.map((section, idx) => (
                                <tr key={section.id || idx}>
                                  <td className="table-td-index">
                                    {String(idx + 1).padStart(2, "0")}
                                  </td>
                                  <td className="table-td-heading">
                                    {section.heading}
                                  </td>
                                  <td className="table-td-text">
                                    {section.text || <span className="table-empty-val">[No body text]</span>}
                                  </td>
                                  <td className="table-td-action">
                                    <button
                                      type="button"
                                      className={`btn-table-copy ${copiedIndex === idx ? "btn-table-copy--copied" : ""}`}
                                      onClick={() => handleCopySection(idx, section)}
                                      title="Copy section"
                                    >
                                      {copiedIndex === idx ? "Copied" : "Copy"}
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── View 3: JSON View ─────────────────────────────── */}
                  {viewMode === "json" && (
                    <div className="json-code-container">
                      <div className="json-code-header">
                        <span className="json-schema-tag">API Response JSON</span>
                        <button
                          type="button"
                          className="btn-copy-json"
                          onClick={handleCopyJSONView}
                        >
                          {jsonCopied ? "✓ Copied JSON" : "Copy JSON"}
                        </button>
                      </div>
                      <pre className="json-code-content">
                        <code>
                          {JSON.stringify(rawApiResponse || { success: true, data: results }, null, 2)}
                        </code>
                      </pre>
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default PdfExtractor;
