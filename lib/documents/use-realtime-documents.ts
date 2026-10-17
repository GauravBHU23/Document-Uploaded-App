"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

/**
 * Subscribes to live Postgres changes on the documents table for one
 * person, invalidating the React Query cache the moment a row is
 * inserted/updated/deleted -- this is the mechanism behind "upload on
 * phone, see it on desktop instantly" (the actual core requirement
 * from the start of this project). RLS applies to the realtime feed
 * itself: this session only ever receives change events for rows its
 * own admin session could already SELECT, so subscribing broadly by
 * person_id (rather than narrowing further) doesn't expose anything
 * a disabled/wrong admin couldn't already see via a normal query.
 */
export function useRealtimeDocuments(personId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!personId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`documents-person-${personId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "documents",
          filter: `person_id=eq.${personId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["documents", personId] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [personId, queryClient]);
}

/**
 * Same mechanism as useRealtimeDocuments, but for Trash -- a single
 * app-wide bin across every person, so it can't filter by person_id
 * the way the per-person hook does. Subscribes to every documents
 * change and invalidates the trash query key; RLS still applies to
 * the realtime feed itself, so this session only ever receives events
 * for rows it could already SELECT (its own admin's documents), same
 * as useRealtimeDocuments.
 */
export function useRealtimeTrash() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("documents-trash")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "documents" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["documents", "trash"] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
