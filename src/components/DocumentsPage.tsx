import React, { useState, useMemo } from "react"
import {
  FileText,
  Search,
  ArrowLeft,
  Copy,
  Check,
  X,
  Trash2,
} from "lucide-react"
import { type ExtractedSection } from "../mockData"

/* ─── Types ──────────────────────────────────────────────── */
export interface ProcessedDocument {
  id: string
  fileName: string
  uploadDate: string
  sectionsCount: number
  totalPages: number
  fileSize: string
  status: "Processed" | "Completed"
  sections: ExtractedSection[]
}

/* ─── Level badge styling ────────────────────────────────── */
function levelBadge(level: number) {
  if (level === 1) {
    return {
      label: "H1",
      bg: "#fef2f2",
      color: "#e74c3c",
      border: "#fecaca",
    }
  }
  if (level === 2) {
    return {
      label: "H2",
      bg: "#f1f5f9",
      color: "#334155",
      border: "#cbd5e1",
    }
  }
  return {
    label: "H3",
    bg: "#f4f4f5",
    color: "#71717a",
    border: "#e4e4e7",
  }
}

export const DocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState<ProcessedDocument[]>(() => {
    try {
      const stored = localStorage.getItem("extractai_processed_documents")
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedDoc, setSelectedDoc] = useState<ProcessedDocument | null>(null)
  const [copiedSectionId, setCopiedSectionId] = useState<string | null>(null)

  // Filter documents based on search query
  const filteredDocs = useMemo(() => {
    if (!searchQuery.trim()) return documents
    const q = searchQuery.toLowerCase()
    return documents.filter((doc) => doc.fileName.toLowerCase().includes(q))
  }, [searchQuery, documents])

  // Delete a document from history
  const handleDeleteDoc = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const updated = documents.filter((d) => d.id !== id)
    setDocuments(updated)
    try {
      localStorage.setItem("extractai_processed_documents", JSON.stringify(updated))
    } catch {
      // ignore
    }
  }

  // Copy section text helper
  const handleCopySection = (id: string, heading: string, text: string) => {
    navigator.clipboard.writeText(`## ${heading}\n\n${text}`)
    setCopiedSectionId(id)
    setTimeout(() => setCopiedSectionId(null), 1600)
  }

  /* ──────────────────────────────────────────────────────────
     1. DOCUMENT DETAIL VIEW (When "View" is selected)
     ────────────────────────────────────────────────────────── */
  if (selectedDoc) {
    return (
      <div style={{ padding: "24px 28px", maxWidth: 1000, margin: "0 auto" }}>
        {/* Detail Header Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
            paddingBottom: 16,
            borderBottom: "1px solid var(--border-color)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={() => setSelectedDoc(null)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 6,
                border: "1px solid var(--border-color)",
                background: "var(--card-subtle-bg, #f4f4f5)",
                color: "var(--text-primary)",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <ArrowLeft size={14} />
              Back to Documents
            </button>
            <div style={{ height: 16, width: 1, background: "var(--border-color)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <FileText size={16} color="#e74c3c" />
              <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
                {selectedDoc.fileName}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#16a34a",
                background: "rgba(22, 163, 74, 0.12)",
                border: "1px solid rgba(22, 163, 74, 0.25)",
                padding: "3px 8px",
                borderRadius: 9999,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#16a34a",
                }}
              />
              {selectedDoc.status}
            </span>
          </div>
        </div>

        {/* Metadata Strip */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            background: "var(--card-bg)",
            border: "1px solid var(--border-color)",
            padding: "10px 16px",
            borderRadius: 8,
            marginBottom: 20,
            fontSize: 12,
            color: "var(--text-muted)",
          }}
        >
          <div>
            <span style={{ color: "var(--text-muted)", marginRight: 4 }}>Uploaded:</span>
            <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{selectedDoc.uploadDate}</span>
          </div>
          <span style={{ color: "var(--border-color)" }}>•</span>
          <div>
            <span style={{ color: "var(--text-muted)", marginRight: 4 }}>Sections:</span>
            <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{selectedDoc.sections.length}</span>
          </div>
          <span style={{ color: "var(--border-color)" }}>•</span>
          <div>
            <span style={{ color: "var(--text-muted)", marginRight: 4 }}>Pages:</span>
            <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{selectedDoc.totalPages}</span>
          </div>
          <span style={{ color: "var(--border-color)" }}>•</span>
          <div>
            <span style={{ color: "var(--text-muted)", marginRight: 4 }}>File size:</span>
            <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{selectedDoc.fileSize}</span>
          </div>
        </div>

        {/* Extracted Structured Sections */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {selectedDoc.sections.map((section) => {
            const badge = levelBadge(section.level)
            const isH1 = section.level === 1

            return (
              <article
                key={section.id}
                style={{
                  background: "var(--card-bg)",
                  border: "1px solid var(--border-color)",
                  borderRadius: 8,
                  padding: "16px 20px",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
                  marginLeft: section.level === 2 ? 16 : section.level === 3 ? 32 : 0,
                  borderLeft:
                    section.level === 2
                      ? "3px solid #cbd5e1"
                      : section.level === 3
                      ? "3px solid var(--border-color)"
                      : "1px solid var(--border-color)",
                }}
              >
                {/* Section Meta Strip */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "1px 6px",
                        borderRadius: 4,
                        background: badge.bg,
                        color: badge.color,
                        border: `1px solid ${badge.border}`,
                      }}
                    >
                      {badge.label}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--text-muted)",
                        background: "var(--card-subtle-bg, #f4f4f5)",
                        border: "1px solid var(--border-color)",
                        padding: "1px 6px",
                        borderRadius: 4,
                        fontWeight: 500,
                      }}
                    >
                      Page {section.page}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace" }}>
                      {section.char_count} chars
                    </span>
                  </div>

                  <button
                    onClick={() => handleCopySection(section.id, section.heading, section.text)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 11,
                      fontWeight: 500,
                      color: copiedSectionId === section.id ? "#15803d" : "var(--text-muted)",
                      background: copiedSectionId === section.id ? "#f0fdf4" : "transparent",
                      border: "1px solid",
                      borderColor: copiedSectionId === section.id ? "#bbf7d0" : "var(--border-color)",
                      padding: "3px 8px",
                      borderRadius: 4,
                      cursor: "pointer",
                    }}
                    title="Copy section text"
                  >
                    {copiedSectionId === section.id ? (
                      <>
                        <Check size={11} />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy size={11} />
                        Copy
                      </>
                    )}
                  </button>
                </div>

                {/* Section Heading */}
                <h4
                  style={{
                    fontSize: isH1 ? 15 : 13,
                    fontWeight: isH1 ? 700 : 600,
                    color: "var(--text-primary)",
                    margin: "0 0 8px 0",
                    lineHeight: 1.3,
                  }}
                >
                  {section.heading}
                </h4>

                {/* Section Body Text */}
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--text-secondary)",
                    lineHeight: 1.5,
                    whiteSpace: "pre-line",
                  }}
                >
                  {section.text}
                </div>
              </article>
            )
          })}
        </div>
      </div>
    )
  }

  /* ──────────────────────────────────────────────────────────
     2. DOCUMENTS TABLE / LIST VIEW
     ────────────────────────────────────────────────────────── */
  return (
    <div style={{ padding: "24px 28px", maxWidth: 1080, margin: "0 auto" }}>
      {/* Page Header */}
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
            Documents
          </h2>
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
            Previously processed PDF and Word files and their extracted structure.
          </p>
        </div>

        {/* Search by filename */}
        <div style={{ position: "relative", width: 260 }}>
          <Search
            size={14}
            color="var(--text-muted)"
            style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by filename..."
            style={{
              width: "100%",
              padding: "7px 28px 7px 32px",
              fontSize: 12,
              borderRadius: 6,
              border: "1px solid var(--border-color)",
              background: "var(--card-bg)",
              color: "var(--text-primary)",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              style={{
                position: "absolute",
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                color: "var(--text-muted)",
                display: "flex",
                alignItems: "center",
              }}
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Document Table / List */}
      {filteredDocs.length > 0 ? (
        <div
          style={{
            background: "var(--card-bg)",
            border: "1px solid var(--border-color)",
            borderRadius: 8,
            overflow: "hidden",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
            <thead>
              <tr
                style={{
                  background: "var(--table-head-bg, #fbfbfb)",
                  borderBottom: "1px solid var(--border-color)",
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "var(--text-muted)",
                }}
              >
                <th style={{ padding: "10px 16px" }}>Filename</th>
                <th style={{ padding: "10px 16px", width: 140 }}>Upload Date</th>
                <th style={{ padding: "10px 16px", width: 120 }}>Sections</th>
                <th style={{ padding: "10px 16px", width: 120 }}>Status</th>
                <th style={{ padding: "10px 16px", width: 90, textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocs.map((doc, idx) => (
                <tr
                  key={doc.id}
                  style={{
                    borderBottom: idx === filteredDocs.length - 1 ? "none" : "1px solid #f4f4f5",
                    transition: "background 0.12s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#f9f9fb"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent"
                  }}
                >
                  {/* Filename */}
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
                      <div>
                        <p
                          style={{
                            margin: 0,
                            fontWeight: 600,
                            color: "var(--text-primary)",
                            fontSize: 13,
                          }}
                        >
                          {doc.fileName}
                        </p>
                        <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace" }}>
                          {doc.fileSize} • {doc.totalPages} pages
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Upload Date */}
                  <td style={{ padding: "12px 16px", color: "var(--text-secondary)", fontSize: 12 }}>
                    {doc.uploadDate}
                  </td>

                  {/* Extracted Sections Count */}
                  <td style={{ padding: "12px 16px" }}>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--text-primary)",
                        background: "var(--card-subtle-bg, #f4f4f5)",
                        border: "1px solid var(--border-color)",
                        padding: "2px 8px",
                        borderRadius: 4,
                      }}
                    >
                      {doc.sectionsCount} sections
                    </span>
                  </td>

                  {/* Status Indicator */}
                  <td style={{ padding: "12px 16px" }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: "#16a34a",
                        background: "rgba(22, 163, 74, 0.12)",
                        border: "1px solid rgba(22, 163, 74, 0.25)",
                        padding: "2px 8px",
                        borderRadius: 9999,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: "#16a34a",
                        }}
                      />
                      {doc.status}
                    </span>
                  </td>

                  {/* Action: "View" and "Delete" */}
                  <td style={{ padding: "12px 16px", textAlign: "right" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <button
                        onClick={() => setSelectedDoc(doc)}
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          padding: "5px 12px",
                          borderRadius: 6,
                          border: "1px solid var(--border-color)",
                          background: "var(--card-subtle-bg, #f4f4f5)",
                          color: "var(--text-primary)",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        View
                      </button>
                      <button
                        onClick={(e) => handleDeleteDoc(doc.id, e)}
                        title="Remove from history"
                        style={{
                          fontSize: 12,
                          padding: "5px 7px",
                          borderRadius: 6,
                          border: "1px solid var(--border-color)",
                          background: "transparent",
                          color: "var(--text-muted)",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Empty State */
        <div
          style={{
            background: "var(--card-bg)",
            border: "1px solid var(--border-color)",
            borderRadius: 8,
            padding: "48px 24px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: "var(--card-subtle-bg, #f4f4f5)",
              border: "1px solid var(--border-color)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 12px auto",
              color: "var(--text-muted)",
            }}
          >
            <FileText size={20} />
          </div>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 4px 0" }}>
            No documents found
          </h3>
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 16px 0" }}>
            {searchQuery
              ? `No documents matching "${searchQuery}"`
              : "No previously processed documents are available."}
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: "6px 14px",
                borderRadius: 6,
                border: "1px solid var(--border-color)",
                background: "var(--card-subtle-bg, #f4f4f5)",
                color: "var(--text-primary)",
                cursor: "pointer",
              }}
            >
              Clear search
            </button>
          )}
        </div>
      )}
    </div>
  )
}
