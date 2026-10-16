// Supabase Edge Function: pin-access
//
// Lets a person view and download their own documents using a PIN,
// with no login/signup. This function is the ONLY place that ever
// uses the service role key -- it lives here, in Supabase's secure
// Edge Function environment (set as a secret via `supabase secrets
// set`), and is never present in the Next.js app or any browser
// bundle. The Next.js app only ever talks to this function over
// HTTPS with the person's id, PIN, and (for downloads) a document id.
//
// Every request re-verifies the PIN against the `verify_person_pin`
// RPC (defined in supabase/migrations/0002_person_pin_access.sql,
// which itself rate-limits attempts). There is no session token to
// steal or replay beyond the PIN itself -- if the PIN is wrong or the
// person has no PIN set, every action below is refused.

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

type RequestBody = {
  action: "list" | "download" | "person_name";
  personId: string;
  pin?: string;
  documentId?: string;
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
    const { data, error } = await admin.rpc("list_documents_for_pin", {
      p_person_id: personId,
      p_pin: pin,
    });

    if (error) {
      return json({ error: "Invalid PIN or too many attempts" }, 401);
    }

    return json({ documents: data });
  }

  if (action === "download") {
    if (!documentId) return json({ error: "documentId is required" }, 400);

    // Re-verify the PIN and get this person's documents, then confirm
    // the requested documentId actually belongs to them before ever
    // creating a signed URL -- this is what stops a person with one
    // valid PIN+link from downloading another person's file by
    // guessing a documentId.
    const { data: docs, error: listError } = await admin.rpc("list_documents_for_pin", {
      p_person_id: personId,
      p_pin: pin,
    });

    if (listError) {
      return json({ error: "Invalid PIN or too many attempts" }, 401);
    }

    const match = (docs as Array<{ id: string; storage_path: string }> | null)?.find(
      (d) => d.id === documentId,
    );

    if (!match) {
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
