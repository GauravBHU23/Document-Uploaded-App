"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useCreateUploadToken, useClearUploadToken } from "@/lib/people/hooks";
import { useConfirm } from "@/components/ConfirmDialogProvider";
import LinkQrModal from "@/components/LinkQrModal";
import type { Person } from "@/lib/types";

export default function PersonUploadLinkCard({ person }: { person: Person }) {
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  // Same server/client hydration-safety pattern as PersonAccessCard:
  // window.location.origin is only knowable after mount.
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrigin(window.location.origin);
  }, []);

  const createUploadToken = useCreateUploadToken();
  const clearUploadToken = useClearUploadToken();
  const confirm = useConfirm();

  const hasToken = Boolean(person.upload_token);
  const uploadUrl = origin && person.upload_token ? `${origin}/u/${person.upload_token}` : "";

  async function handleCreate() {
    try {
      await createUploadToken.mutateAsync(person.id);
      toast.success("Upload link created — share it below");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create upload link");
    }
  }

  async function handleClear() {
    const confirmed = await confirm({
      title: "Disable upload link?",
      description: `${person.full_name}'s upload link will stop working immediately.`,
      confirmLabel: "Disable",
      danger: true,
    });
    if (!confirmed) return;
    try {
      await clearUploadToken.mutateAsync(person.id);
      toast.success("Upload link disabled");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not disable upload link");
    }
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(uploadUrl);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy link");
    }
  }

  return (
    <div className="mt-3 rounded-2xl border border-zinc-200/80 bg-white/70 p-4 dark:border-zinc-800/80 dark:bg-zinc-950/50">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            hasToken
              ? "bg-emerald-50 text-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-400"
              : "bg-zinc-100 text-zinc-400 dark:bg-zinc-900 dark:text-zinc-500"
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
            <path d="M11.47 2.47a.75.75 0 011.06 0l4.5 4.5a.75.75 0 01-1.06 1.06l-3.22-3.22V16.5a.75.75 0 01-1.5 0V4.81L8.03 8.03a.75.75 0 01-1.06-1.06l4.5-4.5z" />
            <path d="M3 15.75a.75.75 0 01.75.75v2.25a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5V16.5a.75.75 0 011.5 0v2.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V16.5a.75.75 0 01.75-.75z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
            {person.full_name}&apos;s upload link
          </p>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            {hasToken
              ? "Link is active — anyone with it can add documents, no PIN needed. It can't view or download anything."
              : "Give them a link to upload documents directly — no PIN, upload only."}
          </p>
        </div>
      </div>

      {hasToken && (
        <div className="mt-3 flex flex-col gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/60">
            <span className="min-w-0 flex-1 truncate font-mono text-xs text-zinc-600 dark:text-zinc-400">
              {uploadUrl}
            </span>
            <button
              type="button"
              onClick={handleCopyLink}
              className="shrink-0 rounded-md bg-white px-2 py-1 text-xs font-medium text-zinc-600 shadow-sm transition-colors hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setQrOpen(true)}
            className="flex items-center justify-center gap-2 rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H5v3a1 1 0 01-2 0V4zm9-1a1 1 0 100 2h3v3a1 1 0 102 0V4a1 1 0 00-1-1h-4zm-9 9a1 1 0 112 0v3h3a1 1 0 110 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 110-2h3v-3a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Show QR code
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCreate}
              disabled={createUploadToken.isPending}
              className="flex-1 rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              {createUploadToken.isPending ? "Regenerating..." : "Regenerate link"}
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="flex-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              Disable link
            </button>
          </div>
        </div>
      )}

      <LinkQrModal
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        url={uploadUrl}
        title="Scan to upload"
        description={`Opens ${person.full_name}'s upload page on your phone — no PIN needed.`}
      />

      {!hasToken && (
        <button
          type="button"
          onClick={handleCreate}
          disabled={createUploadToken.isPending}
          className="accent-gradient mt-3 w-full rounded-lg px-3 py-2 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-95 disabled:opacity-50"
        >
          {createUploadToken.isPending ? "Creating..." : "Create upload link"}
        </button>
      )}
    </div>
  );
}
