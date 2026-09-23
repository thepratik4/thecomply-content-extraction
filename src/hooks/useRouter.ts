import { useState, useEffect, useCallback } from "react";

export type DashboardTab = "studio" | "documents" | "batch" | "settings";

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

export function useRouter() {
  const [pathname, setPathname] = useState<string>(() => {
    // Check hash fallback on first load (e.g. #extractor or #studio)
    if (typeof window !== "undefined") {
      if (window.location.hash === "#extractor" || window.location.hash === "#studio") {
        return "/dashboard";
      }
      return window.location.pathname || "/";
    }
    return "/";
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
