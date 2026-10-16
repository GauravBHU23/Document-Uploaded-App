"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { useCreateUploadSession, SESSION_LIFETIME_MINUTES } from "@/lib/upload-sessions/hooks";

type QRCaptureTriggerProps = {
  adminId: string;
  personId: string;
};

export default function QRCaptureTrigger({ adminId, personId }: QRCaptureTriggerProps) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(SESSION_LIFETIME_MINUTES * 60);
  const createSession = useCreateUploadSession();

  async function handleOpen() {
    setOpen(true);
    setUrl(null);
    try {
      const session = await createSession.mutateAsync({ adminId, personId });
      setUrl(`${window.location.origin}/m/${session.id}`);
      setSecondsLeft(SESSION_LIFETIME_MINUTES * 60);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create QR code");
      setOpen(false);
    }
  }

  useEffect(() => {
    if (!open || !url) return;
    const interval = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [open, url]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const expired = secondsLeft === 0;

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-200/80 bg-white/70 px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm backdrop-blur-sm transition-colors hover:bg-zinc-100 dark:border-zinc-700/80 dark:bg-zinc-900/60 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H5v3a1 1 0 01-2 0V4zm9-1a1 1 0 100 2h3v3a1 1 0 102 0V4a1 1 0 00-1-1h-4zm-9 9a1 1 0 112 0v3h3a1 1 0 110 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 110-2h3v-3a1 1 0 011-1z" clipRule="evenodd" />
        </svg>
        Capture from phone
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0 backdrop-blur-sm sm:items-center sm:p-4"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 32, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 340, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-surface w-full max-w-sm rounded-t-2xl border border-zinc-200/80 p-6 text-center shadow-2xl sm:rounded-2xl dark:border-zinc-800/80"
            >
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Scan with your phone
              </h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Opens the camera page for this person. You&apos;ll sign in on your
                phone the first time.
              </p>

              <div className="mx-auto mt-5 flex h-56 w-56 items-center justify-center rounded-2xl bg-white p-4 shadow-inner dark:bg-white">
                {expired ? (
                  <div className="flex flex-col items-center gap-2 text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-8 w-8 text-zinc-300">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm text-zinc-500">QR code expired</p>
                    <button
                      type="button"
                      onClick={handleOpen}
                      className="text-sm font-medium text-indigo-600 hover:underline"
                    >
                      Generate a new one
                    </button>
                  </div>
                ) : url ? (
                  <QRCodeSVG value={url} size={192} level="M" />
                ) : (
                  <svg className="h-8 w-8 animate-spin text-indigo-400" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                )}
              </div>

              {!expired && url && (
                <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">
                  Expires in {minutes}:{String(seconds).padStart(2, "0")}
                </p>
              )}

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mt-5 w-full rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
