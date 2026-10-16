"use client";

import { motion } from "framer-motion";

export default function OfflinePage() {
  return (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass-surface relative z-10 w-full max-w-sm rounded-2xl border border-zinc-200/70 p-8 text-center shadow-xl dark:border-zinc-800/70"
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400 dark:bg-zinc-900 dark:text-zinc-500">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7">
            <path d="M12.75 19.5v-.75a.75.75 0 00-1.5 0v.75a.75.75 0 001.5 0zM3.53 2.47a.75.75 0 00-1.06 1.06l18 18a.75.75 0 101.06-1.06l-2.72-2.72a13.44 13.44 0 003.465-2.73.75.75 0 000-.96 14.942 14.942 0 00-3.912-3.355.75.75 0 10-.75 1.3 13.44 13.44 0 013.08 2.555c-.91.98-1.994 1.788-3.19 2.395l-1.616-1.616a3 3 0 00-4.045-4.045L9.18 9.18a.75.75 0 00-1.137-.976L3.53 2.47zM12 6.75c.653 0 1.287.074 1.897.213l-1.61 1.61a3.002 3.002 0 00-2.714 2.714l-2.108 2.108A13.46 13.46 0 015.06 11a13.46 13.46 0 016.94-4.25z" />
          </svg>
        </div>
        <h1 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          You&apos;re offline
        </h1>
        <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
          No internet connection. Your documents are stored securely online and
          will be available again once you&apos;re back online.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="accent-gradient mt-6 w-full rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-indigo-600/20 transition-opacity hover:opacity-95"
        >
          Try again
        </button>
      </motion.div>
    </div>
  );
}
