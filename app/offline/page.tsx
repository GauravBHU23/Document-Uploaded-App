"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function OfflinePage() {
  const [retrying, setRetrying] = useState(false);
  const [backOnline, setBackOnline] = useState(false);

  useEffect(() => {
    function handleOnline() {
      setBackOnline(true);
      setTimeout(() => window.location.reload(), 900);
    }
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  function handleRetry() {
    setRetrying(true);
    setTimeout(() => window.location.reload(), 500);
  }

  return (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass-surface relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-zinc-200/70 p-8 text-center shadow-xl dark:border-zinc-800/70"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-indigo-500/10 blur-3xl"
        />

        <AnimatePresence mode="wait">
          {backOnline ? (
            <motion.div
              key="online"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative"
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-400">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8">
                  <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                </svg>
              </div>
              <h1 className="relative mt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Back online!
              </h1>
              <p className="relative mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
                Reconnecting you now...
              </p>
            </motion.div>
          ) : (
            <motion.div key="offline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative">
              <div className="relative mx-auto flex h-16 w-16 items-center justify-center">
                <motion.span
                  aria-hidden
                  className="absolute inset-0 rounded-full border-2 border-zinc-300 dark:border-zinc-700"
                  animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
                />
                <motion.span
                  aria-hidden
                  className="absolute inset-0 rounded-full border-2 border-zinc-300 dark:border-zinc-700"
                  animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut", delay: 0.6 }}
                />
                <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400 dark:bg-zinc-900 dark:text-zinc-500">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8">
                    <path d="M12.75 19.5v-.75a.75.75 0 00-1.5 0v.75a.75.75 0 001.5 0zM3.53 2.47a.75.75 0 00-1.06 1.06l18 18a.75.75 0 101.06-1.06l-2.72-2.72a13.44 13.44 0 003.465-2.73.75.75 0 000-.96 14.942 14.942 0 00-3.912-3.355.75.75 0 10-.75 1.3 13.44 13.44 0 013.08 2.555c-.91.98-1.994 1.788-3.19 2.395l-1.616-1.616a3 3 0 00-4.045-4.045L9.18 9.18a.75.75 0 00-1.137-.976L3.53 2.47zM12 6.75c.653 0 1.287.074 1.897.213l-1.61 1.61a3.002 3.002 0 00-2.714 2.714l-2.108 2.108A13.46 13.46 0 015.06 11a13.46 13.46 0 016.94-4.25z" />
                  </svg>
                </div>
              </div>

              <h1 className="relative mt-5 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                You&apos;re offline
              </h1>
              <p className="relative mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
                No internet connection right now. Your documents are safe and stored
                securely online — they&apos;ll be here the moment you&apos;re back.
              </p>

              <div className="relative mt-4 flex items-center justify-center gap-1.5 text-xs font-medium text-zinc-400 dark:text-zinc-500">
                <motion.span
                  aria-hidden
                  className="h-1.5 w-1.5 rounded-full bg-amber-400"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.4, repeat: Infinity }}
                />
                Watching for a connection...
              </div>

              <button
                type="button"
                onClick={handleRetry}
                disabled={retrying}
                className="accent-gradient relative mt-6 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-indigo-600/20 transition-opacity hover:opacity-95 disabled:opacity-70"
              >
                {retrying ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Checking...
                  </>
                ) : (
                  "Try again"
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
