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
      if (file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf") {
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

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files)
    }
  }

  // Remove individual file
  const removeFile = (id: string) => {
    if (isProcessingAll) return
    setFiles((prev) => prev.filter((item) => item.id !== id))
  }

  // Clear entire list
  const clearAll = () => {
    if (isProcessingAll) return
    setFiles([])
  }

  // Process a single file against backend POST /api/extract
  const processFile = async (item: BatchFileItem): Promise<BatchFileItem> => {
    const formData = new FormData()
    formData.append("file", item.file)

    try {
      let res: Response
      try {
        res = await fetch("/api/extract", { method: "POST", body: formData })
      } catch {
        res = await fetch("http://127.0.0.1:8000/api/extract", { method: "POST", body: formData })
      }

      if (!res.ok) {
        const errorJson = await res.json().catch(() => null)
        throw new Error(errorJson?.detail || `Server returned ${res.status}`)
      }

      const json = await res.json()
      if (json.success && Array.isArray(json.data)) {
        try {
          const docRecord = {
            id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            fileName: json.metadata?.file_name ?? item.name,
            uploadDate: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
            sectionsCount: json.data.length,
            totalPages: json.metadata?.total_pages ?? json.total_pages ?? 1,
            fileSize: json.metadata?.file_size ?? formatFileSize(item.size),
            status: "Processed",
            sections: json.data,
          }
          const existing = JSON.parse(localStorage.getItem("extractai_processed_documents") || "[]")
          const filtered = existing.filter((d: any) => d.fileName !== (json.metadata?.file_name ?? item.name))
          localStorage.setItem("extractai_processed_documents", JSON.stringify([docRecord, ...filtered]))
        } catch {
          // ignore storage error
        }

        return {
          ...item,
          status: "completed",
          sectionsCount: json.data.length,
          totalPages: json.metadata?.total_pages ?? json.total_pages ?? 1,
          extractionTimeMs: json.metadata?.extraction_time_ms ?? Math.round((json.processing_time_sec ?? 0.5) * 1000),
          resultData: json,
        }
      } else {
        throw new Error("Invalid response format from extraction API")
      }
    } catch (err: any) {
      return {
        ...item,
        status: "failed",
        error: err?.message || "Extraction failed",
      }
    }
  }

  // Run batch extraction
  const handleExtractAll = async () => {
    if (files.length === 0 || isProcessingAll) return

    setIsProcessingAll(true)
    const pendingItems = files.filter((f) => f.status === "ready" || f.status === "failed")

    for (const item of pendingItems) {
      // Mark as processing
      setFiles((prev) =>
        prev.map((f) => (f.id === item.id ? { ...f, status: "processing", error: undefined } : f))
      )

      // Execute extraction
      const updated = await processFile(item)

      // Update state
      setFiles((prev) => prev.map((f) => (f.id === item.id ? updated : f)))
    }

    setIsProcessingAll(false)
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
    <div style={{ padding: "24px 28px", maxWidth: 1000, margin: "0 auto" }}>
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
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a", margin: "0 0 4px 0" }}>
            Batch Extractions
          </h2>
          <p style={{ fontSize: 12, color: "#71717a", margin: 0 }}>
            Upload multiple PDF documents to extract headings and body text in a single run.
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
                  border: "1px solid #e4e4e7",
                  background: "#ffffff",
                  color: "#18181b",
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
                background: isProcessingAll || readyCount === 0 ? "#a1a1aa" : "#1a1a1a",
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
                  <Zap size={14} color="#e74c3c" />
                  Extract All ({readyCount > 0 ? readyCount : files.length})
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Multiple PDF Upload / Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          background: isDragging ? "#fef2f2" : "#ffffff",
          border: `2px dashed ${isDragging ? "#e74c3c" : "#e5e5e8"}`,
          borderRadius: 10,
          padding: "32px 24px",
          textAlign: "center",
          cursor: "pointer",
          transition: "all 0.15s ease",
          marginBottom: 24,
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          multiple
          style={{ display: "none" }}
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files)
          }}
        />

        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            background: "#fef2f2",
            border: "1px solid #fee2e2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 12px auto",
            color: "#e74c3c",
          }}
        >
          <Upload size={20} />
        </div>

        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a", margin: "0 0 4px 0" }}>
          Drop multiple PDF files here
        </h3>
        <p style={{ fontSize: 12, color: "#71717a", margin: "0 0 12px 0" }}>
          or click to select documents from your computer
        </p>

        <span
          style={{
            display: "inline-block",
            fontSize: 11,
            color: "#a1a1aa",
            background: "#fbfbfb",
            padding: "3px 8px",
            borderRadius: 4,
            border: "1px solid #e5e5e8",
          }}
        >
          Select multiple .pdf files
        </span>
      </div>

      {/* Selected File List */}
      {files.length > 0 && (
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e5e5e8",
            borderRadius: 8,
            overflow: "hidden",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
          }}
        >
          {/* Table Header Bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 16px",
              background: "#fbfbfb",
              borderBottom: "1px solid #e5e5e8",
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "#71717a",
            }}
          >
            <span>
              Queue ({files.length} {files.length === 1 ? "document" : "documents"})
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {completedCount > 0 && (
                <span style={{ color: "#15803d", fontWeight: 600 }}>{completedCount} completed</span>
              )}
              {failedCount > 0 && (
                <span style={{ color: "#b91c1c", fontWeight: 600 }}>{failedCount} failed</span>
              )}
              {!isProcessingAll && (
                <button
                  onClick={clearAll}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#71717a",
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
                  borderBottom: idx === files.length - 1 ? "none" : "1px solid #f4f4f5",
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
                      background: "#fef2f2",
                      border: "1px solid #fee2e2",
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
                        color: "#18181b",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                      title={item.name}
                    >
                      {item.name}
                    </p>
                    <span style={{ fontSize: 11, color: "#a1a1aa", fontFamily: "monospace" }}>
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
                        color: "#71717a",
                        background: "#f4f4f5",
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
                        color: "#15803d",
                        background: "#f0fdf4",
                        border: "1px solid #bbf7d0",
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
                        color: "#b91c1c",
                        background: "#fef2f2",
                        border: "1px solid #fecaca",
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
                      color: isProcessingAll ? "#d4d4d8" : "#a1a1aa",
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
