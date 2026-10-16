"use client";

import { use, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import AppHeader from "@/components/AppHeader";
import CameraCapture from "@/components/CameraCapture";
import { useAdmin } from "@/lib/auth/use-admin";
import { usePerson } from "@/lib/people/hooks";
import { useUploadDocument } from "@/lib/documents/hooks";
import { DOCUMENT_LABEL_SUGGESTIONS } from "@/lib/types";

export default function CapturePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: personId } = use(params);

  const { data: admin } = useAdmin();
  const { data: person } = usePerson(personId);
  const uploadDocument = useUploadDocument();

  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [label, setLabel] = useState("Live Photo");

  async function handleSave() {
    if (!capturedFile || !admin || !label.trim()) return;
    try {
      await uploadDocument.mutateAsync({
        adminId: admin.id,
        personId,
        file: capturedFile,
        label: label.trim(),
        source: "camera",
      });
      toast.success(`${label.trim()} saved`);
      setCapturedFile(null);
      setLabel("Live Photo");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader
        title="Capture Photo"
        subtitle={person ? `For ${person.full_name}` : undefined}
        backHref={`/people/${personId}`}
      />

      <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto w-full max-w-sm">
          {!capturedFile ? (
            <CameraCapture defaultFacing="environment" onCapture={setCapturedFile} />
          ) : (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/80 p-4 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-950/60">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Document name
                </label>
                <input
                  autoFocus
                  list="capture-label-suggestions"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white/80 px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-50"
                />
                <datalist id="capture-label-suggestions">
                  {DOCUMENT_LABEL_SUGGESTIONS.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>

                <div className="mt-4 flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => setCapturedFile(null)}
                    className="flex-1 rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                  >
                    Retake
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!label.trim() || uploadDocument.isPending}
                    className="accent-gradient flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-600/25 transition-opacity hover:opacity-95 disabled:opacity-50"
                  >
                    {uploadDocument.isPending ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
