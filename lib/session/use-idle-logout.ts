"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export const IDLE_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes
const WARNING_BEFORE_MS = 60 * 1000; // show warning with 60s left
const STORAGE_KEY = "docvault-last-activity";
const ACTIVITY_EVENTS = ["mousedown", "keydown", "touchstart", "wheel", "scroll"] as const;

function readLastActivity(): number | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeLastActivity(ts: number) {
  try {
    localStorage.setItem(STORAGE_KEY, String(ts));
  } catch {
    // Best-effort; if storage is unavailable the timer still works
    // per-tab, it just won't sync across tabs.
  }
}

/** How much idle time is left right now, based on the stored
 * last-activity timestamp -- NOT reset just because this function
 * (or the component calling it) happens to run again, e.g. on a page
 * refresh. Only recordActivity() is allowed to push the timestamp
 * forward. */
function computeRemainingMs(): number {
  const last = readLastActivity();
  if (last === null) return IDLE_TIMEOUT_MS;
  return IDLE_TIMEOUT_MS - (Date.now() - last);
}

/**
 * Logs the admin out after IDLE_TIMEOUT_MS of no activity (mouse,
 * keyboard, touch, scroll), with a warning shown for the final
 * WARNING_BEFORE_MS. Activity is shared across tabs via localStorage
 * so switching tabs doesn't trigger a logout while the admin is still
 * actively using another tab of the same app, and -- just as
 * importantly -- so a page refresh/remount does NOT reset the clock:
 * the stored timestamp is what's authoritative, not "the component
 * just mounted."
 */
export function useIdleLogout() {
  const router = useRouter();
  // Always starts at the full timeout, identically on the server and
  // on the client's first render -- computeRemainingMs() reads
  // localStorage/Date.now(), which can only be known client-side and
  // is already nonzero-elapsed for a returning tab, so calling it in
  // the initializer (even behind a typeof-window guard) mismatches
  // the server's render for the same reason every other "read browser
  // state in useState(() => ...)" bug in this codebase did. The real
  // value is reconciled by the effect below immediately after mount.
  const [remainingMs, setRemainingMs] = useState(IDLE_TIMEOUT_MS);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const secondsLeft = remainingMs <= WARNING_BEFORE_MS ? Math.max(0, Math.ceil(remainingMs / 1000)) : null;

  const handleLogout = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login?reason=idle");
    router.refresh();
  }, [router]);

  const recordActivity = useCallback(() => {
    writeLastActivity(Date.now());
    setRemainingMs(IDLE_TIMEOUT_MS);
  }, []);

  useEffect(() => {
    // Seed storage only on a genuinely first-ever load (nothing
    // stored yet) -- a refresh or remount must never push the
    // timestamp forward on its own.
    if (readLastActivity() === null) {
      writeLastActivity(Date.now());
    }

    // Reconcile the real remaining time right after mount, instead of
    // leaving the badge showing the full timeout for up to 1s until
    // the first interval tick below corrects it. This is the
    // post-hydration sync from browser-only state (storage + wall
    // clock) that the lazy initializer above deliberately avoids doing
    // during render, to not mismatch the server.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRemainingMs(computeRemainingMs());

    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, recordActivity, { passive: true }));

    function handleStorage(event: StorageEvent) {
      if (event.key === STORAGE_KEY) setRemainingMs(computeRemainingMs());
    }
    window.addEventListener("storage", handleStorage);

    tickRef.current = setInterval(() => {
      const remaining = computeRemainingMs();
      if (remaining <= 0) {
        handleLogout();
        return;
      }
      setRemainingMs(remaining);
    }, 1000);

    return () => {
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, recordActivity));
      window.removeEventListener("storage", handleStorage);
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [handleLogout, recordActivity]);

  return { secondsLeft, remainingMs, staySignedIn: recordActivity, idleTimeoutMs: IDLE_TIMEOUT_MS };
}
