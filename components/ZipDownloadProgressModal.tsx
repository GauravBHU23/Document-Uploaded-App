"use client";

import { AnimatePresence, motion } from "framer-motion";

type ZipDownloadProgressModalProps = {
  open: boolean;
  done: number;
  total: number;
  /** What happens after every file is fetched -- "building the zip"
   * by default, since this started as zip-only; the person-folder page
   * also reuses this modal for merging into one PDF, which needed
   * different wording to not say "zip" while actually merging a PDF. */
  actionLabel?: string;
};

/** Shows live 1–100% progress while downloadDocumentsAsZip fetches
 * every file and bundles them -- without this, selecting "Download
 * all" on a folder with many documents just sits there with no
 * feedback for however long the fetch+zip takes, which reads as the
 * app having frozen. No close button: this isn't dismissible mid-zip,
 * since there's nothing useful to do until it finishes (it already
 * tolerates individual file failures internally). */
export default function ZipDownloadProgressModal({ open, done, total, actionLabel = "building the zip" }: ZipDownloadProgressModalProps) {
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label="Preparing download"
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 340, damping: 30 }}
            className="glass-surface w-full max-w-sm rounded-2xl border border-zinc-200/80 p-6 text-center shadow-2xl dark:border-zinc-800/80"
          >
            <div className="accent-gradient mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-md shadow-indigo-600/20">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7">
                <path fillRule="evenodd" d="M12 2.25a.75.75 0 01.75.75v11.69l3.22-3.22a.75.75 0 111.06 1.06l-4.5 4.5a.75.75 0 01-1.06 0l-4.5-4.5a.75.75 0 111.06-1.06l3.22 3.22V3a.75.75 0 01.75-.75zm-9 15a.75.75 0 01.75.75v2.25a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5V18a.75.75 0 011.5 0v2.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V18a.75.75 0 01.75-.75z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Preparing your download
            </h2>
            <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
              {done} of {total} file{total === 1 ? "" : "s"} fetched — {actionLabel}...
            </p>

            <div className="mt-5 h-2.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
              <motion.div
                className="accent-gradient h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${percent}%` }}
                transition={{ ease: "easeOut", duration: 0.25 }}
              />
            </div>
            <p className="mt-2 text-sm font-semibold tabular-nums text-indigo-600 dark:text-indigo-400">
              {percent}%
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
