import React, { useState, useEffect } from "react";
import ContractAnimation from "./components/ContractAnimation";
import PdfExtractor from "./components/PdfExtractor";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "./components/ui/sidebar";
import { AppSidebar } from "./components/app-sidebar";
import { DocumentsPage } from "./components/DocumentsPage";
import { BatchExtractionPage } from "./components/BatchExtractionPage";
import "./App.css";

const App: React.FC = () => {
  const [showDashboard, setShowDashboard] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("studio");

  // Check URL hash on initial load and on hash change
  useEffect(() => {
    const handleHash = () => {
      if (window.location.hash === "#extractor" || window.location.hash === "#studio") {
        setShowDashboard(true);
      }
    };
    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  // When dashboard is active, render the shadcn sidebar layout
  if (showDashboard) {
    return (
      <SidebarProvider defaultOpen={true}>
        <AppSidebar
          activeItem={activeTab}
          onSelectItem={setActiveTab}
          onExitDashboard={() => {
            setShowDashboard(false);
            window.location.hash = "";
          }}
        />
        <SidebarInset>
          {/* Dashboard Header with Sidebar Trigger */}
          <header
            style={{
              height: 56,
              borderBottom: "1px solid #e5e5e8",
              background: "#ffffff",
              padding: "0 20px",
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
              <div style={{ height: 16, width: 1, background: "#e5e5e8" }} />
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a" }}>
                  {activeTab === "studio" && "Extractor Studio"}
                  {activeTab === "documents" && "Documents"}
                  {activeTab === "batch" && "Batch Extractions"}
                  {activeTab === "api" && "API & Webhooks"}
                  {activeTab === "settings" && "Settings"}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    background: "#f4f4f5",
                    color: "#71717a",
                    padding: "2px 6px",
                    borderRadius: 4,
                    border: "1px solid #e4e4e7",
                    letterSpacing: "0.04em",
                  }}
                >
                  DASHBOARD
                </span>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                onClick={() => {
                  setShowDashboard(false);
                  window.location.hash = "";
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 500,
                  color: "#52525b",
                  background: "#ffffff",
                  border: "1px solid #e4e4e7",
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
          <div style={{ flex: 1, minHeight: 0, overflowY: "auto", background: "#fafafa" }}>
            {activeTab === "studio" ? (
              <PdfExtractor />
            ) : activeTab === "documents" ? (
              <DocumentsPage />
            ) : activeTab === "batch" ? (
              <BatchExtractionPage />
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
                  onClick={() => setActiveTab("studio")}
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
  }

  // Otherwise, render landing page
  return (
    <div className="page">
      {/* ── Navigation ─────────────────────────────────────────────── */}
      <nav className="nav">
        <div className="nav-inner">
          <a href="/" className="nav-logo">
            <span className="nav-logo-mark">E</span>
            <span className="nav-logo-text">ExtractAI</span>
          </a>
          <ul className="nav-links">
            <li>
              <button
                onClick={() => setShowDashboard(true)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 14,
                  color: "var(--ink-soft)",
                  fontWeight: 450,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  padding: 0,
                }}
              >
                Extractor Studio
              </button>
            </li>
            <li><a href="#product">Capabilities</a></li>
            <li><a href="#how-it-works">How it works</a></li>
            <li><a href="#api">API</a></li>
          </ul>
          <div className="nav-cta">
            <button
              onClick={() => setShowDashboard(true)}
              className="btn btn-ghost"
              style={{ cursor: "pointer" }}
            >
              Demo
            </button>
            <button
              onClick={() => setShowDashboard(true)}
              className="btn btn-primary"
              style={{ cursor: "pointer" }}
            >
              Extract PDF
            </button>
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
              onClick={() => setShowDashboard(true)}
              className="btn btn-primary btn-lg"
              style={{ cursor: "pointer" }}
            >
              Try Extractor Studio
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <a href="#how-it-works" className="btn btn-ghost btn-lg">
              How it works
            </a>
          </div>

          {/* Output format hint */}
          <div className="output-hint">
            <span className="output-hint-label">Output format</span>
            <code className="output-hint-code">
              {"{ heading: string, text: string }[]"}
            </code>
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

      {/* ── Interactive Extractor Workspace ────────────────────────── */}
      <PdfExtractor />

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
