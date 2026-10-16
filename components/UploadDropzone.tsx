"use client";

import { useRef, useState, type DragEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useUploadDocument } from "@/lib/documents/hooks";
import { DOCUMENT_LABEL_SUGGESTIONS } from "@/lib/types";

type UploadDropzoneProps = {
  adminId: string;
  personId: string;
};

export default function UploadDropzone({ adminId, personId }: UploadDropzoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [label, setLabel] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadDocument = useUploadDocument();

  function openPicker() {
    inputRef.current?.click();
  }

  function handleFileSelected(file: File) {
    setPendingFile(file);
    const guessedLabel = file.name.replace(/\.[^/.]+$/, "");
    setLabel(guessedLabel);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) handleFileSelected(file);
  }

  async function handleConfirmUpload() {
    if (!pendingFile || !label.trim()) return;
    try {
      await uploadDocument.mutateAsync({
        adminId,
        personId,
        file: pendingFile,
        label: label.trim(),
      });
      toast.success(`${label.trim()} uploaded`);
      setPendingFile(null);
      setLabel("");
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    }
  }

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border-2 border-dashed p-4 transition-colors ${
        dragActive
          ? "border-indigo-400 bg-indigo-50/60 dark:border-indigo-500 dark:bg-indigo-950/20"
          : "border-zinc-300 bg-white/50 dark:border-zinc-700 dark:bg-zinc-950/40"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelected(file);
        }}
      />

      <AnimatePresence mode="wait">
        {!pendingFile ? (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={openPicker}
            className="flex cursor-pointer flex-col items-center justify-center gap-2.5 rounded-xl py-9 text-center"
          >
            <motion.div
              animate={dragActive ? { scale: 1.1, rotate: -4 } : { scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 18 }}
              className="accent-gradient flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-md shadow-indigo-600/20"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                <path fillRule="evenodd" d="M11.47 2.47a.75.75 0 011.06 0l4.5 4.5a.75.75 0 01-1.06 1.06l-3.22-3.22V16.5a.75.75 0 01-1.5 0V4.81L8.03 8.03a.75.75 0 01-1.06-1.06l4.5-4.5zM3 15.75a.75.75 0 01.75.75v2.25a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5V16.5a.75.75 0 011.5 0v2.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V16.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
              </svg>
            </motion.div>
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {dragActive ? "Drop to upload" : "Drag a file here, or tap to choose"}
            </p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">Image or PDF</p>
          </motion.div>
        ) : (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex flex-col gap-3 p-1"
          >
            <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0 text-indigo-500">
                <path fillRule="evenodd" d="M15.621 4.379a3 3 0 00-4.242 0l-7 7a3 3 0 004.241 4.243h.001l.497-.5a.75.75 0 011.064 1.057l-.498.501-.002.002a4.5 4.5 0 01-6.364-6.364l7-7a4.5 4.5 0 016.368 6.36l-3.455 3.553A2.625 2.625 0 119.52 9.52l3.45-3.451a.75.75 0 111.061 1.06l-3.45 3.451a1.125 1.125 0 001.587 1.595l3.454-3.553a3 3 0 000-4.242z" clipRule="evenodd" />
              </svg>
              <span className="truncate">
                Selected: <span className="font-medium text-zinc-900 dark:text-zinc-50">{pendingFile.name}</span>
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Document name
              </label>
              <input
                autoFocus
                list="label-suggestions"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. 10th Marksheet"
                className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white/80 px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-50"
              />
              <datalist id="label-suggestions">
                {DOCUMENT_LABEL_SUGGESTIONS.map((suggestion) => (
                  <option key={suggestion} value={suggestion} />
                ))}
              </datalist>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setPendingFile(null);
                  setLabel("");
                  if (inputRef.current) inputRef.current.value = "";
                }}
                className="flex-1 rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmUpload}
                disabled={!label.trim() || uploadDocument.isPending}
                className="accent-gradient flex-1 rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-indigo-600/20 transition-opacity hover:opacity-95 disabled:opacity-50"
              >
                {uploadDocument.isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Uploading...
                  </span>
                ) : (
                  "Upload"
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
