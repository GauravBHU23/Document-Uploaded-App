"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
 * Global notifier for documents that arrive via a person's own PIN or
 * upload-link token while the admin isn't looking -- without this,
 * someone on the dashboard (or on a different person's page) has no
 * way to know a new document just landed; they'd only find out by
 * clicking into that specific person's folder. Meant to be mounted
 * once, app-wide (in AppHeader, so it's present on every logged-in
 * page), unlike useRealtimeDocuments/useRealtimeTrash which are
 * scoped to whichever page actually needs the live list refreshed.
 *
 * Deliberately only toasts for source = 'self_upload' (PIN/upload-link
 * uploads) -- the admin's own uploads/captures/tool-generated
 * documents don't need a notification, since they just did it
 * themselves. Suppressed entirely while already on that person's own
 * folder page (useRealtimeDocuments there already updates the list
 * live; a toast on top would be redundant).
 */
export function useNewDocumentNotifier() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  // The subscription below is set up once (it never re-runs on
  // navigation, so no unsubscribe/resubscribe gap can drop an event);
  // its handler reads the CURRENT path/router via these refs (kept in
  // sync by a separate effect) instead of closing over values from
  // whenever the subscription was first created.
  const pathnameRef = useRef(pathname);
  const routerRef = useRef(router);

  useEffect(() => {
    pathnameRef.current = pathname;
    routerRef.current = router;
  }, [pathname, router]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("documents-new-self-upload-notifier")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "documents", filter: "source=eq.self_upload" },
        async (payload) => {
          const personId = payload.new.person_id as string;
          if (pathnameRef.current === `/people/${personId}`) return;

          queryClient.invalidateQueries({ queryKey: ["documents", "total-count"] });

          const { data: person } = await supabase
            .from("people")
            .select("full_name")
            .eq("id", personId)
            .single();

          const label = (payload.new.label as string) || "A document";
          const personName = person?.full_name ?? "someone";
          toast.info(`${personName} uploaded "${label}"`, {
            action: {
              label: "View",
              onClick: () => {
                routerRef.current.push(`/people/${personId}`);
              },
            },
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

/**
 * Notifies the admin the moment someone uses "Forgot PIN?" on their
 * view link (request_person_pin_reset in
 * supabase/migrations/0019_pin_reset_requests.sql). The new PIN is
 * delivered here as plaintext -- shown once in a toast with a copy
 * button -- then the row is deleted from pin_reset_deliveries right
 * away, so it never lingers at rest longer than it takes this
 * subscription to receive the INSERT event. RLS on that table already
 * restricts reads/deletes to the owning admin; this subscription just
 * receives what RLS would already allow a normal SELECT to see.
 */
export function usePinResetNotifier() {
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("pin-reset-deliveries-notifier")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "pin_reset_deliveries" },
        async (payload) => {
          const deliveryId = payload.new.id as string;
          const personId = payload.new.person_id as string;
          const pin = payload.new.plaintext_pin as string;

          const { data: person } = await supabase
            .from("people")
            .select("full_name")
            .eq("id", personId)
            .single();

          const personName = person?.full_name ?? "Someone";

          toast.info(`${personName} requested a new PIN: ${pin}`, {
            duration: 20000,
            action: {
              label: "Copy",
              onClick: () => {
                navigator.clipboard?.writeText(pin).catch(() => {});
              },
            },
          });

          await supabase.from("pin_reset_deliveries").delete().eq("id", deliveryId);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
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
