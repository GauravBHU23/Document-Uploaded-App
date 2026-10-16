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
