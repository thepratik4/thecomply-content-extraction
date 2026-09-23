import React, { useEffect, useRef } from "react";
import { buildExtractionTimeline } from "../animations/contractTimeline";

/**
 * ContractAnimation (PDF Extraction Edition)
 * -------------------------------------------
 * Animates: PDF upload → scanning → heading detection → structured output.
 * All SVG elements use named IDs so every layer is independently addressable.
 */
const ContractAnimation: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tlRef  = useRef<ReturnType<typeof buildExtractionTimeline> | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    tlRef.current = buildExtractionTimeline(svgRef.current);
    return () => { tlRef.current?.kill(); };
  }, []);

  return (
    <div className="contract-animation-wrapper">
      <svg
        ref={svgRef}
        id="extraction-svg"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 480 560"
        fill="none"
        aria-label="PDF extraction animation"
        role="img"
      >
        {/* ═══════════════════════════════════════════════════
            LAYER: Upload / Drop Area
        ═══════════════════════════════════════════════════ */}
        <g id="layer-upload-area" opacity="0">
          <rect
            id="upload-border"
            x="80" y="170" width="320" height="210" rx="6"
            fill="none" stroke="#1a1a1a" strokeWidth="1.5" strokeDasharray="6 4"
          />
          {/* Upload icon */}
          <g id="upload-icon" transform="translate(222, 230)">
            <rect x="0" y="0" width="36" height="36" rx="4" fill="#f4f4f4" stroke="#e0e0e0" strokeWidth="1"/>
            <line x1="18" y1="8" x2="18" y2="26" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round"/>
            <polyline points="11,15 18,8 25,15" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          </g>
          <text
            x="240" y="286" textAnchor="middle"
            fontFamily="Inter, sans-serif" fontSize="11" fill="#1a1a1a" fontWeight="500" letterSpacing="0.02em"
          >Drop PDF to extract</text>
          <text
            x="240" y="302" textAnchor="middle"
            fontFamily="Inter, sans-serif" fontSize="9.5" fill="#6b6b6b" letterSpacing="0.02em"
          >or click to browse</text>
          <line x1="150" y1="340" x2="330" y2="340" stroke="#e8e8e8" strokeWidth="0.75"/>
          <text
            x="240" y="354" textAnchor="middle"
            fontFamily="Inter, sans-serif" fontSize="8.5" fill="#a8a8a8" letterSpacing="0.04em"
          >PDF documents supported</text>
        </g>

        {/* ═══════════════════════════════════════════════════
            LAYER: PDF Document (floating, pre-drop)
        ═══════════════════════════════════════════════════ */}
        <g id="layer-pdf" opacity="0" transform="translate(172, 30)">
          <rect x="0" y="0" width="136" height="176" rx="3" fill="#fff" stroke="#1a1a1a" strokeWidth="1.5"/>
          {/* Dog-ear fold */}
          <path d="M108 0 L136 28 L108 28 Z" fill="#efefef" stroke="#1a1a1a" strokeWidth="1" strokeLinejoin="round"/>
          {/* PDF badge */}
          <rect x="8" y="8" width="32" height="14" rx="2" fill="#1a1a1a"/>
          <text x="24" y="18.5" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="7" fontWeight="600" fill="#fff" letterSpacing="0.06em">PDF</text>
          {/* Simulated content lines */}
          <rect x="8" y="36" width="80" height="6" rx="1.5" fill="#1a1a1a" opacity="0.7"/>
          <rect x="8" y="48" width="120" height="4" rx="1" fill="#e0e0e0"/>
          <rect x="8" y="56" width="100" height="4" rx="1" fill="#e0e0e0"/>
          <rect x="8" y="64" width="112" height="4" rx="1" fill="#e0e0e0"/>
          <rect x="8" y="76" width="70" height="5.5" rx="1.5" fill="#1a1a1a" opacity="0.6"/>
          <rect x="8" y="86" width="115" height="4" rx="1" fill="#e0e0e0"/>
          <rect x="8" y="94" width="95" height="4" rx="1" fill="#e0e0e0"/>
          <rect x="8" y="106" width="60" height="5.5" rx="1.5" fill="#1a1a1a" opacity="0.6"/>
          <rect x="8" y="116" width="108" height="4" rx="1" fill="#e0e0e0"/>
          <rect x="8" y="124" width="88" height="4" rx="1" fill="#e0e0e0"/>
          <text x="68" y="162" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="7.5" fill="#6b6b6b" letterSpacing="0.03em">annual_report_2024.pdf</text>
        </g>

        {/* ═══════════════════════════════════════════════════
            LAYER: Expanded Document (PDF open view)
        ═══════════════════════════════════════════════════ */}
        <g id="layer-document" opacity="0" transform="translate(58, 108)">
          {/* Shadow */}
          <rect x="4" y="4" width="242" height="320" rx="4" fill="#e8e8e8"/>
          {/* Body */}
          <rect x="0" y="0" width="242" height="320" rx="4" fill="#fff" stroke="#d8d8d8" strokeWidth="1"/>
          {/* Header bar */}
          <rect x="0" y="0" width="242" height="30" rx="4" fill="#f6f6f6"/>
          <rect x="0" y="22" width="242" height="8" fill="#f6f6f6"/>
          <line x1="0" y1="30" x2="242" y2="30" stroke="#e0e0e0" strokeWidth="0.75"/>
          <rect x="8" y="10" width="28" height="10" rx="2" fill="#1a1a1a"/>
          <text x="22" y="17.5" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="6" fontWeight="600" fill="#fff" letterSpacing="0.05em">PDF</text>
          <text x="46" y="18" fontFamily="Inter, sans-serif" fontSize="7.5" fontWeight="500" fill="#6b6b6b" letterSpacing="0.02em">annual_report_2024.pdf</text>

          {/* ── Heading 1 ── */}
          <g id="doc-section-1">
            <text id="doc-h1" x="12" y="52" fontFamily="Inter, sans-serif" fontSize="9" fontWeight="700" fill="#1a1a1a" letterSpacing="0.01em">Executive Summary</text>
            <rect x="12" y="58" width="190" height="3.5" rx="1" fill="#e8e8e8"/>
            <rect x="12" y="65" width="175" height="3.5" rx="1" fill="#e8e8e8"/>
            <rect x="12" y="72" width="182" height="3.5" rx="1" fill="#e8e8e8"/>
            <rect x="12" y="79" width="140" height="3.5" rx="1" fill="#e8e8e8"/>
          </g>

          {/* ── Heading 2 ── */}
          <g id="doc-section-2">
            <text id="doc-h2" x="12" y="100" fontFamily="Inter, sans-serif" fontSize="9" fontWeight="700" fill="#1a1a1a" letterSpacing="0.01em">Financial Highlights</text>
            <rect x="12" y="106" width="185" height="3.5" rx="1" fill="#e8e8e8"/>
            <rect x="12" y="113" width="170" height="3.5" rx="1" fill="#e8e8e8"/>
            <rect x="12" y="120" width="178" height="3.5" rx="1" fill="#e8e8e8"/>
            <rect x="12" y="127" width="155" height="3.5" rx="1" fill="#e8e8e8"/>
          </g>

          {/* ── Heading 3 ── */}
          <g id="doc-section-3">
            <text id="doc-h3" x="12" y="148" fontFamily="Inter, sans-serif" fontSize="9" fontWeight="700" fill="#1a1a1a" letterSpacing="0.01em">Risk Factors</text>
            <rect x="12" y="154" width="188" height="3.5" rx="1" fill="#e8e8e8"/>
            <rect x="12" y="161" width="165" height="3.5" rx="1" fill="#e8e8e8"/>
            <rect x="12" y="168" width="175" height="3.5" rx="1" fill="#e8e8e8"/>
            <rect x="12" y="175" width="130" height="3.5" rx="1" fill="#e8e8e8"/>
          </g>

          {/* ── Heading 4 ── */}
          <g id="doc-section-4">
            <text id="doc-h4" x="12" y="196" fontFamily="Inter, sans-serif" fontSize="9" fontWeight="700" fill="#1a1a1a" letterSpacing="0.01em">Market Overview</text>
            <rect x="12" y="202" width="182" height="3.5" rx="1" fill="#e8e8e8"/>
            <rect x="12" y="209" width="172" height="3.5" rx="1" fill="#e8e8e8"/>
            <rect x="12" y="216" width="160" height="3.5" rx="1" fill="#e8e8e8"/>
          </g>

          {/* ── Heading 5 ── */}
          <g id="doc-section-5">
            <text id="doc-h5" x="12" y="237" fontFamily="Inter, sans-serif" fontSize="9" fontWeight="700" fill="#1a1a1a" letterSpacing="0.01em">Outlook &amp; Guidance</text>
            <rect x="12" y="243" width="180" height="3.5" rx="1" fill="#e8e8e8"/>
            <rect x="12" y="250" width="168" height="3.5" rx="1" fill="#e8e8e8"/>
            <rect x="12" y="257" width="175" height="3.5" rx="1" fill="#e8e8e8"/>
            <rect x="12" y="264" width="142" height="3.5" rx="1" fill="#e8e8e8"/>
          </g>

          {/* Page number */}
          <text x="121" y="310" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="7" fill="#c0c0c0">1 / 12</text>
        </g>

        {/* ═══════════════════════════════════════════════════
            LAYER: Scanner Line
        ═══════════════════════════════════════════════════ */}
        <g id="layer-scanner" opacity="0">
          <line id="scanner-glow" x1="62" y1="138" x2="296" y2="138" stroke="#c0392b" strokeWidth="6" opacity="0.07"/>
          <line id="scanner-line" x1="62" y1="138" x2="296" y2="138" stroke="#c0392b" strokeWidth="1" opacity="0.75"/>
        </g>

        {/* ═══════════════════════════════════════════════════
            LAYER: Heading Highlights (on document)
        ═══════════════════════════════════════════════════ */}
        <g id="layer-highlights">
          <rect id="hl-h1" x="68" y="151" width="98"  height="12" rx="2" fill="#c0392b" opacity="0"/>
          <rect id="hl-h2" x="68" y="199" width="104" height="12" rx="2" fill="#c0392b" opacity="0"/>
          <rect id="hl-h3" x="68" y="247" width="68"  height="12" rx="2" fill="#c0392b" opacity="0"/>
          <rect id="hl-h4" x="68" y="295" width="84"  height="12" rx="2" fill="#c0392b" opacity="0"/>
          <rect id="hl-h5" x="68" y="336" width="104" height="12" rx="2" fill="#c0392b" opacity="0"/>
        </g>

        {/* ═══════════════════════════════════════════════════
            LAYER: Extracted Output Cards (right side)
        ═══════════════════════════════════════════════════ */}
        <g id="layer-extractions">
          {/* Card 1 */}
          <g id="extract-1" opacity="0">
            <rect x="304" y="138" width="162" height="52" rx="3" fill="#fff" stroke="#ebebeb" strokeWidth="1"/>
            <rect x="304" y="138" width="3"   height="52" rx="1.5" fill="#c0392b"/>
            <text x="315" y="152" fontFamily="Inter, sans-serif" fontSize="6.5" fontWeight="700" fill="#c0392b" letterSpacing="0.07em">HEADING DETECTED</text>
            <text x="315" y="163" fontFamily="Inter, sans-serif" fontSize="8" fontWeight="600" fill="#1a1a1a">Executive Summary</text>
            <rect x="315" y="169" width="130" height="3" rx="1" fill="#e8e8e8"/>
            <rect x="315" y="175" width="110" height="3" rx="1" fill="#e8e8e8"/>
            <rect x="315" y="181" width="120" height="3" rx="1" fill="#e8e8e8"/>
          </g>

          {/* Card 2 */}
          <g id="extract-2" opacity="0">
            <rect x="304" y="200" width="162" height="52" rx="3" fill="#fff" stroke="#ebebeb" strokeWidth="1"/>
            <rect x="304" y="200" width="3"   height="52" rx="1.5" fill="#c0392b"/>
            <text x="315" y="214" fontFamily="Inter, sans-serif" fontSize="6.5" fontWeight="700" fill="#c0392b" letterSpacing="0.07em">HEADING DETECTED</text>
            <text x="315" y="225" fontFamily="Inter, sans-serif" fontSize="8" fontWeight="600" fill="#1a1a1a">Financial Highlights</text>
            <rect x="315" y="231" width="125" height="3" rx="1" fill="#e8e8e8"/>
            <rect x="315" y="237" width="105" height="3" rx="1" fill="#e8e8e8"/>
            <rect x="315" y="243" width="118" height="3" rx="1" fill="#e8e8e8"/>
          </g>

          {/* Card 3 */}
          <g id="extract-3" opacity="0">
            <rect x="304" y="262" width="162" height="52" rx="3" fill="#fff" stroke="#ebebeb" strokeWidth="1"/>
            <rect x="304" y="262" width="3"   height="52" rx="1.5" fill="#c0392b"/>
            <text x="315" y="276" fontFamily="Inter, sans-serif" fontSize="6.5" fontWeight="700" fill="#c0392b" letterSpacing="0.07em">HEADING DETECTED</text>
            <text x="315" y="287" fontFamily="Inter, sans-serif" fontSize="8" fontWeight="600" fill="#1a1a1a">Risk Factors</text>
            <rect x="315" y="293" width="128" height="3" rx="1" fill="#e8e8e8"/>
            <rect x="315" y="299" width="108" height="3" rx="1" fill="#e8e8e8"/>
            <rect x="315" y="305" width="120" height="3" rx="1" fill="#e8e8e8"/>
          </g>

          {/* Card 4 — collapsed/preview */}
          <g id="extract-4" opacity="0">
            <rect x="304" y="324" width="162" height="30" rx="3" fill="#fff" stroke="#ebebeb" strokeWidth="1"/>
            <rect x="304" y="324" width="3"   height="30" rx="1.5" fill="#c0392b"/>
            <text x="315" y="335" fontFamily="Inter, sans-serif" fontSize="6.5" fontWeight="700" fill="#c0392b" letterSpacing="0.07em">HEADING DETECTED</text>
            <text x="315" y="346" fontFamily="Inter, sans-serif" fontSize="8" fontWeight="600" fill="#1a1a1a">Market Overview</text>
          </g>

          {/* + N more chip */}
          <g id="extract-more" opacity="0">
            <rect x="304" y="362" width="80" height="20" rx="10" fill="#f4f4f4" stroke="#e0e0e0" strokeWidth="1"/>
            <text x="344" y="375" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="7.5" fill="#6b6b6b">+1 more</text>
          </g>
        </g>

        {/* ═══════════════════════════════════════════════════
            LAYER: Result / Completion Status
        ═══════════════════════════════════════════════════ */}
        <g id="layer-result" opacity="0">
          <rect x="100" y="490" width="280" height="44" rx="22" fill="#1a1a1a"/>
          {/* Check icon */}
          <circle cx="128" cy="512" r="11" fill="#c0392b"/>
          <path d="M122 512 L126 516 L134 508" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          <text x="260" y="517" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="9.5" fontWeight="600" fill="#fff" letterSpacing="0.08em">5 HEADINGS EXTRACTED</text>
        </g>
      </svg>
    </div>
  );
};

export default ContractAnimation;
