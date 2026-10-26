"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import InstallPrompt from "@/components/InstallPrompt";
import AnimatedNumber from "@/components/AnimatedNumber";
import { useConfirm } from "@/components/ConfirmDialogProvider";
import { useAdmin } from "@/lib/auth/use-admin";
import { usePeople, useCreatePerson, useUpdatePerson, useDeletePerson } from "@/lib/people/hooks";
import {
  useSearchDocuments,
  useTotalDocumentCount,
  useExpiringSoonDocuments,
  useDocumentLabelCounts,
  useDocumentsByLabel,
} from "@/lib/documents/hooks";
import { exportAllDocumentsAsZip, type PersonWithDocuments } from "@/lib/documents/zip";
import { downloadPeopleAsCsv } from "@/lib/people/csv";
import ZipDownloadProgressModal from "@/components/ZipDownloadProgressModal";
import { createClient } from "@/lib/supabase/client";
import type { Document, Person } from "@/lib/types";
import NewPersonDialog from "./new-person-dialog";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const AVATAR_PALETTE = [
  "from-indigo-400 to-violet-500",
  "from-rose-400 to-orange-400",
  "from-emerald-400 to-teal-500",
  "from-sky-400 to-blue-500",
  "from-fuchsia-400 to-pink-500",
  "from-amber-400 to-orange-500",
];

function avatarGradient(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase();
}

export default function DashboardPage() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState({ done: 0, total: 0 });
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { data: admin, isLoading: adminLoading, isError: adminError } = useAdmin();
  const { data: people, isLoading: peopleLoading, isError: peopleError } = usePeople(search);
  const { data: matchedDocuments, isLoading: documentsSearchLoading } = useSearchDocuments(search);
  const { data: totalDocuments } = useTotalDocumentCount();
  const { data: expiringSoon } = useExpiringSoonDocuments();
  const [expiringDismissed, setExpiringDismissed] = useState(false);
  const { data: labelCounts } = useDocumentLabelCounts();
  const [browseLabel, setBrowseLabel] = useState<string | null>(null);
  const { data: browseResults, isLoading: browseLoading } = useDocumentsByLabel(browseLabel);
  const createPerson = useCreatePerson();
  const updatePerson = useUpdatePerson();
  const deletePerson = useDeletePerson();
  const confirm = useConfirm();

  // "/" jumps straight to search, unless the admin is already typing
  // somewhere else (another input, textarea, or contenteditable) --
  // otherwise it would hijack the key while e.g. renaming a document.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "/") return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return;

      event.preventDefault();
      searchInputRef.current?.focus();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  async function handleCreate(values: {
    fullName: string;
    category?: string;
    dateOfBirth?: string;
    notes?: string;
  }) {
    if (!admin) return;
    try {
      await createPerson.mutateAsync({ adminId: admin.id, ...values });
      toast.success(`${values.fullName} added`);
      setDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add person");
    }
  }

  async function handleUpdate(values: {
    fullName: string;
    category?: string;
    dateOfBirth?: string;
    notes?: string;
  }) {
    if (!editingPerson) return;
    try {
      await updatePerson.mutateAsync({ personId: editingPerson.id, ...values });
      toast.success(`${values.fullName} updated`);
      setEditingPerson(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save changes");
    }
  }

  async function handleDelete(personId: string, fullName: string) {
    const confirmed = await confirm({
      title: `Delete ${fullName}?`,
      description:
        "This permanently deletes all of their documents too — even trashed ones skip the 30-day recovery window. This cannot be undone.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!confirmed) return;
    try {
      await deletePerson.mutateAsync(personId);
      toast.success(`${fullName} deleted`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete");
    }
  }

  async function handleExportAll() {
    if (!admin) return;
    const confirmed = await confirm({
      title: "Export everything?",
      description:
        "Downloads one zip containing every person's documents, organized into a folder per person. This can take a while for a large workspace.",
      confirmLabel: "Export",
    });
    if (!confirmed) return;

    setExporting(true);
    setExportProgress({ done: 0, total: 0 });
    try {
      const supabase = createClient();
      const { data: allPeople, error: peopleFetchError } = await supabase
        .from("people")
        .select("id, full_name");
      if (peopleFetchError) throw new Error(peopleFetchError.message);

      const { data: allDocuments, error: documentsFetchError } = await supabase
        .from("documents")
        .select("*")
        .is("deleted_at", null);
      if (documentsFetchError) throw new Error(documentsFetchError.message);

      const documentsByPerson = new Map<string, Document[]>();
      for (const doc of (allDocuments ?? []) as Document[]) {
        const list = documentsByPerson.get(doc.person_id) ?? [];
        list.push(doc);
        documentsByPerson.set(doc.person_id, list);
      }

      const peopleWithDocuments: PersonWithDocuments[] = (allPeople ?? [])
        .map((p) => ({
          personId: p.id,
          personName: p.full_name,
          documents: documentsByPerson.get(p.id) ?? [],
        }))
        .filter((p) => p.documents.length > 0);

      if (peopleWithDocuments.length === 0) {
        toast.error("No documents to export yet");
        return;
      }

      const result = await exportAllDocumentsAsZip(
        supabase,
        peopleWithDocuments,
        `docvault-export-${new Date().toISOString().slice(0, 10)}`,
        (done, total) => setExportProgress({ done, total }),
      );

      if (result.failed.length > 0) {
        toast.warning(`Exported ${result.succeeded} of ${result.succeeded + result.failed.length} documents — some couldn't be fetched`);
      } else {
        toast.success(`Exported ${result.succeeded} document${result.succeeded === 1 ? "" : "s"} across ${peopleWithDocuments.length} ${peopleWithDocuments.length === 1 ? "person" : "people"}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  function handleExportCsv() {
    if (!people || people.length === 0) {
      toast.error("No people to export yet");
      return;
    }
    downloadPeopleAsCsv(people, `docvault-people-${new Date().toISOString().slice(0, 10)}`);
    toast.success(`Exported ${people.length} ${people.length === 1 ? "person" : "people"} as CSV`);
  }

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader
        title="Dashboard"
        subtitle={admin ? `Signed in as ${admin.display_name || admin.email}` : undefined}
      />

      <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10 2xl:px-16">
        <div className="mx-auto w-full max-w-7xl">
          {/* Hero / stat strip */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="relative mb-7 overflow-hidden rounded-3xl bg-gradient-to-br from-[#4b32d6] via-[#6246ea] to-[#8b6ae8] p-6 text-white shadow-xl shadow-indigo-900/25 sm:p-8 lg:p-10"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.18),transparent_55%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_90%,rgba(255,255,255,0.10),transparent_45%)]" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
            <motion.div
              aria-hidden
              className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-white/10 blur-3xl"
              animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              aria-hidden
              className="pointer-events-none absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-fuchsia-400/10 blur-3xl"
              animate={{ scale: [1, 1.12, 1], opacity: [0.5, 0.8, 0.5] }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            />
            <div
              className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"
              style={{ textShadow: "0 1px 10px rgba(0,0,0,0.15)" }}
            >
              <div>
                <motion.p
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/90"
                >
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" />
                  Welcome back{admin?.display_name ? `, ${admin.display_name}` : ""}
                </motion.p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
                  Document Workspace
                </h2>
                <p className="mt-2 max-w-lg text-sm font-medium text-white/90 sm:text-base">
                  Every person&apos;s documents, organized and ready — synced instantly across your devices.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="flex min-w-0 flex-col items-start gap-0.5 rounded-xl bg-white/15 px-2.5 py-2.5 backdrop-blur-sm ring-1 ring-white/10 sm:gap-1 sm:rounded-2xl sm:px-4 sm:py-3"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-white/80 sm:h-5 sm:w-5">
                    <path d="M4.5 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0zM14.25 8.625a3.375 3.375 0 116.75 0 3.375 3.375 0 01-6.75 0zM1.5 19.125a7.125 7.125 0 0114.25 0v.003l-.001.119a.75.75 0 01-.363.63 13.067 13.067 0 01-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 01-.364-.63l-.001-.122zM17.25 19.128l-.001.144a2.25 2.25 0 01-.233.96 10.088 10.088 0 005.06-1.01.75.75 0 00.42-.643 4.875 4.875 0 00-6.957-4.611 8.586 8.586 0 011.71 5.157v.003z" />
                  </svg>
                  <AnimatedNumber value={people?.length ?? 0} className="text-base font-bold leading-none text-white tabular-nums sm:text-2xl" />
                  <p className="truncate text-[10px] font-medium text-white/70 sm:text-xs">
                    {people?.length === 1 ? "person" : "people"}
                  </p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.22 }}
                  className="flex min-w-0 flex-col items-start gap-0.5 rounded-xl bg-white/15 px-2.5 py-2.5 backdrop-blur-sm ring-1 ring-white/10 sm:gap-1 sm:rounded-2xl sm:px-4 sm:py-3"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-white/80 sm:h-5 sm:w-5">
                    <path fillRule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0016.5 9h-1.875a1.875 1.875 0 01-1.875-1.875V5.25A3.75 3.75 0 009 1.5H5.625zM7.5 15a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 017.5 15zm.75 2.25a.75.75 0 000 1.5h7.5a.75.75 0 000-1.5h-7.5z" clipRule="evenodd" />
                    <path d="M12.971 1.816A5.23 5.23 0 0114.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 013.434 1.279 9.768 9.768 0 00-6.963-6.963z" />
                  </svg>
                  <AnimatedNumber value={totalDocuments ?? 0} className="text-base font-bold leading-none text-white tabular-nums sm:text-2xl" />
                  <p className="truncate text-[10px] font-medium text-white/70 sm:text-xs">
                    document{totalDocuments === 1 ? "" : "s"}
                  </p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.29 }}
                  className="flex min-w-0 flex-col items-start gap-0.5 rounded-xl bg-white/15 px-2.5 py-2.5 backdrop-blur-sm ring-1 ring-white/10 sm:gap-1 sm:rounded-2xl sm:px-4 sm:py-3"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-emerald-300 sm:h-5 sm:w-5">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                  </svg>
                  <p className="truncate text-base font-bold leading-none text-white sm:text-2xl">Secure</p>
                  <p className="truncate text-[10px] font-medium text-white/70 sm:text-xs">PIN-protected</p>
                </motion.div>
              </div>
            </div>
          </motion.div>

          <InstallPrompt />

          {!expiringDismissed && expiringSoon && expiringSoon.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4.5 w-4.5 shrink-0 text-amber-500">
                    <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                      {expiringSoon.length} document{expiringSoon.length === 1 ? "" : "s"} expiring or expired
                    </p>
                    <ul className="mt-1.5 flex flex-col gap-0.5">
                      {expiringSoon.slice(0, 4).map((doc) => (
                        <li key={doc.id} className="text-xs text-amber-700 dark:text-amber-300">
                          <Link href={`/people/${doc.person_id}`} className="hover:underline">
                            {doc.people?.full_name ?? "Someone"}
                          </Link>
                          {" — "}
                          {doc.label} ({doc.expiry_date})
                        </li>
                      ))}
                      {expiringSoon.length > 4 && (
                        <li className="text-xs text-amber-600 dark:text-amber-400">
                          +{expiringSoon.length - 4} more
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setExpiringDismissed(true)}
                  className="shrink-0 rounded-lg p-1 text-amber-500 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                  aria-label="Dismiss"
                  title="Dismiss"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                  </svg>
                </button>
              </div>
            </motion.div>
          )}

          {!adminLoading && adminError && (
            <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              Your account is not listed in the <code className="font-mono">admins</code> table,
              so no records are visible. Add your user id there via the Supabase SQL editor.
            </div>
          )}

          {peopleError && (
            <div className="mb-6 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
              Could not load people.
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400">
                <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
              </svg>
              <input
                ref={searchInputRef}
                type="search"
                placeholder="Search people..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 bg-white/80 py-2.5 pl-9 pr-9 text-sm text-zinc-900 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-50"
              />
              {!search && (
                <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md border border-zinc-300 bg-zinc-100 px-1.5 py-0.5 text-[11px] font-medium text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
                  /
                </kbd>
              )}
            </div>
            <div className="flex shrink-0 gap-2">
              <Link
                href="/trash"
                className="inline-flex items-center justify-center rounded-xl border border-zinc-200/80 bg-white/70 p-2.5 text-zinc-500 shadow-sm backdrop-blur-sm transition-colors hover:bg-zinc-100 dark:border-zinc-700/80 dark:bg-zinc-900/60 dark:text-zinc-400 dark:hover:bg-zinc-800"
                aria-label="Trash"
                title="Trash"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path
                    fillRule="evenodd"
                    d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
                    clipRule="evenodd"
                  />
                </svg>
              </Link>
              <Link
                href="/audit-log"
                className="inline-flex items-center justify-center rounded-xl border border-zinc-200/80 bg-white/70 p-2.5 text-zinc-500 shadow-sm backdrop-blur-sm transition-colors hover:bg-zinc-100 dark:border-zinc-700/80 dark:bg-zinc-900/60 dark:text-zinc-400 dark:hover:bg-zinc-800"
                aria-label="Audit Log"
                title="Audit Log"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm3 1h6a1 1 0 110 2H7a1 1 0 010-2zm0 4h6a1 1 0 110 2H7a1 1 0 010-2zm0 4h3a1 1 0 110 2H7a1 1 0 010-2z" clipRule="evenodd" />
                </svg>
              </Link>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setExportMenuOpen((v) => !v)}
                  disabled={exporting || !people || people.length === 0}
                  className="inline-flex items-center justify-center rounded-xl border border-zinc-200/80 bg-white/70 p-2.5 text-zinc-500 shadow-sm backdrop-blur-sm transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700/80 dark:bg-zinc-900/60 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  aria-label="Export"
                  title="Export"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                    <path fillRule="evenodd" d="M10 12.5a.75.75 0 01-.75-.75V4.56L7.3 6.56a.75.75 0 11-1.1-1.02l3.25-3.5a.75.75 0 011.1 0l3.25 3.5a.75.75 0 11-1.1 1.02l-1.95-2V11.75a.75.75 0 01-.75.75z" clipRule="evenodd" />
                    <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
                  </svg>
                </button>
                <AnimatePresence>
                  {exportMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setExportMenuOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                        className="glass-surface absolute right-0 top-full z-20 mt-2 w-56 overflow-hidden rounded-xl border border-zinc-200/80 shadow-xl dark:border-zinc-800/80"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setExportMenuOpen(false);
                            handleExportAll();
                          }}
                          className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 shrink-0 text-indigo-500">
                            <path fillRule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0016.5 9h-1.875a1.875 1.875 0 01-1.875-1.875V5.25A3.75 3.75 0 009 1.5H5.625zM7.5 15a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 017.5 15zm.75 2.25a.75.75 0 000 1.5h7.5a.75.75 0 000-1.5h-7.5z" clipRule="evenodd" />
                            <path d="M12.971 1.816A5.23 5.23 0 0114.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 013.434 1.279 9.768 9.768 0 00-6.963-6.963z" />
                          </svg>
                          <div>
                            <p className="font-medium">All documents</p>
                            <p className="text-xs text-zinc-400 dark:text-zinc-500">.zip, one folder per person</p>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setExportMenuOpen(false);
                            handleExportCsv();
                          }}
                          className="flex w-full items-center gap-2.5 border-t border-zinc-200/80 px-4 py-3 text-left text-sm text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-800/80 dark:text-zinc-300 dark:hover:bg-zinc-900"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 shrink-0 text-emerald-500">
                            <path fillRule="evenodd" d="M4.5 2.25a.75.75 0 01.75-.75h9a.75.75 0 01.53.22l4.5 4.5a.75.75 0 01.22.53v12.75a.75.75 0 01-.75.75h-14.25a.75.75 0 01-.75-.75V2.25zm9 1.5v3.75a.75.75 0 00.75.75h3.75l-4.5-4.5z" clipRule="evenodd" />
                          </svg>
                          <div>
                            <p className="font-medium">People list</p>
                            <p className="text-xs text-zinc-400 dark:text-zinc-500">.csv, opens in Excel/Sheets</p>
                          </div>
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
              <Link
                href="/tools"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200/80 bg-white/70 px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm backdrop-blur-sm transition-colors hover:bg-zinc-100 dark:border-zinc-700/80 dark:bg-zinc-900/60 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
                Tools
              </Link>
              <motion.button
                whileTap={{ scale: 0.97 }}
                type="button"
                onClick={() => setDialogOpen(true)}
                disabled={!admin}
                className="accent-gradient inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-indigo-600/20 transition-opacity hover:opacity-95 disabled:opacity-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                </svg>
                New Person
              </motion.button>
            </div>
          </div>

          {search.trim().length < 2 && labelCounts && labelCounts.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Browse by type:</span>
              {labelCounts.slice(0, 8).map(({ label, count }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setBrowseLabel(browseLabel === label ? null : label)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                    browseLabel === label
                      ? "accent-gradient text-white shadow-sm"
                      : "border border-zinc-200 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                  }`}
                >
                  {label} <span className="opacity-70">({count})</span>
                </button>
              ))}
            </div>
          )}

          {browseLabel && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 rounded-2xl border border-indigo-200/80 bg-indigo-50/50 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/20"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                  {browseLoading
                    ? "Loading..."
                    : `${browseResults?.length ?? 0} document${browseResults?.length === 1 ? "" : "s"} labeled "${browseLabel}"`}
                </p>
                <button
                  type="button"
                  onClick={() => setBrowseLabel(null)}
                  className="shrink-0 rounded-lg p-1 text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40"
                  aria-label="Close"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                  </svg>
                </button>
              </div>
              {browseResults && browseResults.length > 0 && (
                <ul className="mt-2 flex flex-col gap-1.5">
                  {browseResults.map((doc) => (
                    <Link
                      key={doc.id}
                      href={`/people/${doc.person_id}`}
                      className="flex items-center gap-3 rounded-xl bg-white/80 px-3 py-2 text-sm shadow-sm transition-colors hover:bg-white dark:bg-zinc-950/60 dark:hover:bg-zinc-900"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0 text-indigo-400">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                      </svg>
                      <span className="min-w-0 flex-1 truncate font-medium text-zinc-900 dark:text-zinc-50">
                        {doc.people?.full_name ?? "Unknown"}
                      </span>
                      <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
                        {formatSize(doc.size_bytes)}
                      </span>
                    </Link>
                  ))}
                </ul>
              )}
            </motion.div>
          )}

          {search.trim().length >= 2 && !documentsSearchLoading && matchedDocuments && matchedDocuments.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 rounded-2xl border border-indigo-200/80 bg-indigo-50/50 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/20"
            >
              <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                {matchedDocuments.length} document{matchedDocuments.length === 1 ? "" : "s"} matching &quot;{search.trim()}&quot;
              </p>
              <ul className="mt-2 flex flex-col gap-1.5">
                {matchedDocuments.map((doc) => (
                  <Link
                    key={doc.id}
                    href={`/people/${doc.person_id}`}
                    className="flex items-center gap-3 rounded-xl bg-white/80 px-3 py-2 text-sm shadow-sm transition-colors hover:bg-white dark:bg-zinc-950/60 dark:hover:bg-zinc-900"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0 text-indigo-400">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                    </svg>
                    <span className="min-w-0 flex-1 truncate font-medium text-zinc-900 dark:text-zinc-50">
                      {doc.label}
                    </span>
                    <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
                      {doc.people?.full_name ?? "Unknown"} · {formatSize(doc.size_bytes)}
                    </span>
                  </Link>
                ))}
              </ul>
            </motion.div>
          )}

          {peopleLoading && (
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="skeleton-shimmer h-28 rounded-xl border border-zinc-200/70 dark:border-zinc-800/70"
                />
              ))}
            </div>
          )}

          {!peopleLoading && people && people.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-14 flex flex-col items-center text-center"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-400 dark:bg-indigo-950/40 dark:text-indigo-400">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8">
                  <path d="M4.5 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0zM14.25 8.625a3.375 3.375 0 116.75 0 3.375 3.375 0 01-6.75 0zM1.5 19.125a7.125 7.125 0 0114.25 0v.003l-.001.119a.75.75 0 01-.363.63 13.067 13.067 0 01-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 01-.364-.63l-.001-.122zM17.25 19.128l-.001.144a2.25 2.25 0 01-.233.96 10.088 10.088 0 005.06-1.01.75.75 0 00.42-.643 4.875 4.875 0 00-6.957-4.611 8.586 8.586 0 011.71 5.157v.003z" />
                </svg>
              </div>
              <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
                {search ? "No matching people found." : "No people yet. Add your first one to get started."}
              </p>
              {!search && (
                <button
                  type="button"
                  onClick={() => setDialogOpen(true)}
                  className="mt-4 text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  + New Person
                </button>
              )}
            </motion.div>
          )}

          {people && people.length > 0 && (
            <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <AnimatePresence initial={false}>
                {people.map((person, i) => (
                  <motion.li
                    key={person.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i, 8) * 0.03 } }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.18 }}
                    whileHover={{ y: -4, transition: { duration: 0.15 } }}
                    className="group relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/80 p-5 shadow-sm transition-shadow duration-300 hover:border-indigo-200/80 hover:shadow-xl hover:shadow-indigo-900/10 dark:border-zinc-800/80 dark:bg-zinc-950/60 dark:hover:border-indigo-800/60"
                  >
                    <div
                      className={`absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${avatarGradient(person.id)} opacity-10 blur-xl transition-opacity group-hover:opacity-20`}
                    />
                    <Link href={`/people/${person.id}`} className="relative flex items-start gap-3.5">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${avatarGradient(person.id)} text-base font-semibold text-white shadow-md`}
                      >
                        {initials(person.full_name) || "?"}
                      </div>
                      <div className="min-w-0 flex-1 pr-5">
                        <p className="truncate font-semibold text-zinc-900 dark:text-zinc-50">
                          {person.full_name}
                        </p>
                        {person.category && (
                          <span className="mt-1.5 inline-block rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                            {person.category}
                          </span>
                        )}
                        <p className="mt-2.5 flex items-center gap-1 text-xs font-medium text-indigo-500 opacity-0 transition-opacity group-hover:opacity-100 dark:text-indigo-400">
                          View documents
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3">
                            <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
                          </svg>
                        </p>
                      </div>
                    </Link>
                    <div className="absolute right-3 top-3 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => setEditingPerson(person)}
                        className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/40"
                        aria-label={`Edit ${person.full_name}`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(person.id, person.full_name)}
                        disabled={deletePerson.isPending}
                        className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:pointer-events-none disabled:opacity-40 dark:hover:bg-red-950/40"
                        aria-label={`Delete ${person.full_name}`}
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
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>
      </main>

      <AppFooter />

      <NewPersonDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleCreate}
        submitting={createPerson.isPending}
      />
      <NewPersonDialog
        open={Boolean(editingPerson)}
        onClose={() => setEditingPerson(null)}
        onSubmit={handleUpdate}
        submitting={updatePerson.isPending}
        person={editingPerson}
      />

      <ZipDownloadProgressModal
        open={exporting}
        done={exportProgress.done}
        total={exportProgress.total}
      />
    </div>
  );
}
