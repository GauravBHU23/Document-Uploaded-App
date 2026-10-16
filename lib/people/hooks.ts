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

export function useSetPersonPin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ personId, pin }: { personId: string; pin: string }) => {
      const supabase = createClient();
      const { error } = await supabase.rpc("set_person_pin", {
        p_person_id: personId,
        p_pin: pin,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["people", "detail", variables.personId] });
    },
  });
}

export function useClearPersonPin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (personId: string) => {
      const supabase = createClient();
      const { error } = await supabase.rpc("clear_person_pin", { p_person_id: personId });
      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, personId) => {
      queryClient.invalidateQueries({ queryKey: ["people", "detail", personId] });
    },
  });
}

export function useCreateUploadToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (personId: string) => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("create_upload_token", { p_person_id: personId });
      if (error) throw new Error(error.message);
      return data as string;
    },
    onSuccess: (_data, personId) => {
      queryClient.invalidateQueries({ queryKey: ["people", "detail", personId] });
    },
  });
}

export function useClearUploadToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (personId: string) => {
      const supabase = createClient();
      const { error } = await supabase.rpc("clear_upload_token", { p_person_id: personId });
      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, personId) => {
      queryClient.invalidateQueries({ queryKey: ["people", "detail", personId] });
    },
  });
}
