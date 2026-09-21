import React from "react";
import ContractAnimation from "./components/ContractAnimation";
import "./App.css";

const App: React.FC = () => {
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
            <li><a href="#product">Product</a></li>
            <li><a href="#how-it-works">How it works</a></li>
            <li><a href="#api">API</a></li>
            <li><a href="#about">About</a></li>
          </ul>
          <div className="nav-cta">
            <a href="#demo" className="btn btn-ghost">Request demo</a>
            <a href="#signup" className="btn btn-primary">Get started</a>
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
            <a href="#demo" className="btn btn-primary btn-lg">
              See it in action
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
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
