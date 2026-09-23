import React, { useState, useMemo } from "react";
import {
  FileText,
  Search,
  ArrowLeft,
  Copy,
  Check,
  X,
  Trash2,
  List,
  Table2,
  Code2,
  Download,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { type ExtractedSection, type ExtractedTable } from "../mockData";
import "./PdfExtractor.css";

/* ─── Types ──────────────────────────────────────────────── */
export interface ProcessedDocument {
  id: string;
  fileName: string;
  uploadDate: string;
  sectionsCount: number;
  totalPages: number;
  fileSize: string;
  status: "Processed" | "Completed";
  sections: ExtractedSection[];
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
  tables?: ExtractedTable[];
}

interface SectionTableData {
  sectionIndex: number;
  sectionId: string;
  sectionHeading: string;
  page?: number;
  keyValues: KeyValueRow[];
  realTables: ExtractedTable[];
}

/* ─── Parsing Helpers ────────────────────────────────────── */
function parseKeyValue(line: string): KeyValueRow | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length < 3) return null;
  const match = trimmed.match(/^([^:\n\t?]{2,45})[:\?]\s*(.+)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim();
    if (key.toLowerCase() === "http" || key.toLowerCase() === "https") return null;
    return { key, value };
  }
  return null;
}

function getSerializedTableRows(tables?: ExtractedTable[]): Set<string> {
  const set = new Set<string>();
  if (!tables) return set;
  for (const tbl of tables) {
    const cols = tbl.columns || [];
    for (const row of tbl.rows || []) {
      if (cols.length === 2 && row.length >= 2) {
        const k = (row[0] || "").trim();
        const v = (row[1] || "").trim();
        if (k && v) {
          set.add(`${k}: ${v}`);
        }
      } else {
        const parts: string[] = [];
        const limit = Math.min(cols.length, row.length);
        for (let c = 0; c < limit; c++) {
          const colName = (cols[c] || "").trim();
          const cellVal = String(row[c] ?? "").trim();
          if (cellVal) {
            parts.push(`${colName}: ${cellVal}`);
          }
        }
        if (parts.length > 0) {
          set.add(parts.join(" | "));
        }
      }
    }
  }
  return set;
}

function parseSubsections(
  sectionHeading: string,
  text: string,
  tables?: ExtractedTable[]
): ParsedSubsection[] {
  const serializedRows = getSerializedTableRows(tables);

  if (!text || !text.trim()) {
    return [
      {
        id: "sub-0",
        title: sectionHeading,
        paragraphs: tables && tables.length > 0 ? [] : ["[No body text under this section]"],
        keyValues: [],
        rawText: "",
        tables: tables ? [...tables] : [],
      },
    ];
  }

  const lines = text.split(/\r?\n/);
  const subsections: ParsedSubsection[] = [];
  let currentTitle = "";
  let currentLines: string[] = [];

  const flushCurrent = () => {
    if (currentLines.length === 0 && !currentTitle) return;

    const filteredLines = currentLines.filter((l) => !serializedRows.has(l.trim()));
    if (filteredLines.length === 0 && !currentTitle) {
      currentLines = [];
      return;
    }

    const raw = filteredLines.join("\n").trim();
    const paragraphs: string[] = [];
    const keyValues: KeyValueRow[] = [];
    let currentPara: string[] = [];

    for (const l of filteredLines) {
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

    if (line.startsWith("### ") || line.startsWith("## ") || line.startsWith("# ")) {
      flushCurrent();
      currentTitle = line.replace(/^#+\s*/, "");
      continue;
    }

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
    const allLines = lines
      .filter((l) => l.trim())
      .filter((l) => !serializedRows.has(l.trim()));
    const kvs = allLines.map(parseKeyValue).filter((kv): kv is KeyValueRow => kv !== null);
    const nonKvLines = allLines.filter((l) => !parseKeyValue(l));
    subsections.push({
      id: "sub-0",
      title: sectionHeading,
      paragraphs: nonKvLines.length > 0 ? [nonKvLines.join(" ")] : [],
      keyValues: kvs,
      rawText: allLines.join("\n"),
    });
  }

  if (tables && tables.length > 0 && subsections.length > 0) {
    const unassignedTables = [...tables];

    for (const sub of subsections) {
      const subNorm = sub.title.toLowerCase().trim();
      const matchedTables: ExtractedTable[] = [];
      for (let i = unassignedTables.length - 1; i >= 0; i--) {
        const tbl = unassignedTables[i];
        const tblHeading = (
          (tbl as any).heading ||
          (tbl as any).subheading ||
          (tbl as any).title ||
          ""
        ).toLowerCase().trim();
        if (tblHeading && (subNorm.includes(tblHeading) || tblHeading.includes(subNorm))) {
          matchedTables.unshift(tbl);
          unassignedTables.splice(i, 1);
        }
      }
      if (matchedTables.length > 0) {
        sub.tables = sub.tables ? [...sub.tables, ...matchedTables] : matchedTables;
      }
    }

    const emptySubs = subsections.filter(
      (s) => s.paragraphs.length === 0 && s.keyValues.length === 0 && (!s.tables || s.tables.length === 0)
    );
    while (unassignedTables.length > 0 && emptySubs.length > 0) {
      const sub = emptySubs.shift()!;
      const tbl = unassignedTables.shift()!;
      sub.tables = sub.tables ? [...sub.tables, tbl] : [tbl];
    }

    if (unassignedTables.length > 0) {
      const targetSub = subsections[0];
      targetSub.tables = targetSub.tables ? [...targetSub.tables, ...unassignedTables] : [...unassignedTables];
    }
  }

  return subsections;
}

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

function getTableCellClass(colName: string, totalCols: number, cIdx: number): string {
  if (totalCols === 2) {
    return cIdx === 0 ? "td-field-name" : "td-field-val";
  }
  const name = (colName || "").toLowerCase();
  if (
    name.includes("date") ||
    name.includes("status") ||
    name === "schedule" ||
    name.includes("code") ||
    name.includes("id") ||
    name.includes("type") ||
    name.includes("page")
  ) {
    return "td-cell-compact";
  }
  if (
    name.includes("name") ||
    name.includes("item") ||
    name.includes("desc") ||
    name.includes("document") ||
    name.includes("title") ||
    name.includes("summary") ||
    name.includes("text") ||
    name.includes("comment")
  ) {
    return "td-cell-text";
  }
  return "td-cell-regular";
}

/**
 * Cleans and normalizes cell content for tabular presentation.
 *
 * @param cell - Raw cell string.
 * @returns Cleaned and formatted string.
 */
function formatCellContent(cell: string): string {
  if (!cell) return "";
  let cleaned = cell.replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim();
  cleaned = cleaned.replace(/(\b[A-Za-z]{3,})-\s+([a-z]{2,}\b)/g, "$1$2");
  return cleaned;
}

/**
 * Safely copies text to the system clipboard, falling back to a hidden textarea
 * element when the Clipboard API is unavailable or rejected.
 *
 * @param text - Plain text string to copy.
 * @returns Promise resolving to true if copied successfully, false otherwise.
 */
async function copyToClipboard(text: string): Promise<boolean> {
  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === "function"
  ) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to DOM fallback
    }
  }

  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);
    return successful;
  } catch {
    return false;
  }
}


/* ─── Main Component ─────────────────────────────────────── */
/**
 * Documents management page displaying saved extraction history and detailed
 * section explorer with structured, tables, and JSON representations.
 *
 * @returns Complete Documents view component.
 */
export const DocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState<ProcessedDocument[]>(() => {
    try {
      const stored = localStorage.getItem("extractai_processed_documents");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDoc, setSelectedDoc] = useState<ProcessedDocument | null>(null);

  // Detail View State
  const [viewMode, setViewMode] = useState<"structured" | "tables" | "json">("structured");
  const [detailSearchQuery, setDetailSearchQuery] = useState("");
  const [selectedSectionIndex, setSelectedSectionIndex] = useState(0);
  const [expandedSubsections, setExpandedSubsections] = useState<Record<string, boolean>>({});
  const [copiedSectionIndex, setCopiedSectionIndex] = useState<number | null>(null);
  const [copiedSubKey, setCopiedSubKey] = useState<string | null>(null);
  const [allCopied, setAllCopied] = useState(false);
  const [jsonCopied, setJsonCopied] = useState(false);
  const [copiedTableId, setCopiedTableId] = useState<string | null>(null);

  // Filter documents in main table
  const filteredDocs = useMemo(() => {
    if (!searchQuery.trim()) return documents;
    const q = searchQuery.toLowerCase();
    return documents.filter((doc) => doc.fileName.toLowerCase().includes(q));
  }, [searchQuery, documents]);

  // Delete a document from history
  const handleDeleteDoc = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = documents.filter((d) => d.id !== id);
    setDocuments(updated);
    try {
      localStorage.setItem("extractai_processed_documents", JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  // Detail View: Filter sections in selected document
  const filteredSections = useMemo(() => {
    if (!selectedDoc) return [];
    if (!detailSearchQuery.trim()) return selectedDoc.sections;
    const q = detailSearchQuery.toLowerCase();
    return selectedDoc.sections.filter(
      (s) => s.heading.toLowerCase().includes(q) || s.text.toLowerCase().includes(q)
    );
  }, [selectedDoc, detailSearchQuery]);

  // Detail View: Selected section
  const selectedSection = useMemo(() => {
    if (!selectedDoc || selectedDoc.sections.length === 0) return null;
    return selectedDoc.sections[selectedSectionIndex] || selectedDoc.sections[0];
  }, [selectedDoc, selectedSectionIndex]);

  // Detail View: Subsections
  const currentSubsections = useMemo(() => {
    if (!selectedSection) return [];
    return parseSubsections(
      selectedSection.heading,
      selectedSection.text,
      selectedSection.tables
    );
  }, [selectedSection]);

  // Detail View: Tables
  const sectionsWithTables = useMemo<SectionTableData[]>(() => {
    if (!selectedDoc) return [];
    const tables: SectionTableData[] = [];

    selectedDoc.sections.forEach((sec, idx) => {
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
  }, [selectedDoc]);

  // Detail View: Accordion helpers
  const toggleSubsection = (key: string) => {
    setExpandedSubsections((prev) => ({
      ...prev,
      [key]: prev[key] === undefined ? false : !prev[key],
    }));
  };

  const allSubsectionsOpen = useMemo(() => {
    if (currentSubsections.length === 0) return true;
    return currentSubsections.every(
      (_, idx) => expandedSubsections[`${selectedSectionIndex}-${idx}`] !== false
    );
  }, [currentSubsections, selectedSectionIndex, expandedSubsections]);

  const toggleAllSubsections = () => {
    const nextState = !allSubsectionsOpen;
    const updates: Record<string, boolean> = {};
    currentSubsections.forEach((_, idx) => {
      updates[`${selectedSectionIndex}-${idx}`] = nextState;
    });
    setExpandedSubsections((prev) => ({ ...prev, ...updates }));
  };

  // Copy handlers
  /**
   * Copies the current section heading and body to the clipboard.
   *
   * @param index - Index of the section being copied.
   * @param section - Section content object.
   */
  const handleCopyCurrentSection = async (index: number, section: ExtractedSection) => {
    const formatted = `## ${section.heading}\n\n${section.text}`;
    const ok = await copyToClipboard(formatted);
    if (ok) {
      setCopiedSectionIndex(index);
      setTimeout(() => setCopiedSectionIndex(null), 1800);
    }
  };

  /**
   * Copies a subsection title, paragraphs, and formatted tables to the clipboard.
   *
   * @param subKey - Unique identifier for the subsection.
   * @param title - Subsection heading.
   * @param content - Subsection body text.
   * @param tables - Optional extracted tables attached to subsection.
   */
  const handleCopySubsection = async (
    subKey: string,
    title: string,
    content: string,
    tables?: ExtractedTable[]
  ) => {
    let tableText = "";
    if (tables && tables.length > 0) {
      tableText = tables
        .map((t) =>
          [
            t.columns.map((c) => formatCellContent(c)).join("\t"),
            ...t.rows.map((r) => r.map((c) => formatCellContent(c)).join("\t")),
          ].join("\n")
        )
        .join("\n\n");
    }
    const body = [content, tableText].filter(Boolean).join("\n\n");
    const formatted = `### ${title}\n\n${body}`;
    const ok = await copyToClipboard(formatted);
    if (ok) {
      setCopiedSubKey(subKey);
      setTimeout(() => setCopiedSubKey(null), 1800);
    }
  };

  /**
   * Copies all sections of the active document as Markdown to the clipboard.
   */
  const handleCopyAll = async () => {
    if (!selectedDoc || selectedDoc.sections.length === 0) return;
    const formatted = selectedDoc.sections
      .map(
        (s, idx) => `## ${String(idx + 1).padStart(2, "0")} ${s.heading}\n\n${s.text}`
      )
      .join("\n\n---\n\n");
    const ok = await copyToClipboard(formatted);
    if (ok) {
      setAllCopied(true);
      setTimeout(() => setAllCopied(false), 1800);
    }
  };

  /**
   * Copies full document metadata and extracted sections as structured JSON.
   */
  const handleCopyJSONView = async () => {
    if (!selectedDoc) return;
    const payload = {
      success: true,
      metadata: {
        file_name: selectedDoc.fileName,
        file_size: selectedDoc.fileSize,
        upload_date: selectedDoc.uploadDate,
        total_pages: selectedDoc.totalPages,
        sections_found: selectedDoc.sections.length,
      },
      data: selectedDoc.sections,
    };
    const ok = await copyToClipboard(JSON.stringify(payload, null, 2));
    if (ok) {
      setJsonCopied(true);
      setTimeout(() => setJsonCopied(false), 1800);
    }
  };

  /**
   * Copies table rows or key-value pairs formatted as tab-separated values.
   *
   * @param tableData - Table data for the section.
   */
  const handleCopyTable = async (tableData: SectionTableData) => {
    let text = "";
    if (tableData.realTables && tableData.realTables.length > 0) {
      const chunks = tableData.realTables.map((tbl) => {
        const header = tbl.columns.map((c) => formatCellContent(c)).join("\t");
        const body = tbl.rows
          .map((row) => row.map((c) => formatCellContent(c)).join("\t"))
          .join("\n");
        return `${header}\n${body}`;
      });
      text = chunks.join("\n\n");
    } else {
      const rows = tableData.keyValues.map((kv) => `${kv.key}\t${kv.value}`);
      text = `Field\tValue\n${rows.join("\n")}`;
    }
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedTableId(tableData.sectionId);
      setTimeout(() => setCopiedTableId(null), 1800);
    }
  };

  const handleDownloadJSON = () => {
    if (!selectedDoc) return;
    const payload = {
      success: true,
      metadata: {
        file_name: selectedDoc.fileName,
        file_size: selectedDoc.fileSize,
        upload_date: selectedDoc.uploadDate,
        total_pages: selectedDoc.totalPages,
        sections_found: selectedDoc.sections.length,
      },
      data: selectedDoc.sections,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const baseName = selectedDoc.fileName.replace(/\.[^/.]+$/, "") || "document";
    link.download = `${baseName}_extracted_results.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  /* ──────────────────────────────────────────────────────────
     1. DOCUMENT DETAIL VIEW (When "View" is selected)
     ────────────────────────────────────────────────────────── */
  if (selectedDoc) {
    return (
      <div style={{ padding: "24px 28px", maxWidth: 1040, margin: "0 auto" }}>
        {/* Detail Header Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
            paddingBottom: 14,
            borderBottom: "1px solid var(--border-color, #e5e5e8)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={() => {
                setSelectedDoc(null);
                setDetailSearchQuery("");
                setSelectedSectionIndex(0);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 6,
                border: "1px solid var(--border-color, #e5e5e8)",
                background: "var(--card-subtle-bg, #f4f4f5)",
                color: "var(--text-primary, #18181b)",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <ArrowLeft size={14} />
              Back to Documents
            </button>
            <div style={{ height: 16, width: 1, background: "var(--border-color, #e5e5e8)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <FileText size={16} color="#e74c3c" />
              <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary, #18181b)" }}>
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
            background: "var(--card-bg, #ffffff)",
            border: "1px solid var(--border-color, #e5e5e8)",
            padding: "10px 16px",
            borderRadius: 8,
            marginBottom: 20,
            fontSize: 12,
            color: "var(--text-muted, #71717a)",
          }}
        >
          <div>
            <span style={{ color: "var(--text-muted, #71717a)", marginRight: 4 }}>Uploaded:</span>
            <span style={{ fontWeight: 600, color: "var(--text-primary, #18181b)" }}>{selectedDoc.uploadDate}</span>
          </div>
          <span style={{ color: "var(--border-color, #e5e5e8)" }}>•</span>
          <div>
            <span style={{ color: "var(--text-muted, #71717a)", marginRight: 4 }}>Sections:</span>
            <span style={{ fontWeight: 600, color: "var(--text-primary, #18181b)" }}>{selectedDoc.sections.length}</span>
          </div>
          <span style={{ color: "var(--border-color, #e5e5e8)" }}>•</span>
          <div>
            <span style={{ color: "var(--text-muted, #71717a)", marginRight: 4 }}>Pages:</span>
            <span style={{ fontWeight: 600, color: "var(--text-primary, #18181b)" }}>{selectedDoc.totalPages}</span>
          </div>
          <span style={{ color: "var(--border-color, #e5e5e8)" }}>•</span>
          <div>
            <span style={{ color: "var(--text-muted, #71717a)", marginRight: 4 }}>File size:</span>
            <span style={{ fontWeight: 600, color: "var(--text-primary, #18181b)" }}>{selectedDoc.fileSize}</span>
          </div>
        </div>

        {/* ── Rich Extraction Results Workspace ── */}
        <div className="results-workspace">
          {/* Results Header Bar */}
          <div className="results-header-bar">
            <div className="results-header-title-wrap">
              <h3 className="results-main-title">Extraction Results</h3>
              <span className="results-count-badge">
                {detailSearchQuery.trim()
                  ? `${filteredSections.length} of ${selectedDoc.sections.length} sections`
                  : `${selectedDoc.sections.length} sections extracted`}
              </span>
            </div>

            <div className="results-header-controls">
              {/* View Switcher Tabs */}
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

          {/* ── View 1: Structured View (Two-Panel Explorer) ── */}
          {viewMode === "structured" && (
            <div className="document-explorer">
              {/* LEFT: Section Navigator */}
              <aside className="explorer-nav-panel">
                <div className="explorer-search-box">
                  <Search size={14} className="explorer-search-icon" />
                  <input
                    type="text"
                    className="explorer-search-input"
                    placeholder="Search sections..."
                    value={detailSearchQuery}
                    onChange={(e) => setDetailSearchQuery(e.target.value)}
                  />
                  {detailSearchQuery && (
                    <button
                      type="button"
                      className="explorer-search-clear"
                      onClick={() => setDetailSearchQuery("")}
                      title="Clear search"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                <div className="explorer-nav-header">
                  <span className="explorer-nav-count">
                    {detailSearchQuery.trim()
                      ? `${filteredSections.length} of ${selectedDoc.sections.length} matching`
                      : `${selectedDoc.sections.length} sections in document`}
                  </span>
                </div>

                <nav className="explorer-section-list" aria-label="Document Sections">
                  {filteredSections.length === 0 ? (
                    <div className="explorer-no-results">
                      <p>No sections match "{detailSearchQuery}"</p>
                      <button
                        type="button"
                        className="btn-clear-search-link"
                        onClick={() => setDetailSearchQuery("")}
                      >
                        Clear search
                      </button>
                    </div>
                  ) : (
                    filteredSections.map((section) => {
                      const originalIndex = selectedDoc.sections.indexOf(section);
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
                            {highlightMatch(section.heading, detailSearchQuery)}
                          </span>
                          {section.tables && section.tables.length > 0 && (
                            <span className="explorer-item-table-badge" title="Contains tables">
                              <Table2 size={10} />
                            </span>
                          )}
                          {section.page ? (
                            <span className="explorer-item-page">
                              p.{section.page}
                            </span>
                          ) : null}
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
                        {selectedSection.page ? (
                          <span
                            className="provenance-page-label"
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: "var(--text-muted, #71717a)",
                              background: "var(--card-subtle-bg, #f4f4f5)",
                              padding: "2px 8px",
                              borderRadius: 4,
                              border: "1px solid var(--border-color, #e4e4e7)",
                            }}
                          >
                            Page {selectedSection.page}
                          </span>
                        ) : null}
                        {selectedSection.char_count ? (
                          <span className="section-badge-chars">
                            {selectedSection.char_count} chars
                          </span>
                        ) : null}
                      </div>

                      <div className="section-detail-title-row">
                        <h2 className="section-detail-title">
                          {highlightMatch(selectedSection.heading, detailSearchQuery)}
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
                                {highlightMatch(sub.title, detailSearchQuery)}
                              </h4>
                              <button
                                type="button"
                                className="btn-copy-subsection"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopySubsection(subKey, sub.title, sub.rawText, sub.tables);
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
                                {/* Structured Tables if present in this subsection */}
                                {sub.tables && sub.tables.length > 0 && (
                                  sub.tables.map((tbl, tIdx) => (
                                    <div
                                      key={tIdx}
                                      className="table-scroll-wrap"
                                      style={{
                                        margin: "10px 0 16px 0",
                                        border: "1px solid var(--border-color, #e5e5e8)",
                                        borderRadius: "6px",
                                        overflowX: "auto",
                                      }}
                                    >
                                      <table
                                        className={`results-structured-table ${
                                          tbl.columns.length > 2 ? "results-structured-table--multi" : ""
                                        }`}
                                      >
                                        <thead>
                                          <tr>
                                            {tbl.columns.map((col, cIdx) => (
                                              <th
                                                key={cIdx}
                                                className={getTableCellClass(col, tbl.columns.length, cIdx)}
                                              >
                                                {col || `Col ${cIdx + 1}`}
                                              </th>
                                            ))}
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {tbl.rows.map((row, rIdx) => (
                                            <tr key={rIdx}>
                                              {row.map((cell, cIdx) => {
                                                const colName = tbl.columns[cIdx] || "";
                                                const cellClass = getTableCellClass(
                                                  colName,
                                                  tbl.columns.length,
                                                  cIdx
                                                );
                                                const formatted = formatCellContent(cell);
                                                return (
                                                  <td key={cIdx} className={cellClass}>
                                                    {highlightMatch(formatted, detailSearchQuery)}
                                                  </td>
                                                );
                                              })}
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  ))
                                )}

                                {/* Key-Value fields if present */}
                                {sub.keyValues.length > 0 && (
                                  <div className="subsection-kv-grid">
                                    {sub.keyValues.map((kv, kIdx) => (
                                      <div key={kIdx} className="subsection-kv-row">
                                        <span className="subsection-kv-key">
                                          {highlightMatch(kv.key, detailSearchQuery)}
                                        </span>
                                        <span className="subsection-kv-val">
                                          {highlightMatch(kv.value, detailSearchQuery)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Paragraphs */}
                                {sub.paragraphs.map((para, pIdx) => (
                                  <p key={pIdx} className="subsection-paragraph">
                                    {highlightMatch(para, detailSearchQuery)}
                                  </p>
                                ))}

                                {sub.paragraphs.length === 0 &&
                                  sub.keyValues.length === 0 &&
                                  (!sub.tables || sub.tables.length === 0) && (
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
                        Section {selectedSectionIndex + 1} of {selectedDoc.sections.length}
                      </span>
                      <button
                        type="button"
                        className="btn-nav-step"
                        onClick={() =>
                          setSelectedSectionIndex((prev) =>
                            Math.min(selectedDoc.sections.length - 1, prev + 1)
                          )
                        }
                        disabled={selectedSectionIndex === selectedDoc.sections.length - 1}
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

          {/* ── View 2: Tables View ── */}
          {viewMode === "tables" && (
            <div className="tables-view-container">
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
                            `doc-table-sec-${sec.sectionId}`
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
                      id={`doc-table-sec-${tData.sectionId}`}
                      className="table-card"
                    >
                      <div className="table-card-header">
                        <div className="table-card-title-wrap">
                          <span className="table-card-num">
                            {String(tData.sectionIndex + 1).padStart(2, "0")}
                          </span>
                          <h4 className="table-card-heading">{tData.sectionHeading}</h4>
                          {tData.page ? (
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 600,
                                color: "var(--text-muted, #71717a)",
                                background: "var(--card-subtle-bg, #f4f4f5)",
                                padding: "2px 8px",
                                borderRadius: 4,
                                border: "1px solid var(--border-color, #e4e4e7)",
                              }}
                            >
                              Page {tData.page}
                            </span>
                          ) : null}
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

                      {tData.realTables.length > 0 ? (
                        tData.realTables.map((tbl, tIdx) => (
                          <div key={tIdx} className="table-scroll-wrap">
                            <table
                              className={`results-structured-table ${
                                tbl.columns.length > 2 ? "results-structured-table--multi" : ""
                              }`}
                            >
                              <thead>
                                <tr>
                                  {tbl.columns.map((col, cIdx) => (
                                    <th
                                      key={cIdx}
                                      className={getTableCellClass(col, tbl.columns.length, cIdx)}
                                    >
                                      {col || `Col ${cIdx + 1}`}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {tbl.rows.map((row, rIdx) => (
                                  <tr key={rIdx}>
                                    {row.map((cell, cIdx) => {
                                      const colName = tbl.columns[cIdx] || "";
                                      const cellClass = getTableCellClass(
                                        colName,
                                        tbl.columns.length,
                                        cIdx
                                      );
                                      const formatted = formatCellContent(cell);
                                      return (
                                        <td key={cIdx} className={cellClass}>
                                          {formatted}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ))
                      ) : (
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

          {/* ── View 3: JSON View ── */}
          {viewMode === "json" && (
            <div className="json-code-container">
              <div className="json-code-header">
                <div className="json-header-info">
                  <Code2 size={15} />
                  <span className="json-schema-tag">Processed Document JSON</span>
                  <span className="json-size-tag">
                    {selectedDoc.fileSize}
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
                    {
                      success: true,
                      metadata: {
                        file_name: selectedDoc.fileName,
                        file_size: selectedDoc.fileSize,
                        upload_date: selectedDoc.uploadDate,
                        total_pages: selectedDoc.totalPages,
                        sections_found: selectedDoc.sections.length,
                      },
                      data: selectedDoc.sections,
                    },
                    null,
                    2
                  )}
                </code>
              </pre>
            </div>
          )}
        </div>
      </div>
    );
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
                  className="documents-table-row"
                  style={{
                    borderBottom: idx === filteredDocs.length - 1 ? "none" : "1px solid var(--border-subtle, #f4f4f5)",
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
  );
};
