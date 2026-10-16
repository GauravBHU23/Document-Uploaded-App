"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { usePeople } from "@/lib/people/hooks";
import { useAdmin } from "@/lib/auth/use-admin";
import { useUploadDocument } from "@/lib/documents/hooks";
import { DOCUMENT_LABEL_SUGGESTIONS } from "@/lib/types";

type SaveToPersonPickerProps = {
  file: File | null;
  defaultLabel: string;
  onSaved?: () => void;
};

export default function SaveToPersonPicker({ file, defaultLabel, onSaved }: SaveToPersonPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [label, setLabel] = useState(defaultLabel);

  const { data: admin } = useAdmin();
  const { data: people, isLoading } = usePeople(search);
  const uploadDocument = useUploadDocument();

  function handleOpen() {
    setLabel(defaultLabel);
    setSelectedPersonId(null);
    setOpen(true);
  }

  async function handleSave() {
    if (!file || !admin || !selectedPersonId || !label.trim()) return;
    try {
      await uploadDocument.mutateAsync({
        adminId: admin.id,
        personId: selectedPersonId,
        file,
        label: label.trim(),
        source: "tool_generated",
      });
      toast.success(`Saved to ${people?.find((p) => p.id === selectedPersonId)?.full_name}`);
      setOpen(false);
      onSaved?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        disabled={!file}
        className="flex-1 rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
      >
        Save to a person
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
              className="glass-surface w-full max-w-sm rounded-t-2xl border border-zinc-200/80 p-6 shadow-2xl sm:rounded-2xl dark:border-zinc-800/80"
            >
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Save to a person
              </h2>
              <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                Choose who this document belongs to.
              </p>

              <input
                type="search"
                placeholder="Search people..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="mt-4 w-full rounded-xl border border-zinc-300 bg-white/80 px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-50"
              />

              <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
                {isLoading && (
                  <p className="px-3 py-3 text-sm text-zinc-500 dark:text-zinc-400">Loading...</p>
                )}
                {!isLoading && people?.length === 0 && (
                  <p className="px-3 py-3 text-sm text-zinc-500 dark:text-zinc-400">No people found.</p>
                )}
                {people?.map((person) => (
                  <button
                    key={person.id}
                    type="button"
                    onClick={() => setSelectedPersonId(person.id)}
                    className={`block w-full px-3 py-2.5 text-left text-sm transition-colors ${
                      selectedPersonId === person.id
                        ? "bg-indigo-50 font-medium text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
                        : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-900"
                    }`}
                  >
                    {person.full_name}
                  </button>
                ))}
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Document name
                </label>
                <input
                  list="tool-label-suggestions"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white/80 px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-50"
                />
                <datalist id="tool-label-suggestions">
                  {DOCUMENT_LABEL_SUGGESTIONS.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>

              <div className="mt-5 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!selectedPersonId || !label.trim() || uploadDocument.isPending}
                  className="flex-1 rounded-xl bg-gradient-to-br from-[#4b32d6] via-[#6246ea] to-[#8b6ae8] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-600/25 transition-opacity hover:opacity-95 disabled:opacity-50"
                >
                  {uploadDocument.isPending ? "Saving..." : "Save"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
