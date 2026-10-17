"use client";

import { useEffect } from "react";

/**
 * Shared behavior every modal/dialog in the app should have: Escape
 * closes it, and the page behind it can't be scrolled while it's
 * open. Centralized here instead of copy-pasted into each modal
 * (ConfirmDialogProvider, NewPersonDialog, DocumentPreviewModal,
 * IdleWarningModal) so all of them get it consistently, and fixing it
 * once fixes it everywhere.
 */
export function useModalBehavior(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);
}
