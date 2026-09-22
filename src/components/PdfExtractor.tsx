import React, { useState, useRef, useMemo } from "react";
import {
  FileText,
  List,
  Table2,
  Copy,
  Check,
  Download,
  Search,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  X,
  Code2,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { type ExtractedSection, type ExtractedTable } from "../mockData";
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

interface KeyValueRow {
  key: string;
  value: string;
}

interface ParsedSubsection {
  id: string;
  title: string;
  paragraphs: string[];
  keyValues: KeyValueRow[];
  rawText: string;
}

interface SectionTableData {
  sectionIndex: number;
  sectionId: string;
  sectionHeading: string;
  page?: number;
  keyValues: KeyValueRow[];
  /** Real structured tables returned by the backend extractor */
  realTables: ExtractedTable[];
}

// Helper: check if a line is a key-value or field pair
function parseKeyValue(line: string): KeyValueRow | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length < 3) return null;
  // Match "Key: Value" or "Key? Value" or "Key - Value"
  const match = trimmed.match(/^([^:\n\t?]{2,45})[:\?]\s*(.+)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim();
    if (key.toLowerCase() === "http" || key.toLowerCase() === "https") return null;
    return { key, value };
  }
  return null;
}

// Helper: parse a section's text into clean hierarchical subsections
function parseSubsections(sectionHeading: string, text: string): ParsedSubsection[] {
  if (!text || !text.trim()) {
    return [
      {
        id: "sub-0",
        title: sectionHeading,
        paragraphs: ["[No body text under this heading]"],
        keyValues: [],
        rawText: "",
      },
    ];
  }

  const lines = text.split(/\r?\n/);
  const subsections: ParsedSubsection[] = [];
  let currentTitle = "";
  let currentLines: string[] = [];

  const flushCurrent = () => {
    if (currentLines.length === 0 && !currentTitle) return;
    const raw = currentLines.join("\n").trim();
    if (!raw && !currentTitle) return;

    const paragraphs: string[] = [];
    const keyValues: KeyValueRow[] = [];
    let currentPara: string[] = [];

    for (const l of currentLines) {
      const kv = parseKeyValue(l);
      if (kv) {
        if (currentPara.length > 0) {
          paragraphs.push(currentPara.join(" "));
          currentPara = [];
        }
        keyValues.push(kv);
      } else if (!l.trim()) {
        if (currentPara.length > 0) {
          paragraphs.push(currentPara.join(" "));
          currentPara = [];
        }
      } else {
        currentPara.push(l.trim());
      }
    }

    if (currentPara.length > 0) {
      paragraphs.push(currentPara.join(" "));
    }

    subsections.push({
      id: `sub-${subsections.length}`,
      title: currentTitle || sectionHeading,
      paragraphs,
      keyValues,
      rawText: raw,
    });

    currentLines = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      if (currentLines.length > 0) currentLines.push("");
      continue;
    }

    // Markdown heading format (#, ##, ###)
    if (line.startsWith("### ") || line.startsWith("## ") || line.startsWith("# ")) {
      flushCurrent();
      currentTitle = line.replace(/^#+\s*/, "");
      continue;
    }

    // Heuristic heading candidate: short line, no trailing sentence punct, followed by text
    const isHeadingCandidate =
      line.length >= 3 &&
      line.length <= 55 &&
      !parseKeyValue(line) &&
      !line.endsWith(".") &&
      !line.endsWith(";") &&
      !line.endsWith(",") &&
      !line.startsWith("•") &&
      !line.startsWith("-") &&
      i < lines.length - 1 &&
      (i === 0 || lines[i - 1]?.trim() === "" || currentLines.length > 2);

    if (isHeadingCandidate && (lines[i + 1]?.trim() || i === 0)) {
      if (currentLines.length > 0) {
        flushCurrent();
      }
      currentTitle = line.replace(/:$/, "");
      continue;
    }

    currentLines.push(line);
  }

  flushCurrent();

  if (subsections.length === 0) {
    const allLines = lines.filter((l) => l.trim());
    const kvs = allLines.map(parseKeyValue).filter((kv): kv is KeyValueRow => kv !== null);
    subsections.push({
      id: "sub-0",
      title: sectionHeading,
      paragraphs: [text],
      keyValues: kvs,
      rawText: text,
    });
  }

  return subsections;
}

// Helper: highlight matching search text
function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim() || !text) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="search-highlight">
        {part}
      </mark>
    ) : (
      part
    )
  );
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

  // View state: structured (default), tables, json
  const [viewMode, setViewMode] = useState<"structured" | "tables" | "json">("structured");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedSectionIndex, setSelectedSectionIndex] = useState<number>(0);
  const [expandedSubsections, setExpandedSubsections] = useState<Record<string, boolean>>({});

  // Copy feedback states
  const [copiedSectionIndex, setCopiedSectionIndex] = useState<number | null>(null);
  const [copiedSubKey, setCopiedSubKey] = useState<string | null>(null);
  const [copiedTableId, setCopiedTableId] = useState<string | null>(null);
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

  // Upload simulation for smooth UI transition
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
    setSelectedSectionIndex(0);
    setExpandedSubsections({});
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

  const handleLoadSample = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch("/sample-document.pdf");
      const blob = await res.blob();
      const sampleFile = new File([blob], "AMGN-135003565.pdf", {
        type: "application/pdf",
      });
      startUploadAnimation(sampleFile);
    } catch {
      setError("Failed to load sample document.");
    } finally {
      setIsLoading(false);
    }
  };

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
      const lower = droppedFile.name.toLowerCase();
      if (
        droppedFile.type === "application/pdf" ||
        lower.endsWith(".pdf") ||
        lower.endsWith(".docx") ||
        lower.endsWith(".doc") ||
        droppedFile.type.includes("word") ||
        droppedFile.type.includes("officedocument")
      ) {
        startUploadAnimation(droppedFile);
      } else {
        setError("Please upload a valid document (.pdf, .docx, .doc).");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      const lower = selectedFile.name.toLowerCase();
      if (
        selectedFile.type === "application/pdf" ||
        lower.endsWith(".pdf") ||
        lower.endsWith(".docx") ||
        lower.endsWith(".doc") ||
        selectedFile.type.includes("word") ||
        selectedFile.type.includes("officedocument")
      ) {
        startUploadAnimation(selectedFile);
      } else {
        setError("Please select a valid document (.pdf, .docx, .doc).");
      }
    }
    if (e.target) {
      e.target.value = "";
    }
  };

  const handleChooseFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleChangeFile = () => {
    fileInputRef.current?.click();
  };

  // Run extraction via POST /api/extract
  const handleExtract = async () => {
    if (!file) {
      setError("Please select a document first.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setExtractProgress(15);
    setLoadingStep("Processing document layout & extracting headings...");

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
        setSelectedSectionIndex(0);
        setExpandedSubsections({});

        const m = json.metadata || {};
        setMeta({
          totalPages: m.total_pages ?? json.total_pages,
          extractionTimeMs:
            m.extraction_time_ms ??
            (json.processing_time_sec ? Math.round(json.processing_time_sec * 1000) : undefined),
          processingTimeSec: m.extraction_time_ms
            ? m.extraction_time_ms / 1000
            : json.processing_time_sec,
          fileName: m.file_name ?? file.name,
          fileSize: m.file_size ?? formatFileSize(file.size),
          sectionsFound: m.sections_found ?? json.data.length,
          language: m.language ?? "en",
        });

        // Persist to localStorage for Documents view
        if (json.data.length > 0) {
          try {
            const docRecord = {
              id: `doc-${Date.now()}`,
              fileName: m.file_name ?? file.name,
              uploadDate: new Date().toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              }),
              sectionsCount: json.data.length,
              totalPages: m.total_pages ?? json.total_pages ?? 1,
              fileSize: m.file_size ?? formatFileSize(file.size),
              status: "Processed",
              sections: json.data,
            };
            const existing = JSON.parse(
              localStorage.getItem("extractai_processed_documents") || "[]"
            );
            const filtered = existing.filter(
              (d: any) => d.fileName !== (m.file_name ?? file.name)
            );
            localStorage.setItem(
              "extractai_processed_documents",
              JSON.stringify([docRecord, ...filtered])
            );
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
      setError(
        err?.message || "Failed to extract document. Ensure the document is not password protected."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Copy individual section
  const handleCopyCurrentSection = (index: number, section: ExtractedSection) => {
    const formatted = `## ${section.heading}\n\n${section.text}`;
    navigator.clipboard.writeText(formatted);
    setCopiedSectionIndex(index);
    setTimeout(() => setCopiedSectionIndex(null), 1800);
  };

  // Copy individual subsection
  const handleCopySubsection = (subKey: string, title: string, content: string) => {
    const formatted = `### ${title}\n\n${content}`;
    navigator.clipboard.writeText(formatted);
    setCopiedSubKey(subKey);
    setTimeout(() => setCopiedSubKey(null), 1800);
  };

  // Copy all results (Structured text)
  const handleCopyAll = () => {
    if (!results || results.length === 0) return;
    const formatted = results
      .map(
        (s, idx) => `## ${String(idx + 1).padStart(2, "0")} ${s.heading}\n\n${s.text}`
      )
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

  // Copy specific table data as TSV/text
  const handleCopyTable = (tableData: SectionTableData) => {
    const rows = tableData.keyValues.map((kv) => `${kv.key}\t${kv.value}`);
    const text = `Field\tValue\n${rows.join("\n")}`;
    navigator.clipboard.writeText(text);
    setCopiedTableId(tableData.sectionId);
    setTimeout(() => setCopiedTableId(null), 1800);
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
    const baseName = file?.name?.replace(/\.[^/.]+$/, "") || "document";
    link.download = `${baseName}_extracted_results.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Filter sections by search query across both heading and body
  const filteredResults = useMemo(() => {
    if (!results) return [];
    if (!searchQuery.trim()) return results;
    const q = searchQuery.toLowerCase();
    return results.filter(
      (s) => s.heading.toLowerCase().includes(q) || s.text.toLowerCase().includes(q)
    );
  }, [results, searchQuery]);

  // Ensure selectedSectionIndex points to a valid section in filtered results
  const selectedSection = useMemo(() => {
    if (!results || results.length === 0) return null;
    return results[selectedSectionIndex] || results[0];
  }, [results, selectedSectionIndex]);

  // Parse currently selected section into structured subsections
  const currentSubsections = useMemo(() => {
    if (!selectedSection) return [];
    return parseSubsections(selectedSection.heading, selectedSection.text);
  }, [selectedSection]);

  // Extract tabular data from all sections for the Tables View
  const sectionsWithTables = useMemo<SectionTableData[]>(() => {
    if (!results) return [];
    const tables: SectionTableData[] = [];

    results.forEach((sec, idx) => {
      const lines = sec.text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      const kvs = lines
        .map(parseKeyValue)
        .filter((kv): kv is KeyValueRow => kv !== null);
      const realTables: ExtractedTable[] = Array.isArray(sec.tables)
        ? (sec.tables as ExtractedTable[])
        : [];

      if (kvs.length > 0 || realTables.length > 0) {
        tables.push({
          sectionIndex: idx,
          sectionId: sec.id || `section-${idx}`,
          sectionHeading: sec.heading,
          page: sec.page,
          keyValues: kvs,
          realTables,
        });
      }
    });

    return tables;
  }, [results]);

  // Toggle individual subsection accordion
  const toggleSubsection = (key: string) => {
    setExpandedSubsections((prev) => ({
      ...prev,
      [key]: prev[key] === undefined ? false : !prev[key],
    }));
  };

  // Check if all subsections of current section are expanded
  const allSubsectionsOpen = useMemo(() => {
    if (currentSubsections.length === 0) return true;
    return currentSubsections.every(
      (_, idx) => expandedSubsections[`${selectedSectionIndex}-${idx}`] !== false
    );
  }, [currentSubsections, selectedSectionIndex, expandedSubsections]);

  // Toggle all subsections in current section
  const toggleAllSubsections = () => {
    const nextState = !allSubsectionsOpen;
    const updates: Record<string, boolean> = {};
    currentSubsections.forEach((_, idx) => {
      updates[`${selectedSectionIndex}-${idx}`] = nextState;
    });
    setExpandedSubsections((prev) => ({ ...prev, ...updates }));
  };

  return (
    <section className="extractor-section" id="extractor">
      <div className="extractor-container">
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleFileChange}
          className="file-input-hidden"
          aria-label="Upload Document"
        />

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            STATE 1: No document selected → Upload zone
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
                <FileText size={24} className="dropzone-icon" />
              </div>

              <div className="dropzone-text-group">
                <p className="dropzone-prompt">
                  <strong>Drop document here</strong>, or{" "}
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
                <p className="dropzone-subtext">Accepted file types: PDF, DOC, DOCX</p>
                <div style={{ marginTop: 12 }}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLoadSample();
                    }}
                    style={{
                      fontSize: 11.5,
                      fontWeight: 500,
                      color: "var(--text-muted, #71717a)",
                      background: "transparent",
                      border: "1px dashed var(--border-color, #e4e4e7)",
                      padding: "4px 10px",
                      borderRadius: 4,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    Sample: AMGN-135003565.pdf
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="error-banner">
                <X size={16} className="error-icon" />
                <div className="error-content">
                  <p className="error-msg">{error}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            STATE 2: Document selected/extracted
            Compact document bar + results explorer
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {file && (
          <div className="studio-workspace">
            {/* ── Document Header (Compact Bar) ───────────────── */}
            <div className={`compact-document-bar ${isUploading ? "compact-document-bar--uploading" : ""}`}>
              {/* Progress background line */}
              <div
                className="compact-bar-progress-line"
                style={{
                  width: `${isUploading ? uploadProgress : isLoading ? extractProgress : 100}%`,
                  opacity: isUploading || isLoading ? 1 : 0,
                }}
              />

              <div className="compact-doc-info">
                <div className="compact-doc-icon-box">
                  <FileText size={20} className="compact-doc-icon" />
                </div>

                <div className="compact-doc-details">
                  <div className="compact-doc-title-row">
                    <span className="compact-doc-filename" title={file.name}>
                      {file.name}
                    </span>
                  </div>
                  <div className="compact-doc-meta-row">
                    {meta?.totalPages && (
                      <>
                        <span className="compact-doc-pages">
                          {meta.totalPages} {meta.totalPages === 1 ? "page" : "pages"}
                        </span>
                        <span className="compact-doc-sep">•</span>
                      </>
                    )}
                    <span className="compact-doc-size">{formatFileSize(file.size)}</span>
                    <span className="compact-doc-sep">•</span>
                    <span className="compact-doc-status">
                      {isUploading ? (
                        <span className="status-badge status-badge--uploading">
                          <Loader2 size={12} className="spinner-lucide" />
                          Uploading... {uploadProgress}%
                        </span>
                      ) : isLoading ? (
                        <span className="status-badge status-badge--loading">
                          <Loader2 size={12} className="spinner-lucide" />
                          Extracting... {extractProgress}%
                        </span>
                      ) : results ? (
                        <span className="status-badge status-badge--ready">
                          <CheckCircle2 size={13} className="status-icon-check" />
                          <span>Extracted</span>
                        </span>
                      ) : (
                        <span className="status-badge status-badge--ready">
                          <CheckCircle2 size={13} className="status-icon-check" />
                          <span>Ready to extract</span>
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Document bar actions */}
              <div className="compact-doc-actions">
                <button
                  type="button"
                  className="btn-change-file"
                  onClick={handleChangeFile}
                  disabled={isLoading}
                  title="Select another document"
                >
                  <X size={14} />
                  <span>Change file</span>
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
                        <Loader2 size={13} className="spinner-lucide" />
                        <span>Extracting...</span>
                      </>
                    ) : (
                      <>
                        <span>Extract Document</span>
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="error-banner">
                <X size={16} className="error-icon" />
                <div className="error-content">
                  <p className="error-msg">{error}</p>
                  <button type="button" className="error-retry-link" onClick={handleExtract}>
                    Retry extraction
                  </button>
                </div>
              </div>
            )}

            {/* Loading Step Banner */}
            {isLoading && (
              <div className="extract-loading-box">
                <Loader2 size={28} className="spinner-lucide spinner-lucide--large" />
                <div className="loading-text-wrap">
                  <p className="loading-step-heading">{loadingStep}</p>
                  <p className="loading-step-note">Analyzing layout hierarchy, font sizes, and character clusters</p>
                </div>
              </div>
            )}

            {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                RESULTS WORKSPACE
                ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
            {results !== null && !isLoading && (
              results.length === 0 ? (
                <div className="results-empty-state">
                  <FileText size={28} className="empty-icon" />
                  <h3 className="empty-state-title">No sections could be extracted from this document.</h3>
                  <p className="empty-state-desc">The document may not contain recognized headings or selectable text.</p>
                  <button type="button" className="btn-try-another" onClick={handleChangeFile}>
                    Try another document
                  </button>
                </div>
              ) : (
                <div className="results-workspace" ref={resultsRef}>
                  {/* ── Results Header ────────────────────────────── */}
                  <div className="results-header-bar">
                    <div className="results-header-title-wrap">
                      <h3 className="results-main-title">Extraction Results</h3>
                      <span className="results-count-badge">
                        {searchQuery.trim()
                          ? `${filteredResults.length} of ${results.length} sections`
                          : `${results.length} sections extracted`}
                      </span>
                    </div>

                    <div className="results-header-controls">
                      {/* View Switcher Tabs: [ Structured ] [ Tables ] [ JSON ] */}
                      <div className="results-view-tabs" role="tablist">
                        <button
                          type="button"
                          role="tab"
                          aria-selected={viewMode === "structured"}
                          className={`results-view-tab ${viewMode === "structured" ? "results-view-tab--active" : ""}`}
                          onClick={() => setViewMode("structured")}
                        >
                          <List size={14} />
                          <span>Structured</span>
                        </button>
                        <button
                          type="button"
                          role="tab"
                          aria-selected={viewMode === "tables"}
                          className={`results-view-tab ${viewMode === "tables" ? "results-view-tab--active" : ""}`}
                          onClick={() => setViewMode("tables")}
                        >
                          <Table2 size={14} />
                          <span>Tables</span>
                        </button>
                        <button
                          type="button"
                          role="tab"
                          aria-selected={viewMode === "json"}
                          className={`results-view-tab ${viewMode === "json" ? "results-view-tab--active" : ""}`}
                          onClick={() => setViewMode("json")}
                        >
                          <Code2 size={14} />
                          <span>JSON</span>
                        </button>
                      </div>

                      {/* Header Actions */}
                      <div className="results-button-actions">
                        <button
                          type="button"
                          className="btn-results-action"
                          onClick={handleCopyAll}
                          title="Copy all extracted sections"
                        >
                          {allCopied ? (
                            <>
                              <Check size={14} style={{ color: "#16a34a" }} />
                              <span style={{ color: "#16a34a" }}>Copied All</span>
                            </>
                          ) : (
                            <>
                              <Copy size={14} />
                              <span>Copy All</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          className="btn-results-action"
                          onClick={handleDownloadJSON}
                          title="Download results as JSON file"
                        >
                          <Download size={14} />
                          <span>Download JSON</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* ── View 1: Structured View (Default Two-Panel Explorer) ── */}
                  {viewMode === "structured" && (
                    <div className="document-explorer">
                      {/* LEFT: Section Navigator */}
                      <aside className="explorer-nav-panel">
                        {/* Search sections */}
                        <div className="explorer-search-box">
                          <Search size={14} className="explorer-search-icon" />
                          <input
                            type="text"
                            className="explorer-search-input"
                            placeholder="Search sections..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                          />
                          {searchQuery && (
                            <button
                              type="button"
                              className="explorer-search-clear"
                              onClick={() => setSearchQuery("")}
                              title="Clear search"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>

                        <div className="explorer-nav-header">
                          <span className="explorer-nav-count">
                            {searchQuery.trim()
                              ? `${filteredResults.length} of ${results.length} matching`
                              : `${results.length} sections in document`}
                          </span>
                        </div>

                        {/* Section Item List */}
                        <nav className="explorer-section-list" aria-label="Document Sections">
                          {filteredResults.length === 0 ? (
                            <div className="explorer-no-results">
                              <p>No sections match "{searchQuery}"</p>
                              <button
                                type="button"
                                className="btn-clear-search-link"
                                onClick={() => setSearchQuery("")}
                              >
                                Clear search
                              </button>
                            </div>
                          ) : (
                            filteredResults.map((section) => {
                              const originalIndex = results.indexOf(section);
                              const isSelected = originalIndex === selectedSectionIndex;
                              const sectionNum = String(originalIndex + 1).padStart(2, "0");

                              return (
                                <button
                                  key={section.id || originalIndex}
                                  type="button"
                                  className={`explorer-nav-item ${isSelected ? "explorer-nav-item--active" : ""}`}
                                  onClick={() => setSelectedSectionIndex(originalIndex)}
                                >
                                  <span className="explorer-item-num">{sectionNum}</span>
                                  <span className="explorer-item-heading" title={section.heading}>
                                    {highlightMatch(section.heading, searchQuery)}
                                  </span>
                                  {section.tables && section.tables.length > 0 && (
                                    <span className="explorer-item-table-badge" title="Contains tables">
                                      <Table2 size={10} />
                                    </span>
                                  )}
                                  {section.page && (
                                    <span className="explorer-item-page">p. {section.page}</span>
                                  )}
                                </button>
                              );
                            })
                          )}
                        </nav>
                      </aside>

                      {/* RIGHT: Selected Section Display */}
                      <main className="explorer-detail-panel">
                        {selectedSection ? (
                          <article className="section-detail-card">
                            {/* Section Header */}
                            <div className="section-detail-header">
                              <div className="section-detail-meta">
                                <span className="section-badge-num">
                                  SECTION {String(selectedSectionIndex + 1).padStart(2, "0")}
                                </span>
                                {selectedSection.page && (
                                  <span className="section-badge-page">
                                    Page {selectedSection.page}
                                  </span>
                                )}
                                {selectedSection.char_count && (
                                  <span className="section-badge-chars">
                                    {selectedSection.char_count} chars
                                  </span>
                                )}
                              </div>

                              <div className="section-detail-title-row">
                                <h2 className="section-detail-title">
                                  {highlightMatch(selectedSection.heading, searchQuery)}
                                </h2>

                                <div className="section-header-actions">
                                  {currentSubsections.length > 1 && (
                                    <button
                                      type="button"
                                      className="btn-subtle-toggle"
                                      onClick={toggleAllSubsections}
                                      title={allSubsectionsOpen ? "Collapse all subsections" : "Expand all subsections"}
                                    >
                                      {allSubsectionsOpen ? "Collapse all" : "Expand all"}
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    className="btn-section-copy"
                                    onClick={() =>
                                      handleCopyCurrentSection(selectedSectionIndex, selectedSection)
                                    }
                                    title="Copy section heading and body"
                                  >
                                    {copiedSectionIndex === selectedSectionIndex ? (
                                      <>
                                        <Check size={13} style={{ color: "#16a34a" }} />
                                        <span style={{ color: "#16a34a" }}>Copied</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy size={13} />
                                        <span>Copy</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Section Subsections & Content */}
                            <div className="section-subsections-container">
                              {currentSubsections.map((sub, sIdx) => {
                                const subKey = `${selectedSectionIndex}-${sIdx}`;
                                const isOpen = expandedSubsections[subKey] !== false;

                                return (
                                  <div key={sub.id || sIdx} className="subsection-block">
                                    {/* Subsection Accordion Header */}
                                    <div
                                      className="subsection-header"
                                      onClick={() => toggleSubsection(subKey)}
                                    >
                                      <button
                                        type="button"
                                        className="subsection-toggle-btn"
                                        aria-expanded={isOpen}
                                        tabIndex={-1}
                                      >
                                        {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                                      </button>
                                      <h4 className="subsection-title">
                                        {highlightMatch(sub.title, searchQuery)}
                                      </h4>
                                      <button
                                        type="button"
                                        className="btn-copy-subsection"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCopySubsection(subKey, sub.title, sub.rawText);
                                        }}
                                        title="Copy subsection"
                                      >
                                        {copiedSubKey === subKey ? (
                                          <Check size={12} style={{ color: "#16a34a" }} />
                                        ) : (
                                          <Copy size={12} />
                                        )}
                                      </button>
                                    </div>

                                    {/* Subsection Body */}
                                    {isOpen && (
                                      <div className="subsection-content">
                                        {/* Key-Value fields if present */}
                                        {sub.keyValues.length > 0 && (
                                          <div className="subsection-kv-grid">
                                            {sub.keyValues.map((kv, kIdx) => (
                                              <div key={kIdx} className="subsection-kv-row">
                                                <span className="subsection-kv-key">
                                                  {highlightMatch(kv.key, searchQuery)}
                                                </span>
                                                <span className="subsection-kv-val">
                                                  {highlightMatch(kv.value, searchQuery)}
                                                </span>
                                              </div>
                                            ))}
                                          </div>
                                        )}

                                        {/* Paragraphs */}
                                        {sub.paragraphs.map((para, pIdx) => (
                                          <p key={pIdx} className="subsection-paragraph">
                                            {highlightMatch(para, searchQuery)}
                                          </p>
                                        ))}

                                        {sub.paragraphs.length === 0 && sub.keyValues.length === 0 && (
                                          <p className="subsection-empty">[No body text under this section]</p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Section Navigation Footer */}
                            <div className="section-footer-nav">
                              <button
                                type="button"
                                className="btn-nav-step"
                                onClick={() =>
                                  setSelectedSectionIndex((prev) => Math.max(0, prev - 1))
                                }
                                disabled={selectedSectionIndex === 0}
                              >
                                ← Previous Section
                              </button>
                              <span className="section-step-indicator">
                                Section {selectedSectionIndex + 1} of {results.length}
                              </span>
                              <button
                                type="button"
                                className="btn-nav-step"
                                onClick={() =>
                                  setSelectedSectionIndex((prev) =>
                                    Math.min(results.length - 1, prev + 1)
                                  )
                                }
                                disabled={selectedSectionIndex === results.length - 1}
                              >
                                Next Section →
                              </button>
                            </div>
                          </article>
                        ) : (
                          <div className="explorer-empty-selection">
                            <p>Select a section from the left navigator to inspect its content.</p>
                          </div>
                        )}
                      </main>
                    </div>
                  )}

                  {/* ── View 2: Tables View ───────────────────────────── */}
                  {viewMode === "tables" && (
                    <div className="tables-view-container">
                      {/* Tables View Header & Quick Jump Pills */}
                      <div className="tables-view-header">
                        <div className="tables-header-info">
                          <h4 className="tables-view-title">
                            <Table2 size={16} />
                            <span>Structured Document Tables</span>
                          </h4>
                          <span className="tables-count-pill">
                            {sectionsWithTables.length}{" "}
                            {sectionsWithTables.length === 1
                              ? "section with tabular data"
                              : "sections with tabular data"}
                          </span>
                        </div>

                        {/* Quick Jump Pills */}
                        {sectionsWithTables.length > 1 && (
                          <div className="tables-quick-pills">
                            <span className="tables-pills-label">Jump to:</span>
                            {sectionsWithTables.map((sec) => (
                              <button
                                key={sec.sectionId}
                                type="button"
                                className="tables-pill-btn"
                                onClick={() => {
                                  const el = document.getElementById(
                                    `table-sec-${sec.sectionId}`
                                  );
                                  el?.scrollIntoView({ behavior: "smooth", block: "start" });
                                }}
                              >
                                {String(sec.sectionIndex + 1).padStart(2, "0")} {sec.sectionHeading}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Tables List */}
                      {sectionsWithTables.length === 0 ? (
                        <div className="tables-empty-state">
                          <Table2 size={28} className="tables-empty-icon" />
                          <p className="tables-empty-text">
                            No structured key-value fields or tables detected in this document.
                          </p>
                          <button
                            type="button"
                            className="btn-switch-structured"
                            onClick={() => setViewMode("structured")}
                          >
                            View Structured Text
                          </button>
                        </div>
                      ) : (
                        <div className="tables-cards-list">
                          {sectionsWithTables.map((tData) => (
                            <div
                              key={tData.sectionId}
                              id={`table-sec-${tData.sectionId}`}
                              className="table-card"
                            >
                              <div className="table-card-header">
                                <div className="table-card-title-wrap">
                                  <span className="table-card-num">
                                    {String(tData.sectionIndex + 1).padStart(2, "0")}
                                  </span>
                                  <h4 className="table-card-heading">{tData.sectionHeading}</h4>
                                  {tData.page && (
                                    <span className="table-card-page">Page {tData.page}</span>
                                  )}
                                  <span className="table-card-count">
                                    {tData.realTables.length > 0
                                      ? `${tData.realTables.length} table${tData.realTables.length === 1 ? "" : "s"}`
                                      : `${tData.keyValues.length} ${tData.keyValues.length === 1 ? "field" : "fields"}`}
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  className="btn-copy-table"
                                  onClick={() => handleCopyTable(tData)}
                                  title="Copy table data as TSV"
                                >
                                  {copiedTableId === tData.sectionId ? (
                                    <>
                                      <Check size={12} style={{ color: "#16a34a" }} />
                                      <span style={{ color: "#16a34a" }}>Copied</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy size={12} />
                                      <span>Copy Table</span>
                                    </>
                                  )}
                                </button>
                              </div>

                              {/* Real structured tables from the backend */}
                              {tData.realTables.length > 0 ? (
                                tData.realTables.map((tbl, tIdx) => (
                                  <div key={tIdx} className="table-scroll-wrap">
                                    <table className="results-structured-table">
                                      <thead>
                                        <tr>
                                          {tbl.columns.map((col, cIdx) => (
                                            <th key={cIdx}>{col || `Col ${cIdx + 1}`}</th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {tbl.rows.map((row, rIdx) => (
                                          <tr key={rIdx}>
                                            {row.map((cell, cIdx) => (
                                              <td key={cIdx} className={cIdx === 0 ? "td-field-name" : "td-field-val"}>
                                                {cell}
                                              </td>
                                            ))}
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                ))
                              ) : (
                                /* Fallback: KV pair table from text parsing */
                                <div className="table-scroll-wrap">
                                  <table className="results-structured-table">
                                    <thead>
                                      <tr>
                                        <th style={{ width: "35%" }}>Field</th>
                                        <th>Value</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {tData.keyValues.map((kv, rIdx) => (
                                        <tr key={rIdx}>
                                          <td className="td-field-name">{kv.key}</td>
                                          <td className="td-field-val">{kv.value}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── View 3: JSON View ────────────────────────────── */}
                  {viewMode === "json" && (
                    <div className="json-code-container">
                      <div className="json-code-header">
                        <div className="json-header-info">
                          <Code2 size={15} />
                          <span className="json-schema-tag">Raw Extraction API Response</span>
                          <span className="json-size-tag">
                            {rawApiResponse
                              ? `${(Math.round(JSON.stringify(rawApiResponse).length / 102.4) / 10).toFixed(1)} KB`
                              : ""}
                          </span>
                        </div>
                        <div className="json-header-actions">
                          <button
                            type="button"
                            className="btn-json-action"
                            onClick={handleCopyJSONView}
                          >
                            {jsonCopied ? (
                              <>
                                <Check size={12} style={{ color: "#16a34a" }} />
                                <span style={{ color: "#16a34a" }}>Copied JSON</span>
                              </>
                            ) : (
                              <>
                                <Copy size={12} />
                                <span>Copy JSON</span>
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            className="btn-json-action"
                            onClick={handleDownloadJSON}
                          >
                            <Download size={12} />
                            <span>Download JSON</span>
                          </button>
                        </div>
                      </div>
                      <pre className="json-code-content">
                        <code>
                          {JSON.stringify(
                            rawApiResponse || { success: true, data: results },
                            null,
                            2
                          )}
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
