// Supabase Edge Function: send-notification-email
//
// Generic email sender for the admin's own notifications (PIN reset
// requests, self-uploads, expiring-document summaries) -- a thin
// wrapper over the Resend API. This is the ONLY place RESEND_API_KEY
// is ever read (an Edge Function secret, never present in the Next.js
// app or any browser bundle, same isolation pattern as the service
// role key in pin-access/index.ts).
//
// Called two ways:
//   1. By Postgres triggers via pg_net (see migration
//      0023_email_notifications.sql) -- INSERT on pin_reset_deliveries
//      and on documents where source='self_upload' each fire an async
//      HTTP POST here, so the admin gets an email without any
//      client-side code needing to run or even be online.
//   2. By pg_cron (daily) calling check_expiring_documents_for_email,
//      which itself calls back into THIS function via pg_net when
//      there's something to report.
//
// Every caller must be a trusted Postgres trigger/cron job -- this
// function has no RLS of its own (it's an HTTP endpoint, not a table),
// so it only ever sends to the fixed ADMIN_NOTIFICATION_EMAIL env var,
// never to an address supplied in the request body. That means even
// if the body were somehow forged, it could only ever cause an email
// to the admin's own inbox, never to anyone else's.

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const ADMIN_NOTIFICATION_EMAIL = Deno.env.get("ADMIN_NOTIFICATION_EMAIL")!;
const FROM_EMAIL = "DocVault <onboarding@resend.dev>";

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
  subject: string;
  html: string;
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

  if (!body.subject || !body.html) {
    return json({ error: "subject and html are required" }, 400);
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: ADMIN_NOTIFICATION_EMAIL,
      subject: body.subject,
      html: body.html,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    return json({ error: `Resend API error: ${errText}` }, 502);
  }

  return json({ ok: true });
});
