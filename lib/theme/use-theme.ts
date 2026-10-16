"use client";

import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "docvault-theme";

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");

  if (theme === "system") return;
  root.classList.add(theme);
}

function readStoredTheme(): Theme {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "light" || raw === "dark" || raw === "system") return raw;
  } catch {
    // localStorage unavailable (private mode etc.) -- fall back to system.
  }
  return "system";
}

export function useTheme() {
  // Always starts as "system" so the server render and the client's
  // very first render agree -- localStorage is only readable
  // client-side, so reading it in the useState initializer (even
  // behind a typeof-window guard) would make the client's first
  // render differ from the server's, which is exactly what produced
  // the hydration mismatch in ThemeToggle (its isDark depends on this
  // value). The actual stored theme is applied post-mount instead; it
  // was already visually correct before React even ran, via the
  // inline script in app/layout.tsx that sets the .dark/.light class
  // on <html> pre-hydration -- this effect just brings React's state
  // into agreement with what's already on screen.
  const [theme, setThemeState] = useState<Theme>("system");

  useEffect(() => {
    // Syncing React state to localStorage's actual value, which
    // cannot be read during SSR or the first client render without
    // mismatching (see comment above). One-time catch-up read.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThemeState(readStoredTheme());
  }, []);

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
