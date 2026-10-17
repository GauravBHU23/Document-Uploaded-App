"use client";

import { use, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { getPersonNameByToken, uploadDocumentByToken } from "@/lib/upload-link/api";
import PublicPageChrome from "@/components/PublicPageChrome";

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const MAX_FILES = 20;

type QueuedFile = {
  id: string;
  file: File;
  label: string;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function stripExtension(name: string) {
  const idx = name.lastIndexOf(".");
  return idx > 0 ? name.slice(0, idx) : name;
}

export default function UploadLinkPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);

  const [personName, setPersonName] = useState<string | null>(null);
  const [nameError, setNameError] = useState(false);
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [doneCount, setDoneCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getPersonNameByToken(token)
      .then(setPersonName)
      .catch(() => setNameError(true));
  }, [token]);

  function handleFilesSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    const accepted: QueuedFile[] = [];
    for (const file of files) {
      if (queue.length + accepted.length >= MAX_FILES) {
        toast.error(`You can queue up to ${MAX_FILES} files at once`);
        break;
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        toast.error(`${file.name} is too large (max 25MB)`);
        continue;
      }
      accepted.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        label: stripExtension(file.name),
        status: "pending",
      });
    }

    if (accepted.length > 0) {
      setQueue((q) => [...q, ...accepted]);
    }
  }

  function handleRemove(id: string) {
    setQueue((q) => q.filter((item) => item.id !== id));
  }

  function handleLabelChange(id: string, label: string) {
    setQueue((q) => q.map((item) => (item.id === id ? { ...item, label } : item)));
  }

  async function handleUploadAll() {
    const pending = queue.filter((item) => item.status === "pending" || item.status === "error");
    if (pending.length === 0) return;

    setSubmitting(true);

    for (const item of pending) {
      setQueue((q) => q.map((q2) => (q2.id === item.id ? { ...q2, status: "uploading", error: undefined } : q2)));
      try {
        await uploadDocumentByToken(token, item.file, item.label.trim() || item.file.name);
        setQueue((q) => q.map((q2) => (q2.id === item.id ? { ...q2, status: "done" } : q2)));
        setDoneCount((n) => n + 1);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        setQueue((q) => q.map((q2) => (q2.id === item.id ? { ...q2, status: "error", error: message } : q2)));
      }
    }

    setSubmitting(false);
  }

  const pendingCount = queue.filter((item) => item.status === "pending" || item.status === "error").length;
  const hasErrors = queue.some((item) => item.status === "error");

  return (
    <PublicPageChrome>
    <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-10">
      <div className="relative z-10 w-full max-w-lg">
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
            className="glass-surface rounded-2xl border border-zinc-200/70 p-6 shadow-xl sm:p-8 dark:border-zinc-800/70"
          >
            <div className="accent-gradient mx-auto flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-md shadow-indigo-600/20">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                <path d="M11.47 2.47a.75.75 0 011.06 0l4.5 4.5a.75.75 0 01-1.06 1.06l-3.22-3.22V16.5a.75.75 0 01-1.5 0V4.81L8.03 8.03a.75.75 0 01-1.06-1.06l4.5-4.5z" />
                <path d="M3 15.75a.75.75 0 01.75.75v2.25a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5V16.5a.75.75 0 011.5 0v2.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V16.5a.75.75 0 01.75-.75z" />
              </svg>
            </div>
            <h1 className="mt-4 text-center text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {personName ? `Upload documents for ${personName}` : "Loading..."}
            </h1>
            <p className="mt-1 text-center text-sm text-zinc-500 dark:text-zinc-400">
              Take photos or choose files — no PIN needed. This link only adds documents, it doesn&apos;t show existing ones.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              capture="environment"
              multiple
              className="hidden"
              onChange={handleFilesSelected}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={submitting || !personName}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-indigo-300 bg-indigo-50/50 px-4 py-3 text-sm font-medium text-indigo-600 transition-colors hover:bg-indigo-50 disabled:opacity-50 dark:border-indigo-800 dark:bg-indigo-950/20 dark:text-indigo-300 dark:hover:bg-indigo-950/30"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <path d="M12 4.5a.75.75 0 01.75.75v6h6a.75.75 0 010 1.5h-6v6a.75.75 0 01-1.5 0v-6h-6a.75.75 0 010-1.5h6v-6A.75.75 0 0112 4.5z" />
              </svg>
              Choose documents to upload
            </button>

            <AnimatePresence initial={false}>
              {queue.length > 0 && (
                <motion.ul
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 flex flex-col gap-2 overflow-hidden"
                >
                  <AnimatePresence initial={false}>
                    {queue.map((item, index) => (
                      <motion.li
                        key={item.id}
                        layout
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 8, height: 0 }}
                        transition={{ duration: 0.18 }}
                        className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
                          item.status === "error"
                            ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
                            : item.status === "done"
                              ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30"
                              : "border-zinc-200 bg-white/80 dark:border-zinc-800 dark:bg-zinc-900/60"
                        }`}
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                          {index + 1}
                        </span>

                        <div className="min-w-0 flex-1">
                          <input
                            type="text"
                            value={item.label}
                            onChange={(e) => handleLabelChange(item.id, e.target.value)}
                            disabled={item.status === "uploading" || item.status === "done"}
                            placeholder="e.g. 10th Marksheet"
                            className="w-full truncate bg-transparent text-sm font-medium text-zinc-900 outline-none placeholder:text-zinc-400 disabled:opacity-70 dark:text-zinc-50"
                          />
                          <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                            {item.status === "error"
                              ? item.error
                              : item.status === "uploading"
                                ? "Uploading..."
                                : item.status === "done"
                                  ? "Uploaded"
                                  : formatSize(item.file.size)}
                          </p>
                        </div>

                        {item.status === "uploading" && (
                          <svg className="h-4 w-4 shrink-0 animate-spin text-indigo-400" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                          </svg>
                        )}

                        {item.status === "done" && (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 shrink-0 text-emerald-500">
                            <path fillRule="evenodd" d="M2.25 12a9.75 9.75 0 1119.5 0 9.75 9.75 0 01-19.5 0zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                          </svg>
                        )}

                        {(item.status === "pending" || item.status === "error") && (
                          <button
                            type="button"
                            onClick={() => handleRemove(item.id)}
                            disabled={submitting}
                            className="shrink-0 rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-red-500 disabled:opacity-50 dark:hover:bg-zinc-800"
                            aria-label={`Remove ${item.file.name}`}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                            </svg>
                          </button>
                        )}
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </motion.ul>
              )}
            </AnimatePresence>

            {queue.length > 0 && (
              <button
                type="button"
                onClick={handleUploadAll}
                disabled={submitting || pendingCount === 0}
                className="accent-gradient mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-indigo-600/20 transition-opacity hover:opacity-95 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Uploading...
                  </>
                ) : hasErrors ? (
                  `Retry ${pendingCount} file${pendingCount === 1 ? "" : "s"}`
                ) : (
                  `Upload ${pendingCount} file${pendingCount === 1 ? "" : "s"}`
                )}
              </button>
            )}

            {doneCount > 0 && queue.every((item) => item.status === "done") && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 text-center text-sm text-emerald-600 dark:text-emerald-400"
              >
                {doneCount} document{doneCount === 1 ? "" : "s"} uploaded. You can add more, or close this page.
              </motion.p>
            )}
          </motion.div>
        )}
      </div>
    </div>
    </PublicPageChrome>
  );
}
