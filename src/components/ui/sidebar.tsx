import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  forwardRef,
} from "react"
import { PanelLeft } from "lucide-react"
import "./sidebar.css"

/* ─── Constants ──────────────────────────────────────────── */
const SIDEBAR_COOKIE_NAME = "sidebar_state"
const SIDEBAR_KEYBOARD_SHORTCUT = "b"
const SIDEBAR_WIDTH = "16rem"
const SIDEBAR_WIDTH_MOBILE = "18rem"
const SIDEBAR_WIDTH_ICON = "3.5rem"

/* ─── Context ────────────────────────────────────────────── */
interface SidebarContextType {
  state: "expanded" | "collapsed"
  open: boolean
  setOpen: (open: boolean | ((value: boolean) => boolean)) => void
  openMobile: boolean
  setOpenMobile: (open: boolean | ((value: boolean) => boolean)) => void
  isMobile: boolean
  toggleSidebar: () => void
}

const SidebarContext = createContext<SidebarContextType | null>(null)

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider")
  }
  return context
}

/* ─── SidebarProvider ────────────────────────────────────── */
export interface SidebarProviderProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export const SidebarProvider = forwardRef<HTMLDivElement, SidebarProviderProps>(
  (
    {
      defaultOpen = true,
      open: openProp,
      onOpenChange: setOpenProp,
      className = "",
      style,
      children,
      ...props
    },
    ref
  ) => {
    const [isMobile, setIsMobile] = useState(false)
    const [openMobile, setOpenMobile] = useState(false)

    // Uncontrolled vs Controlled state
    const [_open, _setOpen] = useState(defaultOpen)
    const open = openProp !== undefined ? openProp : _open

    const setOpen = useCallback(
      (value: boolean | ((value: boolean) => boolean)) => {
        const openState = typeof value === "function" ? value(open) : value
        if (setOpenProp) {
          setOpenProp(openState)
        } else {
          _setOpen(openState)
        }
      },
      [setOpenProp, open]
    )

    // Track mobile breakpoint (768px)
    useEffect(() => {
      const checkMobile = () => {
        setIsMobile(window.innerWidth < 768)
      }
      checkMobile()
      window.addEventListener("resize", checkMobile)
      return () => window.removeEventListener("resize", checkMobile)
    }, [])

    // Toggle sidebar helper
    const toggleSidebar = useCallback(() => {
      if (isMobile) {
        setOpenMobile((prev) => !prev)
      } else {
        setOpen((prev) => !prev)
      }
    }, [isMobile, setOpen])

    // Keyboard shortcut (ctrl+b or cmd+b)
    useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (
          event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
          (event.metaKey || event.ctrlKey)
        ) {
          event.preventDefault()
          toggleSidebar()
        }
      }
      window.addEventListener("keydown", handleKeyDown)
      return () => window.removeEventListener("keydown", handleKeyDown)
    }, [toggleSidebar])

    const state = open ? "expanded" : "collapsed"

    const contextValue = useMemo<SidebarContextType>(
      () => ({
        state,
        open,
        setOpen,
        openMobile,
        setOpenMobile,
        isMobile,
        toggleSidebar,
      }),
      [state, open, setOpen, openMobile, setOpenMobile, isMobile, toggleSidebar]
    )

    return (
      <SidebarContext.Provider value={contextValue}>
        <div
          ref={ref}
          className={`sidebar-provider ${className}`}
          style={
            {
              "--sidebar-width": SIDEBAR_WIDTH,
              "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
              "--sidebar-width-mobile": SIDEBAR_WIDTH_MOBILE,
              ...style,
            } as React.CSSProperties
          }
          {...props}
        >
          {children}
        </div>
      </SidebarContext.Provider>
    )
  }
)
SidebarProvider.displayName = "SidebarProvider"

/* ─── Sidebar ────────────────────────────────────────────── */
export interface SidebarProps extends React.HTMLAttributes<HTMLElement> {
  side?: "left" | "right"
  variant?: "sidebar" | "floating" | "inset"
  collapsible?: "offcanvas" | "icon" | "none"
}

export const Sidebar = forwardRef<HTMLElement, SidebarProps>(
  (
    {
      side = "left",
      variant = "sidebar",
      collapsible = "icon",
      className = "",
      children,
      ...props
    },
    ref
  ) => {
    const { state, open } = useSidebar()

    return (
      <aside
        ref={ref}
        data-state={state}
        data-collapsible={collapsible}
        data-variant={variant}
        data-side={side}
        className={`sidebar ${className}`}
        {...props}
      >
        {children}
      </aside>
    )
  }
)
Sidebar.displayName = "Sidebar"

/* ─── SidebarTrigger ─────────────────────────────────────── */
export interface SidebarTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export const SidebarTrigger = forwardRef<HTMLButtonElement, SidebarTriggerProps>(
  ({ className = "", onClick, children, ...props }, ref) => {
    const { toggleSidebar } = useSidebar()

    return (
      <button
        ref={ref}
        type="button"
        className={`sidebar-trigger ${className}`}
        onClick={(e) => {
          onClick?.(e)
          toggleSidebar()
        }}
        title="Toggle sidebar (Ctrl+B)"
        {...props}
      >
        {children || <PanelLeft size={16} />}
        <span className="sr-only" style={{ display: "none" }}>Toggle Sidebar</span>
      </button>
    )
  }
)
SidebarTrigger.displayName = "SidebarTrigger"

/* ─── SidebarRail ────────────────────────────────────────── */
export const SidebarRail = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className = "", onClick, ...props }, ref) => {
  const { toggleSidebar } = useSidebar()

  return (
    <button
      ref={ref}
      type="button"
      className={`sidebar-rail ${className}`}
      onClick={(e) => {
        onClick?.(e)
        toggleSidebar()
      }}
      title="Toggle Sidebar Rail"
      aria-label="Toggle Sidebar"
      tabIndex={-1}
      {...props}
    />
  )
})
SidebarRail.displayName = "SidebarRail"

/* ─── SidebarInset ───────────────────────────────────────── */
export const SidebarInset = forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement>
>(({ className = "", children, ...props }, ref) => {
  return (
    <main ref={ref} className={`sidebar-inset ${className}`} {...props}>
      {children}
    </main>
  )
})
SidebarInset.displayName = "SidebarInset"

/* ─── SidebarHeader ──────────────────────────────────────── */
export const SidebarHeader = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className = "", children, ...props }, ref) => {
  return (
    <div ref={ref} className={`sidebar-header ${className}`} {...props}>
      {children}
    </div>
  )
})
SidebarHeader.displayName = "SidebarHeader"

/* ─── SidebarFooter ──────────────────────────────────────── */
export const SidebarFooter = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className = "", children, ...props }, ref) => {
  return (
    <div ref={ref} className={`sidebar-footer ${className}`} {...props}>
      {children}
    </div>
  )
})
SidebarFooter.displayName = "SidebarFooter"

/* ─── SidebarContent ─────────────────────────────────────── */
export const SidebarContent = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className = "", children, ...props }, ref) => {
  return (
    <div ref={ref} className={`sidebar-content ${className}`} {...props}>
      {children}
    </div>
  )
})
SidebarContent.displayName = "SidebarContent"

/* ─── SidebarGroup ───────────────────────────────────────── */
export const SidebarGroup = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className = "", children, ...props }, ref) => {
  return (
    <div ref={ref} className={`sidebar-group ${className}`} {...props}>
      {children}
    </div>
  )
})
SidebarGroup.displayName = "SidebarGroup"

/* ─── SidebarGroupLabel ──────────────────────────────────── */
export const SidebarGroupLabel = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className = "", children, ...props }, ref) => {
  return (
    <div ref={ref} className={`sidebar-group-label ${className}`} {...props}>
      {children}
    </div>
  )
})
SidebarGroupLabel.displayName = "SidebarGroupLabel"

/* ─── SidebarGroupAction ─────────────────────────────────── */
export const SidebarGroupAction = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className = "", children, ...props }, ref) => {
  return (
    <button ref={ref} className={`sidebar-group-action ${className}`} {...props}>
      {children}
    </button>
  )
})
SidebarGroupAction.displayName = "SidebarGroupAction"

/* ─── SidebarGroupContent ────────────────────────────────── */
export const SidebarGroupContent = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className = "", children, ...props }, ref) => {
  return (
    <div ref={ref} className={`sidebar-group-content ${className}`} {...props}>
      {children}
    </div>
  )
})
SidebarGroupContent.displayName = "SidebarGroupContent"

/* ─── SidebarMenu ────────────────────────────────────────── */
export const SidebarMenu = forwardRef<
  HTMLUListElement,
  React.HTMLAttributes<HTMLUListElement>
>(({ className = "", children, ...props }, ref) => {
  return (
    <ul ref={ref} className={`sidebar-menu ${className}`} {...props}>
      {children}
    </ul>
  )
})
SidebarMenu.displayName = "SidebarMenu"

/* ─── SidebarMenuItem ────────────────────────────────────── */
export const SidebarMenuItem = forwardRef<
  HTMLLIElement,
  React.LiHTMLAttributes<HTMLLIElement>
>(({ className = "", children, ...props }, ref) => {
  return (
    <li ref={ref} className={`sidebar-menu-item ${className}`} {...props}>
      {children}
    </li>
  )
})
SidebarMenuItem.displayName = "SidebarMenuItem"

/* ─── SidebarMenuButton ──────────────────────────────────── */
export interface SidebarMenuButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isActive?: boolean
  asChild?: boolean
}

export const SidebarMenuButton = forwardRef<
  HTMLButtonElement,
  SidebarMenuButtonProps
>(({ isActive = false, className = "", children, ...props }, ref) => {
  return (
    <button
      ref={ref}
      type="button"
      data-active={isActive}
      className={`sidebar-menu-button ${className}`}
      {...props}
    >
      {children}
    </button>
  )
})
SidebarMenuButton.displayName = "SidebarMenuButton"

/* ─── SidebarMenuBadge ───────────────────────────────────── */
export const SidebarMenuBadge = forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className = "", children, ...props }, ref) => {
  return (
    <span ref={ref} className={`sidebar-menu-badge ${className}`} {...props}>
      {children}
    </span>
  )
})
SidebarMenuBadge.displayName = "SidebarMenuBadge"

/* ─── SidebarMenuAction ──────────────────────────────────── */
export const SidebarMenuAction = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className = "", children, ...props }, ref) => {
  return (
    <button ref={ref} className={`sidebar-menu-action ${className}`} {...props}>
      {children}
    </button>
  )
})
SidebarMenuAction.displayName = "SidebarMenuAction"

/* ─── SidebarMenuSub ─────────────────────────────────────── */
export const SidebarMenuSub = forwardRef<
  HTMLUListElement,
  React.HTMLAttributes<HTMLUListElement>
>(({ className = "", children, ...props }, ref) => {
  return (
    <ul ref={ref} className={`sidebar-menu-sub ${className}`} {...props}>
      {children}
    </ul>
  )
})
SidebarMenuSub.displayName = "SidebarMenuSub"

/* ─── SidebarMenuSubItem ─────────────────────────────────── */
export const SidebarMenuSubItem = forwardRef<
  HTMLLIElement,
  React.LiHTMLAttributes<HTMLLIElement>
>(({ className = "", children, ...props }, ref) => {
  return (
    <li ref={ref} className={`sidebar-menu-sub-item ${className}`} {...props}>
      {children}
    </li>
  )
})
SidebarMenuSubItem.displayName = "SidebarMenuSubItem"

/* ─── SidebarMenuSubButton ───────────────────────────────── */
export const SidebarMenuSubButton = forwardRef<
  HTMLAnchorElement,
  React.AnchorHTMLAttributes<HTMLAnchorElement>
>(({ className = "", children, ...props }, ref) => {
  return (
    <a ref={ref} className={`sidebar-menu-sub-button ${className}`} {...props}>
      {children}
    </a>
  )
})
SidebarMenuSubButton.displayName = "SidebarMenuSubButton"
