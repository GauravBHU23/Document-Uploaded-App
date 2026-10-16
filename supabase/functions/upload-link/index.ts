// Supabase Edge Function: upload-link
//
// A PIN-free, upload-only counterpart to pin-access (supabase/functions/
// pin-access). A person's self-access card (components/
// PersonUploadLinkCard.tsx) can hand out a link carrying a random,
// unguessable token (people.upload_token, set via create_upload_token
// in supabase/migrations/0011_upload_only_link.sql) instead of a PIN.
// Whoever has the link can add a document for that person -- nothing
// else. There is no action to list or download: the token grants
// write-only access by design, so this function never needs to read
// documents back.
//
// Like pin-access, this is the only place that uses the service role
// key, which is provided automatically as SUPABASE_SERVICE_ROLE_KEY in
// Supabase's Edge Function environment and is never present in the
// Next.js app or any browser bundle. The token itself carries all the
// authorization -- insert_document_for_token looks up person_id and
// admin_id from the token server-side and never trusts a
// client-supplied id, so this token can only ever write into the one
// person's folder it was issued for.

import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
}

type RequestBody = {
  action: "person_name" | "upload";
  token: string;
  label?: string;
  fileName?: string;
  mimeType?: string;
  fileBase64?: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }

  const { action, token, label, fileName, mimeType, fileBase64 } = body;

  if (!token || typeof token !== "string") {
    return json({ error: "token is required" }, 400);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  if (action === "person_name") {
    const { data, error } = await admin.rpc("get_person_name_by_token", { p_token: token });
    if (error || !data) return json({ error: "This link is invalid or no longer available" }, 404);
    return json({ name: data });
  }

  if (action === "upload") {
    if (!label || typeof label !== "string") {
      return json({ error: "label is required" }, 400);
    }
    if (!fileName || !mimeType || !fileBase64) {
      return json({ error: "fileName, mimeType and fileBase64 are required" }, 400);
    }

    const { data: person, error: personError } = await admin
      .from("people")
      .select("id, admin_id")
      .eq("upload_token", token)
      .single();

    if (personError || !person) {
      return json({ error: "This link is invalid or no longer available" }, 404);
    }

    let bytes: Uint8Array;
    try {
      bytes = Uint8Array.from(atob(fileBase64), (c) => c.charCodeAt(0));
    } catch {
      return json({ error: "Invalid file data" }, 400);
    }

    if (bytes.byteLength === 0 || bytes.byteLength > MAX_UPLOAD_BYTES) {
      return json({ error: "File is empty or too large (max 25MB)" }, 400);
    }

    const documentId = crypto.randomUUID();
    const storagePath = `${person.admin_id}/${person.id}/${documentId}-${sanitizeFilename(fileName)}`;

    const { error: uploadError } = await admin.storage
      .from("documents")
      .upload(storagePath, bytes, { contentType: mimeType, upsert: false });

    if (uploadError) {
      return json({ error: `Upload failed: ${uploadError.message}` }, 500);
    }

    const { error: insertError } = await admin.rpc("insert_document_for_token", {
      p_token: token,
      p_document_id: documentId,
      p_label: label,
      p_storage_path: storagePath,
      p_mime_type: mimeType,
      p_size_bytes: bytes.byteLength,
    });

    if (insertError) {
      await admin.storage.from("documents").remove([storagePath]);
      return json({ error: `Could not save document record: ${insertError.message}` }, 500);
    }

    return json({ id: documentId });
  }

  return json({ error: "Unknown action" }, 400);
});
