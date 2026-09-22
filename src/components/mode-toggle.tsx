import { Moon, Sun } from "lucide-react"
import { useTheme } from "./theme-provider"

export function ModeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()

  const toggleTheme = () => {
    if (theme === "dark") {
      setTheme("light")
    } else {
      setTheme("dark")
    }
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={className}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 32,
        height: 32,
        borderRadius: 6,
        border: "1px solid var(--border-color, #e4e4e7)",
        background: "var(--card-bg, #ffffff)",
        color: "var(--text-primary, #18181b)",
        cursor: "pointer",
        transition: "all 0.15s ease",
        flexShrink: 0,
      }}
    >
      {theme === "dark" ? (
        <Sun size={15} color="#e74c3c" />
      ) : (
        <Moon size={15} color="#52525b" />
      )}
      <span style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0, 0, 0, 0)", border: 0 }}>
        Toggle theme
      </span>
    </button>
  )
}
