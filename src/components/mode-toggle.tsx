import React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "./theme-provider"

/**
 * Sliding pill theme toggle switch allowing users to transition between light and dark themes.
 *
 * @param props - Component properties, including optional className for layout overrides.
 * @returns Sliding pill switch element.
 */
export function ModeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  const isDark = theme === "dark"

  /**
   * Toggles between dark and light themes.
   */
  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark")
  }

  /**
   * Handles keyboard interaction (Enter and Space) for accessible toggle control.
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      toggleTheme()
    }
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggleTheme}
      onKeyDown={handleKeyDown}
      className={className}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        width: 48,
        height: 26,
        padding: 3,
        borderRadius: 9999,
        background: isDark ? "#27272a" : "#e8e8ed",
        border: isDark
          ? "1px solid rgba(255, 255, 255, 0.14)"
          : "1px solid rgba(0, 0, 0, 0.08)",
        cursor: "pointer",
        position: "relative",
        boxSizing: "border-box",
        transition: "background-color 0.22s ease, border-color 0.22s ease",
        flexShrink: 0,
        outline: "none",
      }}
    >
      {/* Sliding circular thumb */}
      <span
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: isDark ? "#18181b" : "#ffffff",
          boxShadow: isDark
            ? "0 1px 3px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.08)"
            : "0 1px 3px rgba(0, 0, 0, 0.18), 0 1px 1px rgba(0, 0, 0, 0.08)",
          transform: isDark ? "translateX(22px)" : "translateX(0px)",
          transition: "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.2s ease",
        }}
      >
        {isDark ? (
          <Moon size={11} strokeWidth={2.4} color="#f4f4f5" />
        ) : (
          <Sun size={12} strokeWidth={2.3} color="#3f3f46" />
        )}
      </span>

      <span
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: "hidden",
          clip: "rect(0, 0, 0, 0)",
          border: 0,
        }}
      >
        Toggle theme
      </span>
    </button>
  )
}
