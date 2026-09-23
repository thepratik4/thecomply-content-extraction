import React from "react";

interface TheExtractorLogoProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Primary vector SVG brand logo component for TheExtractor.
 * Renders a precision document icon with structured extraction layers and scan beam.
 *
 * @param props - Component properties including size, className, and optional style overrides.
 * @returns An accessible SVG brand badge element.
 */
export const TheExtractorLogo: React.FC<TheExtractorLogoProps> = ({
  size = 24,
  className = "",
  style = {},
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{
        display: "inline-block",
        flexShrink: 0,
        verticalAlign: "middle",
        transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        ...style,
      }}
      aria-label="TheExtractor logo"
    >
      <defs>
        <linearGradient id="theextractor-comp-bg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1e1e24" />
          <stop offset="100%" stopColor="#0c0c0e" />
        </linearGradient>
        <linearGradient id="theextractor-comp-red" x1="0" y1="0" x2="16" y2="16" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#c0392b" />
        </linearGradient>
      </defs>

      {/* Container badge */}
      <rect width="32" height="32" rx="8" fill="url(#theextractor-comp-bg)" />
      <rect
        width="31"
        height="31"
        x="0.5"
        y="0.5"
        rx="7.5"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth="1"
      />

      {/* Document Sheet */}
      <path
        d="M8 7C8 5.89543 8.89543 5 10 5H18.5L24 10.5V25C24 26.1046 23.1046 27 22 27H10C8.89543 27 8 26.1046 8 25V7Z"
        fill="#27272a"
      />

      {/* Dog-ear fold with red accent */}
      <path
        d="M18.5 5V9.5C18.5 10.0523 18.9477 10.5 19.5 10.5H24L18.5 5Z"
        fill="url(#theextractor-comp-red)"
      />

      {/* Extracted Heading bar (crimson highlight) */}
      <rect x="11" y="13" width="9" height="2.5" rx="1.25" fill="url(#theextractor-comp-red)" />

      {/* Extracted structured body lines */}
      <rect x="11" y="17.5" width="10" height="2" rx="1" fill="#a1a1aa" />
      <rect x="11" y="21.5" width="6.5" height="2" rx="1" fill="#71717a" />

      {/* Precision scan indicator */}
      <circle cx="21" cy="14.25" r="1.25" fill="#f87171" />
    </svg>
  );
};

export default TheExtractorLogo;
