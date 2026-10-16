"use client";

type SessionBadgeProps = {
  idleTimeoutMs: number;
};

export default function SessionBadge({ idleTimeoutMs }: SessionBadgeProps) {
  const minutes = Math.round(idleTimeoutMs / 60_000);

  return (
    <div
      className="hidden shrink-0 items-center gap-1.5 rounded-xl border border-zinc-200/80 bg-white/70 px-3 py-2 text-xs font-medium text-zinc-500 shadow-sm backdrop-blur-sm sm:flex dark:border-zinc-700/80 dark:bg-zinc-900/60 dark:text-zinc-400"
      title={`For security, you'll be signed out automatically after ${minutes} minutes of inactivity.`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 text-emerald-500">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clipRule="evenodd" />
      </svg>
      <span>Session active</span>
    </div>
  );
}
