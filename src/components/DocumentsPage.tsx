import React, { useState, useMemo } from "react"
import {
  FileText,
  Search,
  ArrowLeft,
  CheckCircle2,
  Copy,
  Check,
  ChevronRight,
  ExternalLink,
  Layers,
  Calendar,
  Clock,
  X,
} from "lucide-react"
import { MOCK_EXTRACTION_DATA, type ExtractedSection } from "../mockData"

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

/* ─── Realistic Mock Documents ────────────────────────────── */
const MOCK_DOCUMENTS: ProcessedDocument[] = [
  {
    id: "doc-1",
    fileName: "AMGN-135003565.pdf",
    uploadDate: "Sep 21, 2026",
    sectionsCount: 11,
    totalPages: 15,
    fileSize: "30.2 KB",
    status: "Processed",
    sections: MOCK_EXTRACTION_DATA,
  },
  {
    id: "doc-2",
    fileName: "Maryland-SOV-Annuity-Filing.pdf",
    uploadDate: "Sep 18, 2026",
    sectionsCount: 8,
    totalPages: 12,
    fileSize: "48.5 KB",
    status: "Processed",
    sections: [
      {
        id: "sov-1",
        heading: "1. Statement of Variability Summary",
        level: 1,
        page: 1,
        text: "This filing contains revised Statement of Variability specifications for group non-variable annuity products submitted under Maryland Insurance Code § 16-102.",
        char_count: 172,
      },
      {
        id: "sov-2",
        heading: "1.1 General Product Classification",
        level: 2,
        page: 2,
        text: "Sub-TOI: A05G.000 Annuities - Immediate Non-variable. Primary carrier: American General Life Insurance Company. Market Type: Employer Group.",
        char_count: 148,
      },
      {
        id: "sov-3",
        heading: "2. Contract Variable Provisions",
        level: 1,
        page: 4,
        text: "Variable language provisions across contract specification pages, payout frequency options, guaranteed interest floor, and death benefit riders.",
        char_count: 154,
      },
      {
        id: "sov-4",
        heading: "2.1 Interest Guarantee Thresholds",
        level: 2,
        page: 5,
        text: "Guaranteed minimum rate is fixed at 2.75% per annum for the initial five-year policy period, subject to statutory standard non-forfeiture minimums.",
        char_count: 152,
      },
      {
        id: "sov-5",
        heading: "3. Redline Version Comparison",
        level: 1,
        page: 8,
        text: "Enclosed redline document P 22550-I highlights 4 textual modifications reflecting state review recommendations from examiner correspondence.",
        char_count: 146,
      },
    ],
  },
  {
    id: "doc-3",
    fileName: "Corebridge-Master-Agreement.pdf",
    uploadDate: "Sep 14, 2026",
    sectionsCount: 6,
    totalPages: 9,
    fileSize: "112.4 KB",
    status: "Processed",
    sections: [
      {
        id: "cba-1",
        heading: "Section 1: Parties and Scope",
        level: 1,
        page: 1,
        text: "This Master Services Agreement is entered into between Corebridge Financial Inc. and authorized enterprise distribution partners.",
        char_count: 136,
      },
      {
        id: "cba-2",
        heading: "Section 2: Regulatory Compliance Obligations",
        level: 1,
        page: 3,
        text: "Both parties agree to adhere to applicable FINRA and state insurance department disclosure rules regarding product documentation and customer notices.",
        char_count: 158,
      },
      {
        id: "cba-3",
        heading: "Section 2.1 Audit and Record Retention",
        level: 2,
        page: 5,
        text: "All statutory records, filing confirmations, and communication transcripts shall be retained for a period of not less than seven (7) policy years.",
        char_count: 154,
      },
    ],
  },
  {
    id: "doc-4",
    fileName: "SERFF-Statutory-Dispositions.pdf",
    uploadDate: "Sep 08, 2026",
    sectionsCount: 5,
    totalPages: 7,
    fileSize: "64.1 KB",
    status: "Processed",
    sections: [
      {
        id: "disp-1",
        heading: "Filing Disposition Notice",
        level: 1,
        page: 1,
        text: "Disposition Status: Received and Filed. Date Processed: 08/17/2026. Effective Date: Immediate upon acknowledgment by State Commissioner of Insurance.",
        char_count: 153,
      },
      {
        id: "disp-2",
        heading: "Reviewer Commentary",
        level: 1,
        page: 2,
        text: "Department review concluded with no remaining objections. All supplementary redline schedules have been verified against Maryland Bulletin 22-04.",
        char_count: 151,
      },
    ],
  },
  {
    id: "doc-5",
    fileName: "Form-10K-Part-I-Business.pdf",
    uploadDate: "Aug 29, 2026",
    sectionsCount: 14,
    totalPages: 22,
    fileSize: "210.0 KB",
    status: "Processed",
    sections: [
      {
        id: "10k-1",
        heading: "Item 1. Business Overview",
        level: 1,
        page: 1,
        text: "Corebridge Financial provides retirement solutions and insurance products across individual retirement, group retirement, and life solutions segments.",
        char_count: 153,
      },
      {
        id: "10k-2",
        heading: "Item 1A. Risk Factors",
        level: 1,
        page: 7,
        text: "Market risk, interest rate volatility, statutory capital requirements, credit quality changes, and evolving regulatory mandates represent material risks.",
        char_count: 159,
      },
    ],
  },
]

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
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedDoc, setSelectedDoc] = useState<ProcessedDocument | null>(null)
  const [copiedSectionId, setCopiedSectionId] = useState<string | null>(null)

  // Filter documents based on search query
  const filteredDocs = useMemo(() => {
    if (!searchQuery.trim()) return MOCK_DOCUMENTS
    const q = searchQuery.toLowerCase()
    return MOCK_DOCUMENTS.filter((doc) => doc.fileName.toLowerCase().includes(q))
  }, [searchQuery])

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
            borderBottom: "1px solid #e5e5e8",
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
                border: "1px solid #e4e4e7",
                background: "#ffffff",
                color: "#18181b",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <ArrowLeft size={14} />
              Back to Documents
            </button>
            <div style={{ height: 16, width: 1, background: "#e5e5e8" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <FileText size={16} color="#e74c3c" />
              <span style={{ fontSize: 15, fontWeight: 700, color: "#1a1a1a" }}>
                {selectedDoc.fileName}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#15803d",
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
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
            background: "#ffffff",
            border: "1px solid #e5e5e8",
            padding: "10px 16px",
            borderRadius: 8,
            marginBottom: 20,
            fontSize: 12,
            color: "#71717a",
          }}
        >
          <div>
            <span style={{ color: "#a1a1aa", marginRight: 4 }}>Uploaded:</span>
            <span style={{ fontWeight: 600, color: "#1a1a1a" }}>{selectedDoc.uploadDate}</span>
          </div>
          <span style={{ color: "#e4e4e7" }}>•</span>
          <div>
            <span style={{ color: "#a1a1aa", marginRight: 4 }}>Sections:</span>
            <span style={{ fontWeight: 600, color: "#1a1a1a" }}>{selectedDoc.sections.length}</span>
          </div>
          <span style={{ color: "#e4e4e7" }}>•</span>
          <div>
            <span style={{ color: "#a1a1aa", marginRight: 4 }}>Pages:</span>
            <span style={{ fontWeight: 600, color: "#1a1a1a" }}>{selectedDoc.totalPages}</span>
          </div>
          <span style={{ color: "#e4e4e7" }}>•</span>
          <div>
            <span style={{ color: "#a1a1aa", marginRight: 4 }}>File size:</span>
            <span style={{ fontWeight: 600, color: "#1a1a1a" }}>{selectedDoc.fileSize}</span>
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
                  background: "#ffffff",
                  border: "1px solid #e5e5e8",
                  borderRadius: 8,
                  padding: "16px 20px",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
                  marginLeft: section.level === 2 ? 16 : section.level === 3 ? 32 : 0,
                  borderLeft:
                    section.level === 2
                      ? "3px solid #cbd5e1"
                      : section.level === 3
                      ? "3px solid #e4e4e7"
                      : "1px solid #e5e5e8",
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
                        color: "#71717a",
                        background: "#f4f4f5",
                        padding: "1px 6px",
                        borderRadius: 4,
                        fontWeight: 500,
                      }}
                    >
                      Page {section.page}
                    </span>
                    <span style={{ fontSize: 11, color: "#a1a1aa", fontFamily: "monospace" }}>
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
                      color: copiedSectionId === section.id ? "#15803d" : "#71717a",
                      background: copiedSectionId === section.id ? "#f0fdf4" : "transparent",
                      border: "1px solid",
                      borderColor: copiedSectionId === section.id ? "#bbf7d0" : "#e4e4e7",
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
                    color: "#1a1a1a",
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
                    color: "#52525b",
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
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a", margin: "0 0 4px 0" }}>
            Documents
          </h2>
          <p style={{ fontSize: 12, color: "#71717a", margin: 0 }}>
            Previously processed PDF files and their extracted structure.
          </p>
        </div>

        {/* Search by filename */}
        <div style={{ position: "relative", width: 260 }}>
          <Search
            size={14}
            color="#a1a1aa"
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
              border: "1px solid #e4e4e7",
              background: "#ffffff",
              color: "#1a1a1a",
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
                color: "#a1a1aa",
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
            background: "#ffffff",
            border: "1px solid #e5e5e8",
            borderRadius: 8,
            overflow: "hidden",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
            <thead>
              <tr
                style={{
                  background: "#fbfbfb",
                  borderBottom: "1px solid #e5e5e8",
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "#71717a",
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
                            color: "#18181b",
                            fontSize: 13,
                          }}
                        >
                          {doc.fileName}
                        </p>
                        <span style={{ fontSize: 11, color: "#a1a1aa", fontFamily: "monospace" }}>
                          {doc.fileSize} • {doc.totalPages} pages
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Upload Date */}
                  <td style={{ padding: "12px 16px", color: "#52525b", fontSize: 12 }}>
                    {doc.uploadDate}
                  </td>

                  {/* Extracted Sections Count */}
                  <td style={{ padding: "12px 16px" }}>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#18181b",
                        background: "#f4f4f5",
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
                        color: "#15803d",
                        background: "#f0fdf4",
                        border: "1px solid #bbf7d0",
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

                  {/* Action: "View" */}
                  <td style={{ padding: "12px 16px", textAlign: "right" }}>
                    <button
                      onClick={() => setSelectedDoc(doc)}
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        padding: "5px 12px",
                        borderRadius: 6,
                        border: "1px solid #e4e4e7",
                        background: "#ffffff",
                        color: "#18181b",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#1a1a1a"
                        e.currentTarget.style.color = "#ffffff"
                        e.currentTarget.style.borderColor = "#1a1a1a"
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "#ffffff"
                        e.currentTarget.style.color = "#18181b"
                        e.currentTarget.style.borderColor = "#e4e4e7"
                      }}
                    >
                      View
                    </button>
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
            background: "#ffffff",
            border: "1px solid #e5e5e8",
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
              background: "#f4f4f5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 12px auto",
              color: "#a1a1aa",
            }}
          >
            <FileText size={20} />
          </div>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: "#18181b", margin: "0 0 4px 0" }}>
            No documents found
          </h3>
          <p style={{ fontSize: 12, color: "#71717a", margin: "0 0 16px 0" }}>
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
                border: "1px solid #e4e4e7",
                background: "#ffffff",
                color: "#18181b",
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
