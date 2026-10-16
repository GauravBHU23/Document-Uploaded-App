"use client";

import { use } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import AppHeader from "@/components/AppHeader";
import UploadDropzone from "@/components/UploadDropzone";
import DocumentCard from "@/components/DocumentCard";
import PersonAccessCard from "@/components/PersonAccessCard";
import QRCaptureTrigger from "@/components/QRCaptureTrigger";
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
                className="relative mb-5 overflow-hidden rounded-2xl bg-gradient-to-br from-[#4b32d6] via-[#6246ea] to-[#8b6ae8] p-5 text-white shadow-md shadow-indigo-900/20"
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(255,255,255,0.18),transparent_55%)]" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
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
                <p className="mt-2 text-center text-xs text-zinc-400 dark:text-zinc-500">
                  Need to merge PDFs or resize a photo first?{" "}
                  <Link href="/tools" className="font-medium text-indigo-500 hover:underline dark:text-indigo-400">
                    Open Tools
                  </Link>
                </p>
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
