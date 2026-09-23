import {
  FileText,
  Zap,
  Clock,
  Settings,
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
import { TheExtractorLogo } from "./TheExtractorLogo"
import { SidebarGreeting } from "./SidebarGreeting"

interface AppSidebarProps {
  activeItem?: string
  onSelectItem?: (item: string) => void
  onExitDashboard?: () => void
}

/**
 * Primary sidebar navigation component for the dashboard, containing application modules,
 * pinned settings in the footer, and the dynamic IST greeting widget.
 *
 * @param props - Component properties, including active navigation item and selection handlers.
 * @returns Sidebar navigation element.
 */
export function AppSidebar({
  activeItem = "studio",
  onSelectItem,
  onExitDashboard,
}: AppSidebarProps) {
  const { state, isMobile, setOpenMobile, toggleSidebar } = useSidebar()

  /**
   * Handles selection of a sidebar menu item and closes mobile drawer if open.
   *
   * @param item - Identifier of the selected navigation module.
   */
  const handleSelect = (item: string) => {
    onSelectItem?.(item)
    if (isMobile) {
      setOpenMobile(false)
    }
  }

  /**
   * Handles exiting the dashboard back to the landing page and closes mobile drawer.
   */
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
          {state === "collapsed" ? (
            <button
              type="button"
              onClick={toggleSidebar}
              title="Expand sidebar"
              aria-label="Expand sidebar"
              style={{
                cursor: "pointer",
                background: "transparent",
                border: "none",
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 8,
                flexShrink: 0,
                transition: "transform 0.18s ease, filter 0.18s ease",
              }}
            >
              <TheExtractorLogo size={28} />
            </button>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
              }}
            >
              <button
                type="button"
                onClick={handleExit}
                title="TheExtractor · Return to Home"
                aria-label="TheExtractor, Return to Home"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <TheExtractorLogo size={28} />
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: "var(--sidebar-foreground, #18181b)",
                    letterSpacing: "-0.01em",
                  }}
                >
                  TheExtractor
                </span>
              </button>

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
                  aria-label="Close sidebar"
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

              <SidebarMenuItem id="tour-batch-nav">
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
      </SidebarContent>

      {/* ─── Footer: Pinned Settings & IST Greeting Widget ───── */}
      <SidebarFooter
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: state === "collapsed" ? "center" : "stretch",
          width: "100%",
          padding: state === "collapsed" ? "8px 4px" : "10px 12px",
          gap: 10,
        }}
      >
        <SidebarMenu>
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

        <SidebarGreeting isCollapsed={state === "collapsed"} />
      </SidebarFooter>

      {/* ─── Collapsible Rail ─────────────────────────────────── */}
      <SidebarRail />
    </Sidebar>
  )
}
