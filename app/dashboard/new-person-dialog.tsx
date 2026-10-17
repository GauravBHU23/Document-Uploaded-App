"use client";

import { useEffect, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useModalBehavior } from "@/lib/ui/use-modal-behavior";
import type { Person } from "@/lib/types";

type PersonFormValues = {
  fullName: string;
  category?: string;
  dateOfBirth?: string;
  notes?: string;
};

type NewPersonDialogProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: PersonFormValues) => void;
  submitting: boolean;
  /** When set, the dialog edits this person instead of creating a new
   * one -- same form, different copy/icon/submit label. */
  person?: Person | null;
};

const inputClasses =
  "mt-1.5 w-full rounded-xl border border-zinc-300 bg-white/80 px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition-all placeholder:text-zinc-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-50 dark:placeholder:text-zinc-600";

const CATEGORY_OPTIONS = ["General", "OBC", "SC", "ST", "EWS"];

export default function NewPersonDialog({
  open,
  onClose,
  onSubmit,
  submitting,
  person,
}: NewPersonDialogProps) {
  const isEdit = Boolean(person);

  const [fullName, setFullName] = useState("");
  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState(false);
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [notes, setNotes] = useState("");

  function reset() {
    setFullName("");
    setCategory("");
    setCustomCategory(false);
    setDateOfBirth("");
    setNotes("");
  }

  // Seed the form from the person being edited every time the dialog
  // opens for them -- not on every `person` change, since re-running
  // this while the admin is mid-edit (e.g. a background refetch
  // updating the `person` object) would stomp on unsaved input.
  useEffect(() => {
    if (!open) return;
    if (person) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFullName(person.full_name);
      const isPreset = CATEGORY_OPTIONS.includes(person.category ?? "");
      setCategory(person.category ?? "");
      setCustomCategory(Boolean(person.category) && !isPreset);
      setDateOfBirth(person.date_of_birth ?? "");
      setNotes(person.notes ?? "");
    } else {
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, person?.id]);

  function handleClose() {
    onClose();
  }

  useModalBehavior(open, handleClose);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!fullName.trim()) return;
    onSubmit({
      fullName: fullName.trim(),
      category: category.trim() || undefined,
      dateOfBirth: dateOfBirth || undefined,
      notes: notes.trim() || undefined,
    });
    if (!isEdit) reset();
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label={isEdit ? "Edit Person" : "New Person"}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 32, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 340, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-surface relative w-full max-w-md overflow-hidden rounded-t-3xl border border-zinc-200/80 shadow-2xl sm:rounded-3xl dark:border-zinc-800/80"
          >
            {/* Decorative header strip */}
            <div className="relative overflow-hidden bg-gradient-to-br from-[#4b32d6] via-[#6246ea] to-[#8b6ae8] px-6 pb-6 pt-7">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.2),transparent_55%)]" />
              <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
              <button
                type="button"
                onClick={handleClose}
                className="absolute right-4 top-4 rounded-lg p-1.5 text-white/70 transition-colors hover:bg-white/15 hover:text-white"
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
              <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 text-white shadow-md backdrop-blur-sm">
                {isEdit ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-6 w-6">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-6 w-6">
                    <path fillRule="evenodd" d="M10 2a5 5 0 00-5 5v1a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <h2
                className="relative mt-3 text-xl font-bold text-white"
                style={{ textShadow: "0 1px 10px rgba(0,0,0,0.15)" }}
              >
                {isEdit ? "Edit Person" : "New Person"}
              </h2>
              <p
                className="relative mt-0.5 text-sm font-medium text-white/90"
                style={{ textShadow: "0 1px 10px rgba(0,0,0,0.15)" }}
              >
                {isEdit
                  ? "Update their details. Their documents stay exactly as they are."
                  : "Create a folder to keep their documents organized."}
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex max-h-[65vh] flex-col gap-4 overflow-y-auto px-6 py-5"
            >
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Full name
                </label>
                <input
                  autoFocus
                  required
                  placeholder="e.g. Priya Sharma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={inputClasses}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Category
                </label>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {CATEGORY_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        setCategory(option);
                        setCustomCategory(false);
                      }}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                        !customCategory && category === option
                          ? "border-indigo-500 bg-indigo-500 text-white"
                          : "border-zinc-300 bg-white/80 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setCustomCategory(true);
                      setCategory("");
                    }}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                      customCategory
                        ? "border-indigo-500 bg-indigo-500 text-white"
                        : "border-zinc-300 bg-white/80 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    }`}
                  >
                    Other
                  </button>
                </div>
                {customCategory && (
                  <input
                    autoFocus
                    placeholder="e.g. Student"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className={inputClasses}
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Date of birth
                </label>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className={`${inputClasses} [color-scheme:inherit]`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Anything worth remembering about this person..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={`${inputClasses} resize-none`}
                />
              </div>

              <div className="mt-1 flex gap-2.5">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                >
                  Cancel
                </button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  type="submit"
                  disabled={submitting || !fullName.trim()}
                  className="relative flex-1 overflow-hidden rounded-xl bg-gradient-to-br from-[#4b32d6] via-[#6246ea] to-[#8b6ae8] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-600/25 transition-opacity hover:opacity-95 disabled:opacity-50"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                      {isEdit ? "Saving..." : "Adding..."}
                    </span>
                  ) : isEdit ? (
                    "Save Changes"
                  ) : (
                    "Add Person"
                  )}
                </motion.button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
