"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

const SESSION_LIFETIME_MINUTES = 10;

type UploadSession = {
  id: string;
  admin_id: string;
  person_id: string;
  created_at: string;
  expires_at: string;
};

/** Creates a short-lived upload_sessions row the QR code points to.
 * This grants no access by itself -- the /m/[sessionId] page it leads
 * to still requires the same admin login as every other page. It only
 * remembers "which person was this QR for" so the phone doesn't need
 * to navigate manually on a small screen. See the plan's QR flow
 * design notes in supabase/migrations/0001_init.sql. */
export function useCreateUploadSession() {
  return useMutation({
    mutationFn: async ({ adminId, personId }: { adminId: string; personId: string }) => {
      const supabase = createClient();
      const expiresAt = new Date(Date.now() + SESSION_LIFETIME_MINUTES * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from("upload_sessions")
        .insert({ admin_id: adminId, person_id: personId, expires_at: expiresAt })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as UploadSession;
    },
  });
}

/** Loads one upload session by id, scoped by RLS to the current admin
 * (so even a guessed/shared session id from a different admin's
 * project is simply invisible, not "wrong person"). Returns null
 * (not an error) when the session doesn't exist, isn't this admin's,
 * or has expired -- all three cases should look identical to the
 * caller: "this link no longer works." */
export function useUploadSession(sessionId: string) {
  return useQuery({
    queryKey: ["upload-session", sessionId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("upload_sessions")
        .select("*, people(id, full_name)")
        .eq("id", sessionId)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!data) return null;

      const isExpired = new Date(data.expires_at).getTime() < Date.now();
      if (isExpired) return null;

      return data as UploadSession & { people: { id: string; full_name: string } };
    },
    enabled: Boolean(sessionId),
    retry: false,
  });
}

export { SESSION_LIFETIME_MINUTES };
