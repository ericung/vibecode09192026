"use client";

import { useCallback, useLayoutEffect, useState } from "react";

const STORAGE_KEY = "theme";
type Theme = "light" | "dark";

function initialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // Storage unavailable (private mode) — fall through to system preference.
  }
  try {
    if (typeof window.matchMedia === "function") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
  } catch {
    // matchMedia unavailable (e.g. jsdom) — default to light.
  }
  return "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
}

/**
 * Light/dark toggle (Phase 5, Prompt 15).
 * Defaults to the OS preference; manual choice persists to localStorage.
 * The pre-paint inline script in `app/layout.tsx` sets the initial class
 * so there is no flash — this component re-applies it in a layout effect
 * (covers dev StrictMode remounts) and on user toggle.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => initialTheme());

  // Re-apply after React clears <html> attributes on dev StrictMode remount.
  // DOM-only sync — no cascading render. No-op in production.
  useLayoutEffect(() => {
    applyTheme(initialTheme());
  }, []);

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      applyTheme(next);
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Ignore storage failures — theme still applies for the session.
      }
      return next;
    });
  }, []);

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={isDark}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--line)] bg-white/70 text-lg leading-none transition-colors hover:bg-white dark:border-white/15 dark:bg-white/10 dark:hover:bg-white/15"
    >
      <span aria-hidden="true" suppressHydrationWarning>
        {isDark ? "☾" : "☀"}
      </span>
    </button>
  );
}
