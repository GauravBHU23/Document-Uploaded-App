"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

/**
 * Catches the case the service worker's offline fallback (public/sw.js
 * -> /offline) can't: the app is already open on screen and the
 * connection drops mid-session, with no navigation happening for the
 * worker's fetch handler to intercept. Without this, that moment is
 * silent -- data fetches just start failing one by one -- or, worse,
 * if the admin then hits refresh, the browser's own native "no
 * internet" interstitial (always a plain white page, outside this
 * app's control) flashes before anything of ours can render.
 *
 * This listens for the browser's own online/offline events directly
 * (not navigator.onLine polling) and covers the full viewport the
 * instant the connection drops, so there's never a bare/white moment
 * -- then dismisses itself the instant the connection is back,
 * without needing a reload (React Query's own refetch-on-reconnect
 * picks up stale data once the overlay clears).
 */
export default function OfflineOverlay() {
  // Starts false to match the server render (navigator doesn't exist
  // during SSR); the effect below corrects it immediately post-mount
  // if the page happened to load while already offline, same
  // hydration-safe pattern used for every other browser-only value in
  // this app (theme, idle timer, etc.).
  const [offline, setOffline] = useState(false);
  const [justReconnected, setJustReconnected] = useState(false);

  useEffect(() => {
    function handleOffline() {
      setOffline(true);
      setJustReconnected(false);
    }
    function handleOnline() {
      setJustReconnected(true);
      setTimeout(() => setOffline(false), 1100);
    }

    if (!navigator.onLine) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOffline(true);
    }

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  return (
    <AnimatePresence>
      {offline && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="alert"
          aria-live="assertive"
          className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden bg-[#0b0b14] px-4"
        >
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <motion.div
              className="absolute -right-24 -top-24 h-[36rem] w-[36rem] rounded-full bg-indigo-600/25 blur-[120px]"
              animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute -bottom-32 -left-16 h-[34rem] w-[34rem] rounded-full bg-fuchsia-600/20 blur-[120px]"
              animate={{ scale: [1, 1.12, 1], opacity: [0.4, 0.7, 0.4] }}
              transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="relative z-10 w-full max-w-sm rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center shadow-2xl backdrop-blur-xl"
          >
            <AnimatePresence mode="wait">
              {justReconnected ? (
                <motion.div key="reconnected" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8">
                      <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h2 className="mt-5 text-lg font-semibold text-white">Back online</h2>
                  <p className="mt-1.5 text-sm text-white/60">Picking up right where you left off.</p>
                </motion.div>
              ) : (
                <motion.div key="offline" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="relative mx-auto flex h-16 w-16 items-center justify-center">
                    <motion.span
                      aria-hidden
                      className="absolute inset-0 rounded-full border-2 border-white/20"
                      animate={{ scale: [1, 1.7], opacity: [0.7, 0] }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
                    />
                    <motion.span
                      aria-hidden
                      className="absolute inset-0 rounded-full border-2 border-white/20"
                      animate={{ scale: [1, 1.7], opacity: [0.7, 0] }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut", delay: 0.6 }}
                    />
                    <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-white/70">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8">
                        <path d="M12.75 19.5v-.75a.75.75 0 00-1.5 0v.75a.75.75 0 001.5 0zM3.53 2.47a.75.75 0 00-1.06 1.06l18 18a.75.75 0 101.06-1.06l-2.72-2.72a13.44 13.44 0 003.465-2.73.75.75 0 000-.96 14.942 14.942 0 00-3.912-3.355.75.75 0 10-.75 1.3 13.44 13.44 0 013.08 2.555c-.91.98-1.994 1.788-3.19 2.395l-1.616-1.616a3 3 0 00-4.045-4.045L9.18 9.18a.75.75 0 00-1.137-.976L3.53 2.47zM12 6.75c.653 0 1.287.074 1.897.213l-1.61 1.61a3.002 3.002 0 00-2.714 2.714l-2.108 2.108A13.46 13.46 0 015.06 11a13.46 13.46 0 016.94-4.25z" />
                      </svg>
                    </div>
                  </div>

                  <h2 className="mt-5 text-lg font-semibold text-white">You&apos;re offline</h2>
                  <p className="mt-1.5 text-sm text-white/60">
                    No internet connection right now. Your documents are safe — everything will sync the moment you&apos;re back.
                  </p>

                  <div className="mt-5 flex items-center justify-center gap-1.5 text-xs font-medium text-white/50">
                    <motion.span
                      aria-hidden
                      className="h-1.5 w-1.5 rounded-full bg-amber-400"
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 1.4, repeat: Infinity }}
                    />
                    Watching for a connection...
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
