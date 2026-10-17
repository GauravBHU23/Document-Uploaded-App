"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { getSignedUrl } from "@/lib/documents/upload";
import { useDeleteDocument, useRenameDocument } from "@/lib/documents/hooks";
import { useConfirm } from "@/components/ConfirmDialogProvider";
import DocumentPreviewModal from "@/components/DocumentPreviewModal";
import type { Document } from "@/lib/types";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const SOURCE_LABEL: Record<Document["source"], string> = {
  upload: "Uploaded",
  camera: "Captured",
  qr_mobile: "Via phone",
  tool_generated: "Generated",
  self_upload: "By person",
};

type DocumentCardProps = {
  document: Document;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (documentId: string) => void;
};

export default function DocumentCard({ document, selectable, selected, onToggleSelect }: DocumentCardProps) {
  const [renaming, setRenaming] = useState(false);
  const [label, setLabel] = useState(document.label);
  const [downloading, setDownloading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const deleteDocument = useDeleteDocument();
  const renameDocument = useRenameDocument();
  const confirm = useConfirm();

  const isImage = document.mime_type.startsWith("image/");

  async function handleOpen() {
    if (selectable) {
      onToggleSelect?.(document.id);
      return;
    }
    setPreviewOpen(true);
    setPreviewUrl(null);
    try {
      const supabase = createClient();
      const url = await getSignedUrl(supabase, document.storage_path, 60);
      setPreviewUrl(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not open file");
      setPreviewOpen(false);
    }
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      const supabase = createClient();
      const url = await getSignedUrl(supabase, document.storage_path, 60);
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = window.document.createElement("a");
      a.href = blobUrl;
      a.download = document.label;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not download file");
    } finally {
      setDownloading(false);
    }
  }

  async function handleDelete() {
    const confirmed = await confirm({
      title: `Delete "${document.label}"?`,
      description: "It will move to Trash and can be restored within 30 days.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!confirmed) return;
    try {
      await deleteDocument.mutateAsync(document);
      toast.success("Moved to Trash");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete");
    }
  }

  async function handleRenameSubmit() {
    const trimmed = label.trim();
    if (!trimmed || trimmed === document.label) {
      setRenaming(false);
      setLabel(document.label);
      return;
    }
    try {
      await renameDocument.mutateAsync({ documentId: document.id, label: trimmed });
      toast.success("Renamed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not rename");
    } finally {
      setRenaming(false);
    }
  }

  const SOURCE_BADGE_COLOR: Record<Document["source"], string> = {
    upload: "bg-zinc-100 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400",
    camera: "bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400",
    qr_mobile: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
    tool_generated: "bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400",
    self_upload: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
  };

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.18 }}
      whileHover={{ y: -2 }}
      className={`group relative flex flex-col rounded-xl border p-3 shadow-sm transition-shadow hover:shadow-lg hover:shadow-indigo-900/5 ${
        selected
          ? "border-indigo-400 bg-indigo-50/60 dark:border-indigo-500 dark:bg-indigo-950/30"
          : "border-zinc-200/80 bg-white/80 dark:border-zinc-800/80 dark:bg-zinc-950/60"
      }`}
    >
      {selectable && (
        <div
          className={`absolute left-2 top-2 z-10 flex h-5 w-5 items-center justify-center rounded-md border-2 transition-colors ${
            selected
              ? "border-indigo-600 bg-indigo-600 text-white"
              : "border-zinc-300 bg-white/90 dark:border-zinc-600 dark:bg-zinc-900/90"
          }`}
        >
          {selected && (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
            </svg>
          )}
        </div>
      )}
      <button
        type="button"
        onClick={handleOpen}
        disabled={previewOpen && !previewUrl}
        className="flex h-28 w-full items-center justify-center rounded-lg bg-gradient-to-br from-zinc-100 to-zinc-50 text-zinc-400 transition-colors group-hover:from-indigo-50 group-hover:to-violet-50 dark:from-zinc-900 dark:to-zinc-900/60 dark:group-hover:from-indigo-950/30 dark:group-hover:to-violet-950/20"
      >
        {previewOpen && !previewUrl ? (
          <svg className="h-7 w-7 animate-spin text-indigo-400" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        ) : isImage ? (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-10 w-10 transition-transform group-hover:scale-110">
            <path fillRule="evenodd" d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.16-5.159a1.5 1.5 0 00-2.12 0L3 16.061zm10.125-7.81a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-10 w-10 transition-transform group-hover:scale-110">
            <path fillRule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0016.5 9h-1.875a1.875 1.875 0 01-1.875-1.875V5.25A3.75 3.75 0 009 1.5H5.625zM7.5 15a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 017.5 15zm.75 2.25a.75.75 0 000 1.5h7.5a.75.75 0 000-1.5h-7.5z" clipRule="evenodd" />
            <path d="M12.971 1.816A5.23 5.23 0 0114.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 013.434 1.279 9.768 9.768 0 00-6.963-6.963z" />
          </svg>
        )}
      </button>

      <div className="mt-2">
        {renaming ? (
          <input
            autoFocus
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") {
                setLabel(document.label);
                setRenaming(false);
              }
            }}
            className="w-full rounded border border-indigo-400 px-1.5 py-0.5 text-sm outline-none dark:bg-zinc-900"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              if (selectable) {
                onToggleSelect?.(document.id);
                return;
              }
              setRenaming(true);
            }}
            className="block w-full truncate text-left text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-50"
            title={selectable ? undefined : "Click to rename"}
          >
            {document.label}
          </button>
        )}
        <div className="mt-1.5 flex items-center gap-1.5">
          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${SOURCE_BADGE_COLOR[document.source]}`}>
            {SOURCE_LABEL[document.source]}
          </span>
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            {formatSize(document.size_bytes)}
          </span>
        </div>
      </div>

      {!selectable && (
        <>
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="absolute left-2 top-2 rounded bg-white/90 p-1 text-zinc-400 opacity-70 transition-opacity hover:bg-indigo-50 hover:text-indigo-600 hover:opacity-100 disabled:opacity-40 dark:bg-zinc-950/90 dark:hover:bg-indigo-950/40"
            aria-label={`Download ${document.label}`}
            title="Download"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path
                fillRule="evenodd"
                d="M10 3a.75.75 0 01.75.75v6.638l1.96-2.158a.75.75 0 111.08 1.04l-3.25 3.5a.75.75 0 01-1.08 0l-3.25-3.5a.75.75 0 111.08-1.04l1.96 2.158V3.75A.75.75 0 0110 3zM3 13.25a.75.75 0 01.75.75v2a1.5 1.5 0 001.5 1.5h9.5a1.5 1.5 0 001.5-1.5v-2a.75.75 0 011.5 0v2a3 3 0 01-3 3h-9.5a3 3 0 01-3-3v-2a.75.75 0 01.75-.75z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          <button
            type="button"
            onClick={handleDelete}
            className="absolute right-2 top-2 rounded bg-white/90 p-1 text-zinc-400 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 dark:bg-zinc-950/90 dark:hover:bg-red-950/40"
            aria-label={`Delete ${document.label}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path
                fillRule="evenodd"
                d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </>
      )}

      <DocumentPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        url={previewUrl}
        label={document.label}
        mimeType={document.mime_type}
        onDownload={handleDownload}
      />
    </motion.li>
  );
}
