import React, { useState, useRef } from "react"
import {
  Upload,
  FileText,
  X,
  Zap,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Download,
  Trash2,
  Layers,
} from "lucide-react"

/* ─── Types ──────────────────────────────────────────────── */
export type BatchFileStatus = "ready" | "processing" | "completed" | "failed"

export interface BatchFileItem {
  id: string
  file: File
  name: string
  size: number
  status: BatchFileStatus
  sectionsCount?: number
  totalPages?: number
  extractionTimeMs?: number
  error?: string
  resultData?: any
}

/* ─── Helpers ────────────────────────────────────────────── */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export const BatchExtractionPage: React.FC = () => {
  const [files, setFiles] = useState<BatchFileItem[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessingAll, setIsProcessingAll] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Add files to batch list
  const addFiles = (selectedFiles: FileList | File[]) => {
    const newItems: BatchFileItem[] = []
    Array.from(selectedFiles).forEach((file) => {
      const lower = file.name.toLowerCase()
      if (
        lower.endsWith(".pdf") ||
        lower.endsWith(".docx") ||
        lower.endsWith(".doc") ||
        file.type === "application/pdf" ||
        file.type.includes("word") ||
        file.type.includes("officedocument")
      ) {
        newItems.push({
          id: `${file.name}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          file,
          name: file.name,
          size: file.size,
          status: "ready",
        })
      }
    })
    if (newItems.length > 0) {
      setFiles((prev) => [...prev, ...newItems])
    }
  }

  // Handle Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files)
    }
  }

  // Extract a single file via backend or fallback
  const extractFile = async (item: BatchFileItem): Promise<BatchFileItem> => {
    const formData = new FormData()
    formData.append("file", item.file)

    const startTime = performance.now()

    try {
      let res: Response
      try {
        res = await fetch("/api/extract?granularity=detailed", {
          method: "POST",
          body: formData,
        })
      } catch {
        res = await fetch("http://127.0.0.1:8000/api/extract?granularity=detailed", {
          method: "POST",
          body: formData,
        })
      }

      const elapsed = Math.round(performance.now() - startTime)

      if (res.ok) {
        const data = await res.json()
        return {
          ...item,
          status: "completed",
          sectionsCount: data.data?.length || 0,
          totalPages: data.metadata?.total_pages || 1,
          extractionTimeMs: data.metadata?.extraction_time_ms || elapsed,
          resultData: data,
        }
      } else {
        return {
          ...item,
          status: "failed",
          error: `Server responded ${res.status}`,
        }
      }
    } catch (err: any) {
      return {
        ...item,
        status: "failed",
        error: err.message || "Failed to process document",
      }
    }
  }

  // Extract All files sequentially or in parallel batches
  const handleExtractAll = async () => {
    const readyItems = files.filter((f) => f.status === "ready" || f.status === "failed")
    if (readyItems.length === 0) return

    setIsProcessingAll(true)

    for (const item of readyItems) {
      setFiles((prev) =>
        prev.map((f) => (f.id === item.id ? { ...f, status: "processing", error: undefined } : f))
      )

      const updated = await extractFile(item)

      setFiles((prev) => prev.map((f) => (f.id === item.id ? updated : f)))
    }

    setIsProcessingAll(false)
  }

  // Remove single file
  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }

  // Clear all files
  const clearAll = () => {
    if (isProcessingAll) return
    setFiles([])
  }

  // Download all completed results as JSON
  const handleDownloadAllJSON = () => {
    const completedItems = files.filter((f) => f.status === "completed" && f.resultData)
    if (completedItems.length === 0) return

    const payload = {
      batch_name: "extractai_batch_export",
      export_timestamp: new Date().toISOString(),
      total_files: completedItems.length,
      results: completedItems.map((f) => ({
        file_name: f.name,
        file_size_bytes: f.size,
        sections_found: f.sectionsCount,
        metadata: f.resultData.metadata,
        data: f.resultData.data,
      })),
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `batch_extraction_${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const completedCount = files.filter((f) => f.status === "completed").length
  const failedCount = files.filter((f) => f.status === "failed").length
  const readyCount = files.filter((f) => f.status === "ready").length

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1040, margin: "0 auto" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 4px 0" }}>
            Batch Extractions
          </h2>
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
            Upload multiple PDF or Word documents to extract headings and body text in a single run.
          </p>
        </div>

        {/* Global Action Controls */}
        {files.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {completedCount > 0 && (
              <button
                onClick={handleDownloadAllJSON}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "7px 12px",
                  borderRadius: 6,
                  border: "1px solid var(--border-color)",
                  background: "var(--card-bg)",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <Download size={14} color="#e74c3c" />
                Download Results JSON ({completedCount})
              </button>
            )}

            <button
              onClick={handleExtractAll}
              disabled={isProcessingAll || readyCount === 0}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                fontWeight: 600,
                padding: "7px 16px",
                borderRadius: 6,
                border: "none",
                background: isProcessingAll || readyCount === 0 ? "var(--border-hover, #a1a1aa)" : "#e74c3c",
                color: "#ffffff",
                cursor: isProcessingAll || readyCount === 0 ? "not-allowed" : "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {isProcessingAll ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Extracting...
                </>
              ) : (
                <>
                  <Zap size={14} color="#ffffff" />
                  Extract All ({readyCount > 0 ? readyCount : files.length})
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Multiple PDF / DOC Upload Zone (matching Image 1 layout) */}
      <div className="upload-wrapper" style={{ marginBottom: 24 }}>
        <div
          className={`dropzone ${isDragging ? "dropzone--dragging" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            multiple
            style={{ display: "none" }}
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files)
            }}
          />

          <div className="dropzone-icon-wrap">
            <Upload className="dropzone-icon" />
          </div>

          <div className="dropzone-prompt">
            <strong>Upload multiple PDFs</strong>, or{" "}
            <span className="dropzone-browse-link">Browse files</span>
          </div>

          <div className="dropzone-sub">
            Accepted file types: PDF, DOC, DOCX · Select multiple files
          </div>
        </div>
      </div>

      {/* Selected File List */}
      {files.length > 0 && (
        <div
          style={{
            background: "var(--card-bg)",
            border: "1px solid var(--border-color)",
            borderRadius: 8,
            overflow: "hidden",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          {/* Table Header Bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 16px",
              background: "var(--table-head-bg, #fbfbfb)",
              borderBottom: "1px solid var(--border-color)",
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--text-muted)",
            }}
          >
            <span>
              Queue ({files.length} {files.length === 1 ? "document" : "documents"})
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {completedCount > 0 && (
                <span style={{ color: "#16a34a", fontWeight: 600 }}>{completedCount} completed</span>
              )}
              {failedCount > 0 && (
                <span style={{ color: "#ef4444", fontWeight: 600 }}>{failedCount} failed</span>
              )}
              {!isProcessingAll && (
                <button
                  onClick={clearAll}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-muted)",
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  Clear all
                </button>
              )}
            </div>
          </div>

          {/* Files Rows */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            {files.map((item, idx) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  borderBottom: idx === files.length - 1 ? "none" : "1px solid var(--border-subtle, #f4f4f5)",
                  gap: 12,
                }}
              >
                {/* Left: Icon & Filename + Size */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: "rgba(231, 76, 60, 0.1)",
                      border: "1px solid rgba(231, 76, 60, 0.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#e74c3c",
                      flexShrink: 0,
                    }}
                  >
                    <FileText size={14} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--text-primary)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                      title={item.name}
                    >
                      {item.name}
                    </p>
                    <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace" }}>
                      {formatFileSize(item.size)}
                    </span>
                  </div>
                </div>

                {/* Center: Processing Status */}
                <div style={{ flexShrink: 0 }}>
                  {item.status === "ready" && (
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--text-secondary)",
                        background: "var(--card-subtle-bg, #f4f4f5)",
                        border: "1px solid var(--border-color)",
                        padding: "3px 8px",
                        borderRadius: 9999,
                        fontWeight: 500,
                      }}
                    >
                      Ready
                    </span>
                  )}

                  {item.status === "processing" && (
                    <span
                      style={{
                        fontSize: 11,
                        color: "#b45309",
                        background: "#fef3c7",
                        border: "1px solid #fde68a",
                        padding: "3px 8px",
                        borderRadius: 9999,
                        fontWeight: 600,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                      }}
                    >
                      <Loader2 size={11} className="animate-spin" />
                      Extracting...
                    </span>
                  )}

                  {item.status === "completed" && (
                    <span
                      style={{
                        fontSize: 11,
                        color: "#16a34a",
                        background: "rgba(22, 163, 74, 0.12)",
                        border: "1px solid rgba(22, 163, 74, 0.25)",
                        padding: "3px 8px",
                        borderRadius: 9999,
                        fontWeight: 600,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                      }}
                    >
                      <CheckCircle2 size={12} />
                      {item.sectionsCount} sections ({item.extractionTimeMs}ms)
                    </span>
                  )}

                  {item.status === "failed" && (
                    <span
                      style={{
                        fontSize: 11,
                        color: "#ef4444",
                        background: "rgba(239, 68, 68, 0.12)",
                        border: "1px solid rgba(239, 68, 68, 0.25)",
                        padding: "3px 8px",
                        borderRadius: 9999,
                        fontWeight: 600,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                      }}
                      title={item.error}
                    >
                      <AlertCircle size={12} />
                      Failed
                    </span>
                  )}
                </div>

                {/* Right: Remove Action */}
                <div style={{ flexShrink: 0 }}>
                  <button
                    onClick={() => removeFile(item.id)}
                    disabled={isProcessingAll}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--text-muted)",
                      cursor: isProcessingAll ? "not-allowed" : "pointer",
                      padding: 4,
                      display: "flex",
                      alignItems: "center",
                      borderRadius: 4,
                    }}
                    title="Remove file"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
