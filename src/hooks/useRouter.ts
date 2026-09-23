import { useState, useEffect, useCallback } from "react";

export type DashboardTab = "studio" | "documents" | "batch" | "settings";

/**
 * Maps the current URL pathname to the active dashboard tab.
 *
 * @param pathname - The browser pathname to evaluate.
 * @returns The corresponding DashboardTab identifier.
 */
function getTabFromPath(pathname: string): DashboardTab {
  const normalized = pathname.toLowerCase().replace(/\/$/, "");
  if (normalized.includes("/documents") || normalized === "/documents") {
    return "documents";
  }
  if (normalized.includes("/batch") || normalized === "/batch") {
    return "batch";
  }
  if (normalized.includes("/settings") || normalized === "/settings") {
    return "settings";
  }
  return "studio";
}

/**
 * Checks whether the current URL path belongs to the dashboard environment.
 *
 * @param pathname - The browser pathname to evaluate.
 * @returns True if the path represents a dashboard route; false otherwise.
 */
function isDashboardPath(pathname: string): boolean {
  const normalized = pathname.toLowerCase().replace(/\/$/, "");
  return (
    normalized.startsWith("/dashboard") ||
    normalized === "/studio" ||
    normalized === "/documents" ||
    normalized === "/batch" ||
    normalized === "/settings"
  );
}

/**
 * Lightweight HTML5 History router hook providing client-side navigation,
 * browser Back/Forward synchronization, and URL hash compatibility.
 *
 * @returns Router context with current pathname, navigate function, dashboard state, and active tab.
 */
export function useRouter() {
  const [pathname, setPathname] = useState<string>(() => {
    if (typeof window === "undefined") return "/";

    // Restore path saved by public/404.html when Vercel served the SPA fallback
    // on a hard reload of a deep-link (e.g. /dashboard/documents).
    const redirectPath = sessionStorage.getItem("spa_redirect_path");
    if (redirectPath) {
      sessionStorage.removeItem("spa_redirect_path");
      // Replace the current history entry so the correct URL shows immediately
      window.history.replaceState(null, "", redirectPath);
      return redirectPath;
    }

    // Check hash fallback on first load (e.g. #extractor or #studio)
    if (window.location.hash === "#extractor" || window.location.hash === "#studio") {
      return "/dashboard";
    }
    return window.location.pathname || "/";
  });

  useEffect(() => {
    const handlePopState = () => {
      setPathname(window.location.pathname || "/");
    };

    const handleHashChange = () => {
      if (window.location.hash === "#extractor" || window.location.hash === "#studio") {
        if (window.location.pathname === "/") {
          window.history.pushState(null, "", "/dashboard");
          setPathname("/dashboard");
        }
      }
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("hashchange", handleHashChange);

    // If loaded with hash, update url without reloading
    if (window.location.hash === "#extractor" || window.location.hash === "#studio") {
      window.history.replaceState(null, "", "/dashboard");
    }

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  /**
   * Pushes a new route to the browser history and updates router state.
   *
   * @param to - Target pathname to navigate to.
   */
  const navigate = useCallback((to: string) => {
    if (to !== window.location.pathname) {
      window.history.pushState(null, "", to);
      setPathname(to);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  const isDashboard = isDashboardPath(pathname);
  const currentTab = getTabFromPath(pathname);

  return {
    pathname,
    navigate,
    isDashboard,
    currentTab,
  };
}
