"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export function useAdmin() {
  return useQuery({
    queryKey: ["admin", "me"],
    queryFn: async () => {
      const supabase = createClient();
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error("Not signed in");

      const { data: admin, error: adminError } = await supabase
        .from("admins")
        .select("id, email, display_name, trash_retention_days, expiry_warning_days")
        .eq("id", userData.user.id)
        .single();

      if (adminError || !admin) throw new Error("Account is not an admin");
      return admin;
    },
    staleTime: 5 * 60_000,
    retry: false,
  });
}

export function useUpdateDisplayName() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (displayName: string) => {
      const supabase = createClient();
      const { error } = await supabase.rpc("update_my_display_name", {
        p_display_name: displayName.trim() || null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "me"] });
    },
  });
}

/** Updates the admin's trash retention and expiry-warning windows
 * (both previously hardcoded to 30 days in SQL -- see migration
 * 0025_configurable_retention_windows.sql). Invalidates the
 * expiring-soon query too, since that window just changed. */
export function useUpdateRetentionSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      trashRetentionDays,
      expiryWarningDays,
    }: {
      trashRetentionDays: number;
      expiryWarningDays: number;
    }) => {
      const supabase = createClient();
      const { error } = await supabase.rpc("update_retention_settings", {
        p_trash_retention_days: trashRetentionDays,
        p_expiry_warning_days: expiryWarningDays,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "me"] });
      queryClient.invalidateQueries({ queryKey: ["documents", "expiring-soon"] });
    },
  });
}
