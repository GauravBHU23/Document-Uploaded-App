import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "./sign-out-button";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  const { data: admin } = await supabase
    .from("admins")
    .select("display_name, email")
    .eq("id", userData.user.id)
    .maybeSingle();

  const { data: people, error: peopleError } = await supabase
    .from("people")
    .select("id, full_name, category, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Dashboard
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Signed in as {admin?.display_name || admin?.email || userData.user.email}
          </p>
        </div>
        <SignOutButton />
      </header>

      <main className="flex-1 px-6 py-8">
        {!admin && (
          <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            Your account is logged in but is not yet listed in the{" "}
            <code className="font-mono">admins</code> table, so no records are
            visible. Add your user id there via the Supabase SQL editor.
          </div>
        )}

        {peopleError && (
          <div className="mb-6 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
            Could not load people: {peopleError.message}
          </div>
        )}

        <div className="flex items-center justify-between">
          <h2 className="text-base font-medium text-zinc-900 dark:text-zinc-50">
            People
          </h2>
          <button
            type="button"
            disabled
            title="Coming in Phase 2"
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white opacity-60"
          >
            + New Person
          </button>
        </div>

        {people && people.length === 0 && (
          <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400">
            No people yet. Person profiles and document upload are coming in
            Phase 2.
          </p>
        )}

        {people && people.length > 0 && (
          <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {people.map((person) => (
              <li
                key={person.id}
                className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <p className="font-medium text-zinc-900 dark:text-zinc-50">
                  {person.full_name}
                </p>
                {person.category && (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {person.category}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
