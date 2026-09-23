import React, { useState, useEffect, useCallback } from "react";
import ContractAnimation from "./components/ContractAnimation";
import PdfExtractor from "./components/PdfExtractor";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "./components/ui/sidebar";
import { AppSidebar } from "./components/app-sidebar";
import { DocumentsPage } from "./components/DocumentsPage";
import { BatchExtractionPage } from "./components/BatchExtractionPage";
import { SettingsPage } from "./components/SettingsPage";
import { ModeToggle } from "./components/mode-toggle";
import { TourProvider, useTour, type TourStep } from "./components/Tour";
import { TourConfirmModal } from "./components/TourConfirmModal";
import { ArrowRight, Compass } from "lucide-react";
import { useRouter, type DashboardTab } from "./hooks/useRouter";
import "./App.css";

const TOUR_STEPS: TourStep[] = [
  {
    id: "step-upload",
    selectorId: "tour-dropzone",
    title: "1. Upload & File Selection",
    description:
      "Drop any PDF filing here, browse files from your computer, or click the sample PDF in the top-right corner to start extraction immediately.",
    position: "bottom",
    actionText: "Load Sample Document (AMGN-135003565.pdf)",
    onAction: () => {
      if (!(window as any).__extractai_has_work) {
        window.dispatchEvent(new CustomEvent("extractai:load-sample"));
      }
      window.dispatchEvent(new CustomEvent("extractai:tour-next-step"));
    },
  },
  {
    id: "step-navigator",
    selectorId: "tour-navigator",
    title: "2. Document Structure & H1 Hierarchy",
    description:
      "Browse the complete document hierarchy. The extraction pipeline programmatically distinguishes prominent headings from body paragraphs and regulatory boilerplate, complete with page numbers and character counts.",
    position: "right",
  },
  {
    id: "step-traceability",
    selectorId: "tour-traceability",
    title: "3. Source Traceability & Audit Trail",
    description:
      "Every extracted section has clear provenance. Compliance analysts can click 'View source' to open the original uploaded PDF directly at the relevant page for instant verification.",
    position: "bottom",
  },
  {
    id: "step-section-actions",
    selectorId: "tour-section-actions",
    title: "4. Section Controls & Quick Copy",
    description:
      "Use 'Collapse all / Expand all' to quickly scan sub-clauses and provisions, or click 'Copy' to copy the current section's heading and body text to clipboard.",
    position: "bottom",
  },
  {
    id: "step-view-tabs",
    selectorId: "tour-view-tabs",
    title: "5. Multi-View Explorer & Structured Tables",
    description:
      "Switch between Structured Explorer, a dedicated Tables View (isolating filing schedules with responsive columns and 1-click TSV copy for Excel), and raw JSON code view.",
    position: "bottom",
  },
  {
    id: "step-export-actions",
    selectorId: "tour-export-actions",
    title: "6. Bulk Copy & JSON Export",
    description:
      "Copy all extracted sections as structured text or download the full API JSON payload to integrate with downstream regulatory and compliance workflows.",
    position: "bottom",
  },
  {
    id: "step-search",
    selectorId: "tour-search",
    title: "7. Real-Time Search & Match Highlighting",
    description:
      "Instantly search across all extracted headings, body paragraphs, and table rows with highlighted query matches.",
    position: "bottom",
  },
  {
    id: "step-batch-nav",
    selectorId: "tour-batch-nav",
    title: "8. Enterprise Batch Processing",
    description:
      "Scale to large compliance workloads. The Batch Extractions suite allows you to upload and process dozens of filings concurrently with queue monitoring and bulk downloads.",
    position: "right",
  },
];

const TourTriggerButton: React.FC<{
  onSwitchTab?: () => void;
  onRequestTour?: () => void;
}> = ({ onSwitchTab, onRequestTour }) => {
  const { isActive } = useTour();
  return (
    <button
      type="button"
      className="btn-tour-trigger"
      onClick={() => {
        onSwitchTab?.();
        onRequestTour?.();
      }}
      title="Start interactive guided tour"
    >
      <Compass size={13} />
      <span>{isActive ? "Tour Active" : "Guided Tour"}</span>
    </button>
  );
};

const DashboardContent: React.FC<{
  activeTab: DashboardTab;
  onSelectTab: (tab: DashboardTab) => void;
  onExitDashboard: () => void;
  onRequestTour: () => void;
}> = ({ activeTab, onSelectTab, onExitDashboard, onRequestTour }) => {

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar
        activeItem={activeTab}
        onSelectItem={(item) => onSelectTab(item as DashboardTab)}
        onExitDashboard={onExitDashboard}
      />
      <SidebarInset>
        {/* Dashboard Header with Sidebar Trigger */}
        <header
          style={{
            height: 56,
            borderBottom: "1px solid var(--border-color, #e5e5e8)",
            background: "var(--card-bg, #ffffff)",
            padding: "0 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "sticky",
            top: 0,
            zIndex: 30,
            boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <SidebarTrigger />
            <div style={{ height: 16, width: 1, background: "var(--border-color, #e5e5e8)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary, #1a1a1a)" }}>
                {activeTab === "studio" && "Extractor Studio"}
                {activeTab === "documents" && "Documents"}
                {activeTab === "batch" && "Batch Extractions"}
                {activeTab === "settings" && "Settings"}
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  background: "var(--card-subtle-bg, #f4f4f5)",
                  color: "var(--text-muted, #71717a)",
                  padding: "2px 6px",
                  borderRadius: 4,
                  border: "1px solid var(--border-color, #e4e4e7)",
                  letterSpacing: "0.04em",
                }}
              >
                DASHBOARD
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <TourTriggerButton
              onSwitchTab={() => onSelectTab("studio")}
              onRequestTour={onRequestTour}
            />
            <ModeToggle />
            <button
              onClick={onExitDashboard}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                fontWeight: 500,
                color: "var(--text-secondary, #52525b)",
                background: "var(--card-bg, #ffffff)",
                border: "1px solid var(--border-color, #e4e4e7)",
                padding: "6px 12px",
                borderRadius: 6,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              ← Back to Landing Page
            </button>
          </div>
        </header>

        {/* Dashboard Workspace */}
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", background: "var(--app-bg, #fafafa)" }}>
          {activeTab === "studio" ? (
            <PdfExtractor />
          ) : activeTab === "documents" ? (
            <DocumentsPage />
          ) : activeTab === "batch" ? (
            <BatchExtractionPage />
          ) : activeTab === "settings" ? (
            <SettingsPage />
          ) : (
            <div style={{ padding: 40, maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: "#ffffff",
                  border: "1px solid #e4e4e7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px auto",
                  color: "#e74c3c",
                }}
              >
                <span style={{ fontSize: 20, fontWeight: 700 }}>✦</span>
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: "#1a1a1a", marginBottom: 8 }}>
                {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Workspace
              </h3>
              <p style={{ fontSize: 13, color: "#71717a", maxWidth: 400, margin: "0 auto 20px auto" }}>
                This dashboard module is configured as part of the ExtractAI system.
              </p>
              <button
                onClick={() => onSelectTab("studio")}
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  padding: "8px 16px",
                  borderRadius: 8,
                  background: "#1a1a1a",
                  color: "#ffffff",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Go to Extractor Studio
              </button>
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

const AppContent: React.FC = () => {
  const { startTour } = useTour();
  const { navigate, isDashboard, currentTab } = useRouter();
  const [showTourConfirmModal, setShowTourConfirmModal] = useState<boolean>(false);

  const handleSelectTab = useCallback(
    (tab: DashboardTab) => {
      if (tab === "studio") {
        navigate("/dashboard");
      } else {
        navigate(`/dashboard/${tab}`);
      }
    },
    [navigate]
  );

  const handleExitDashboard = useCallback(() => {
    navigate("/");
  }, [navigate]);

  const handleRequestTour = useCallback(() => {
    const hasWork = Boolean((window as any).__extractai_has_work);
    if (hasWork) {
      setShowTourConfirmModal(true);
    } else {
      navigate("/dashboard");
      startTour();
    }
  }, [navigate, startTour]);

  const handleConfirmTour = useCallback(() => {
    setShowTourConfirmModal(false);
    window.dispatchEvent(new CustomEvent("extractai:reset-workspace"));
    navigate("/dashboard");
    startTour();
  }, [navigate, startTour]);

  const handleCancelTourModal = useCallback(() => {
    setShowTourConfirmModal(false);
  }, []);

  return (
    <>
      {isDashboard ? (
        <DashboardContent
          activeTab={currentTab}
          onSelectTab={handleSelectTab}
          onExitDashboard={handleExitDashboard}
          onRequestTour={handleRequestTour}
        />
      ) : (
        <div className="page">
          {/* ── Navigation (Simple, clean top bar matching Thecomply.ai) ──── */}
          <nav className="nav">
            <div className="nav-inner">
              <a
                href="/"
                className="nav-logo"
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/");
                }}
              >
                <span className="nav-logo-square" />
                <span className="nav-logo-text">TheExtractor</span>
              </a>

              <div className="nav-cta">
                <ModeToggle />
              </div>
            </div>
          </nav>

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section className="hero">
        <div className="hero-left">
          {/* Eyebrow */}
          <p className="eyebrow">
            <span className="eyebrow-dot" />
            AI-Powered Document Extraction
          </p>

          {/* Headline */}
          <h1 className="headline">
            Turn PDFs into<br />
            <span className="headline-accent">structured data</span><br />
            in minutes, not hours.
          </h1>

          {/* Sub-copy */}
          <p className="subline">
            Upload a PDF and automatically extract headings and their associated
            body text into clean, structured data — ready for any downstream
            system or workflow.
          </p>

          {/* CTA row */}
          <div className="hero-actions">
            <button
              onClick={() => navigate("/dashboard")}
              className="btn btn-primary btn-lg"
            >
              <span>Try Extractor Studio</span>
              <ArrowRight size={16} />
            </button>
            <button
              onClick={handleRequestTour}
              className="btn btn-hero-tour btn-lg"
            >
              <Compass size={16} />
              <span>Guided Tour</span>
            </button>
          </div>
        </div>

        {/* ── Animation Panel ──────────────────────────────────────── */}
        <div className="hero-right">
          <div className="animation-frame">
            <div className="animation-frame-header">
              <span className="frame-dot frame-dot--red" />
              <span className="frame-dot frame-dot--amber" />
              <span className="frame-dot frame-dot--green" />
              <span className="frame-label">PDF Extraction · Live</span>
            </div>
            <div className="animation-canvas">
              <ContractAnimation />
            </div>
          </div>
        </div>
      </section>

      {/* ── Marquee ────────────────────────────────────────────────── */}
      <div className="marquee-bar">
        <div className="marquee-track">
          {[
            "Heading Detection","Body Text Extraction","Structured JSON Output",
            "PDF Parsing","Section Mapping","Nested Headings","Multi-column Layout",
            "Clean Data Export","REST API","React UI",
            "Heading Detection","Body Text Extraction","Structured JSON Output",
            "PDF Parsing","Section Mapping","Nested Headings","Multi-column Layout",
            "Clean Data Export","REST API","React UI",
          ].map((item, i) => (
            <span key={i} className="marquee-item">
              {item}
              <span className="marquee-sep">·</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── Feature Grid ───────────────────────────────────────────── */}
      <section className="features" id="product">
        <div className="features-header">
          <p className="section-label">CAPABILITIES</p>
          <h2 className="section-title">
            Everything you need to go from raw PDF to structured, usable data.
          </h2>
        </div>
        <div className="features-grid">
          {FEATURES.map((f, i) => (
            <div key={i} className="feature-card">
              <div className="feature-icon">{f.icon}</div>
              <h3 className="feature-name">{f.name}</h3>
              <p className="feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="footer">
        <div className="footer-inner">
          <span className="footer-logo">ExtractAI</span>
          <p className="footer-copy">© 2024 ExtractAI. All rights reserved.</p>
          <div className="footer-links">
            <a href="#privacy">Privacy</a>
            <a href="#terms">Terms</a>
            <a href="#docs">API Docs</a>
          </div>
        </div>
      </footer>
    </div>
  )}

    {/* Tour Restart Confirmation Dialog */}
    <TourConfirmModal
      isOpen={showTourConfirmModal}
      onConfirm={handleConfirmTour}
      onCancel={handleCancelTourModal}
    />
  </>
  );
};

const App: React.FC = () => {
  return (
    <TourProvider defaultSteps={TOUR_STEPS}>
      <AppContent />
    </TourProvider>
  );
};

const FEATURES = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="3" y="2" width="14" height="17" rx="2" stroke="#1a1a1a" strokeWidth="1.5"/>
        <line x1="6" y1="6.5" x2="14" y2="6.5" stroke="#1a1a1a" strokeWidth="1.5"/>
        <line x1="6" y1="10"  x2="14" y2="10"  stroke="#e0e0e0" strokeWidth="1"/>
        <line x1="6" y1="13"  x2="11" y2="13"  stroke="#e0e0e0" strokeWidth="1"/>
      </svg>
    ),
    name: "Heading Detection",
    desc: "Automatically identifies H1, H2, and H3 headings from any PDF — native, scanned, or complex multi-column layouts.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="3" y="2" width="14" height="17" rx="2" stroke="#1a1a1a" strokeWidth="1.5"/>
        <rect x="6" y="7" width="8" height="1.5" rx="0.5" fill="#c0392b"/>
        <line x1="6" y1="11" x2="14" y2="11" stroke="#e0e0e0" strokeWidth="1"/>
        <line x1="6" y1="14" x2="12" y2="14" stroke="#e0e0e0" strokeWidth="1"/>
      </svg>
    ),
    name: "Body Text Association",
    desc: "Each heading is paired with its associated paragraph text — preserving document hierarchy and context.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="5" width="16" height="11" rx="2" stroke="#1a1a1a" strokeWidth="1.5"/>
        <text x="5" y="13" fontFamily="monospace" fontSize="7" fill="#c0392b">{"{ }"}</text>
      </svg>
    ),
    name: "Structured JSON Output",
    desc: "Returns clean {heading, text} pairs as JSON — ready to pipe into databases, search engines, or LLMs.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="7.5" stroke="#1a1a1a" strokeWidth="1.5"/>
        <path d="M10 6v4l3 2" stroke="#c0392b" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    name: "Instant Processing",
    desc: "Upload a PDF and receive fully structured extraction results in seconds, regardless of document length.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M4 10 L8 14 L16 6" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="10" cy="10" r="8" stroke="#e0e0e0" strokeWidth="1"/>
      </svg>
    ),
    name: "Any PDF Format",
    desc: "Works with native text PDFs, scanned documents, annual reports, filings, and mixed-format documents.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="8" width="16" height="9" rx="2" stroke="#1a1a1a" strokeWidth="1.5"/>
        <path d="M7 8V6a3 3 0 016 0v2" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="10" y1="12" x2="10" y2="14" stroke="#c0392b" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    name: "REST API",
    desc: "Single endpoint: POST a PDF, receive structured JSON. Integrate into any pipeline in under five minutes.",
  },
];

export default App;
