"use client";

import { useCallback, useState } from "react";

export type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "docvault-theme";

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");

  if (theme === "system") return;
  root.classList.add(theme);
}

function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "light" || raw === "dark" || raw === "system") return raw;
  } catch {
    // localStorage unavailable (private mode etc.) -- fall back to system.
  }
  return "system";
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    applyTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Best-effort only.
    }
  }, []);

  return { theme, setTheme };
}
