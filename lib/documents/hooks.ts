"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { uploadDocument, deleteDocument as deleteDocumentFile } from "./upload";
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
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);
      return data as Document[];
    },
    enabled: Boolean(personId),
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

export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (document: Document) => {
      const supabase = createClient();
      await deleteDocumentFile(supabase, document);
      return document;
    },
    onSuccess: (document) => {
      queryClient.invalidateQueries({ queryKey: ["documents", document.person_id] });
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
