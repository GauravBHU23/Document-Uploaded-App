"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Person } from "@/lib/types";

export function usePeople(search: string) {
  return useQuery({
    queryKey: ["people", search],
    queryFn: async () => {
      const supabase = createClient();
      let query = supabase
        .from("people")
        .select("*")
        .order("created_at", { ascending: false });

      if (search.trim()) {
        query = query.ilike("full_name", `%${search.trim()}%`);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data as Person[];
    },
  });
}

export function usePerson(personId: string) {
  return useQuery({
    queryKey: ["people", "detail", personId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("people")
        .select("*")
        .eq("id", personId)
        .single();

      if (error) throw new Error(error.message);
      return data as Person;
    },
    enabled: Boolean(personId),
  });
}

type CreatePersonInput = {
  adminId: string;
  fullName: string;
  category?: string;
  dateOfBirth?: string;
  notes?: string;
};

export function useCreatePerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePersonInput) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("people")
        .insert({
          admin_id: input.adminId,
          full_name: input.fullName,
          category: input.category || null,
          date_of_birth: input.dateOfBirth || null,
          notes: input.notes || null,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as Person;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["people"] });
    },
  });
}

export function useDeletePerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (personId: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("people").delete().eq("id", personId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["people"] });
    },
  });
}
