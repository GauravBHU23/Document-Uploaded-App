// Supabase Edge Function: pin-access
//
// Lets a person view and download their own documents using a PIN,
// with no login/signup. This function is the ONLY place that ever
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
  action: "list" | "download" | "person_name";
  personId: string;
  pin?: string;
  documentId?: string;
};

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

  const { action, personId, pin, documentId } = body;

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

  return json({ error: "Unknown action" }, 400);
});
