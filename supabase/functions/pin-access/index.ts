// Supabase Edge Function: pin-access
//
// Lets a person view, download, and upload their own documents using
// a PIN, with no login/signup. This function is the ONLY place that ever
// uses the service role key -- it lives here, in Supabase's secure
// Edge Function environment (provided automatically as
// SUPABASE_SERVICE_ROLE_KEY), and is never present in the Next.js app
// or any browser bundle. The Next.js app only ever talks to this
// function over HTTPS with the person's id, PIN, and (for downloads)
// a document id.
//
// Every request re-verifies the PIN against the verify_person_pin
// RPC (defined in supabase/migrations/0002_person_pin_access.sql and
// fixed in 0003_fix_pin_rate_limit.sql), which rate-limits attempts
// to 8 per 10 minutes per person. There is no session token to steal
// or replay beyond the PIN itself.
//
// list_documents_for_pin returns a `pin_valid` flag on every row (or
// a single row with pin_valid=false and every other column null when
// the PIN is wrong) rather than raising an exception -- raising would
// roll back the attempt-counter row that verify_person_pin just
// inserted in the same call, silently defeating the rate limit.
//
// The "upload" action (added in 0010_pin_self_upload.sql) lets the
// PIN holder add their own documents. It writes to the same storage
// path shape as the admin's normal upload (admin_id/person_id/...),
// so these files appear in the admin's view exactly like any other
// document -- just tagged source='self_upload'. The row is written
// via insert_document_for_pin, which independently re-verifies the
// PIN and looks up admin_id itself (never trusts a client-supplied
// admin_id), so a PIN only ever grants write access into the one
// person's folder it belongs to.

import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

type PinRow = {
  pin_valid: boolean;
  id: string | null;
  label: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string | null;
  storage_path: string | null;
};

type RequestBody = {
  action: "list" | "download" | "person_name" | "upload";
  personId: string;
  pin?: string;
  documentId?: string;
  label?: string;
  fileName?: string;
  mimeType?: string;
  fileBase64?: string;
};

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
}

async function listForPin(
  admin: ReturnType<typeof createClient>,
  personId: string,
  pin: string,
): Promise<{ valid: boolean; rows: PinRow[] }> {
  const { data, error } = await admin.rpc("list_documents_for_pin", {
    p_person_id: personId,
    p_pin: pin,
  });

  if (error) return { valid: false, rows: [] };

  const rows = (data as PinRow[]) ?? [];
  const valid = rows.length === 0 ? false : rows[0].pin_valid;
  return { valid, rows: valid ? rows : [] };
}

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

  const { action, personId, pin, documentId, label, fileName, mimeType, fileBase64 } = body;

  if (!personId || typeof personId !== "string") {
    return json({ error: "personId is required" }, 400);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  if (action === "person_name") {
    const { data, error } = await admin.rpc("get_person_name", { p_person_id: personId });
    if (error) return json({ error: "Could not look up person" }, 404);
    return json({ name: data });
  }

  if (!pin || typeof pin !== "string") {
    return json({ error: "pin is required" }, 400);
  }

  if (action === "list") {
    const { valid, rows } = await listForPin(admin, personId, pin);

    if (!valid) {
      return json({ error: "Invalid PIN or too many attempts" }, 401);
    }

    // rows may include a pin_valid-only marker row (id: null) when the
    // person has zero documents -- filter that out of the response.
    const documents = rows
      .filter((r) => r.id !== null)
      .map(({ pin_valid: _pinValid, ...doc }) => doc);
    return json({ documents });
  }

  if (action === "download") {
    if (!documentId) return json({ error: "documentId is required" }, 400);

    const { valid, rows } = await listForPin(admin, personId, pin);

    if (!valid) {
      return json({ error: "Invalid PIN or too many attempts" }, 401);
    }

    // Confirming the requested documentId is actually in this
    // person's own list (just fetched under the same verified PIN)
    // is what stops a valid PIN holder from downloading another
    // person's file by guessing a documentId.
    const match = rows.find((d) => d.id === documentId);

    if (!match || !match.storage_path) {
      return json({ error: "Document not found" }, 404);
    }

    const { data: signed, error: signError } = await admin.storage
      .from("documents")
      .createSignedUrl(match.storage_path, 60);

    if (signError || !signed) {
      return json({ error: "Could not create download link" }, 500);
    }

    return json({ url: signed.signedUrl });
  }

  if (action === "upload") {
    if (!label || typeof label !== "string") {
      return json({ error: "label is required" }, 400);
    }
    if (!fileName || !mimeType || !fileBase64) {
      return json({ error: "fileName, mimeType and fileBase64 are required" }, 400);
    }

    // Re-verify the PIN directly (rather than via listForPin) so a
    // person with zero existing documents can still upload their
    // first one -- listForPin's valid/rows shape is about reading
    // documents that already exist, not about authorizing a write.
    const { data: pinOk, error: pinError } = await admin.rpc("verify_person_pin", {
      p_person_id: personId,
      p_pin: pin,
    });

    if (pinError || !pinOk) {
      return json({ error: "Invalid PIN or too many attempts" }, 401);
    }

    const { data: adminIdRow, error: adminIdError } = await admin
      .from("people")
      .select("admin_id")
      .eq("id", personId)
      .single();

    if (adminIdError || !adminIdRow) {
      return json({ error: "Person not found" }, 404);
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
    const storagePath = `${adminIdRow.admin_id}/${personId}/${documentId}-${sanitizeFilename(fileName)}`;

    const { error: uploadError } = await admin.storage
      .from("documents")
      .upload(storagePath, bytes, { contentType: mimeType, upsert: false });

    if (uploadError) {
      return json({ error: `Upload failed: ${uploadError.message}` }, 500);
    }

    const { error: insertError } = await admin.rpc("insert_document_for_pin", {
      p_person_id: personId,
      p_pin: pin,
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
