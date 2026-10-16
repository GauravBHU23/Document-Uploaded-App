"use client";

type SessionBadgeProps = {
  remainingMs: number;
  idleTimeoutMs: number;
};

function formatMMSS(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export default function SessionBadge({ remainingMs, idleTimeoutMs }: SessionBadgeProps) {
  const totalMinutes = Math.round(idleTimeoutMs / 60_000);
  const isLow = remainingMs <= 2 * 60 * 1000; // last 2 minutes

  return (
    <div
      className={`hidden shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium shadow-sm backdrop-blur-sm transition-colors sm:flex ${
        isLow
          ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
          : "border-zinc-200/80 bg-white/70 text-zinc-500 dark:border-zinc-700/80 dark:bg-zinc-900/60 dark:text-zinc-400"
      }`}
      title={`Auto sign-out after ${totalMinutes} minutes of inactivity. Click, type, or scroll to stay signed in.`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className={`h-3.5 w-3.5 ${isLow ? "text-amber-500" : "text-emerald-500"}`}
      >
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clipRule="evenodd" />
      </svg>
      <span className="tabular-nums">{formatMMSS(remainingMs)}</span>
    </div>
  );
}
