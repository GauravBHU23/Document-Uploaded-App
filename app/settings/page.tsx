"use client";

import { useEffect, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import { useAdmin, useUpdateDisplayName } from "@/lib/auth/use-admin";

export default function SettingsPage() {
  const { data: admin, isLoading } = useAdmin();
  const updateDisplayName = useUpdateDisplayName();

  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    if (admin) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisplayName(admin.display_name ?? "");
    }
  }, [admin]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await updateDisplayName.mutateAsync(displayName);
      toast.success("Saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title="Settings" subtitle="Your account" backHref="/dashboard" />

      <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10 2xl:px-16">
        <div className="mx-auto w-full max-w-lg">
          {isLoading && (
            <div className="skeleton-shimmer h-48 rounded-2xl border border-zinc-200/70 dark:border-zinc-800/70" />
          )}

          {admin && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="glass-surface rounded-2xl border border-zinc-200/80 p-6 shadow-sm dark:border-zinc-800/80"
            >
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                Profile
              </h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                This name appears in the header and the dashboard greeting.
              </p>

              <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Display name
                  </label>
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Gaurav"
                    className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white/80 px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition-all placeholder:text-zinc-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-50 dark:placeholder:text-zinc-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Email
                  </label>
                  <input
                    value={admin.email}
                    disabled
                    className="mt-1.5 w-full cursor-not-allowed rounded-xl border border-zinc-200 bg-zinc-100 px-3.5 py-2.5 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-500"
                  />
                  <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                    Email and password can only be changed from the Supabase Dashboard, to keep account recovery safe.
                  </p>
                </div>

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={updateDisplayName.isPending}
                  className="accent-gradient mt-1 self-start rounded-xl px-5 py-2.5 text-sm font-medium text-white shadow-md shadow-indigo-600/20 transition-opacity hover:opacity-95 disabled:opacity-50"
                >
                  {updateDisplayName.isPending ? "Saving..." : "Save changes"}
                </motion.button>
              </form>
            </motion.div>
          )}
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
