"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import AppHeader from "@/components/AppHeader";
import { useAdmin } from "@/lib/auth/use-admin";
import { usePeople, useCreatePerson, useDeletePerson } from "@/lib/people/hooks";
import NewPersonDialog from "./new-person-dialog";

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
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <AppHeader
        title="Dashboard"
        subtitle={admin ? `Signed in as ${admin.display_name || admin.email}` : undefined}
      />

      <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">
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
            <input
              type="search"
              placeholder="Search people..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </div>
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            disabled={!admin}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
            </svg>
            New Person
          </button>
        </div>

        {peopleLoading && (
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
              />
            ))}
          </div>
        )}

        {!peopleLoading && people && people.length === 0 && (
          <p className="mt-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
            {search ? "No matching people found." : "No people yet. Click \"New Person\" to add one."}
          </p>
        )}

        {people && people.length > 0 && (
          <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence initial={false}>
              {people.map((person) => (
                <motion.li
                  key={person.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.18 }}
                  className="group relative rounded-xl border border-zinc-200 bg-white p-4 transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <Link href={`/people/${person.id}`} className="block">
                    <p className="pr-6 font-medium text-zinc-900 dark:text-zinc-50">
                      {person.full_name}
                    </p>
                    {person.category && (
                      <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                        {person.category}
                      </p>
                    )}
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
