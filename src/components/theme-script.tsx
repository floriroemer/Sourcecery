import { useEffect } from "react";

/**
 * Applies the theme class to <html> before React hydration to prevent FOUC.
 * Rendered as a client component — runs on mount, reads localStorage,
 * and sets the dark class immediately.
 */
export function ThemeScript() {
  useEffect(() => {
    try {
      const t = localStorage.getItem("sourcecery-theme");
      if (
        t === "dark" ||
        (!t && window.matchMedia("(prefers-color-scheme: dark)").matches)
      ) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } catch {
      // ignore
    }
  }, []);

  return null;
}