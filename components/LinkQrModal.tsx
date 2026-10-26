"use client";

import { QRCodeSVG } from "qrcode.react";
import { AnimatePresence, motion } from "framer-motion";

type LinkQrModalProps = {
  open: boolean;
  onClose: () => void;
  url: string;
  title: string;
  description: string;
};

/**
 * Shared QR modal for the two "share a static link" cards
 * (PersonAccessCard's PIN link, PersonUploadLinkCard's upload link) --
 * unlike QRCaptureTrigger's QR (which encodes a short-lived, admin-
 * session-bound /m/[sessionId] capture URL), this just encodes
 * whatever permanent link the card already shows, so scanning it on a
 * phone is purely a faster alternative to retyping/copy-pasting the
 * same URL -- it doesn't grant any access the link itself doesn't
 * already grant.
 */
export default function LinkQrModal({ open, onClose, url, title, description }: LinkQrModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 32, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 340, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-surface w-full max-w-sm rounded-t-2xl border border-zinc-200/80 p-6 text-center shadow-2xl sm:rounded-2xl dark:border-zinc-800/80"
          >
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{title}</h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>

            <div className="mx-auto mt-5 flex h-56 w-56 items-center justify-center rounded-2xl bg-white p-4 shadow-inner dark:bg-white">
              {url ? (
                <QRCodeSVG value={url} size={192} level="M" />
              ) : (
                <svg className="h-8 w-8 animate-spin text-indigo-400" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="mt-5 w-full rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              Close
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
