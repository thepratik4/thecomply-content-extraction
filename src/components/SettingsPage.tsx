import React, { useState, useEffect } from "react"
import {
  Sun,
  Moon,
  Laptop,
  AlertCircle,
  RefreshCw,
} from "lucide-react"

type ThemeMode = "system" | "light" | "dark"

interface ApiHealthState {
  status: "checking" | "online" | "offline"
  version?: string
  latencyMs?: number
  error?: string
}

export const SettingsPage: React.FC = () => {
  // 1. Theme State
  const [theme, setTheme] = useState<ThemeMode>(() => {
    return (localStorage.getItem("extractai_theme") as ThemeMode) || "system"
  })

  const handleThemeChange = (newTheme: ThemeMode) => {
    setTheme(newTheme)
    localStorage.setItem("extractai_theme", newTheme)
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark")
    } else if (newTheme === "light") {
      document.documentElement.classList.remove("dark")
    } else {
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        document.documentElement.classList.add("dark")
      } else {
        document.documentElement.classList.remove("dark")
      }
    }
  }

  // 2. API Server Status State
  const [apiHealth, setApiHealth] = useState<ApiHealthState>({
    status: "checking",
  })

  const checkApiHealth = async () => {
    setApiHealth((prev) => ({ ...prev, status: "checking" }))
    const startTime = performance.now()

    try {
      let res: Response
      try {
        res = await fetch("/api/health")
      } catch {
        res = await fetch("http://127.0.0.1:8000/api/health")
      }

      const latencyMs = Math.round(performance.now() - startTime)

      if (res.ok) {
        const data = await res.json()
        setApiHealth({
          status: "online",
          version: data.version || "2.0.0",
          latencyMs,
        })
      } else {
        setApiHealth({
          status: "offline",
          error: `Server status ${res.status}`,
        })
      }
    } catch {
      setApiHealth({
        status: "offline",
        error: "Server unreachable",
      })
    }
  }

  useEffect(() => {
    checkApiHealth()
  }, [])

  return (
    <div style={{ padding: "24px 28px", maxWidth: 640, margin: "0 auto" }}>
      {/* Page Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a", margin: "0 0 4px 0" }}>
          Settings
        </h2>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* ─── 1. Theme Configuration ─────────────────────────── */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e5e5e8",
            borderRadius: 8,
            padding: "16px 20px",
            boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ marginBottom: 12 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a", margin: 0 }}>
              Theme
            </h3>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {/* System */}
            <button
              onClick={() => handleThemeChange("system")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "10px 12px",
                borderRadius: 6,
                border: theme === "system" ? "2px solid #1a1a1a" : "1px solid #e4e4e7",
                background: theme === "system" ? "#fbfbfb" : "#ffffff",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <Laptop size={15} color={theme === "system" ? "#1a1a1a" : "#71717a"} />
              <span style={{ fontSize: 12, fontWeight: theme === "system" ? 600 : 500, color: "#1a1a1a" }}>
                System
              </span>
            </button>

            {/* Light */}
            <button
              onClick={() => handleThemeChange("light")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "10px 12px",
                borderRadius: 6,
                border: theme === "light" ? "2px solid #1a1a1a" : "1px solid #e4e4e7",
                background: theme === "light" ? "#fbfbfb" : "#ffffff",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <Sun size={15} color={theme === "light" ? "#e74c3c" : "#71717a"} />
              <span style={{ fontSize: 12, fontWeight: theme === "light" ? 600 : 500, color: "#1a1a1a" }}>
                Light
              </span>
            </button>

            {/* Dark */}
            <button
              onClick={() => handleThemeChange("dark")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "10px 12px",
                borderRadius: 6,
                border: theme === "dark" ? "2px solid #1a1a1a" : "1px solid #e4e4e7",
                background: theme === "dark" ? "#fbfbfb" : "#ffffff",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <Moon size={15} color={theme === "dark" ? "#1a1a1a" : "#71717a"} />
              <span style={{ fontSize: 12, fontWeight: theme === "dark" ? 600 : 500, color: "#1a1a1a" }}>
                Dark
              </span>
            </button>
          </div>
        </div>

        {/* ─── 2. API Server Status ───────────────────────────── */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e5e5e8",
            borderRadius: 8,
            padding: "16px 20px",
            boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <h3 style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a", margin: 0 }}>
              API Server Status
            </h3>

            <button
              onClick={checkApiHealth}
              disabled={apiHealth.status === "checking"}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: 11,
                fontWeight: 500,
                color: "#71717a",
                background: "#ffffff",
                border: "1px solid #e4e4e7",
                padding: "4px 8px",
                borderRadius: 6,
                cursor: apiHealth.status === "checking" ? "not-allowed" : "pointer",
              }}
            >
              <RefreshCw
                size={11}
                style={{
                  animation: apiHealth.status === "checking" ? "spin 1s linear infinite" : "none",
                }}
              />
              Check
            </button>
          </div>

          <div
            style={{
              background: "#fafafa",
              border: "1px solid #e5e5e8",
              borderRadius: 6,
              padding: "10px 14px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              fontSize: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ color: "#71717a" }}>Status</span>
              {apiHealth.status === "checking" && (
                <span style={{ color: "#a1a1aa", fontSize: 11 }}>Checking...</span>
              )}

              {apiHealth.status === "online" && (
                <span
                  style={{
                    color: "#15803d",
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    padding: "2px 8px",
                    borderRadius: 9999,
                    fontSize: 11,
                    fontWeight: 600,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "#16a34a",
                    }}
                  />
                  Operational
                </span>
              )}

              {apiHealth.status === "offline" && (
                <span
                  style={{
                    color: "#b91c1c",
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    padding: "2px 8px",
                    borderRadius: 9999,
                    fontSize: 11,
                    fontWeight: 600,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <AlertCircle size={11} />
                  Offline
                </span>
              )}
            </div>

            {apiHealth.latencyMs !== undefined && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ color: "#71717a" }}>Latency</span>
                <span style={{ fontFamily: "monospace", color: "#1a1a1a", fontSize: 11 }}>
                  {apiHealth.latencyMs} ms
                </span>
              </div>
            )}

            {apiHealth.error && (
              <div style={{ color: "#b91c1c", fontSize: 11 }}>
                {apiHealth.error}
              </div>
            )}
          </div>
        </div>

        {/* ─── 3. Application Version ─────────────────────────── */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e5e5e8",
            borderRadius: 8,
            padding: "16px 20px",
            boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ marginBottom: 12 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a", margin: 0 }}>
              Application Version
            </h3>
          </div>

          <div
            style={{
              background: "#fafafa",
              border: "1px solid #e5e5e8",
              borderRadius: 6,
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: 12,
            }}
          >
            <span style={{ color: "#71717a" }}>Version</span>
            <span
              style={{
                fontFamily: "monospace",
                background: "#f4f4f5",
                padding: "2px 6px",
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 600,
                color: "#18181b",
              }}
            >
              {apiHealth.version ? `v${apiHealth.version}` : "v2.0.0"}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
