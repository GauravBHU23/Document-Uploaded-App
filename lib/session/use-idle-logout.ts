"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
const WARNING_BEFORE_MS = 60 * 1000; // show warning with 60s left
const STORAGE_KEY = "docvault-last-activity";
const ACTIVITY_EVENTS = ["mousedown", "keydown", "touchstart", "wheel", "scroll"] as const;

function readLastActivity(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) ? parsed : Date.now();
  } catch {
    return Date.now();
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

/**
 * Logs the admin out after IDLE_TIMEOUT_MS of no activity (mouse,
 * keyboard, touch, scroll), with a warning shown for the final
 * WARNING_BEFORE_MS. Activity is shared across tabs via localStorage
 * so switching tabs doesn't trigger a logout while the admin is still
 * actively using another tab of the same app.
 */
export function useIdleLogout() {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleLogout = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login?reason=idle");
    router.refresh();
  }, [router]);

  const recordActivity = useCallback(() => {
    writeLastActivity(Date.now());
    setSecondsLeft(null);
  }, []);

  useEffect(() => {
    writeLastActivity(Date.now());

    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, recordActivity, { passive: true }));

    function handleStorage(event: StorageEvent) {
      if (event.key === STORAGE_KEY) setSecondsLeft(null);
    }
    window.addEventListener("storage", handleStorage);

    tickRef.current = setInterval(() => {
      const last = readLastActivity();
      const elapsed = Date.now() - last;
      const remaining = IDLE_TIMEOUT_MS - elapsed;

      if (remaining <= 0) {
        handleLogout();
        return;
      }

      if (remaining <= WARNING_BEFORE_MS) {
        setSecondsLeft(Math.ceil(remaining / 1000));
      } else {
        setSecondsLeft(null);
      }
    }, 1000);

    return () => {
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, recordActivity));
      window.removeEventListener("storage", handleStorage);
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [handleLogout, recordActivity]);

  return { secondsLeft, staySignedIn: recordActivity, idleTimeoutMs: IDLE_TIMEOUT_MS };
}
