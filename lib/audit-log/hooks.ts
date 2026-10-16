"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export type AuditAction =
  | "person_created"
  | "person_updated"
  | "person_deleted"
  | "document_uploaded"
  | "document_trashed"
  | "document_restored"
  | "document_renamed"
  | "document_permanently_deleted";

export type AuditLogEntry = {
  id: string;
  admin_id: string;
  action: AuditAction;
  entity_type: "person" | "document";
  entity_id: string;
  entity_label: string | null;
  person_id: string | null;
  person_label: string | null;
  metadata: Record<string, string> | null;
  created_at: string;
};

const PAGE_SIZE = 50;

export function useAuditLog(page: number) {
  return useQuery({
    queryKey: ["audit-log", page],
    queryFn: async () => {
      const supabase = createClient();

      // Lazily sweep anything past the 30-day retention window before
      // listing, same reasoning as Trash's purge-on-load (see
      // supabase/migrations/0012_audit_log_retention.sql) -- only on
      // the first page, so paging through older entries doesn't
      // re-trigger the sweep on every page change.
      if (page === 0) {
        await supabase.rpc("purge_expired_audit_log");
      }

      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error, count } = await supabase
        .from("audit_log")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw new Error(error.message);
      return { entries: data as AuditLogEntry[], total: count ?? 0 };
    },
  });
}

export function useDeleteAuditLogEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entryId: string) => {
      const supabase = createClient();
      const { error } = await supabase.rpc("delete_audit_log_entry", { p_entry_id: entryId });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audit-log"] });
    },
  });
}

export { PAGE_SIZE };
