"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export const DEFAULT_IDLE_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes
export const IDLE_TIMEOUT_OPTIONS_MINUTES = [10, 20, 30, 60] as const;
const WARNING_BEFORE_MS = 60 * 1000; // show warning with 60s left
const STORAGE_KEY = "docvault-last-activity";
const TIMEOUT_STORAGE_KEY = "docvault-idle-timeout-minutes";
const ACTIVITY_EVENTS = ["mousedown", "keydown", "touchstart", "wheel", "scroll"] as const;
// Fired whenever the configured timeout changes, in ADDITION to the
// browser's own "storage" event -- "storage" only reaches OTHER tabs,
// never the tab that made the write, so Settings changing the value
// in its own tab would otherwise not take effect until that tab next
// reloads. This custom event covers the same-tab case; the "storage"
// listener below still covers other tabs.
const TIMEOUT_CHANGE_EVENT = "docvault-idle-timeout-change";

/** Reads the admin's chosen auto-logout duration (Settings page), or
 * DEFAULT_IDLE_TIMEOUT_MS if they've never changed it. Per-device by
 * design (localStorage, not a DB column) -- this is a UI convenience
 * preference, not account security state, so there's no need for a
 * migration or to sync it across devices. */
export function getIdleTimeoutMs(): number {
  try {
    const raw = localStorage.getItem(TIMEOUT_STORAGE_KEY);
    const minutes = raw ? Number(raw) : NaN;
    if (Number.isFinite(minutes) && minutes > 0) return minutes * 60 * 1000;
  } catch {
    // Falls through to the default below.
  }
  return DEFAULT_IDLE_TIMEOUT_MS;
}

export function setIdleTimeoutMinutes(minutes: number) {
  try {
    localStorage.setItem(TIMEOUT_STORAGE_KEY, String(minutes));
  } catch {
    // Best-effort; the default just applies next time.
  }
  window.dispatchEvent(new Event(TIMEOUT_CHANGE_EVENT));
}

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

/** Clears the stored activity timestamp. Must be called on sign-out
 * (idle or manual) -- otherwise the next login reads a timestamp
 * that's already far in the past (from the session that just got
 * logged out), computeRemainingMs() returns <= 0 immediately, and the
 * very first 1s tick logs the admin straight back out again before
 * they can even click anything to record fresh activity. */
export function clearLastActivity() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Best-effort; nothing to fall back to.
  }
}

/** How much idle time is left right now, based on the stored
 * last-activity timestamp -- NOT reset just because this function
 * (or the component calling it) happens to run again, e.g. on a page
 * refresh. Only recordActivity() is allowed to push the timestamp
 * forward. */
function computeRemainingMs(timeoutMs: number): number {
  const last = readLastActivity();
  if (last === null) return timeoutMs;
  return timeoutMs - (Date.now() - last);
}

/**
 * Logs the admin out after the configured idle timeout (default 20
 * minutes, changeable in Settings) of no activity (mouse,
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
  const [remainingMs, setRemainingMs] = useState(DEFAULT_IDLE_TIMEOUT_MS);
  // Mirrors timeoutMsRef for display (SessionBadge's "out of N
  // minutes" tooltip) -- the ref alone is enough to drive the ticking
  // logic, but reading a ref during render doesn't trigger a re-render
  // when it changes, so this state exists purely so the UI updates
  // when the admin changes their timeout preference mid-session.
  const [idleTimeoutMs, setIdleTimeoutMsState] = useState(DEFAULT_IDLE_TIMEOUT_MS);
  // The configured timeout itself can change mid-session (Settings
  // page, this tab or another) -- tracked in a ref rather than state
  // so the 1s interval below always reads the current value without
  // needing to be torn down and restarted every time it changes.
  const timeoutMsRef = useRef(DEFAULT_IDLE_TIMEOUT_MS);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Guards against the 1s interval firing handleLogout more than once:
  // signOut() is async, so without this, every tick that elapses while
  // the first sign-out is still in flight sees computeRemainingMs()
  // still <= 0 and fires a second (third, fourth...) overlapping
  // signOut() + router.push(), which is where the flaky "logs out
  // twice" / "timer doesn't behave" symptoms came from.
  const loggingOutRef = useRef(false);

  const secondsLeft = remainingMs <= WARNING_BEFORE_MS ? Math.max(0, Math.ceil(remainingMs / 1000)) : null;

  const handleLogout = useCallback(async () => {
    if (loggingOutRef.current) return;
    loggingOutRef.current = true;
    const supabase = createClient();
    await supabase.auth.signOut();
    clearLastActivity();
    router.push("/login?reason=idle");
    router.refresh();
  }, [router]);

  const recordActivity = useCallback(() => {
    if (loggingOutRef.current) return;
    writeLastActivity(Date.now());
    setRemainingMs(timeoutMsRef.current);
  }, []);

  useEffect(() => {
    timeoutMsRef.current = getIdleTimeoutMs();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIdleTimeoutMsState(timeoutMsRef.current);

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
    setRemainingMs(computeRemainingMs(timeoutMsRef.current));

    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, recordActivity, { passive: true }));

    // The admin changed their timeout preference in Settings (this tab
    // or another) -- pick it up immediately rather than only on next
    // login, and recompute what's left under the new duration using
    // the SAME last-activity timestamp (changing the duration
    // shouldn't itself count as activity).
    function applyTimeoutChange() {
      timeoutMsRef.current = getIdleTimeoutMs();
      setIdleTimeoutMsState(timeoutMsRef.current);
      setRemainingMs(computeRemainingMs(timeoutMsRef.current));
    }

    function handleStorage(event: StorageEvent) {
      if (event.key === STORAGE_KEY) {
        setRemainingMs(computeRemainingMs(timeoutMsRef.current));
      } else if (event.key === TIMEOUT_STORAGE_KEY) {
        applyTimeoutChange();
      }
    }
    window.addEventListener("storage", handleStorage);
    window.addEventListener(TIMEOUT_CHANGE_EVENT, applyTimeoutChange);

    tickRef.current = setInterval(() => {
      const remaining = computeRemainingMs(timeoutMsRef.current);
      if (remaining <= 0) {
        handleLogout();
        return;
      }
      setRemainingMs(remaining);
    }, 1000);

    return () => {
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, recordActivity));
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(TIMEOUT_CHANGE_EVENT, applyTimeoutChange);
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [handleLogout, recordActivity]);

  return { secondsLeft, remainingMs, staySignedIn: recordActivity, idleTimeoutMs };
}
