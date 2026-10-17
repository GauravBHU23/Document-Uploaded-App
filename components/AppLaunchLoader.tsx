"use client";

import { useEffect, useState } from "react";

/**
 * Covers the brief gap between the browser painting the raw HTML
 * (dark background, no visible content yet) and React finishing
 * hydration -- most noticeable on a cold PWA launch from the home
 * screen, where there's no previous page to show while JS boots.
 * Without this the screen reads as a blank/frozen flash for a beat;
 * this fills it with the same branded mark used everywhere else in
 * the app instead of nothing.
 *
 * Rendered directly in the server HTML (not behind a client-only
 * guard), so it's already on screen at first paint with zero JS
 * required -- the useEffect below is only what removes it once React
 * has taken over, not what shows it.
 */
export default function AppLaunchLoader() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHidden(true);
  }, []);

  if (hidden) return null;

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[300] flex items-center justify-center bg-[#0b0b14]"
    >
      <div className="flex flex-col items-center gap-4">
        <div className="accent-gradient flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-lg shadow-indigo-600/30">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7">
            <path fillRule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0016.5 9h-1.875a1.875 1.875 0 01-1.875-1.875V5.25A3.75 3.75 0 009 1.5H5.625zM7.5 15a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 017.5 15zm.75 2.25a.75.75 0 000 1.5h7.5a.75.75 0 000-1.5h-7.5z" clipRule="evenodd" />
            <path d="M12.971 1.816A5.23 5.23 0 0114.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 013.434 1.279 9.768 9.768 0 00-6.963-6.963z" />
          </svg>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400" style={{ animationDelay: "0ms" }} />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400" style={{ animationDelay: "150ms" }} />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}
