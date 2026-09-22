import {
  FileText,
  Zap,
  Clock,
  Settings,
  Terminal,
  X,
} from "lucide-react"
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarRail,
  useSidebar,
} from "./ui/sidebar"

interface AppSidebarProps {
  activeItem?: string
  onSelectItem?: (item: string) => void
  onExitDashboard?: () => void
}

export function AppSidebar({
  activeItem = "studio",
  onSelectItem,
  onExitDashboard,
}: AppSidebarProps) {
  const { state, isMobile, setOpenMobile, toggleSidebar } = useSidebar()

  const handleSelect = (item: string) => {
    onSelectItem?.(item)
    if (isMobile) {
      setOpenMobile(false)
    }
  }

  const handleExit = () => {
    if (isMobile) {
      setOpenMobile(false)
    }
    onExitDashboard?.()
  }

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      {/* ─── Header: Brand ──────────────────────────────────── */}
      <SidebarHeader>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: state === "collapsed" ? "center" : "flex-start",
            gap: state === "collapsed" ? 0 : 10,
            width: "100%",
            overflow: "visible",
          }}
        >
          <div
            onClick={() => {
              if (state === "collapsed") {
                toggleSidebar()
              }
            }}
            title={state === "collapsed" ? "Expand sidebar" : "ExtractAI"}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "#e74c3c",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: 15,
              flexShrink: 0,
              boxShadow: "0 2px 8px rgba(231, 76, 60, 0.35)",
              cursor: state === "collapsed" ? "pointer" : "default",
            }}
          >
            E
          </div>
          {state !== "collapsed" && (
            <div
              style={{
                flex: 1,
                minWidth: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: "var(--sidebar-foreground, #18181b)",
                  letterSpacing: "-0.01em",
                }}
              >
                ExtractAI
              </span>
              {isMobile && (
                <button
                  type="button"
                  onClick={() => setOpenMobile(false)}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--sidebar-foreground)",
                    padding: 4,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: 0.7,
                  }}
                  title="Close sidebar"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          )}
        </div>
      </SidebarHeader>

      {/* ─── Scrollable Content ──────────────────────────────── */}
      <SidebarContent>
        {/* Group 1: Application */}
        <SidebarGroup>
          <SidebarGroupLabel>
            <span>Application</span>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeItem === "studio"}
                  onClick={() => handleSelect("studio")}
                  title="Extractor Studio"
                >
                  <Zap size={16} />
                  <span className="sidebar-menu-button-text">Extractor Studio</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeItem === "documents"}
                  onClick={() => handleSelect("documents")}
                  title="Documents"
                >
                  <FileText size={16} />
                  <span className="sidebar-menu-button-text">Documents</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeItem === "batch"}
                  onClick={() => handleSelect("batch")}
                  title="Batch Extractions"
                >
                  <Clock size={16} />
                  <span className="sidebar-menu-button-text">Batch Extractions</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Group 2: Developer */}
        <SidebarGroup>
          <SidebarGroupLabel>
            <span>Developer</span>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeItem === "api"}
                  onClick={() => handleSelect("api")}
                  title="API & Webhooks"
                >
                  <Terminal size={16} />
                  <span className="sidebar-menu-button-text">API & Webhooks</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeItem === "settings"}
                  onClick={() => handleSelect("settings")}
                  title="Settings"
                >
                  <Settings size={16} />
                  <span className="sidebar-menu-button-text">Settings</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* ─── Footer: Back to Landing Page ────────────────────── */}
      <SidebarFooter>
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 6 }}>
          {onExitDashboard && (
            <button
              onClick={handleExit}
              title="Back to Landing Page"
              style={{
                width: "100%",
                padding: state === "collapsed" ? "8px 0" : "6px 8px",
                borderRadius: 6,
                border: "1px solid #e4e4e7",
                background: "#fafafa",
                color: "#71717a",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                textAlign: "center",
                transition: "all 0.15s ease",
              }}
            >
              {state === "collapsed" ? "←" : "← Back to Landing Page"}
            </button>
          )}
        </div>
      </SidebarFooter>

      {/* ─── Collapsible Rail ─────────────────────────────────── */}
      <SidebarRail />
    </Sidebar>
  )
}
