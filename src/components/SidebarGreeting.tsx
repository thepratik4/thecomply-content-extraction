import React, { useState, useEffect } from "react";

interface SidebarGreetingProps {
  isCollapsed?: boolean;
}

interface ISTState {
  greeting: string;
  icon: string;
  subtitle: string;
  timeStr: string;
}

/**
 * Computes contextual greeting, display icon, and formatted time
 * in Indian Standard Time (IST / Asia/Kolkata).
 *
 * @returns Object with greeting, icon, subtitle, and formatted IST time string.
 */
function getISTState(): ISTState {
  const now = new Date();
  
  // Format formatted 12-hour time in Asia/Kolkata timezone
  const timeStr = now.toLocaleTimeString("en-US", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  // Extract 24-hour hour in Asia/Kolkata timezone
  const hourParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(now);

  const hourPart = hourParts.find((p) => p.type === "hour");
  const hour = hourPart ? parseInt(hourPart.value, 10) : now.getHours();

  if (hour >= 4 && hour < 12) {
    return {
      greeting: "Good morning",
      icon: "🌅",
      subtitle: "Ready to extract",
      timeStr,
    };
  } else if (hour >= 12 && hour < 17) {
    return {
      greeting: "Good afternoon",
      icon: "☀️",
      subtitle: "Pipeline active",
      timeStr,
    };
  } else if (hour >= 17 && hour < 22) {
    return {
      greeting: "Good evening",
      icon: "🌇",
      subtitle: "Ready for review",
      timeStr,
    };
  } else {
    return {
      greeting: "Hey, night owl!",
      icon: "🌙",
      subtitle: "Burning midnight oil",
      timeStr,
    };
  }
}

/**
 * Sidebar footer widget displaying dynamic time-of-day greetings and operational status
 * based on Indian Standard Time (IST).
 *
 * @param props - Component properties, including isCollapsed flag for icon-only mode.
 * @returns Card or icon badge element.
 */
export const SidebarGreeting: React.FC<SidebarGreetingProps> = ({ isCollapsed = false }) => {
  const [ist, setIst] = useState<ISTState>(getISTState);

  useEffect(() => {
    // Update every 30 seconds
    const interval = setInterval(() => {
      setIst(getISTState());
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  if (isCollapsed) {
    return (
      <div
        title={`${ist.greeting} • ${ist.timeStr} IST`}
        style={{
          width: 32,
          height: 32,
          margin: "0 auto",
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 16,
          background: "var(--card-subtle-bg, rgba(255, 255, 255, 0.05))",
          border: "1px solid var(--border-color, rgba(255, 255, 255, 0.1))",
          cursor: "default",
          userSelect: "none",
          transition: "transform 0.15s ease",
        }}
      >
        <span role="img" aria-label={ist.greeting}>{ist.icon}</span>
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        padding: "10px 12px",
        borderRadius: 8,
        background: "var(--card-subtle-bg, rgba(0, 0, 0, 0.025))",
        border: "1px solid var(--border-color, rgba(0, 0, 0, 0.06))",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        userSelect: "none",
        transition: "all 0.18s ease",
      }}
      className="sidebar-greeting-card"
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ fontSize: 15 }} role="img" aria-label={ist.greeting}>
            {ist.icon}
          </span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--sidebar-foreground, #18181b)",
              letterSpacing: "-0.01em",
            }}
          >
            {ist.greeting}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#10b981",
              boxShadow: "0 0 6px rgba(16, 185, 129, 0.6)",
              display: "inline-block",
            }}
            title="Engine Online"
          />
          <span
            style={{
              fontSize: 10,
              fontWeight: 500,
              color: "var(--text-muted, #71717a)",
              letterSpacing: "0.02em",
            }}
          >
            IST
          </span>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 11,
          color: "var(--text-muted, #71717a)",
        }}
      >
        <span>{ist.subtitle}</span>
        <span style={{ fontFamily: "var(--mono, monospace)", fontSize: 10.5, opacity: 0.9 }}>
          {ist.timeStr}
        </span>
      </div>
    </div>
  );
};

export default SidebarGreeting;
