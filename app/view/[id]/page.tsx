"use client";

import { use, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  getPersonName,
  listDocumentsForPin,
  getDownloadUrl,
  uploadDocumentForPin,
} from "@/lib/pin-access/api";
import DocumentPreviewModal from "@/components/DocumentPreviewModal";

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

type PinDocument = {
  id: string;
  label: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function PersonViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: personId } = use(params);

  const [personName, setPersonName] = useState<string | null>(null);
  const [nameError, setNameError] = useState(false);
  const [pin, setPin] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<PinDocument[] | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<PinDocument | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getPersonName(personId)
      .then(setPersonName)
      .catch(() => setNameError(true));
  }, [personId]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setVerifying(true);
    try {
      const docs = await listDocumentsForPin(personId, pin);
      setDocuments(docs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid PIN");
    } finally {
      setVerifying(false);
    }
  }

  async function handleOpen(doc: PinDocument) {
    setDownloadingId(doc.id);
    setPreviewDoc(doc);
    setPreviewUrl(null);
    try {
      const url = await getDownloadUrl(personId, pin, doc.id);
      setPreviewUrl(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not open file");
      setPreviewDoc(null);
    } finally {
      setDownloadingId(null);
    }
  }

  async function handlePreviewDownload() {
    if (!previewUrl || !previewDoc) return;
    try {
      const response = await fetch(previewUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = previewDoc.label;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch {
      toast.error("Could not download file");
    }
  }

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
      await uploadDocumentForPin(personId, pin, file, file.name);
      const docs = await listDocumentsForPin(personId, pin);
      setDocuments(docs);
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

        {!nameError && !documents && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="glass-surface rounded-2xl border border-zinc-200/70 p-8 shadow-xl dark:border-zinc-800/70"
          >
            <div className="accent-gradient mx-auto flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-md shadow-indigo-600/20">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
              </svg>
            </div>
            <h1 className="mt-4 text-center text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {personName ? `Enter PIN for ${personName}` : "Loading..."}
            </h1>
            <p className="mt-1 text-center text-sm text-zinc-500 dark:text-zinc-400">
              Enter the PIN you were given to view your documents.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
              <input
                autoFocus
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                placeholder="••••"
                className="w-full rounded-xl border border-zinc-300 bg-white/80 px-4 py-3 text-center font-mono text-2xl tracking-[0.4em] text-zinc-900 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-50"
              />

              {error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-600 dark:bg-red-950/50 dark:text-red-400"
                >
                  {error}
                </motion.p>
              )}

              <button
                type="submit"
                disabled={verifying || !/^\d{4,6}$/.test(pin) || !personName}
                className="accent-gradient rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-indigo-600/20 transition-opacity hover:opacity-95 disabled:opacity-50"
              >
                {verifying ? "Checking..." : "View my documents"}
              </button>
            </form>
          </motion.div>
        )}

        {documents && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              {personName}&apos;s Documents
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              View, download, and add your own — {documents.length} document{documents.length === 1 ? "" : "s"}
            </p>

            <div className="mt-5 glass-surface rounded-2xl border border-dashed border-zinc-300/80 p-4 dark:border-zinc-700/80">
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
                disabled={uploading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50 dark:bg-white dark:text-zinc-900"
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
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                      <path d="M11.47 2.47a.75.75 0 011.06 0l4.5 4.5a.75.75 0 01-1.06 1.06l-3.22-3.22V16.5a.75.75 0 01-1.5 0V4.81L8.03 8.03a.75.75 0 01-1.06-1.06l4.5-4.5z" />
                      <path d="M3 15.75a.75.75 0 01.75.75v2.25a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5V16.5a.75.75 0 011.5 0v2.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V16.5a.75.75 0 01.75-.75z" />
                    </svg>
                    Upload a document
                  </>
                )}
              </button>
              <p className="mt-2 text-center text-xs text-zinc-400 dark:text-zinc-500">
                Take a photo or choose a file from your device
              </p>
            </div>

            {documents.length === 0 ? (
              <p className="mt-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                No documents have been uploaded yet.
              </p>
            ) : (
              <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <AnimatePresence initial={false}>
                  {documents.map((doc) => (
                    <motion.li
                      key={doc.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.18 }}
                      className="rounded-xl border border-zinc-200/80 bg-white/80 p-3 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-950/60"
                    >
                      <button
                        type="button"
                        onClick={() => handleOpen(doc)}
                        disabled={downloadingId === doc.id}
                        className="flex h-24 w-full items-center justify-center rounded-lg bg-gradient-to-br from-zinc-100 to-zinc-50 text-zinc-400 dark:from-zinc-900 dark:to-zinc-900/60"
                      >
                        {downloadingId === doc.id ? (
                          <svg className="h-6 w-6 animate-spin text-indigo-400" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                          </svg>
                        ) : doc.mime_type.startsWith("image/") ? (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8">
                            <path fillRule="evenodd" d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.16-5.159a1.5 1.5 0 00-2.12 0L3 16.061zm10.125-7.81a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8">
                            <path fillRule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0016.5 9h-1.875a1.875 1.875 0 01-1.875-1.875V5.25A3.75 3.75 0 009 1.5H5.625zM7.5 15a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 017.5 15zm.75 2.25a.75.75 0 000 1.5h7.5a.75.75 0 000-1.5h-7.5z" clipRule="evenodd" />
                            <path d="M12.971 1.816A5.23 5.23 0 0114.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 013.434 1.279 9.768 9.768 0 00-6.963-6.963z" />
                          </svg>
                        )}
                      </button>
                      <p className="mt-2 truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        {doc.label}
                      </p>
                      <p className="text-xs text-zinc-400 dark:text-zinc-500">
                        {formatSize(doc.size_bytes)}
                      </p>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </motion.div>
        )}
      </div>

      <DocumentPreviewModal
        open={Boolean(previewDoc)}
        onClose={() => setPreviewDoc(null)}
        url={previewUrl}
        label={previewDoc?.label ?? ""}
        mimeType={previewDoc?.mime_type ?? ""}
        onDownload={handlePreviewDownload}
      />
    </div>
  );
}
