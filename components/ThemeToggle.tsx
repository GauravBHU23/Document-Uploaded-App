"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/lib/theme/use-theme";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  // System-preference dark/light can only be read via
  // window.matchMedia, which doesn't exist during SSR. Keep this
  // false until mounted so the server render and the client's first
  // render agree (both "false"/default icon), then correct it in an
  // effect -- reading it directly in the render body (even behind a
  // `typeof window` check) mismatches, because the *client's own*
  // first render already has `window` and would compute `true` before
  // React has a chance to reconcile against the server's "false".
  const [systemPrefersDark, setSystemPrefersDark] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    // This IS the "subscribe to an external system, then sync on
    // change" pattern the lint rule's own guidance calls out as fine:
    // the setState below is the first sync before the change listener
    // takes over, and window.matchMedia genuinely cannot be read
    // during render (no window on the server).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSystemPrefersDark(mql.matches);
    const handler = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  const isDark = theme === "dark" || (theme === "system" && systemPrefersDark);

  function toggle() {
    setTheme(isDark ? "light" : "dark");
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex shrink-0 items-center justify-center rounded-xl border border-zinc-200/80 bg-white/70 p-2 text-zinc-500 shadow-sm backdrop-blur-sm transition-colors hover:bg-zinc-100 dark:border-zinc-700/80 dark:bg-zinc-900/60 dark:text-zinc-300 dark:hover:bg-zinc-800"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path
            fillRule="evenodd"
            d="M10 2a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 2zM10 15a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 15zM10 7a3 3 0 100 6 3 3 0 000-6zM15.657 5.404a.75.75 0 10-1.06-1.06l-1.061 1.06a.75.75 0 001.06 1.06l1.06-1.06zM6.464 14.596a.75.75 0 10-1.06-1.06l-1.06 1.06a.75.75 0 001.06 1.06l1.06-1.06zM18 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5A.75.75 0 0118 10zM5 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5A.75.75 0 015 10zM15.657 14.596a.75.75 0 01-1.06 1.06l-1.061-1.06a.75.75 0 111.06-1.06l1.06 1.06zM6.464 5.404a.75.75 0 01-1.06 1.06l-1.06-1.06a.75.75 0 111.06-1.06l1.06 1.06z"
            clipRule="evenodd"
          />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path
            fillRule="evenodd"
            d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"
            clipRule="evenodd"
          />
        </svg>
      )}
    </button>
  );
}
