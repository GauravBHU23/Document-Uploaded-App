"use client";

import { use, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { getPersonNameByToken, uploadDocumentByToken } from "@/lib/upload-link/api";

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export default function UploadLinkPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);

  const [personName, setPersonName] = useState<string | null>(null);
  const [nameError, setNameError] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getPersonNameByToken(token)
      .then(setPersonName)
      .catch(() => setNameError(true));
  }, [token]);

  async function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error("File is too large (max 25MB)");
      return;
    }

    setUploading(true);
    try {
      await uploadDocumentByToken(token, file, file.name);
      setUploadedCount((n) => n + 1);
      toast.success("Document uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-10">
      <div className="relative z-10 w-full max-w-md">
        {nameError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            This link is invalid or no longer available.
          </div>
        )}

        {!nameError && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="glass-surface rounded-2xl border border-zinc-200/70 p-8 shadow-xl dark:border-zinc-800/70"
          >
            <div className="accent-gradient mx-auto flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-md shadow-indigo-600/20">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                <path d="M11.47 2.47a.75.75 0 011.06 0l4.5 4.5a.75.75 0 01-1.06 1.06l-3.22-3.22V16.5a.75.75 0 01-1.5 0V4.81L8.03 8.03a.75.75 0 01-1.06-1.06l4.5-4.5z" />
                <path d="M3 15.75a.75.75 0 01.75.75v2.25a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5V16.5a.75.75 0 011.5 0v2.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V16.5a.75.75 0 01.75-.75z" />
              </svg>
            </div>
            <h1 className="mt-4 text-center text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {personName ? `Upload a document for ${personName}` : "Loading..."}
            </h1>
            <p className="mt-1 text-center text-sm text-zinc-500 dark:text-zinc-400">
              Take a photo or choose a file — no PIN needed. This link only adds documents, it doesn&apos;t show existing ones.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              capture="environment"
              className="hidden"
              onChange={handleFileSelected}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || !personName}
              className="accent-gradient mt-6 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-indigo-600/20 transition-opacity hover:opacity-95 disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Uploading...
                </>
              ) : (
                "Choose a document to upload"
              )}
            </button>

            {uploadedCount > 0 && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 text-center text-sm text-emerald-600 dark:text-emerald-400"
              >
                {uploadedCount} document{uploadedCount === 1 ? "" : "s"} uploaded. You can upload more, or close this page.
              </motion.p>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
