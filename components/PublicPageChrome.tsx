"use client";

/**
 * Minimal header/footer for the app's public (no-login) pages --
 * the PIN self-access page (/view/[id]) and the PIN-free upload link
 * (/u/[token]). Both are reached from outside the app (a shared link,
 * not navigation inside DocVault), so without this they render as a
 * single bare card on an empty gradient background with nothing
 * saying what app it is or that it's safe to use -- which reads as
 * unfinished/untrustworthy to someone opening a link they were sent.
 */
export default function PublicPageChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="px-4 py-4 sm:px-6">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-2">
          <div className="accent-gradient flex h-8 w-8 items-center justify-center rounded-lg text-white">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4.5 w-4.5">
              <path fillRule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0016.5 9h-1.875a1.875 1.875 0 01-1.875-1.875V5.25A3.75 3.75 0 009 1.5H5.625zM7.5 15a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 017.5 15zm.75 2.25a.75.75 0 000 1.5h7.5a.75.75 0 000-1.5h-7.5z" clipRule="evenodd" />
              <path d="M12.971 1.816A5.23 5.23 0 0114.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 013.434 1.279 9.768 9.768 0 00-6.963-6.963z" />
            </svg>
          </div>
          <span className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            DocVault
          </span>
        </div>
      </header>

      <div className="flex flex-1 flex-col">{children}</div>

      <footer className="px-4 py-5 sm:px-6">
        <p className="mx-auto flex w-full max-w-7xl items-center justify-center gap-1.5 text-center text-xs text-zinc-500 dark:text-zinc-400">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 shrink-0">
            <path fillRule="evenodd" d="M10 1c-1.716 0-3.408.106-5.07.31C3.806 1.45 3 2.414 3 3.517V18a1 1 0 001.447.894L10 16.118l5.553 2.776A1 1 0 0017 18V3.517c0-1.103-.806-2.068-1.93-2.207A41.403 41.403 0 0010 1z" clipRule="evenodd" />
          </svg>
          Private link — only works for the person it was shared with
        </p>
      </footer>
    </div>
  );
}
