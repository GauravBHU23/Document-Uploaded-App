"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { usePendingPinResets, useDismissPinReset } from "@/lib/documents/use-realtime-documents";

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/**
 * Persistent backup for PIN-reset notifications -- usePinResetNotifier
 * (use-realtime-documents.ts) already shows a live toast the instant a
 * reset happens, but a toast is easy to miss if the admin wasn't
 * looking at the app right then. Every pending delivery stays queryable
 * here (and visible via this bell's badge) until the admin explicitly
 * dismisses it, so a reset request can never go unnoticed just because
 * nobody was on screen at that exact moment.
 */
export default function PinResetBell() {
  const [open, setOpen] = useState(false);
  const { data: deliveries } = usePendingPinResets();
  const dismiss = useDismissPinReset();

  const count = deliveries?.length ?? 0;

  function handleCopy(pin: string) {
    navigator.clipboard?.writeText(pin).catch(() => {});
    toast.success("PIN copied");
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex shrink-0 items-center justify-center rounded-xl border border-zinc-200/80 bg-white/70 p-2 text-zinc-500 shadow-sm backdrop-blur-sm transition-colors hover:bg-zinc-100 dark:border-zinc-700/80 dark:bg-zinc-900/60 dark:text-zinc-400 dark:hover:bg-zinc-800"
        aria-label="PIN reset requests"
        title="PIN reset requests"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
          <path fillRule="evenodd" d="M5.25 9a6.75 6.75 0 0113.5 0v.75c0 2.123.8 4.057 2.118 5.52a.75.75 0 01-.297 1.206c-1.544.57-3.16.99-4.831 1.243a3.75 3.75 0 11-7.48 0 24.585 24.585 0 01-4.831-1.244.75.75 0 01-.298-1.205A8.217 8.217 0 005.25 9.75V9zm4.502 8.9a2.25 2.25 0 104.496 0 25.057 25.057 0 01-4.496 0z" clipRule="evenodd" />
        </svg>
        {count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {count}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="glass-surface absolute right-0 top-full z-20 mt-2 w-80 rounded-2xl border border-zinc-200/70 p-2 shadow-xl dark:border-zinc-800/70"
            >
              <p className="px-2.5 py-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                PIN reset requests
              </p>
              {count === 0 ? (
                <p className="px-2.5 py-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
                  Nothing pending.
                </p>
              ) : (
                <ul className="flex max-h-80 flex-col gap-1 overflow-y-auto">
                  {deliveries?.map((d) => (
                    <li
                      key={d.id}
                      className="flex items-center gap-2 rounded-xl p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900/60"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                          {d.people?.full_name ?? "Someone"}
                        </p>
                        <p className="font-mono text-base tracking-wider text-indigo-600 dark:text-indigo-400">
                          {d.plaintext_pin}
                        </p>
                        <p className="text-xs text-zinc-400 dark:text-zinc-500">{timeAgo(d.created_at)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(d.plaintext_pin)}
                        className="shrink-0 rounded-lg border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        Copy
                      </button>
                      <button
                        type="button"
                        onClick={() => dismiss.mutate(d.id)}
                        className="shrink-0 rounded-lg p-1 text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/40"
                        aria-label="Dismiss"
                        title="Dismiss"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                          <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
