import type { SupabaseClient } from "@supabase/supabase-js";
import type { Document, DocumentSource } from "@/lib/types";

type UploadDocumentParams = {
  supabase: SupabaseClient;
  adminId: string;
  personId: string;
  file: File;
  label: string;
  source?: DocumentSource;
};

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
}

export async function uploadDocument({
  supabase,
  adminId,
  personId,
  file,
  label,
  source = "upload",
}: UploadDocumentParams): Promise<Document> {
  const documentId = crypto.randomUUID();
  const storagePath = `${adminId}/${personId}/${documentId}-${sanitizeFilename(file.name)}`;

  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(storagePath, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  const { data: row, error: insertError } = await supabase
    .from("documents")
    .insert({
      id: documentId,
      person_id: personId,
      admin_id: adminId,
      label,
      storage_path: storagePath,
      mime_type: file.type || "application/octet-stream",
      size_bytes: file.size,
      source,
    })
    .select()
    .single();

  if (insertError) {
    // Roll back the uploaded file so storage never has an orphaned object
    // with no matching documents row.
    await supabase.storage.from("documents").remove([storagePath]);
    throw new Error(`Saving document record failed: ${insertError.message}`);
  }

  return row as Document;
}

export async function getSignedUrl(
  supabase: SupabaseClient,
  storagePath: string,
  expiresInSeconds = 60,
) {
  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error || !data) {
    throw new Error(`Could not create signed URL: ${error?.message}`);
  }

  return data.signedUrl;
}

export async function deleteDocument(
  supabase: SupabaseClient,
  document: Pick<Document, "id" | "storage_path">,
) {
  const { error: storageError } = await supabase.storage
    .from("documents")
    .remove([document.storage_path]);

  if (storageError) {
    throw new Error(`Could not delete file: ${storageError.message}`);
  }

  const { error: dbError } = await supabase
    .from("documents")
    .delete()
    .eq("id", document.id);

  if (dbError) {
    throw new Error(`Could not delete document record: ${dbError.message}`);
  }
}
