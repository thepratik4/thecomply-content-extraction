import React, { useState } from "react"
import { FileText, CheckCircle2, Trash2, RefreshCw } from "lucide-react"

export interface UploadedFile {
  id: string
  name: string
  size: number
  type?: string
  progress: number
  failed?: boolean
  fileObject?: File
}

export function getReadableFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export const uploadFileWithProgress = (_file: File, onProgress: (progress: number) => void) => {
  let progress = 0
  const interval = setInterval(() => {
    progress += Math.floor(Math.random() * 8) + 4
    if (progress >= 100) {
      progress = 100
      clearInterval(interval)
    }
    onProgress(progress)
  }, 60)
}

interface FileUploadProgressFillProps {
  isDisabled?: boolean
  onFileSelect?: (file: File) => void
}

export const FileUploadProgressFill: React.FC<FileUploadProgressFillProps> = () => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])


  const handleDeleteFile = (id: string) => {
    setUploadedFiles((prev) => prev.filter((file) => file.id !== id))
  }

  const handleRetryFile = (id: string) => {
    const file = uploadedFiles.find((f) => f.id === id)
    if (!file) return

    setUploadedFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, progress: 0, failed: false } : f))
    )

    uploadFileWithProgress(new File([], file.name, { type: file.type }), (progress) => {
      setUploadedFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, progress, failed: false } : f))
      )
    })
  }

  return (
    <div className="file-upload-root" style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
      {/* File List with Progress Fill */}
      {uploadedFiles.length > 0 && (
        <div className="file-upload-list" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {uploadedFiles.map((file) => {
            const isComplete = file.progress >= 100 && !file.failed
            return (
              <div
                key={file.id}
                className="file-upload-item-fill"
                style={{
                  position: "relative",
                  overflow: "hidden",
                  borderRadius: 8,
                  border: "1px solid var(--border-color, #e5e5e8)",
                  background: "var(--card-bg, #ffffff)",
                  padding: "12px 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                {/* Progress Fill Background */}
                <div
                  className="file-upload-progress-fill-bg"
                  style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    left: 0,
                    width: `${file.progress}%`,
                    background: file.failed
                      ? "rgba(239, 68, 68, 0.08)"
                      : isComplete
                      ? "rgba(34, 197, 94, 0.08)"
                      : "rgba(231, 76, 60, 0.08)",
                    transition: "width 0.15s ease-out",
                    zIndex: 0,
                  }}
                />

                {/* Progress Fill Bottom Line */}
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    background: "var(--border-color, #f4f4f5)",
                    zIndex: 1,
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${file.progress}%`,
                      background: file.failed ? "#ef4444" : isComplete ? "#22c55e" : "#e74c3c",
                      transition: "width 0.15s ease-out",
                    }}
                  />
                </div>

                {/* Left: Icon & Meta */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, zIndex: 2, minWidth: 0 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      background: isComplete ? "#f0fdf4" : "#fef2f2",
                      border: `1px solid ${isComplete ? "#bbf7d0" : "#fee2e2"}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      color: isComplete ? "#16a34a" : "#e74c3c",
                    }}
                  >
                    <FileText size={18} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", minWidth: 0, gap: 2 }}>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--text-primary, #18181b)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {file.name}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-muted, #71717a)" }}>
                      <span>{getReadableFileSize(file.size)}</span>
                      <span>•</span>
                      {file.failed ? (
                        <span style={{ color: "#ef4444", fontWeight: 600 }}>Failed</span>
                      ) : isComplete ? (
                        <span style={{ color: "#16a34a", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 3 }}>
                          <CheckCircle2 size={11} /> 100% Uploaded
                        </span>
                      ) : (
                        <span style={{ fontWeight: 600, color: "#e74c3c" }}>
                          Uploading... {file.progress}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, zIndex: 2 }}>
                  {file.failed && (
                    <button
                      onClick={() => handleRetryFile(file.id)}
                      title="Retry"
                      style={{
                        background: "none",
                        border: "none",
                        color: "#71717a",
                        cursor: "pointer",
                        padding: 4,
                      }}
                    >
                      <RefreshCw size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteFile(file.id)}
                    title="Remove"
                    style={{
                      background: "none",
                      border: "none",
                      color: "#71717a",
                      cursor: "pointer",
                      padding: 4,
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
