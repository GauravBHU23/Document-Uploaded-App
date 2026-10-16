"use client";

import { use } from "react";
import { AnimatePresence } from "framer-motion";
import AppHeader from "@/components/AppHeader";
import UploadDropzone from "@/components/UploadDropzone";
import DocumentCard from "@/components/DocumentCard";
import { useAdmin } from "@/lib/auth/use-admin";
import { usePerson } from "@/lib/people/hooks";
import { useDocuments } from "@/lib/documents/hooks";

export default function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: personId } = use(params);

  const { data: admin } = useAdmin();
  const { data: person, isLoading: personLoading, isError: personError } = usePerson(personId);
  const { data: documents, isLoading: documentsLoading } = useDocuments(personId);

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <AppHeader
        title={person?.full_name || "Loading..."}
        subtitle={person?.category || undefined}
        backHref="/dashboard"
      />

      <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {personError && (
          <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
            Could not load this person. They may not exist, or you may not have access.
          </div>
        )}

        {personLoading && (
          <div className="h-16 animate-pulse rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950" />
        )}

        {person && admin && (
          <>
            <UploadDropzone adminId={admin.id} personId={person.id} />

            <h2 className="mt-8 text-base font-medium text-zinc-900 dark:text-zinc-50">
              Documents
            </h2>

            {documentsLoading && (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="h-40 animate-pulse rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
                  />
                ))}
              </div>
            )}

            {!documentsLoading && documents && documents.length === 0 && (
              <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400">
                No documents yet for {person.full_name}. Upload one above.
              </p>
            )}

            {documents && documents.length > 0 && (
              <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                <AnimatePresence initial={false}>
                  {documents.map((document) => (
                    <DocumentCard key={document.id} document={document} />
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </>
        )}
      </main>
    </div>
  );
}
