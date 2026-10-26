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
//   2. By a daily pg_cron job calling send_expiring_documents_email,
//      which itself calls back into THIS function via pg_net when
//      there's something to report.
//
// Every caller must be a trusted Postgres trigger/cron job -- this
// function has no RLS of its own (it's an HTTP endpoint, not a table),
// so it only ever sends to the fixed ADMIN_NOTIFICATION_EMAIL env var,
// never to an address supplied in the request body. That means even
// if the body were somehow forged, it could only ever cause an email
// to the admin's own inbox, never to anyone else's.
//
// Callers send structured content (heading/intro/highlight/items/
// footerNote), not raw HTML -- this function alone owns the actual
// markup, so every notification shares one consistent, branded layout
// (matches the app's own indigo/violet accent-gradient) instead of
// each trigger hand-rolling its own ad hoc HTML string in SQL.

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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

type EmailKind = "pin_reset" | "self_upload" | "expiring_summary";

type RequestBody = {
  subject: string;
  kind: EmailKind;
  // Short line under the icon, e.g. "PIN reset requested".
  heading: string;
  // One or two sentences of context.
  intro: string;
  // Optional large, prominent value (used for the PIN itself).
  highlight?: string;
  // Optional small caption under the highlight box.
  highlightCaption?: string;
  // Optional bullet list (used for the expiring-documents summary).
  items?: string[];
  // Optional closing note, smaller/muted text.
  footerNote?: string;
};

const KIND_ICON: Record<EmailKind, string> = {
  // Key icon (PIN reset)
  pin_reset:
    '<path d="M18.364 4.636a9 9 0 11-12.728 0M12 3v9" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
  // Upload-arrow icon (self upload)
  self_upload:
    '<path d="M12 16V4m0 0l-4 4m4-4l4 4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
  // Calendar/clock icon (expiring documents)
  expiring_summary:
    '<path d="M8 2v4M16 2v4M3 10h18M5 6h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
};

function renderEmailHtml(body: RequestBody): string {
  const icon = KIND_ICON[body.kind] ?? KIND_ICON.self_upload;

  const highlightBlock = body.highlight
    ? `
      <div style="margin:24px 0;padding:20px 24px;background:#f5f3ff;border:1px solid #e4defa;border-radius:14px;text-align:center;">
        <div style="font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;font-size:28px;font-weight:700;letter-spacing:4px;color:#4b32d6;">
          ${escapeHtml(body.highlight)}
        </div>
        ${body.highlightCaption ? `<div style="margin-top:6px;font-size:12px;color:#6b7280;">${escapeHtml(body.highlightCaption)}</div>` : ""}
      </div>`
    : "";

  const itemsBlock = body.items && body.items.length > 0
    ? `
      <ul style="margin:20px 0;padding:0;list-style:none;">
        ${body.items
          .map(
            (item) => `
          <li style="padding:12px 16px;margin-bottom:8px;background:#f9fafb;border:1px solid #eef0f3;border-radius:10px;font-size:14px;color:#374151;">
            ${escapeHtml(item)}
          </li>`,
          )
          .join("")}
      </ul>`
    : "";

  const footerNoteBlock = body.footerNote
    ? `<p style="margin:20px 0 0;font-size:13px;line-height:1.5;color:#9ca3af;">${escapeHtml(body.footerNote)}</p>`
    : "";

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f8;padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 1px 3px rgba(16,24,40,0.1),0 8px 24px rgba(16,24,40,0.06);">
            <tr>
              <td style="padding:32px 32px 24px;background:linear-gradient(135deg,#4b32d6,#6246ea,#8b6ae8);text-align:center;">
                <div style="width:48px;height:48px;margin:0 auto 14px;border-radius:14px;background:rgba(255,255,255,0.18);display:inline-flex;align-items:center;justify-content:center;">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">${icon}</svg>
                </div>
                <div style="font-size:18px;font-weight:700;color:#ffffff;letter-spacing:-0.2px;">DocVault</div>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 8px;font-size:20px;line-height:1.3;color:#111827;font-weight:700;">
                  ${escapeHtml(body.heading)}
                </h1>
                <p style="margin:0;font-size:14px;line-height:1.6;color:#4b5563;">
                  ${escapeHtml(body.intro)}
                </p>
                ${highlightBlock}
                ${itemsBlock}
                ${footerNoteBlock}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;background:#fafafa;border-top:1px solid #eef0f3;text-align:center;">
                <p style="margin:0;font-size:12px;color:#9ca3af;">
                  DocVault — Document workspace
                </p>
                <p style="margin:4px 0 0;font-size:11px;color:#b0b4bb;">
                  Developed by Gaurav Kumar — Department of Computer Science, IIT BHU Varanasi
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
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

  if (!body.subject || !body.kind || !body.heading || !body.intro) {
    return json({ error: "subject, kind, heading and intro are required" }, 400);
  }

  const html = renderEmailHtml(body);

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
      html,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    return json({ error: `Resend API error: ${errText}` }, 502);
  }

  return json({ ok: true });
});
