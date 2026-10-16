import type { SupabaseClient } from "@supabase/supabase-js";
import type { Document } from "@/lib/types";
import { deleteDocument as permanentlyDeleteDocument } from "./upload";

const TRASH_RETENTION_DAYS = 30;

/** Soft-deletes a document: marks it deleted_at = now(). The storage
 * file and database row both stay intact -- it can be restored, or
 * will be permanently purged after TRASH_RETENTION_DAYS. */
export async function moveToTrash(supabase: SupabaseClient, documentId: string) {
  const { error } = await supabase
    .from("documents")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", documentId);

  if (error) throw new Error(`Could not move to trash: ${error.message}`);
}

/** Restores a soft-deleted document (clears deleted_at). */
export async function restoreFromTrash(supabase: SupabaseClient, documentId: string) {
  const { error } = await supabase
    .from("documents")
    .update({ deleted_at: null })
    .eq("id", documentId);

  if (error) throw new Error(`Could not restore: ${error.message}`);
}

/** Permanently deletes one trashed document right now (storage file +
 * database row), bypassing the 30-day wait. */
export async function permanentlyDeleteFromTrash(
  supabase: SupabaseClient,
  document: Pick<Document, "id" | "storage_path">,
) {
  await permanentlyDeleteDocument(supabase, document);
}

/** Sweeps and permanently deletes every document this admin soft-
 * deleted more than TRASH_RETENTION_DAYS ago. There is no cron job in
 * this app (no backend server to run one on) -- this runs lazily
 * whenever the Trash page loads, which is a reasonable cadence for a
 * single-admin tool used at least occasionally. The RPC deletes the
 * database rows and returns their storage paths; the storage objects
 * are then removed in a single batched call. */
export async function purgeExpiredTrash(supabase: SupabaseClient): Promise<number> {
  const { data, error } = await supabase.rpc("purge_expired_trash");
  if (error) throw new Error(`Could not purge expired trash: ${error.message}`);

  const paths = (data as Array<{ storage_path: string }> | null)?.map((r) => r.storage_path) ?? [];
  if (paths.length > 0) {
    await supabase.storage.from("documents").remove(paths);
  }
  return paths.length;
}

export { TRASH_RETENTION_DAYS };
