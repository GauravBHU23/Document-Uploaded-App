"use client";

import { useRef, useState } from "react";
import { AnimatePresence, Reorder, motion } from "framer-motion";
import { toast } from "sonner";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import ToolHero from "@/components/ToolHero";
import SaveToPersonPicker from "@/components/SaveToPersonPicker";
import { mergeFilesToPdf } from "@/lib/pdf/mergePdfs";

type QueuedFile = {
  id: string;
  file: File;
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MergePdfPage() {
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [merging, setMerging] = useState(false);
  const [resultFile, setResultFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFilesSelected(fileList: FileList | null) {
    if (!fileList) return;
    const accepted: QueuedFile[] = [];
    for (const file of Array.from(fileList)) {
      if (!["application/pdf", "image/jpeg", "image/png"].includes(file.type)) {
        toast.error(`${file.name}: only PDF, JPG, or PNG files are supported`);
        continue;
      }
      accepted.push({ id: crypto.randomUUID(), file });
    }
    setQueue((prev) => [...prev, ...accepted]);
    setResultFile(null);
  }

  function removeFile(id: string) {
    setQueue((prev) => prev.filter((f) => f.id !== id));
    setResultFile(null);
  }

  async function handleMerge() {
    if (queue.length < 1) return;
    setMerging(true);
    try {
      const blob = await mergeFilesToPdf(queue.map((q) => q.file));
      const file = new File([blob], "merged.pdf", { type: "application/pdf" });
      setResultFile(file);
      toast.success("PDF merged");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not merge files");
    } finally {
      setMerging(false);
    }
  }

  function handleDownload() {
    if (!resultFile) return;
    const url = URL.createObjectURL(resultFile);
    const a = document.createElement("a");
    a.href = url;
    a.download = resultFile.name;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title="Merge PDF" backHref="/dashboard" />

      <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10 2xl:px-16">
        <div className="mx-auto w-full max-w-3xl">
          <ToolHero
            title="Merge PDF"
            description="Combine images and PDFs into one file — fully in your browser, nothing uploaded anywhere."
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                <path fillRule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0016.5 9h-1.875a1.875 1.875 0 01-1.875-1.875V5.25A3.75 3.75 0 009 1.5H5.625zM7.5 15a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 017.5 15zm.75 2.25a.75.75 0 000 1.5h7.5a.75.75 0 000-1.5h-7.5z" clipRule="evenodd" />
                <path d="M12.971 1.816A5.23 5.23 0 0114.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 013.434 1.279 9.768 9.768 0 00-6.963-6.963z" />
              </svg>
            }
          />

          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            multiple
            className="hidden"
            onChange={(e) => handleFilesSelected(e.target.files)}
          />

          {queue.length === 0 ? (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed border-zinc-300 bg-white/50 py-14 text-center transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950/40 dark:hover:bg-zinc-900/40"
            >
              <div className="accent-gradient flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-md shadow-indigo-600/20">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                  <path fillRule="evenodd" d="M11.47 2.47a.75.75 0 011.06 0l4.5 4.5a.75.75 0 01-1.06 1.06l-3.22-3.22V16.5a.75.75 0 01-1.5 0V4.81L8.03 8.03a.75.75 0 01-1.06-1.06l4.5-4.5zM3 15.75a.75.75 0 01.75.75v2.25a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5V16.5a.75.75 0 011.5 0v2.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V16.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Add PDFs or images to merge
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Tap to choose files</p>
            </button>
          ) : (
            <div className="rounded-2xl border border-zinc-200/80 bg-white/70 p-4 dark:border-zinc-800/80 dark:bg-zinc-950/50">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  {queue.length} file{queue.length === 1 ? "" : "s"} — drag to reorder
                </p>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  + Add more
                </button>
              </div>

              <Reorder.Group
                axis="y"
                values={queue}
                onReorder={(newOrder) => {
                  setQueue(newOrder);
                  setResultFile(null);
                }}
                className="mt-3 flex flex-col gap-2"
              >
                <AnimatePresence initial={false}>
                  {queue.map((item, i) => (
                    <Reorder.Item
                      key={item.id}
                      value={item}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex cursor-grab items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 active:cursor-grabbing dark:border-zinc-800 dark:bg-zinc-900"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0 text-zinc-300 dark:text-zinc-600">
                        <path d="M7 3a1 1 0 112 0 1 1 0 01-2 0zm4 0a1 1 0 112 0 1 1 0 01-2 0zM7 8a1 1 0 112 0 1 1 0 01-2 0zm4 0a1 1 0 112 0 1 1 0 01-2 0zm-4 5a1 1 0 112 0 1 1 0 01-2 0zm4 0a1 1 0 112 0 1 1 0 01-2 0z" />
                      </svg>
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-xs font-semibold text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                          {item.file.name}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">{formatSize(item.file.size)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(item.id)}
                        className="shrink-0 rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                        aria-label={`Remove ${item.file.name}`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                          <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                        </svg>
                      </button>
                    </Reorder.Item>
                  ))}
                </AnimatePresence>
              </Reorder.Group>

              <button
                type="button"
                onClick={handleMerge}
                disabled={merging}
                className="mt-4 w-full rounded-xl bg-gradient-to-br from-[#4b32d6] via-[#6246ea] to-[#8b6ae8] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-600/25 transition-opacity hover:opacity-95 disabled:opacity-50"
              >
                {merging ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Merging...
                  </span>
                ) : (
                  "Merge into one PDF"
                )}
              </button>
            </div>
          )}

          {resultFile && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-emerald-950/30"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-emerald-900 dark:text-emerald-200">Merged PDF ready</p>
                  <p className="text-sm text-emerald-700 dark:text-emerald-400">{formatSize(resultFile.size)}</p>
                </div>
              </div>
              <div className="mt-4 flex gap-2.5">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex-1 rounded-xl border border-emerald-300 bg-white px-4 py-2.5 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-50 dark:border-emerald-800 dark:bg-zinc-950 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
                >
                  Download
                </button>
                <SaveToPersonPicker file={resultFile} defaultLabel="Merged Document" />
              </div>
            </motion.div>
          )}
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
