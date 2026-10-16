"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import AppHeader from "@/components/AppHeader";
import { useAdmin } from "@/lib/auth/use-admin";
import { usePeople, useCreatePerson, useDeletePerson } from "@/lib/people/hooks";
import NewPersonDialog from "./new-person-dialog";

const AVATAR_PALETTE = [
  "from-indigo-400 to-violet-500",
  "from-rose-400 to-orange-400",
  "from-emerald-400 to-teal-500",
  "from-sky-400 to-blue-500",
  "from-fuchsia-400 to-pink-500",
  "from-amber-400 to-orange-500",
];

function avatarGradient(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase();
}

export default function DashboardPage() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: admin, isLoading: adminLoading, isError: adminError } = useAdmin();
  const { data: people, isLoading: peopleLoading, isError: peopleError } = usePeople(search);
  const createPerson = useCreatePerson();
  const deletePerson = useDeletePerson();

  async function handleCreate(values: {
    fullName: string;
    category?: string;
    dateOfBirth?: string;
    notes?: string;
  }) {
    if (!admin) return;
    try {
      await createPerson.mutateAsync({ adminId: admin.id, ...values });
      toast.success(`${values.fullName} added`);
      setDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add person");
    }
  }

  async function handleDelete(personId: string, fullName: string) {
    if (!confirm(`Delete ${fullName} and all their documents? This cannot be undone.`)) {
      return;
    }
    try {
      await deletePerson.mutateAsync(personId);
      toast.success(`${fullName} deleted`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete");
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader
        title="Dashboard"
        subtitle={admin ? `Signed in as ${admin.display_name || admin.email}` : undefined}
      />

      <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
        {/* Hero / stat strip */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="accent-gradient relative mb-7 overflow-hidden rounded-2xl p-6 text-white shadow-lg shadow-indigo-900/10 sm:p-8"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.2),transparent_55%)]" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium text-white/75">Welcome back</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                {admin?.display_name || "Your"} Document Workspace
              </h2>
              <p className="mt-1.5 max-w-md text-sm text-white/75">
                Every person&apos;s documents, organized and ready — synced instantly across your devices.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2 rounded-xl bg-white/15 px-4 py-3 backdrop-blur-sm">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 text-white/90">
                <path d="M4.5 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0zM14.25 8.625a3.375 3.375 0 116.75 0 3.375 3.375 0 01-6.75 0zM1.5 19.125a7.125 7.125 0 0114.25 0v.003l-.001.119a.75.75 0 01-.363.63 13.067 13.067 0 01-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 01-.364-.63l-.001-.122zM17.25 19.128l-.001.144a2.25 2.25 0 01-.233.96 10.088 10.088 0 005.06-1.01.75.75 0 00.42-.643 4.875 4.875 0 00-6.957-4.611 8.586 8.586 0 011.71 5.157v.003z" />
              </svg>
              <div>
                <p className="text-xl font-semibold leading-none">{people?.length ?? "–"}</p>
                <p className="text-xs text-white/70">
                  {people?.length === 1 ? "person" : "people"}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {!adminLoading && adminError && (
          <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            Your account is not listed in the <code className="font-mono">admins</code> table,
            so no records are visible. Add your user id there via the Supabase SQL editor.
          </div>
        )}

        {peopleError && (
          <div className="mb-6 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
            Could not load people.
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400">
              <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
            </svg>
            <input
              type="search"
              placeholder="Search people..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-zinc-300 bg-white/80 py-2.5 pl-9 pr-3 text-sm text-zinc-900 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-50"
            />
          </div>
          <motion.button
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={() => setDialogOpen(true)}
            disabled={!admin}
            className="accent-gradient inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-indigo-600/20 transition-opacity hover:opacity-95 disabled:opacity-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
            </svg>
            New Person
          </motion.button>
        </div>

        {peopleLoading && (
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="skeleton-shimmer h-24 rounded-xl border border-zinc-200/70 dark:border-zinc-800/70"
              />
            ))}
          </div>
        )}

        {!peopleLoading && people && people.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-14 flex flex-col items-center text-center"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-400 dark:bg-indigo-950/40 dark:text-indigo-400">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8">
                <path d="M4.5 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0zM14.25 8.625a3.375 3.375 0 116.75 0 3.375 3.375 0 01-6.75 0zM1.5 19.125a7.125 7.125 0 0114.25 0v.003l-.001.119a.75.75 0 01-.363.63 13.067 13.067 0 01-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 01-.364-.63l-.001-.122zM17.25 19.128l-.001.144a2.25 2.25 0 01-.233.96 10.088 10.088 0 005.06-1.01.75.75 0 00.42-.643 4.875 4.875 0 00-6.957-4.611 8.586 8.586 0 011.71 5.157v.003z" />
              </svg>
            </div>
            <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
              {search ? "No matching people found." : "No people yet. Add your first one to get started."}
            </p>
            {!search && (
              <button
                type="button"
                onClick={() => setDialogOpen(true)}
                className="mt-4 text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
              >
                + New Person
              </button>
            )}
          </motion.div>
        )}

        {people && people.length > 0 && (
          <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence initial={false}>
              {people.map((person, i) => (
                <motion.li
                  key={person.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i, 8) * 0.03 } }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.18 }}
                  whileHover={{ y: -2 }}
                  className="group relative rounded-xl border border-zinc-200/80 bg-white/80 p-4 shadow-sm transition-shadow hover:shadow-lg hover:shadow-indigo-900/5 dark:border-zinc-800/80 dark:bg-zinc-950/60"
                >
                  <Link href={`/people/${person.id}`} className="flex items-start gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${avatarGradient(person.id)} text-sm font-semibold text-white shadow-sm`}
                    >
                      {initials(person.full_name) || "?"}
                    </div>
                    <div className="min-w-0 pr-5">
                      <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">
                        {person.full_name}
                      </p>
                      {person.category && (
                        <span className="mt-1 inline-block rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                          {person.category}
                        </span>
                      )}
                    </div>
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(person.id, person.full_name)}
                    className="absolute right-3 top-3 rounded p-1 text-zinc-400 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 dark:hover:bg-red-950/40"
                    aria-label={`Delete ${person.full_name}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                      <path
                        fillRule="evenodd"
                        d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </main>

      <NewPersonDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleCreate}
        submitting={createPerson.isPending}
      />
    </div>
  );
}
