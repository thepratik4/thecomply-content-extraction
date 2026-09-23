import { useState, useEffect, useCallback } from "react";

export type DashboardTab = "studio" | "documents" | "batch" | "settings";

/**
 * Maps a pathname to the active dashboard tab.
 * Works with both legacy pathnames (/dashboard/documents) and hash paths (#/dashboard/documents).
 */
function getTabFromPath(pathname: string): DashboardTab {
  const normalized = pathname.toLowerCase().replace(/\/$/, "");
  if (normalized.includes("/documents")) return "documents";
  if (normalized.includes("/batch"))     return "batch";
  if (normalized.includes("/settings"))  return "settings";
  return "studio";
}

/**
 * Returns true when the current path represents a dashboard route.
 */
function isDashboardPath(pathname: string): boolean {
  const normalized = pathname.toLowerCase().replace(/\/$/, "");
  return (
    normalized.startsWith("/dashboard") ||
    normalized === "/studio"            ||
    normalized === "/documents"         ||
    normalized === "/batch"             ||
    normalized === "/settings"
  );
}

/**
 * Derives the logical pathname from the current browser URL.
 *
 * Navigation uses hash-based routing (#/dashboard/documents) so the server
 * always receives a request for "/" and never needs to know about sub-routes.
 * This permanently eliminates 404 errors on page reload in Vercel's Services
 * architecture (or any static host) without any server-side configuration.
 *
 * Legacy hashes (#extractor, #studio) are still supported for backward compat.
 */
function getRoutePath(): string {
  if (typeof window === "undefined") return "/";

  const hash = window.location.hash;

  // Hash-based routing — primary mechanism
  // URL shape: theextractor.vercel.app/#/dashboard/documents
  if (hash.startsWith("#/")) return hash.slice(1); // "#/dashboard/documents" → "/dashboard/documents"

  // Legacy hashes kept for backward compatibility
  if (hash === "#extractor" || hash === "#studio") return "/dashboard";

  // Fallback: read the actual pathname (covers the landing page at "/")
  return window.location.pathname || "/";
}

/**
 * Lightweight hash-based router hook providing client-side navigation and
 * browser Back/Forward synchronisation.
 *
 * URL format: /#/dashboard/documents
 *   • Everything before "#" is always "/" — the server serves index.html.
 *   • Everything after "#" is handled entirely in the browser by this hook.
 *
 * @returns Router context: pathname, navigate, isDashboard, currentTab.
 */
export function useRouter() {
  const [pathname, setPathname] = useState<string>(getRoutePath);

  useEffect(() => {
    /**
     * Fires on both browser back/forward (popstate) and programmatic hash
     * changes (hashchange). Both events must be handled because:
     *   • popstate  fires when returning to "/" from a hash URL
     *   • hashchange fires when moving between hash routes
     */
    const sync = () => setPathname(getRoutePath());

    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate",   sync);

    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate",   sync);
    };
  }, []);

  /**
   * Navigate to a route.
   *
   * • "/" (landing page) — uses pushState so the URL shows "/" without a hash.
   * • Everything else    — sets window.location.hash, e.g. #/dashboard/documents.
   *   The base URL stays "/" so the server is never asked for a non-existent path.
   */
  const navigate = useCallback((to: string) => {
    if (to === "/") {
      // Landing page: clear the hash and restore the clean "/" URL
      if (window.location.pathname !== "/" || window.location.hash !== "") {
        window.history.pushState(null, "", "/");
        setPathname("/");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } else {
      // All dashboard/sub routes: use hash routing
      const newHash = `#${to}`;
      if (window.location.hash !== newHash) {
        window.location.hash = to; // sets window.location.hash and pushes history entry
        setPathname(to);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  }, []);

  const isDashboard = isDashboardPath(pathname);
  const currentTab  = getTabFromPath(pathname);

  return { pathname, navigate, isDashboard, currentTab };
}
