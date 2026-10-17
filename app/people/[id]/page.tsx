"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import AppHeader from "@/components/AppHeader";
import UploadDropzone from "@/components/UploadDropzone";
import DocumentCard from "@/components/DocumentCard";
import PersonAccessCard from "@/components/PersonAccessCard";
import PersonUploadLinkCard from "@/components/PersonUploadLinkCard";
import QRCaptureTrigger from "@/components/QRCaptureTrigger";
import { useConfirm } from "@/components/ConfirmDialogProvider";
import { useAdmin } from "@/lib/auth/use-admin";
import { usePerson, useUpdatePerson } from "@/lib/people/hooks";
import { useDocuments, useBulkDeleteDocuments } from "@/lib/documents/hooks";
import { useRealtimeDocuments } from "@/lib/documents/use-realtime-documents";
import { downloadDocumentsAsZip } from "@/lib/documents/zip";
import ZipDownloadProgressModal from "@/components/ZipDownloadProgressModal";
import { createClient } from "@/lib/supabase/client";
import type { DocumentSource } from "@/lib/types";
import NewPersonDialog from "@/app/dashboard/new-person-dialog";

function formatTotalSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const SOURCE_FILTERS: { label: string; value: DocumentSource | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Uploaded", value: "upload" },
  { label: "Captured", value: "camera" },
  { label: "Via phone", value: "qr_mobile" },
  { label: "Generated", value: "tool_generated" },
  { label: "By person", value: "self_upload" },
];

export default function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: personId } = use(params);

  const { data: admin } = useAdmin();
  const { data: person, isLoading: personLoading, isError: personError } = usePerson(personId);
  const { data: documents, isLoading: documentsLoading } = useDocuments(personId);
  useRealtimeDocuments(personId);

  const [docSearch, setDocSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<DocumentSource | "all">("all");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDownloading, setBulkDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({ done: 0, total: 0 });
  const [editOpen, setEditOpen] = useState(false);

  const bulkDelete = useBulkDeleteDocuments();
  const updatePerson = useUpdatePerson();
  const confirm = useConfirm();

  async function handleUpdate(values: {
    fullName: string;
    category?: string;
    dateOfBirth?: string;
    notes?: string;
  }) {
    if (!person) return;
    try {
      await updatePerson.mutateAsync({ personId: person.id, ...values });
      toast.success("Saved");
      setEditOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save changes");
    }
  }

  const totalSize = documents?.reduce((sum, d) => sum + d.size_bytes, 0) ?? 0;

  const filteredDocuments = useMemo(() => {
    if (!documents) return documents;
    const query = docSearch.trim().toLowerCase();
    return documents.filter((doc) => {
      const matchesQuery = !query || doc.label.toLowerCase().includes(query);
      const matchesSource = sourceFilter === "all" || doc.source === sourceFilter;
      return matchesQuery && matchesSource;
    });
  }, [documents, docSearch, sourceFilter]);

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

  async function handleBulkDownload() {
    if (selectedDocuments.length === 0 || !person) return;
    setBulkDownloading(true);
    setDownloadProgress({ done: 0, total: selectedDocuments.length });
    try {
      const supabase = createClient();
      const result = await downloadDocumentsAsZip(
        supabase,
        selectedDocuments,
        `${person.full_name}-documents`,
        (done, total) => setDownloadProgress({ done, total }),
      );
      if (result.failed.length > 0) {
        toast.warning(`Downloaded ${result.succeeded} of ${selectedDocuments.length} — couldn't fetch: ${result.failed.join(", ")}`);
      } else {
        toast.success(`Downloaded ${result.succeeded} document${result.succeeded === 1 ? "" : "s"} as a zip`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not download all files");
    } finally {
      setBulkDownloading(false);
    }
  }

  async function handleDownloadAll() {
    if (!documents || documents.length === 0 || !person) return;
    setBulkDownloading(true);
    setDownloadProgress({ done: 0, total: documents.length });
    try {
      const supabase = createClient();
      const result = await downloadDocumentsAsZip(
        supabase,
        documents,
        `${person.full_name}-documents`,
        (done, total) => setDownloadProgress({ done, total }),
      );
      if (result.failed.length > 0) {
        toast.warning(`Downloaded ${result.succeeded} of ${documents.length} — couldn't fetch: ${result.failed.join(", ")}`);
      } else {
        toast.success(`Downloaded all ${result.succeeded} documents as a zip`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not download all files");
    } finally {
      setBulkDownloading(false);
    }
  }

  async function handleBulkDelete() {
    if (selectedDocuments.length === 0) return;
    const confirmed = await confirm({
      title: `Delete ${selectedDocuments.length} document${selectedDocuments.length === 1 ? "" : "s"}?`,
      description: "They'll move to Trash and can be restored within 30 days.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!confirmed) return;
    try {
      await bulkDelete.mutateAsync(selectedDocuments);
      toast.success("Moved to Trash");
      exitSelectMode();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete");
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader
        title={person?.full_name || "Loading..."}
        subtitle={person?.category || undefined}
        backHref="/dashboard"
      />

      <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10 2xl:px-16">
        <div className="mx-auto w-full max-w-7xl">
        {personError && (
          <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
            Could not load this person. They may not exist, or you may not have access.
          </div>
        )}

        {personLoading && (
          <div className="skeleton-shimmer h-20 rounded-2xl border border-zinc-200/70 dark:border-zinc-800/70" />
        )}

        {person && admin && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
            <div className="min-w-0">
              {/* Person summary strip */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="relative mb-5 overflow-hidden rounded-2xl bg-gradient-to-br from-[#4b32d6] via-[#6246ea] to-[#8b6ae8] p-5 text-white shadow-lg shadow-indigo-900/25"
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(255,255,255,0.18),transparent_55%)]" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                <motion.div
                  aria-hidden
                  className="pointer-events-none absolute -right-12 -top-12 z-0 h-48 w-48 rounded-full bg-white/10 blur-3xl"
                  animate={{ scale: [1, 1.08, 1], opacity: [0.6, 0.9, 0.6] }}
                  transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                />
                <button
                  type="button"
                  onClick={() => setEditOpen(true)}
                  className="absolute right-4 top-4 z-10 flex items-center gap-1.5 rounded-lg bg-white/15 px-2.5 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/25"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                  Edit
                </button>
                <div
                  className="relative flex flex-wrap items-center gap-x-6 gap-y-2 text-sm"
                  style={{ textShadow: "0 1px 10px rgba(0,0,0,0.15)" }}
                >
                  <div>
                    <p className="font-medium text-white/85">Documents</p>
                    <p className="text-lg font-bold text-white">{documents?.length ?? "–"}</p>
                  </div>
                  <div>
                    <p className="font-medium text-white/85">Total size</p>
                    <p className="text-lg font-bold text-white">
                      {documents ? formatTotalSize(totalSize) : "–"}
                    </p>
                  </div>
                  {person.date_of_birth && (
                    <div>
                      <p className="font-medium text-white/85">Date of birth</p>
                      <p className="text-lg font-bold text-white">{person.date_of_birth}</p>
                    </div>
                  )}
                </div>
                {person.notes && (
                  <p
                    className="relative mt-3 max-w-lg text-sm font-medium text-white/90"
                    style={{ textShadow: "0 1px 10px rgba(0,0,0,0.15)" }}
                  >
                    {person.notes}
                  </p>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.05 }}
              >
                <div className="mb-3 flex gap-2.5">
                  <Link
                    href={`/people/${person.id}/capture`}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-200/80 bg-white/70 px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm backdrop-blur-sm transition-colors hover:bg-zinc-100 dark:border-zinc-700/80 dark:bg-zinc-900/60 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                      <path fillRule="evenodd" d="M1 5.25A2.25 2.25 0 013.25 3h.5c.966 0 1.8.65 2.063 1.546l.044.154A.25.25 0 006.1 4.9h7.8a.25.25 0 00.243-.3l.044-.154A2.25 2.25 0 0116.25 3h.5A2.25 2.25 0 0119 5.25v9.5A2.25 2.25 0 0116.75 17H3.25A2.25 2.25 0 011 14.75v-9.5zM10 7a3.5 3.5 0 100 7 3.5 3.5 0 000-7z" clipRule="evenodd" />
                    </svg>
                    Capture Photo
                  </Link>
                  <QRCaptureTrigger adminId={admin.id} personId={person.id} />
                </div>
                <UploadDropzone adminId={admin.id} personId={person.id} />
                <p className="mt-2 text-center text-xs text-zinc-500 dark:text-zinc-400">
                  Need to merge PDFs or resize a photo first?{" "}
                  <Link href="/tools" className="font-medium text-indigo-500 hover:underline dark:text-indigo-400">
                    Open Tools
                  </Link>
                </p>
              </motion.div>

              <div className="mt-8 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-medium text-zinc-900 dark:text-zinc-50">
                    Documents
                  </h2>
                  {documents && documents.length > 0 && (
                    <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                      {filteredDocuments?.length === documents.length
                        ? documents.length
                        : `${filteredDocuments?.length ?? 0} / ${documents.length}`}
                    </span>
                  )}
                </div>
                {documents && documents.length > 0 && !selectMode && (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleDownloadAll}
                      disabled={bulkDownloading}
                      className="text-sm font-medium text-indigo-600 hover:underline disabled:opacity-50 dark:text-indigo-400"
                    >
                      {bulkDownloading ? "Zipping..." : "Download all"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectMode(true)}
                      className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                    >
                      Select
                    </button>
                  </div>
                )}
                {documents && documents.length > 0 && selectMode && (
                  <button
                    type="button"
                    onClick={exitSelectMode}
                    className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    Cancel
                  </button>
                )}
              </div>

              <AnimatePresence>
                {selectMode && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50/70 px-3 py-2.5 dark:border-indigo-900 dark:bg-indigo-950/30">
                      <span className="text-sm font-medium text-indigo-900 dark:text-indigo-200">
                        {selectedIds.size} selected
                      </span>
                      <button
                        type="button"
                        onClick={handleSelectAll}
                        className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                      >
                        Select all
                      </button>
                      <div className="ml-auto flex gap-2">
                        <button
                          type="button"
                          onClick={handleBulkDownload}
                          disabled={selectedIds.size === 0 || bulkDownloading}
                          className="rounded-lg border border-indigo-300 bg-white px-3 py-1.5 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-50 disabled:opacity-50 dark:border-indigo-800 dark:bg-zinc-950 dark:text-indigo-300 dark:hover:bg-indigo-950/40"
                        >
                          {bulkDownloading ? "Zipping..." : "Download"}
                        </button>
                        <button
                          type="button"
                          onClick={handleBulkDelete}
                          disabled={selectedIds.size === 0 || bulkDelete.isPending}
                          className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:bg-zinc-950 dark:text-red-400 dark:hover:bg-red-950/40"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {documents && documents.length > 0 && (
                <div className="mt-3 flex flex-col gap-2.5 sm:flex-row sm:items-center">
                  <div className="relative flex-1 sm:max-w-xs">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400">
                      <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
                    </svg>
                    <input
                      type="search"
                      placeholder="Search documents..."
                      value={docSearch}
                      onChange={(e) => setDocSearch(e.target.value)}
                      className="w-full rounded-xl border border-zinc-300 bg-white/80 py-2 pl-9 pr-3 text-sm text-zinc-900 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-50"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {SOURCE_FILTERS.map((filter) => (
                      <button
                        key={filter.value}
                        type="button"
                        onClick={() => setSourceFilter(filter.value)}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                          sourceFilter === filter.value
                            ? "bg-gradient-to-br from-[#4b32d6] via-[#6246ea] to-[#8b6ae8] text-white shadow-sm"
                            : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
                        }`}
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {documentsLoading && (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="skeleton-shimmer h-40 rounded-xl border border-zinc-200/70 dark:border-zinc-800/70"
                    />
                  ))}
                </div>
              )}

              {!documentsLoading && documents && documents.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-10 flex flex-col items-center text-center"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-400 dark:bg-indigo-950/40 dark:text-indigo-400">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7">
                      <path fillRule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0016.5 9h-1.875a1.875 1.875 0 01-1.875-1.875V5.25A3.75 3.75 0 009 1.5H5.625zM7.5 15a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 017.5 15zm.75 2.25a.75.75 0 000 1.5h7.5a.75.75 0 000-1.5h-7.5z" clipRule="evenodd" />
                      <path d="M12.971 1.816A5.23 5.23 0 0114.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 013.434 1.279 9.768 9.768 0 00-6.963-6.963z" />
                    </svg>
                  </div>
                  <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
                    No documents yet for {person.full_name}. Upload one above.
                  </p>
                </motion.div>
              )}

              {!documentsLoading && documents && documents.length > 0 && filteredDocuments?.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-10 flex flex-col items-center text-center"
                >
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    No documents match your search or filter.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setDocSearch("");
                      setSourceFilter("all");
                    }}
                    className="mt-2 text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    Clear filters
                  </button>
                </motion.div>
              )}

              {filteredDocuments && filteredDocuments.length > 0 && (
                <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                  <AnimatePresence initial={false}>
                    {filteredDocuments.map((document) => (
                      <DocumentCard
                        key={document.id}
                        document={document}
                        selectable={selectMode}
                        selected={selectedIds.has(document.id)}
                        onToggleSelect={toggleSelect}
                      />
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </div>

            {/* Sidebar */}
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="lg:sticky lg:top-20 lg:self-start"
            >
              <PersonAccessCard person={person} />
              <PersonUploadLinkCard person={person} />
            </motion.div>
          </div>
        )}
        </div>
      </main>

      {person && (
        <NewPersonDialog
          open={editOpen}
          onClose={() => setEditOpen(false)}
          onSubmit={handleUpdate}
          submitting={updatePerson.isPending}
          person={person}
        />
      )}

      <ZipDownloadProgressModal
        open={bulkDownloading}
        done={downloadProgress.done}
        total={downloadProgress.total}
      />
    </div>
  );
}
