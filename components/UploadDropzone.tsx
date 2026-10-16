"use client";

import { useRef, useState, type DragEvent } from "react";
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
    <div className="rounded-xl border border-dashed border-zinc-300 p-4 dark:border-zinc-700">
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

      {!pendingFile ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={openPicker}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg py-8 text-center transition-colors ${
            dragActive ? "bg-indigo-50 dark:bg-indigo-950/30" : ""
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8 text-zinc-400">
            <path fillRule="evenodd" d="M11.47 2.47a.75.75 0 011.06 0l4.5 4.5a.75.75 0 01-1.06 1.06l-3.22-3.22V16.5a.75.75 0 01-1.5 0V4.81L8.03 8.03a.75.75 0 01-1.06-1.06l4.5-4.5zM3 15.75a.75.75 0 01.75.75v2.25a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5V16.5a.75.75 0 011.5 0v2.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V16.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Drag a file here, or tap to choose (image or PDF)
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Selected: <span className="font-medium text-zinc-900 dark:text-zinc-50">{pendingFile.name}</span>
          </p>
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
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
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
              className="flex-1 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmUpload}
              disabled={!label.trim() || uploadDocument.isPending}
              className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
            >
              {uploadDocument.isPending ? "Uploading..." : "Upload"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
