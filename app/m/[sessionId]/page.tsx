"use client";

import { use, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";
import CameraCapture from "@/components/CameraCapture";
import { useAdmin } from "@/lib/auth/use-admin";
import { useUploadSession } from "@/lib/upload-sessions/hooks";
import { useUploadDocument } from "@/lib/documents/hooks";
import { DOCUMENT_LABEL_SUGGESTIONS } from "@/lib/types";

export default function MobileCapturePage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);

  const { data: admin } = useAdmin();
  const { data: session, isLoading, isError } = useUploadSession(sessionId);
  const uploadDocument = useUploadDocument();

  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [label, setLabel] = useState("");

  async function handleSave() {
    if (!capturedFile || !admin || !session || !label.trim()) return;
    try {
      await uploadDocument.mutateAsync({
        adminId: admin.id,
        personId: session.person_id,
        file: capturedFile,
        label: label.trim(),
        source: "qr_mobile",
      });
      toast.success(`${label.trim()} saved`);
      setCapturedFile(null);
      setLabel("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        {isLoading && (
          <div className="flex flex-col items-center gap-3 py-16">
            <svg className="h-8 w-8 animate-spin text-indigo-400" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          </div>
        )}

        {!isLoading && (isError || !session) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-surface rounded-2xl border border-zinc-200/80 p-6 text-center shadow-xl dark:border-zinc-800/80"
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-500 dark:bg-amber-950/40 dark:text-amber-400">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-6 w-6">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clipRule="evenodd" />
              </svg>
            </div>
            <h1 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              This link no longer works
            </h1>
            <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
              QR codes expire after a few minutes for security. Go back to the
              person&apos;s page on your other device and scan a fresh one.
            </p>
            <Link
              href="/dashboard"
              className="mt-5 inline-block text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
            >
              Go to dashboard
            </Link>
          </motion.div>
        )}

        {session && !capturedFile && (
          <>
            <p className="mb-4 text-center text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Capturing for <span className="text-zinc-900 dark:text-zinc-50">{session.people.full_name}</span>
            </p>
            <CameraCapture
              defaultFacing="environment"
              onCapture={(file) => {
                setCapturedFile(file);
                setLabel(file.name.replace(/\.[^/.]+$/, ""));
              }}
            />
          </>
        )}

        {session && capturedFile && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="glass-surface overflow-hidden rounded-2xl border border-zinc-200/80 p-4 shadow-sm dark:border-zinc-800/80">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Document name
              </label>
              <input
                autoFocus
                list="mobile-label-suggestions"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white/80 px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-50"
              />
              <datalist id="mobile-label-suggestions">
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
            <p className="mt-3 text-center text-xs text-zinc-400 dark:text-zinc-500">
              It will appear on your other device instantly.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
