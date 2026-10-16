"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import AppHeader from "@/components/AppHeader";
import { useConfirm } from "@/components/ConfirmDialogProvider";
import DocumentPreviewModal from "@/components/DocumentPreviewModal";
import { createClient } from "@/lib/supabase/client";
import { getSignedUrl } from "@/lib/documents/upload";
import {
  useTrashedDocuments,
  useRestoreDocument,
  usePermanentlyDeleteDocument,
  useBulkRestoreDocuments,
  useBulkPermanentlyDeleteDocuments,
} from "@/lib/documents/hooks";
import { TRASH_RETENTION_DAYS } from "@/lib/documents/trash";
import type { Document } from "@/lib/types";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function daysLeft(deletedAt: string) {
  const deletedDate = new Date(deletedAt);
  const expiresAt = new Date(deletedDate.getTime() + TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const msLeft = expiresAt.getTime() - Date.now();
  return Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
}

type TrashedDoc = Document & { people: { full_name: string } | null };

function TrashRow({
  doc,
  selectable,
  selected,
  onToggleSelect,
}: {
  doc: TrashedDoc;
  selectable: boolean;
  selected: boolean;
  onToggleSelect: (documentId: string) => void;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const restore = useRestoreDocument();
  const permanentlyDelete = usePermanentlyDeleteDocument();
  const confirm = useConfirm();

  const remaining = doc.deleted_at ? daysLeft(doc.deleted_at) : 0;
  const isImage = doc.mime_type.startsWith("image/");

  async function handleOpen() {
    if (selectable) {
      onToggleSelect(doc.id);
      return;
    }
    setPreviewOpen(true);
    setPreviewUrl(null);
    try {
      const supabase = createClient();
      const url = await getSignedUrl(supabase, doc.storage_path, 60);
      setPreviewUrl(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not open file");
      setPreviewOpen(false);
    }
  }

  async function handlePreviewDownload() {
    if (!previewUrl) return;
    try {
      const response = await fetch(previewUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = window.document.createElement("a");
      a.href = blobUrl;
      a.download = doc.label;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch {
      toast.error("Could not download file");
    }
  }

  async function handleRestore() {
    try {
      await restore.mutateAsync(doc);
      toast.success(`Restored to ${doc.people?.full_name ?? "its folder"}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not restore");
    }
  }

  async function handlePermanentDelete() {
    const confirmed = await confirm({
      title: `Permanently delete "${doc.label}"?`,
      description: "This removes the file for good — it cannot be restored after this.",
      confirmLabel: "Delete forever",
      danger: true,
    });
    if (!confirmed) return;
    try {
      await permanentlyDelete.mutateAsync(doc);
      toast.success("Permanently deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete");
    }
  }

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.18 }}
      className={`flex items-center gap-3 rounded-xl border p-3 shadow-sm transition-colors ${
        selected
          ? "border-indigo-400 bg-indigo-50/60 dark:border-indigo-700 dark:bg-indigo-950/30"
          : "border-zinc-200/80 bg-white/80 dark:border-zinc-800/80 dark:bg-zinc-950/60"
      }`}
    >
      <button
        type="button"
        onClick={handleOpen}
        disabled={previewOpen && !previewUrl}
        className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-zinc-100 to-zinc-50 text-zinc-400 dark:from-zinc-900 dark:to-zinc-900/60"
      >
        {selectable ? (
          <span
            className={`flex h-5 w-5 items-center justify-center rounded-md border-2 ${
              selected ? "border-indigo-500 bg-indigo-500 text-white" : "border-zinc-300 dark:border-zinc-600"
            }`}
          >
            {selected && (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
              </svg>
            )}
          </span>
        ) : previewOpen && !previewUrl ? (
          <svg className="h-5 w-5 animate-spin text-indigo-400" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        ) : isImage ? (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
            <path fillRule="evenodd" d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.16-5.159a1.5 1.5 0 00-2.12 0L3 16.061zm10.125-7.81a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
            <path fillRule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0016.5 9h-1.875a1.875 1.875 0 01-1.875-1.875V5.25A3.75 3.75 0 009 1.5H5.625zM7.5 15a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 017.5 15zm.75 2.25a.75.75 0 000 1.5h7.5a.75.75 0 000-1.5h-7.5z" clipRule="evenodd" />
            <path d="M12.971 1.816A5.23 5.23 0 0114.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 013.434 1.279 9.768 9.768 0 00-6.963-6.963z" />
          </svg>
        )}
      </button>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">{doc.label}</p>
        <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
          {doc.people?.full_name ?? "Unknown person"} · {formatSize(doc.size_bytes)}
        </p>
      </div>

      <span
        className={`hidden shrink-0 rounded-full px-2 py-0.5 text-xs font-medium sm:inline-block ${
          remaining <= 7
            ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
            : "bg-zinc-100 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400"
        }`}
      >
        {remaining === 0 ? "Expiring today" : `${remaining}d left`}
      </span>

      {!selectable && (
        <div className="flex shrink-0 gap-1.5">
          <button
            type="button"
            onClick={handleRestore}
            disabled={restore.isPending}
            className="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            Restore
          </button>
          <button
            type="button"
            onClick={handlePermanentDelete}
            disabled={permanentlyDelete.isPending}
            className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-950/40"
            aria-label={`Permanently delete ${doc.label}`}
            title="Delete forever"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path
                fillRule="evenodd"
                d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      )}

      <DocumentPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        url={previewUrl}
        label={doc.label}
        mimeType={doc.mime_type}
        onDownload={handlePreviewDownload}
      />
    </motion.li>
  );
}

export default function TrashPage() {
  const { data: documents, isLoading } = useTrashedDocuments();
  const [search, setSearch] = useState("");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const bulkRestore = useBulkRestoreDocuments();
  const bulkPermanentlyDelete = useBulkPermanentlyDeleteDocuments();
  const confirm = useConfirm();

  const filteredDocuments = useMemo(() => {
    if (!documents) return documents;
    const query = search.trim().toLowerCase();
    if (!query) return documents;
    return documents.filter(
      (doc) =>
        doc.label.toLowerCase().includes(query) ||
        (doc.people?.full_name ?? "").toLowerCase().includes(query),
    );
  }, [documents, search]);

  const selectedDocuments = useMemo(
    () => (documents ?? []).filter((d) => selectedIds.has(d.id)),
    [documents, selectedIds],
  );

  function toggleSelect(documentId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(documentId)) next.delete(documentId);
      else next.add(documentId);
      return next;
    });
  }

  function handleSelectAll() {
    if (!filteredDocuments) return;
    setSelectedIds(new Set(filteredDocuments.map((d) => d.id)));
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelectedIds(new Set());
  }

  async function handleBulkRestore() {
    if (selectedDocuments.length === 0) return;
    try {
      await bulkRestore.mutateAsync(selectedDocuments);
      toast.success(`Restored ${selectedDocuments.length} document${selectedDocuments.length === 1 ? "" : "s"}`);
      exitSelectMode();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not restore");
    }
  }

  async function handleBulkPermanentDelete() {
    if (selectedDocuments.length === 0) return;
    const confirmed = await confirm({
      title: `Permanently delete ${selectedDocuments.length} document${selectedDocuments.length === 1 ? "" : "s"}?`,
      description: "This removes the files for good — they cannot be restored after this.",
      confirmLabel: "Delete forever",
      danger: true,
    });
    if (!confirmed) return;
    try {
      await bulkPermanentlyDelete.mutateAsync(selectedDocuments);
      toast.success("Permanently deleted");
      exitSelectMode();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete");
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title="Trash" subtitle={`Deleted documents are kept for ${TRASH_RETENTION_DAYS} days`} backHref="/dashboard" />

      <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10 2xl:px-16">
        <div className="mx-auto w-full max-w-3xl">
          {isLoading && (
            <div className="flex flex-col gap-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="skeleton-shimmer h-20 rounded-xl border border-zinc-200/70 dark:border-zinc-800/70" />
              ))}
            </div>
          )}

          {!isLoading && documents && documents.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-14 flex flex-col items-center text-center"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-400 dark:bg-indigo-950/40 dark:text-indigo-400">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8">
                  <path
                    fillRule="evenodd"
                    d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.05 14.133A2.25 2.25 0 0116.62 22.5H7.38a2.25 2.25 0 01-2.244-2.077L4.087 6.66l-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.388 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.272 0c.74.024 1.364.64 1.364 1.452v.227a49.55 49.55 0 00-6 0v-.227c0-.812.623-1.428 1.364-1.452z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">Trash is empty.</p>
              <Link href="/dashboard" className="mt-3 text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400">
                Back to dashboard
              </Link>
            </motion.div>
          )}

          {documents && documents.length > 0 && (
            <>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full sm:max-w-xs">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400">
                    <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
                  </svg>
                  <input
                    type="search"
                    placeholder="Search trash..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-xl border border-zinc-300 bg-white/80 py-2 pl-9 pr-3 text-sm text-zinc-900 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-50"
                  />
                </div>

                {!selectMode ? (
                  <button
                    type="button"
                    onClick={() => setSelectMode(true)}
                    className="shrink-0 rounded-xl border border-zinc-200/80 bg-white/70 px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm backdrop-blur-sm transition-colors hover:bg-zinc-100 dark:border-zinc-700/80 dark:bg-zinc-900/60 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    Select
                  </button>
                ) : (
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <span className="text-sm text-zinc-500 dark:text-zinc-400">
                      {selectedDocuments.length} selected
                    </span>
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      onClick={handleBulkRestore}
                      disabled={selectedDocuments.length === 0 || bulkRestore.isPending}
                      className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                    >
                      Restore
                    </button>
                    <button
                      type="button"
                      onClick={handleBulkPermanentDelete}
                      disabled={selectedDocuments.length === 0 || bulkPermanentlyDelete.isPending}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
                    >
                      Delete forever
                    </button>
                    <button
                      type="button"
                      onClick={exitSelectMode}
                      className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-900"
                      aria-label="Cancel selection"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                        <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              {filteredDocuments && filteredDocuments.length === 0 && (
                <p className="mt-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
                  No trashed documents match &quot;{search}&quot;.
                </p>
              )}

              {filteredDocuments && filteredDocuments.length > 0 && (
                <ul className="flex flex-col gap-2.5">
                  <AnimatePresence initial={false}>
                    {filteredDocuments.map((doc) => (
                      <TrashRow
                        key={doc.id}
                        doc={doc}
                        selectable={selectMode}
                        selected={selectedIds.has(doc.id)}
                        onToggleSelect={toggleSelect}
                      />
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
