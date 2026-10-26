"use client";

import { motion } from "framer-motion";
import ThemeToggle from "@/components/ThemeToggle";

/**
 * Header/footer for the app's public (no-login) pages -- the PIN
 * self-access page (/view/[id]) and the PIN-free upload link
 * (/u/[token]). Both are reached from outside the app (a shared link,
 * not navigation inside DocVault), so without proper chrome they
 * render as a single bare card floating on an empty gradient with
 * nothing saying what app it is or that it's safe to use -- which
 * reads as unfinished/untrustworthy to someone opening a link they
 * were sent cold. Mirrors AppHeader's card styling (glass-surface,
 * border, shadow) for visual consistency with the logged-in app, but
 * deliberately carries none of its authenticated-only pieces
 * (session badge, settings, sign out) since this page has no session.
 */
export default function PublicPageChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="glass-surface sticky top-0 z-20 border-b border-zinc-200/70 px-4 py-3.5 sm:px-6 lg:px-10 2xl:px-16 dark:border-zinc-800/70"
      >
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="accent-gradient flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4.5 w-4.5">
                <path fillRule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0016.5 9h-1.875a1.875 1.875 0 01-1.875-1.875V5.25A3.75 3.75 0 009 1.5H5.625zM7.5 15a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 017.5 15zm.75 2.25a.75.75 0 000 1.5h7.5a.75.75 0 000-1.5h-7.5z" clipRule="evenodd" />
                <path d="M12.971 1.816A5.23 5.23 0 0114.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 013.434 1.279 9.768 9.768 0 00-6.963-6.963z" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-semibold text-zinc-900 sm:text-lg dark:text-zinc-50">
                DocVault
              </h1>
              <p className="hidden text-xs text-zinc-500 sm:block dark:text-zinc-400">
                Secure document sharing
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-xl border border-emerald-200/80 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 sm:flex dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
              </svg>
              Private link
            </span>
            <ThemeToggle />
          </div>
        </div>
      </motion.header>

      <div className="flex flex-1 flex-col">{children}</div>

      <footer className="border-t border-zinc-200/70 px-4 py-5 sm:px-6 sm:py-6 lg:px-10 2xl:px-16 dark:border-zinc-800/70">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:gap-4 sm:text-left">
          <div className="flex items-center gap-2.5">
            <div className="accent-gradient flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
                <path fillRule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0016.5 9h-1.875a1.875 1.875 0 01-1.875-1.875V5.25A3.75 3.75 0 009 1.5H5.625zM7.5 15a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 017.5 15zm.75 2.25a.75.75 0 000 1.5h7.5a.75.75 0 000-1.5h-7.5z" clipRule="evenodd" />
                <path d="M12.971 1.816A5.23 5.23 0 0114.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 013.434 1.279 9.768 9.768 0 00-6.963-6.963z" />
              </svg>
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">DocVault</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Document workspace</p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-1 sm:items-end">
            <p className="flex max-w-[22rem] items-center justify-center gap-1.5 text-xs font-medium text-zinc-600 sm:justify-end dark:text-zinc-300">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 shrink-0 text-emerald-500">
                <path fillRule="evenodd" d="M10 1c-1.716 0-3.408.106-5.07.31C3.806 1.45 3 2.414 3 3.517V18a1 1 0 001.447.894L10 16.118l5.553 2.776A1 1 0 0017 18V3.517c0-1.103-.806-2.068-1.93-2.207A41.403 41.403 0 0010 1z" clipRule="evenodd" />
              </svg>
              Private link — only works for the person it was shared with
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              © {new Date().getFullYear()} DocVault. All uploads stay within the owner&apos;s private workspace.
            </p>
          </div>
        </div>

        <div className="mx-auto mt-4 w-full max-w-7xl border-t border-zinc-200/70 pt-3 text-center sm:mt-5 sm:pt-4 dark:border-zinc-800/70">
          <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            Developed by <span className="font-medium text-zinc-700 dark:text-zinc-200">Gaurav Kumar</span>
            <br className="sm:hidden" />
            <span className="hidden sm:inline"> — </span>
            Department of Computer Science, IIT BHU Varanasi
          </p>
        </div>
      </footer>
    </div>
  );
}
