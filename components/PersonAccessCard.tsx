"use client";

import { useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useSetPersonPin, useClearPersonPin } from "@/lib/people/hooks";
import type { Person } from "@/lib/types";

function generatePin() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export default function PersonAccessCard({ person }: { person: Person }) {
  const [editing, setEditing] = useState(false);
  const [pin, setPin] = useState("");
  const [copied, setCopied] = useState(false);

  const setPersonPin = useSetPersonPin();
  const clearPersonPin = useClearPersonPin();

  const hasPin = Boolean(person.access_pin_hash);
  const viewUrl =
    typeof window !== "undefined" ? `${window.location.origin}/view/${person.id}` : "";

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^\d{4,6}$/.test(pin)) {
      toast.error("PIN must be 4 to 6 digits");
      return;
    }
    try {
      await setPersonPin.mutateAsync({ personId: person.id, pin });
      toast.success(hasPin ? "PIN updated" : "PIN created — share the link below");
      setEditing(false);
      setPin("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save PIN");
    }
  }

  async function handleClear() {
    if (!confirm(`Remove ${person.full_name}'s access PIN? Their link will stop working.`)) return;
    try {
      await clearPersonPin.mutateAsync(person.id);
      toast.success("Access disabled");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove PIN");
    }
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(viewUrl);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy link");
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white/70 p-4 dark:border-zinc-800/80 dark:bg-zinc-950/50">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            hasPin
              ? "bg-emerald-50 text-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-400"
              : "bg-zinc-100 text-zinc-400 dark:bg-zinc-900 dark:text-zinc-500"
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
            <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
            {person.full_name}&apos;s self-access
          </p>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            {hasPin
              ? "PIN is active — they can view and download their own documents with the link below."
              : "Give them a private link + PIN so they can view their own documents (view & download only)."}
          </p>
        </div>
      </div>

      {hasPin && !editing && (
        <div className="mt-3 flex flex-col gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/60">
            <span className="min-w-0 flex-1 truncate font-mono text-xs text-zinc-600 dark:text-zinc-400">
              {viewUrl}
            </span>
            <button
              type="button"
              onClick={handleCopyLink}
              className="shrink-0 rounded-md bg-white px-2 py-1 text-xs font-medium text-zinc-600 shadow-sm transition-colors hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="flex-1 rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              Change PIN
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="flex-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              Disable access
            </button>
          </div>
        </div>
      )}

      {!hasPin && !editing && (
        <button
          type="button"
          onClick={() => {
            setPin(generatePin());
            setEditing(true);
          }}
          className="accent-gradient mt-3 w-full rounded-lg px-3 py-2 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-95"
        >
          Create access PIN
        </button>
      )}

      <AnimatePresence>
        {editing && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSave}
            className="mt-3 overflow-hidden"
          >
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              4-6 digit PIN
            </label>
            <div className="mt-1 flex gap-2">
              <input
                autoFocus
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                className="flex-1 rounded-lg border border-zinc-300 px-3 py-1.5 text-center font-mono text-sm tracking-widest text-zinc-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
              <button
                type="button"
                onClick={() => setPin(generatePin())}
                className="rounded-lg border border-zinc-300 px-2 text-xs text-zinc-500 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
                title="Generate random PIN"
              >
                🎲
              </button>
            </div>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setPin("");
                }}
                className="flex-1 rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={setPersonPin.isPending || !/^\d{4,6}$/.test(pin)}
                className="accent-gradient flex-1 rounded-lg px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-opacity hover:opacity-95 disabled:opacity-50"
              >
                {setPersonPin.isPending ? "Saving..." : "Save PIN"}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
