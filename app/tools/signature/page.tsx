"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import ToolHero from "@/components/ToolHero";
import SignaturePad, { type SignaturePadHandle } from "@/components/SignaturePad";
import CameraCapture from "@/components/CameraCapture";
import SaveToPersonPicker from "@/components/SaveToPersonPicker";
import { cleanPhotographedSignature } from "@/lib/image/cleanSignature";

type Mode = "draw" | "photograph";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

export default function SignatureToolPage() {
  const [mode, setMode] = useState<Mode>("draw");
  const [hasInk, setHasInk] = useState(false);
  const [resultFile, setResultFile] = useState<File | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const padRef = useRef<SignaturePadHandle | null>(null);

  function setResult(file: File) {
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setResultFile(file);
    setResultUrl(URL.createObjectURL(file));
  }

  async function handleUseDrawn() {
    const pad = padRef.current;
    if (!pad || pad.isEmpty()) {
      toast.error("Draw your signature first");
      return;
    }
    const blob = await pad.toBlob();
    if (!blob) return;
    setResult(new File([blob], "signature.png", { type: "image/png" }));
  }

  async function handlePhotographed(file: File) {
    setProcessing(true);
    try {
      const cleaned = await cleanPhotographedSignature(file);
      setResult(new File([cleaned], "signature.png", { type: "image/png" }));
      toast.success("Background removed");
    } catch {
      toast.error("Could not process the photo");
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

  function handleStartOver() {
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setResultFile(null);
    setResultUrl(null);
    padRef.current?.clear();
    setHasInk(false);
  }

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title="Signature" backHref="/dashboard" />

      <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10 2xl:px-16">
        <div className="mx-auto w-full max-w-3xl">
          <ToolHero
            title="Signature"
            description="Draw a signature, or photograph one on paper and we'll clean up the background."
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                <path d="M3.75 3a.75.75 0 00-.75.75v16.5c0 .414.336.75.75.75H20.25a.75.75 0 00.75-.75V3.75a.75.75 0 00-.75-.75H3.75zM6 15.26c2.07-2.956 4.573-4.52 7.5-4.52a.75.75 0 010 1.5c-2.414 0-4.546 1.263-6.372 3.76h1.372a.75.75 0 010 1.5H5a.75.75 0 01-.75-.75v-3.5a.75.75 0 011.5 0v2.01z" />
              </svg>
            }
          />

          {!resultFile && (
            <div className="mb-4 inline-flex w-full rounded-xl border border-zinc-200 bg-white/70 p-1 dark:border-zinc-800 dark:bg-zinc-950/50">
              <button
                type="button"
                onClick={() => setMode("draw")}
                className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  mode === "draw"
                    ? "bg-gradient-to-br from-[#4b32d6] via-[#6246ea] to-[#8b6ae8] text-white shadow-sm"
                    : "text-zinc-600 dark:text-zinc-400"
                }`}
              >
                Draw
              </button>
              <button
                type="button"
                onClick={() => setMode("photograph")}
                className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  mode === "photograph"
                    ? "bg-gradient-to-br from-[#4b32d6] via-[#6246ea] to-[#8b6ae8] text-white shadow-sm"
                    : "text-zinc-600 dark:text-zinc-400"
                }`}
              >
                Photograph on paper
              </button>
            </div>
          )}

          {!resultFile && mode === "draw" && (
            <div className="rounded-2xl border border-zinc-200/80 bg-white/70 p-4 dark:border-zinc-800/80 dark:bg-zinc-950/50">
              <SignaturePad padRef={padRef} onChange={setHasInk} />
              <div className="mt-4 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    padRef.current?.clear();
                    setHasInk(false);
                  }}
                  className="flex-1 rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={handleUseDrawn}
                  disabled={!hasInk}
                  className="flex-1 rounded-xl bg-gradient-to-br from-[#4b32d6] via-[#6246ea] to-[#8b6ae8] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-600/25 transition-opacity hover:opacity-95 disabled:opacity-50"
                >
                  Use this signature
                </button>
              </div>
            </div>
          )}

          {!resultFile && mode === "photograph" && (
            <div className="rounded-2xl border border-zinc-200/80 bg-white/70 p-4 dark:border-zinc-800/80 dark:bg-zinc-950/50">
              <p className="mb-3 text-center text-sm text-zinc-500 dark:text-zinc-400">
                Sign on plain white paper, then photograph it here.
              </p>
              {processing ? (
                <div className="flex aspect-square w-full max-w-sm mx-auto flex-col items-center justify-center gap-3 rounded-2xl bg-zinc-100 dark:bg-zinc-900">
                  <svg className="h-8 w-8 animate-spin text-indigo-400" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">Cleaning up background...</p>
                </div>
              ) : (
                <CameraCapture defaultFacing="environment" onCapture={handlePhotographed} />
              )}
            </div>
          )}

          {resultFile && resultUrl && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-emerald-950/30"
            >
              <div className="flex items-center gap-4">
                <div
                  className="flex h-20 w-32 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-[repeating-conic-gradient(#e5e5e5_0%_25%,white_0%_50%)] bg-[length:12px_12px] dark:border-emerald-900"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- local blob: URL */}
                  <img src={resultUrl} alt="Signature" className="max-h-full max-w-full object-contain" />
                </div>
                <div>
                  <p className="font-medium text-emerald-900 dark:text-emerald-200">Signature ready</p>
                  <p className="text-sm text-emerald-700 dark:text-emerald-400">{formatSize(resultFile.size)}</p>
                  <button
                    type="button"
                    onClick={handleStartOver}
                    className="mt-1 text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                  >
                    Start over
                  </button>
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
                <SaveToPersonPicker file={resultFile} defaultLabel="Signature" />
              </div>
            </motion.div>
          )}
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
