import * as React from "react"
import "./spinner.css"

export interface SpinnerProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: "xs" | "sm" | "default" | "md" | "lg" | "xl"
  className?: string
}

export const Spinner = React.forwardRef<HTMLSpanElement, SpinnerProps>(
  ({ className = "", size = "default", style, ...props }, ref) => {
    return (
      <span
        ref={ref}
        role="status"
        aria-label="Loading"
        className={`shadcn-spinner shadcn-spinner--${size} ${className}`}
        style={style}
        {...props}
      >
        <svg
          className="shadcn-spinner-svg"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            className="shadcn-spinner-track"
            cx="12"
            cy="12"
            r="9.5"
            stroke="currentColor"
            strokeWidth="2.75"
          />
          <path
            className="shadcn-spinner-arc"
            d="M12 2.5C17.2467 2.5 21.5 6.75329 21.5 12"
            stroke="currentColor"
            strokeWidth="2.75"
            strokeLinecap="round"
          />
        </svg>
      </span>
    )
  }
)

Spinner.displayName = "Spinner"

export function SpinnerDemo() {
  return (
    <div style={{ display: "flex", width: "100%", maxWidth: "20rem", flexDirection: "column", gap: "1rem" }}>
      <div className="ui-item ui-item--muted" style={{ borderRadius: "1rem" }}>
        <div className="ui-item-media">
          <Spinner />
        </div>
        <div className="ui-item-content">
          <p className="ui-item-title line-clamp-1">Processing payment...</p>
        </div>
        <div className="ui-item-content flex-none justify-end">
          <span style={{ fontSize: "0.875rem", fontVariantNumeric: "tabular-nums" }}>$100.00</span>
        </div>
      </div>
    </div>
  )
}
