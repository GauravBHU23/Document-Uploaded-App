"use client";

import { use } from "react";
import { AnimatePresence, motion } from "framer-motion";
import AppHeader from "@/components/AppHeader";
import UploadDropzone from "@/components/UploadDropzone";
import DocumentCard from "@/components/DocumentCard";
import PersonAccessCard from "@/components/PersonAccessCard";
import { useAdmin } from "@/lib/auth/use-admin";
import { usePerson } from "@/lib/people/hooks";
import { useDocuments } from "@/lib/documents/hooks";

function formatTotalSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: personId } = use(params);

  const { data: admin } = useAdmin();
  const { data: person, isLoading: personLoading, isError: personError } = usePerson(personId);
  const { data: documents, isLoading: documentsLoading } = useDocuments(personId);

  const totalSize = documents?.reduce((sum, d) => sum + d.size_bytes, 0) ?? 0;

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
                className="accent-gradient relative mb-5 overflow-hidden rounded-2xl p-5 text-white shadow-md shadow-indigo-900/10"
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(255,255,255,0.18),transparent_55%)]" />
                <div className="relative flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                  <div>
                    <p className="text-white/70">Documents</p>
                    <p className="text-lg font-semibold">{documents?.length ?? "–"}</p>
                  </div>
                  <div>
                    <p className="text-white/70">Total size</p>
                    <p className="text-lg font-semibold">
                      {documents ? formatTotalSize(totalSize) : "–"}
                    </p>
                  </div>
                  {person.date_of_birth && (
                    <div>
                      <p className="text-white/70">Date of birth</p>
                      <p className="text-lg font-semibold">{person.date_of_birth}</p>
                    </div>
                  )}
                </div>
                {person.notes && (
                  <p className="relative mt-3 max-w-lg text-sm text-white/80">{person.notes}</p>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.05 }}
              >
                <UploadDropzone adminId={admin.id} personId={person.id} />
              </motion.div>

              <div className="mt-8 flex items-center justify-between">
                <h2 className="text-base font-medium text-zinc-900 dark:text-zinc-50">
                  Documents
                </h2>
                {documents && documents.length > 0 && (
                  <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                    {documents.length}
                  </span>
                )}
              </div>

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

              {documents && documents.length > 0 && (
                <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                  <AnimatePresence initial={false}>
                    {documents.map((document) => (
                      <DocumentCard key={document.id} document={document} />
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
            </motion.div>
          </div>
        )}
        </div>
      </main>
    </div>
  );
}
