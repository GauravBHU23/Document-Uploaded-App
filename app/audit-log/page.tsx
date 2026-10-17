"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import AppHeader from "@/components/AppHeader";
import { useConfirm } from "@/components/ConfirmDialogProvider";
import {
  useAuditLog,
  useDeleteAuditLogEntry,
  PAGE_SIZE,
  type AuditAction,
  type AuditLogEntry,
} from "@/lib/audit-log/hooks";

const ACTION_META: Record<
  AuditAction,
  { label: string; icon: "plus" | "trash" | "restore" | "pencil" | "x"; color: string }
> = {
  person_created: { label: "created", icon: "plus", color: "emerald" },
  person_updated: { label: "updated", icon: "pencil", color: "indigo" },
  person_deleted: { label: "deleted person", icon: "x", color: "red" },
  document_uploaded: { label: "uploaded", icon: "plus", color: "emerald" },
  document_trashed: { label: "moved to Trash", icon: "trash", color: "amber" },
  document_restored: { label: "restored", icon: "restore", color: "sky" },
  document_renamed: { label: "renamed", icon: "pencil", color: "indigo" },
  document_permanently_deleted: { label: "permanently deleted", icon: "x", color: "red" },
};

const COLOR_CLASSES: Record<string, string> = {
  emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
  sky: "bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400",
  indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400",
  red: "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400",
};

const ICONS: Record<string, React.ReactNode> = {
  plus: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
    </svg>
  ),
  trash: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path
        fillRule="evenodd"
        d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
        clipRule="evenodd"
      />
    </svg>
  ),
  restore: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 002.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0112.888 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clipRule="evenodd" />
    </svg>
  ),
  pencil: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
    </svg>
  ),
  x: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
    </svg>
  ),
};

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

const PERSON_FIELD_LABEL: Record<string, string> = {
  full_name: "name",
  category: "category",
  date_of_birth: "date of birth",
  notes: "notes",
};

function describeEntry(entry: AuditLogEntry): string {
  const meta = ACTION_META[entry.action];
  if (entry.action === "document_renamed" && entry.metadata) {
    return `renamed "${entry.metadata.from}" to "${entry.metadata.to}"`;
  }
  if (entry.action === "person_updated" && entry.metadata) {
    const changedFields = Object.keys(entry.metadata);

    if (changedFields.length === 1 && changedFields[0] === "full_name") {
      const change = entry.metadata.full_name as { from: string; to: string };
      return `renamed "${change.from}" to "${change.to}"`;
    }

    const fieldLabels = changedFields.map((field) => PERSON_FIELD_LABEL[field] ?? field);
    return `updated ${fieldLabels.join(", ")} for "${entry.entity_label}"`;
  }
  if (entry.entity_type === "document") {
    const who = entry.person_label ? ` (${entry.person_label})` : "";
    return `${meta.label} "${entry.entity_label}"${who}`;
  }
  return `${meta.label} "${entry.entity_label}"`;
}

export default function AuditLogPage() {
  const [page, setPage] = useState(0);
  const { data, isLoading } = useAuditLog(page);
  const deleteEntry = useDeleteAuditLogEntry();
  const confirm = useConfirm();

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  async function handleDelete(entry: AuditLogEntry) {
    const confirmed = await confirm({
      title: "Delete this entry?",
      description: `"${describeEntry(entry)}" will be removed from the audit log. This can't be undone.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!confirmed) return;
    try {
      await deleteEntry.mutateAsync(entry.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete entry");
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title="Audit Log" subtitle="Every create, rename, and delete, with when it happened" backHref="/dashboard" />

      <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10 2xl:px-16">
        <div className="mx-auto w-full max-w-3xl">
          {isLoading && (
            <div className="flex flex-col gap-2.5">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="skeleton-shimmer h-14 rounded-xl border border-zinc-200/70 dark:border-zinc-800/70" />
              ))}
            </div>
          )}

          {!isLoading && data && data.entries.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-14 flex flex-col items-center text-center"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-400 dark:bg-indigo-950/40 dark:text-indigo-400">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8">
                  <path fillRule="evenodd" d="M6.75 2.25A.75.75 0 017.5 3v1.5h9V3A.75.75 0 0118 3v1.5h.75a3 3 0 013 3v11.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V7.5a3 3 0 013-3H6V3a.75.75 0 01.75-.75zm13.5 9a1.5 1.5 0 00-1.5-1.5H5.25a1.5 1.5 0 00-1.5 1.5v7.5a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5v-7.5z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">Nothing logged yet.</p>
              <Link href="/dashboard" className="mt-3 text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400">
                Back to dashboard
              </Link>
            </motion.div>
          )}

          {data && data.entries.length > 0 && (
            <>
              <ul className="flex flex-col gap-2">
                <AnimatePresence initial={false}>
                  {data.entries.map((entry) => {
                    const meta = ACTION_META[entry.action];
                    return (
                      <motion.li
                        key={entry.id}
                        layout
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: 24, transition: { duration: 0.15 } }}
                        className="group flex items-start gap-3 rounded-xl border border-zinc-200/80 bg-white/80 p-3 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-950/60"
                      >
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${COLOR_CLASSES[meta.color]}`}>
                          {ICONS[meta.icon]}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-zinc-700 dark:text-zinc-300">{describeEntry(entry)}</p>
                          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{timeAgo(entry.created_at)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDelete(entry)}
                          disabled={deleteEntry.isPending}
                          className="shrink-0 rounded-lg p-1.5 text-zinc-300 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50 dark:text-zinc-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                          aria-label="Delete this entry"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                            <path
                              fillRule="evenodd"
                              d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ul>

              {totalPages > 1 && (
                <div className="mt-5 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">
                    Page {page + 1} of {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
