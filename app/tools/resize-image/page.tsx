"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import AppHeader from "@/components/AppHeader";
import ToolHero from "@/components/ToolHero";
import SaveToPersonPicker from "@/components/SaveToPersonPicker";
import { compressImage } from "@/lib/image/compress";

const PRESETS = [
  { label: "Passport photo (50 KB)", maxSizeKB: 50, maxWidthOrHeight: 600 },
  { label: "Signature (20 KB)", maxSizeKB: 20, maxWidthOrHeight: 800 },
  { label: "Standard document (200 KB)", maxSizeKB: 200, maxWidthOrHeight: 1920 },
  { label: "Custom", maxSizeKB: 0, maxWidthOrHeight: 0 },
];

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ResizeImagePage() {
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [presetIndex, setPresetIndex] = useState(2);
  const [customSizeKB, setCustomSizeKB] = useState(200);
  const [customMaxDimension, setCustomMaxDimension] = useState(1920);
  const [processing, setProcessing] = useState(false);
  const [resultFile, setResultFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const preset = PRESETS[presetIndex];
  const isCustom = preset.label === "Custom";

  function handleFileSelected(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    setSourceFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setResultFile(null);
  }

  async function handleCompress() {
    if (!sourceFile) return;
    setProcessing(true);
    try {
      const result = await compressImage(sourceFile, {
        maxSizeKB: isCustom ? customSizeKB : preset.maxSizeKB,
        maxWidthOrHeight: isCustom ? customMaxDimension : preset.maxWidthOrHeight,
      });
      setResultFile(result);
      toast.success(`Resized: ${formatSize(sourceFile.size)} → ${formatSize(result.size)}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not resize image");
    } finally {
      setProcessing(false);
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
      <AppHeader title="Resize Image" backHref="/dashboard" />

      <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10 2xl:px-16">
        <div className="mx-auto w-full max-w-3xl">
          <ToolHero
            title="Resize Image"
            description="Shrink photos to the exact size govt. forms ask for — all on your device."
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                <path fillRule="evenodd" d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.16-5.159a1.5 1.5 0 00-2.12 0L3 16.061zm10.125-7.81a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0z" clipRule="evenodd" />
              </svg>
            }
          />

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFileSelected(e.target.files?.[0] ?? null)}
          />

          {!sourceFile ? (
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
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Choose an image</p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500">JPG or PNG</p>
            </button>
          ) : (
            <div className="rounded-2xl border border-zinc-200/80 bg-white/70 p-4 dark:border-zinc-800/80 dark:bg-zinc-950/50">
              <div className="flex gap-4">
                {previewUrl && (
                  // eslint-disable-next-line @next/next/no-img-element -- a locally-chosen blob: URL, not a remote image Next's optimizer could handle
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="h-24 w-24 shrink-0 rounded-xl object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {sourceFile.name}
                  </p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">{formatSize(sourceFile.size)}</p>
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="mt-1.5 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    Choose a different image
                  </button>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Target size
                </label>
                <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {PRESETS.map((p, i) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setPresetIndex(i)}
                      className={`rounded-lg border px-2.5 py-2 text-xs font-medium transition-colors ${
                        presetIndex === i
                          ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/40 dark:text-indigo-300"
                          : "border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {isCustom && (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      Max size (KB)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={customSizeKB}
                      onChange={(e) => setCustomSizeKB(Number(e.target.value) || 1)}
                      className="mt-1 w-full rounded-lg border border-zinc-300 bg-white/80 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      Max width/height (px)
                    </label>
                    <input
                      type="number"
                      min={50}
                      value={customMaxDimension}
                      onChange={(e) => setCustomMaxDimension(Number(e.target.value) || 50)}
                      className="mt-1 w-full rounded-lg border border-zinc-300 bg-white/80 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-50"
                    />
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleCompress}
                disabled={processing}
                className="mt-4 w-full rounded-xl bg-gradient-to-br from-[#4b32d6] via-[#6246ea] to-[#8b6ae8] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-600/25 transition-opacity hover:opacity-95 disabled:opacity-50"
              >
                {processing ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Resizing...
                  </span>
                ) : (
                  "Resize image"
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
                  <p className="font-medium text-emerald-900 dark:text-emerald-200">Resized successfully</p>
                  <p className="text-sm text-emerald-700 dark:text-emerald-400">
                    {sourceFile && formatSize(sourceFile.size)} → {formatSize(resultFile.size)}
                  </p>
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
                <SaveToPersonPicker file={resultFile} defaultLabel={sourceFile?.name.replace(/\.[^/.]+$/, "") || "Photo"} />
              </div>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
