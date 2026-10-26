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

      const trimmed = search.trim();
      if (trimmed) {
        // Matches name OR category -- searching "OBC" previously found
        // nothing even though category is a real, filterable field.
        query = query.or(`full_name.ilike.%${trimmed}%,category.ilike.%${trimmed}%`);
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

type UpdatePersonInput = {
  personId: string;
  fullName: string;
  category?: string;
  dateOfBirth?: string;
  notes?: string;
};

export function useUpdatePerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdatePersonInput) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("people")
        .update({
          full_name: input.fullName,
          category: input.category || null,
          date_of_birth: input.dateOfBirth || null,
          notes: input.notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", input.personId)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as Person;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["people"] });
      queryClient.invalidateQueries({ queryKey: ["people", "detail", variables.personId] });
    },
  });
}

/** Deletes a person and ALL their documents (active and trashed alike)
 * -- a hard, irreversible delete that bypasses Trash entirely (the DB
 * cascade removes the document rows outright, not a soft-delete).
 * Uses delete_person_and_get_storage_paths (migration 0020) rather
 * than a plain `delete from people`, since an on-delete-cascade only
 * ever removes database rows -- without this RPC, every Storage file
 * that person ever had would be orphaned (unreachable, but still
 * consuming storage quota forever). Same pattern as purgeExpiredTrash
 * in lib/documents/trash.ts: the RPC returns the storage paths, the
 * client removes those objects in one batched Storage call. */
export function useDeletePerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (personId: string) => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("delete_person_and_get_storage_paths", {
        p_person_id: personId,
      });
      if (error) throw new Error(error.message);

      const paths = (data as Array<{ storage_path: string }> | null)?.map((r) => r.storage_path) ?? [];
      if (paths.length > 0) {
        await supabase.storage.from("documents").remove(paths);
      }
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
