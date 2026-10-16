"use client";

import { useQuery } from "@tanstack/react-query";
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
        .select("id, email, display_name")
        .eq("id", userData.user.id)
        .single();

      if (adminError || !admin) throw new Error("Account is not an admin");
      return admin;
    },
    staleTime: 5 * 60_000,
    retry: false,
  });
}
