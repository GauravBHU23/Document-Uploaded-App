"use client";

import { AnimatePresence, motion } from "framer-motion";

type IdleWarningModalProps = {
  secondsLeft: number | null;
  onStaySignedIn: () => void;
};

export default function IdleWarningModal({ secondsLeft, onStaySignedIn }: IdleWarningModalProps) {
  const visible = secondsLeft !== null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 340, damping: 30 }}
            className="glass-surface w-full max-w-sm rounded-2xl border border-zinc-200/80 p-6 text-center shadow-2xl dark:border-zinc-800/80"
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-500 dark:bg-amber-950/40 dark:text-amber-400">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7">
                <path
                  fillRule="evenodd"
                  d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 9a.75.75 0 00-1.5 0v4.5c0 .414.336.75.75.75h3a.75.75 0 000-1.5h-2.25V9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <h2 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Still there?
            </h2>
            <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
              You&apos;ll be signed out in{" "}
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">{secondsLeft}s</span>{" "}
              due to inactivity, to keep this account secure.
            </p>
            <button
              type="button"
              onClick={onStaySignedIn}
              className="accent-gradient mt-5 w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 transition-opacity hover:opacity-95"
            >
              Stay signed in
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
