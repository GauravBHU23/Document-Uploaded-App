"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { uploadDocument } from "./upload";
import {
  moveToTrash,
  restoreFromTrash,
  permanentlyDeleteFromTrash,
  purgeExpiredTrash,
} from "./trash";
import type { Document, DocumentSource } from "@/lib/types";

export function useDocuments(personId: string) {
  return useQuery({
    queryKey: ["documents", personId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("person_id", personId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);
      return data as Document[];
    },
    enabled: Boolean(personId),
  });
}

/** All of this admin's trashed documents, across every person --
 * Trash is a single app-wide bin, not scoped per person, so a
 * document deleted from any folder shows up in one place. */
export function useTrashedDocuments() {
  return useQuery({
    queryKey: ["documents", "trash"],
    queryFn: async () => {
      const supabase = createClient();
      // Lazily sweep anything past the 30-day retention window before
      // listing, so the Trash view never shows rows that are about to
      // vanish on their own -- and the admin, if they have the tab
      // open for a while, doesn't see a permanently-deleted document
      // linger until a manual refresh.
      await purgeExpiredTrash(supabase);

      const { data, error } = await supabase
        .from("documents")
        .select("*, people(full_name)")
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });

      if (error) throw new Error(error.message);
      return data as (Document & { people: { full_name: string } | null })[];
    },
  });
}

type UploadInput = {
  adminId: string;
  personId: string;
  file: File;
  label: string;
  source?: DocumentSource;
};

export function useUploadDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UploadInput) => {
      const supabase = createClient();
      return uploadDocument({
        supabase,
        adminId: input.adminId,
        personId: input.personId,
        file: input.file,
        label: input.label,
        source: input.source,
      });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["documents", variables.personId] });
    },
  });
}

/** Soft-deletes (moves to Trash) -- the normal "delete" action
 * throughout the app. Recoverable for 30 days. */
export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (document: Document) => {
      const supabase = createClient();
      await moveToTrash(supabase, document.id);
      return document;
    },
    onSuccess: (document) => {
      queryClient.invalidateQueries({ queryKey: ["documents", document.person_id] });
      queryClient.invalidateQueries({ queryKey: ["documents", "trash"] });
    },
  });
}

export function useRestoreDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (document: Document) => {
      const supabase = createClient();
      await restoreFromTrash(supabase, document.id);
      return document;
    },
    onSuccess: (document) => {
      queryClient.invalidateQueries({ queryKey: ["documents", document.person_id] });
      queryClient.invalidateQueries({ queryKey: ["documents", "trash"] });
    },
  });
}

/** Permanently deletes a trashed document right now, bypassing the
 * 30-day wait. Irreversible. */
export function usePermanentlyDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (document: Document) => {
      const supabase = createClient();
      await permanentlyDeleteFromTrash(supabase, document);
      return document;
    },
    onSuccess: (document) => {
      queryClient.invalidateQueries({ queryKey: ["documents", "trash"] });
      queryClient.invalidateQueries({ queryKey: ["documents", document.person_id] });
    },
  });
}

/** Soft-deletes (moves to Trash) every document in one batched
 * update, instead of one request per document. */
export function useBulkDeleteDocuments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (documents: Document[]) => {
      if (documents.length === 0) return documents;
      const supabase = createClient();
      const ids = documents.map((d) => d.id);
      const { error } = await supabase
        .from("documents")
        .update({ deleted_at: new Date().toISOString() })
        .in("id", ids);

      if (error) throw new Error(error.message);
      return documents;
    },
    onSuccess: (documents) => {
      const personIds = new Set(documents.map((d) => d.person_id));
      personIds.forEach((personId) => {
        queryClient.invalidateQueries({ queryKey: ["documents", personId] });
      });
      queryClient.invalidateQueries({ queryKey: ["documents", "trash"] });
    },
  });
}

export function useRenameDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ documentId, label }: { documentId: string; label: string }) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("documents")
        .update({ label })
        .eq("id", documentId)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as Document;
    },
    onSuccess: (document) => {
      queryClient.invalidateQueries({ queryKey: ["documents", document.person_id] });
    },
  });
}
