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
            <span className="nav-logo-mark">C</span>
            <span className="nav-logo-text">Comply AI</span>
          </a>
          <ul className="nav-links">
            <li><a href="#product">Product</a></li>
            <li><a href="#solutions">Solutions</a></li>
            <li><a href="#pricing">Pricing</a></li>
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
            AI-Powered Contract Intelligence
          </p>

          {/* Headline */}
          <h1 className="headline">
            Review contracts<br />
            in <span className="headline-accent">minutes,</span><br />
            not days.
          </h1>

          {/* Sub-copy */}
          <p className="subline">
            Comply AI identifies high-risk clauses, flags compliance gaps, and
            delivers structured findings — so your legal team can focus on
            decisions that matter.
          </p>

          {/* CTA row */}
          <div className="hero-actions">
            <a href="#demo" className="btn btn-primary btn-lg">
              See it in action
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
            <a href="#learn" className="btn btn-ghost btn-lg">
              How it works
            </a>
          </div>

          {/* Social proof strip */}
          <div className="proof-strip">
            <span className="proof-stat">
              <strong>10k+</strong> contracts reviewed
            </span>
            <span className="proof-divider" />
            <span className="proof-stat">
              <strong>99.1%</strong> clause recall
            </span>
            <span className="proof-divider" />
            <span className="proof-stat">
              <strong>SOC 2</strong> Type II certified
            </span>
          </div>
        </div>

        {/* ── Animation Panel ──────────────────────────────────────── */}
        <div className="hero-right">
          <div className="animation-frame">
            <div className="animation-frame-header">
              <span className="frame-dot frame-dot--red" />
              <span className="frame-dot frame-dot--amber" />
              <span className="frame-dot frame-dot--green" />
              <span className="frame-label">Contract Analysis · Live</span>
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
            "Indemnification","Limitation of Liability","Termination Clauses",
            "IP Assignment","Governing Law","Force Majeure","Data Processing",
            "Confidentiality","Payment Terms","Warranty Disclaimers",
            "Indemnification","Limitation of Liability","Termination Clauses",
            "IP Assignment","Governing Law","Force Majeure","Data Processing",
            "Confidentiality","Payment Terms","Warranty Disclaimers",
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
            Everything your legal team needs to move fast, without the risk.
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
          <span className="footer-logo">Comply AI</span>
          <p className="footer-copy">© 2024 Comply AI Limited. All rights reserved.</p>
          <div className="footer-links">
            <a href="#privacy">Privacy</a>
            <a href="#terms">Terms</a>
            <a href="#security">Security</a>
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
        <line x1="6" y1="7"  x2="14" y2="7"  stroke="#1a1a1a" strokeWidth="1"/>
        <line x1="6" y1="10" x2="14" y2="10" stroke="#1a1a1a" strokeWidth="1"/>
        <line x1="6" y1="13" x2="10" y2="13" stroke="#1a1a1a" strokeWidth="1"/>
      </svg>
    ),
    name: "Clause-Level Analysis",
    desc: "Every clause is categorised, risk-scored, and cross-referenced against your policy playbook in real time.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="7.5" stroke="#1a1a1a" strokeWidth="1.5"/>
        <path d="M10 6v4l3 2" stroke="#c0392b" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    name: "Instant Turnaround",
    desc: "Receive a structured compliance report within seconds — not hours — without sacrificing precision.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M4 16 L10 4 L16 16" stroke="#1a1a1a" strokeWidth="1.5" strokeLinejoin="round"/>
        <line x1="6.5" y1="12" x2="13.5" y2="12" stroke="#1a1a1a" strokeWidth="1"/>
      </svg>
    ),
    name: "Risk Prioritisation",
    desc: "High, medium, and low risk findings are surfaced in order of legal exposure so you know where to act first.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="2.5" y="5" width="15" height="11" rx="2" stroke="#1a1a1a" strokeWidth="1.5"/>
        <path d="M6 5V4a4 4 0 018 0v1" stroke="#1a1a1a" strokeWidth="1.5"/>
        <circle cx="10" cy="11" r="1.5" fill="#c0392b"/>
      </svg>
    ),
    name: "Enterprise Security",
    desc: "SOC 2 Type II, GDPR-compliant. Your documents never leave your cloud tenant.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="3" y="3" width="6" height="6" rx="1" stroke="#1a1a1a" strokeWidth="1.5"/>
        <rect x="11" y="3" width="6" height="6" rx="1" stroke="#1a1a1a" strokeWidth="1.5"/>
        <rect x="3" y="11" width="6" height="6" rx="1" stroke="#1a1a1a" strokeWidth="1.5"/>
        <rect x="11" y="11" width="6" height="6" rx="1" stroke="#c0392b" strokeWidth="1.5"/>
      </svg>
    ),
    name: "Playbook Integration",
    desc: "Connect your standard position playbook. Comply AI flags any deviation, no matter how subtle.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M10 2v16M2 10h16" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="10" cy="10" r="3" stroke="#1a1a1a" strokeWidth="1.5"/>
      </svg>
    ),
    name: "API Access",
    desc: "Embed Comply AI directly into your CLM, CRM, or procurement workflow via a single REST endpoint.",
  },
];

export default App;
