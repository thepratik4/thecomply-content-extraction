import React, { useEffect, useRef } from "react";
import { buildContractTimeline } from "../animations/contractTimeline";
import gsap from "gsap";

/**
 * ContractAnimation
 * -----------------
 * A self-contained React component that renders the contract analysis
 * animation as inline SVG driven by a GSAP timeline.
 *
 * The SVG uses explicit, named groups (layers) so every visual element
 * can be targeted and modified without touching the animation code.
 */
const ContractAnimation: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tlRef  = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    tlRef.current = buildContractTimeline(svgRef.current);
    return () => {
      tlRef.current?.kill();
    };
  }, []);

  return (
    <div className="contract-animation-wrapper">
      <svg
        ref={svgRef}
        id="contract-svg"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 480 560"
        fill="none"
        aria-label="Contract compliance animation"
        role="img"
      >
        {/* ── Upload Drop Area ─────────────────────────────────────── */}
        <g id="layer-upload-area" opacity="0">
          <rect
            id="upload-border"
            x="80" y="180" width="320" height="220" rx="6"
            fill="none" stroke="#1a1a1a" strokeWidth="1.5" strokeDasharray="6 4"
          />
          <text
            id="upload-label"
            x="240" y="295" textAnchor="middle"
            fontFamily="Inter, sans-serif" fontSize="11" fill="#6b6b6b" letterSpacing="0.08em"
          >DROP CONTRACT TO ANALYSE</text>
          <line id="upload-divider" x1="180" y1="308" x2="300" y2="308" stroke="#d0d0d0" strokeWidth="0.75"/>
        </g>

        {/* ── PDF Document (pre-drop) ───────────────────────────────── */}
        <g id="layer-pdf" opacity="0" transform="translate(172, 40)">
          <rect
            id="pdf-body"
            x="0" y="0" width="136" height="176" rx="3"
            fill="#ffffff" stroke="#1a1a1a" strokeWidth="1.5"
          />
          <path
            id="pdf-fold"
            d="M108 0 L136 28 L108 28 Z"
            fill="#e8e8e8" stroke="#1a1a1a" strokeWidth="1" strokeLinejoin="round"
          />
          <rect id="pdf-badge" x="8" y="8" width="32" height="14" rx="2" fill="#1a1a1a"/>
          <text
            x="24" y="18.5" textAnchor="middle"
            fontFamily="Inter, sans-serif" fontSize="7" fontWeight="600" fill="#ffffff" letterSpacing="0.06em"
          >PDF</text>
          <line x1="8"  y1="36" x2="128" y2="36" stroke="#e0e0e0" strokeWidth="0.75"/>
          <line x1="8"  y1="50" x2="100" y2="50" stroke="#e0e0e0" strokeWidth="0.75"/>
          <line x1="8"  y1="62" x2="120" y2="62" stroke="#e0e0e0" strokeWidth="0.75"/>
          <line x1="8"  y1="74" x2="90"  y2="74" stroke="#e0e0e0" strokeWidth="0.75"/>
          <line x1="8"  y1="86" x2="115" y2="86" stroke="#e0e0e0" strokeWidth="0.75"/>
          <line x1="8"  y1="98" x2="100" y2="98" stroke="#e0e0e0" strokeWidth="0.75"/>
          <text
            x="68" y="160" textAnchor="middle"
            fontFamily="Inter, sans-serif" fontSize="8" fill="#6b6b6b" letterSpacing="0.04em"
          >MSA_2024_v3.pdf</text>
        </g>

        {/* ── Expanded Document ─────────────────────────────────────── */}
        <g id="layer-document" opacity="0" transform="translate(60, 120)">
          <rect id="doc-shadow" x="4" y="4" width="360" height="320" rx="4" fill="#e8e8e8"/>
          <rect id="doc-body"   x="0" y="0" width="360" height="320" rx="4" fill="#ffffff" stroke="#d8d8d8" strokeWidth="1"/>
          {/* Header */}
          <rect x="0" y="0" width="360" height="36" rx="4" fill="#f6f6f6"/>
          <rect x="0" y="26" width="360" height="10" fill="#f6f6f6"/>
          <line x1="0" y1="36" x2="360" y2="36" stroke="#e0e0e0" strokeWidth="0.75"/>
          <text x="16" y="22" fontFamily="Inter, sans-serif" fontSize="9" fontWeight="600" fill="#1a1a1a" letterSpacing="0.04em">
            MASTER SERVICE AGREEMENT
          </text>
          {/* Section 1 */}
          <text x="16" y="62" fontFamily="Inter, sans-serif" fontSize="8" fontWeight="600" fill="#1a1a1a" letterSpacing="0.06em">1. DEFINITIONS</text>
          <rect x="16" y="70"  width="240" height="5" rx="1" fill="#e8e8e8"/>
          <rect x="16" y="80"  width="200" height="5" rx="1" fill="#e8e8e8"/>
          <rect x="16" y="90"  width="220" height="5" rx="1" fill="#e8e8e8"/>
          {/* Section 2 */}
          <text x="16" y="115" fontFamily="Inter, sans-serif" fontSize="8" fontWeight="600" fill="#1a1a1a" letterSpacing="0.06em">2. INDEMNIFICATION</text>
          <rect x="16" y="123" width="280" height="5" rx="1" fill="#e8e8e8"/>
          <rect x="16" y="133" width="250" height="5" rx="1" fill="#e8e8e8"/>
          <rect x="16" y="143" width="260" height="5" rx="1" fill="#e8e8e8"/>
          <rect x="16" y="153" width="180" height="5" rx="1" fill="#e8e8e8"/>
          {/* Section 3 */}
          <text x="16" y="178" fontFamily="Inter, sans-serif" fontSize="8" fontWeight="600" fill="#1a1a1a" letterSpacing="0.06em">3. LIMITATION OF LIABILITY</text>
          <rect x="16" y="186" width="260" height="5" rx="1" fill="#e8e8e8"/>
          <rect x="16" y="196" width="220" height="5" rx="1" fill="#e8e8e8"/>
          <rect x="16" y="206" width="270" height="5" rx="1" fill="#e8e8e8"/>
          {/* Section 4 */}
          <text x="16" y="231" fontFamily="Inter, sans-serif" fontSize="8" fontWeight="600" fill="#1a1a1a" letterSpacing="0.06em">4. TERMINATION</text>
          <rect x="16" y="239" width="250" height="5" rx="1" fill="#e8e8e8"/>
          <rect x="16" y="249" width="230" height="5" rx="1" fill="#e8e8e8"/>
          <rect x="16" y="259" width="200" height="5" rx="1" fill="#e8e8e8"/>
          {/* Summary table */}
          <g id="doc-table" opacity="0">
            <rect x="16" y="275" width="328" height="34" rx="2" fill="#f8f8f8" stroke="#e0e0e0" strokeWidth="0.75"/>
            <line x1="120" y1="275" x2="120" y2="309" stroke="#e0e0e0" strokeWidth="0.5"/>
            <line x1="224" y1="275" x2="224" y2="309" stroke="#e0e0e0" strokeWidth="0.5"/>
            <line x1="16"  y1="287" x2="344" y2="287" stroke="#e0e0e0" strokeWidth="0.5"/>
            <text x="68"  y="284" fontFamily="Inter, sans-serif" fontSize="6.5" fill="#6b6b6b" textAnchor="middle">Clause</text>
            <text x="172" y="284" fontFamily="Inter, sans-serif" fontSize="6.5" fill="#6b6b6b" textAnchor="middle">Risk Level</text>
            <text x="284" y="284" fontFamily="Inter, sans-serif" fontSize="6.5" fill="#6b6b6b" textAnchor="middle">Status</text>
            <text x="68"  y="300" fontFamily="Inter, sans-serif" fontSize="6.5" fill="#1a1a1a" textAnchor="middle">Indemnity §2.3</text>
            <text x="172" y="300" fontFamily="Inter, sans-serif" fontSize="6.5" fill="#c0392b" textAnchor="middle">High</text>
            <text x="284" y="300" fontFamily="Inter, sans-serif" fontSize="6.5" fill="#1a1a1a" textAnchor="middle">Review</text>
          </g>
        </g>

        {/* ── Scanner Line ──────────────────────────────────────────── */}
        <g id="layer-scanner" opacity="0">
          <line id="scanner-glow" x1="64" y1="156" x2="420" y2="156" stroke="#c0392b" strokeWidth="6"  opacity="0.08"/>
          <line id="scanner-line" x1="64" y1="156" x2="420" y2="156" stroke="#c0392b" strokeWidth="1"  opacity="0.8"/>
        </g>

        {/* ── Clause Highlights ─────────────────────────────────────── */}
        <g id="layer-highlights">
          <rect id="highlight-indemnity"    x="76" y="230" width="172" height="34" rx="2" fill="#c0392b" opacity="0"/>
          <rect id="highlight-liability"    x="76" y="293" width="148" height="22" rx="2" fill="#e67e22" opacity="0"/>
          <rect id="highlight-termination"  x="76" y="346" width="155" height="22" rx="2" fill="#1a1a1a" opacity="0"/>
        </g>

        {/* ── Compliance Findings ───────────────────────────────────── */}
        <g id="layer-findings">
          {/* Finding 1 — High Risk */}
          <g id="finding-1" opacity="0">
            <rect x="272" y="228" width="148" height="44" rx="3" fill="#fff" stroke="#ebebeb" strokeWidth="1"/>
            <rect x="272" y="228" width="3"   height="44" rx="1" fill="#c0392b"/>
            <text x="282" y="242" fontFamily="Inter, sans-serif" fontSize="7.5" fontWeight="700" fill="#c0392b" letterSpacing="0.05em">HIGH RISK</text>
            <text x="282" y="255" fontFamily="Inter, sans-serif" fontSize="7"   fill="#1a1a1a">Unlimited indemnity</text>
            <text x="282" y="266" fontFamily="Inter, sans-serif" fontSize="6.5" fill="#6b6b6b">§2.3 — no liability cap</text>
          </g>
          {/* Finding 2 — Medium Risk */}
          <g id="finding-2" opacity="0">
            <rect x="272" y="282" width="148" height="44" rx="3" fill="#fff" stroke="#ebebeb" strokeWidth="1"/>
            <rect x="272" y="282" width="3"   height="44" rx="1" fill="#e67e22"/>
            <text x="282" y="296" fontFamily="Inter, sans-serif" fontSize="7.5" fontWeight="700" fill="#e67e22" letterSpacing="0.05em">MEDIUM RISK</text>
            <text x="282" y="309" fontFamily="Inter, sans-serif" fontSize="7"   fill="#1a1a1a">Liability cap at £50k</text>
            <text x="282" y="320" fontFamily="Inter, sans-serif" fontSize="6.5" fill="#6b6b6b">§3.1 — below threshold</text>
          </g>
          {/* Finding 3 — Note */}
          <g id="finding-3" opacity="0">
            <rect x="272" y="336" width="148" height="44" rx="3" fill="#fff" stroke="#ebebeb" strokeWidth="1"/>
            <rect x="272" y="336" width="3"   height="44" rx="1" fill="#1a1a1a"/>
            <text x="282" y="350" fontFamily="Inter, sans-serif" fontSize="7.5" fontWeight="700" fill="#1a1a1a" letterSpacing="0.05em">NOTE</text>
            <text x="282" y="363" fontFamily="Inter, sans-serif" fontSize="7"   fill="#1a1a1a">30-day termination notice</text>
            <text x="282" y="374" fontFamily="Inter, sans-serif" fontSize="6.5" fill="#6b6b6b">§4.2 — standard term</text>
          </g>
        </g>

        {/* ── Result Status ─────────────────────────────────────────── */}
        <g id="layer-result" opacity="0">
          <rect id="result-pill" x="100" y="490" width="280" height="44" rx="22" fill="#1a1a1a"/>
          <text
            x="222" y="517"
            fontFamily="Inter, sans-serif" fontSize="9.5" fontWeight="600" fill="#ffffff" letterSpacing="0.1em"
          >REVIEW REQUIRED</text>
          <circle cx="354" cy="512" r="14" fill="#c0392b"/>
          <text x="354" y="516" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="9" fontWeight="700" fill="#ffffff">2</text>
        </g>
      </svg>
    </div>
  );
};

export default ContractAnimation;
