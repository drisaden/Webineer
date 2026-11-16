"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export const THEME_KEY = "theme";
export const THEME_EVENT = "webineer-theme-change";

/** Customer-facing pages (registration, embeds, rooms, replays) keep their own light design and never take the app's dark theme. */
const LIGHT_ONLY = [/^\/w\//, /^\/embed\//, /^\/room\//, /^\/replay\//];

export function isThemedPath(pathname: string | null): boolean {
  return !!pathname && !LIGHT_ONLY.some((re) => re.test(pathname));
}

export function readThemePreference(): boolean {
  try {
    return JSON.parse(window.localStorage.getItem(THEME_KEY) ?? "false") === true;
  } catch {
    return false;
  }
}

export function writeThemePreference(dark: boolean) {
  try {
    window.localStorage.setItem(THEME_KEY, JSON.stringify(dark));
  } catch {
    /* storage unavailable: the theme just won't persist */
  }
  window.dispatchEvent(new Event(THEME_EVENT));
}

export function subscribeTheme(onChange: () => void) {
  window.addEventListener(THEME_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(THEME_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Applies the saved theme to <body> on themed pages and removes it everywhere else, so dark mode can't leak between sections on client navigation. */
export function ThemeSync() {
  const pathname = usePathname();
  useEffect(() => {
    const apply = () => document.body.classList.toggle("dark", isThemedPath(pathname) && readThemePreference());
    apply();
    window.addEventListener(THEME_EVENT, apply);
    window.addEventListener("storage", apply);
    return () => {
      window.removeEventListener(THEME_EVENT, apply);
      window.removeEventListener("storage", apply);
    };
  }, [pathname]);
  return null;
}
