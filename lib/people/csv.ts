import type { Person } from "@/lib/types";

/** Quotes a CSV field only when it actually needs it (contains a
 * comma, quote, or newline) -- keeps the common case readable while
 * staying correct for names/notes that happen to contain punctuation. */
function csvField(value: string | null | undefined): string {
  const v = value ?? "";
  if (/[",\n]/.test(v)) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

/** Exports the people list as a CSV an admin can open in Excel/Sheets
 * -- the only "get my records out in a portable format" path for
 * people data (documents have their own zip export). Notes are
 * included since they can hold anything worth keeping a record of. */
export function downloadPeopleAsCsv(people: Person[], filename: string) {
  const header = ["Full name", "Category", "Date of birth", "Notes", "Created at"];
  const rows = people.map((p) => [
    csvField(p.full_name),
    csvField(p.category),
    csvField(p.date_of_birth),
    csvField(p.notes),
    csvField(p.created_at),
  ]);

  const csv = [header, ...rows].map((row) => row.join(",")).join("\r\n");
  // Leading BOM so Excel opens UTF-8 CSVs without mangling non-ASCII
  // characters (names with diacritics, etc.) -- a well-known Excel
  // quirk, not needed for tools that already assume UTF-8.
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
