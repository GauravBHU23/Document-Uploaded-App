-- Adds email notifications for the admin, on top of the existing
-- in-app realtime toast/bell -- found in a feature audit: there was
-- no way for the admin to be notified of anything while away from the
-- app/browser. Covers the three events the admin chose: a PIN reset
-- request, a new self-upload, and a daily summary of
-- expiring/expired documents.
--
-- Every trigger here fires an ASYNC HTTP call via pg_net to the
-- send-notification-email Edge Function (the only place that ever
-- holds the Resend API key -- see
-- supabase/functions/send-notification-email/index.ts). pg_net calls
-- are fire-and-forget from Postgres' perspective: if the HTTP call
-- fails (network blip, Resend outage), the triggering database write
-- itself is NOT rolled back or blocked -- the admin still sees the
-- PIN reset / upload in-app regardless of whether the email send
-- succeeded. Email is a best-effort convenience layer on top of
-- already-reliable in-app notifications, never a dependency of them.

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- The anon key embedded in the http_post calls below is intentionally
-- public (it's NEXT_PUBLIC_SUPABASE_ANON_KEY, already shipped in every
-- page's client-side JS bundle -- RLS, not anon-key secrecy, is this
-- app's real access boundary, same as every other anon-callable RPC in
-- this schema). It's only used here to satisfy the Edge Function
-- gateway's auth requirement; it carries no special privilege. The
-- actual Resend API key stays confined to the Edge Function
-- environment, never appearing in this database at all.

-- ============================================================
-- Trigger: a PIN reset was just delivered to the admin (see
-- pin_reset_deliveries, migration 0019) -- email it too, in case the
-- admin isn't looking at the app right then.
-- ============================================================
create or replace function public.notify_pin_reset_email()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_person_name text;
begin
  select full_name into v_person_name from public.people where id = new.person_id;

  perform net.http_post(
    url := 'https://ihaywujugpnytueingdb.supabase.co/functions/v1/send-notification-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloYXl3dWp1Z3BueXR1ZWluZ2RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxMzEwNDksImV4cCI6MjEwNzcwNzA0OX0.VMwCXJxaCAIxE-2vLqMFucwuDS-U2qNW_eIXWvkqPro',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloYXl3dWp1Z3BueXR1ZWluZ2RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxMzEwNDksImV4cCI6MjEwNzcwNzA0OX0.VMwCXJxaCAIxE-2vLqMFucwuDS-U2qNW_eIXWvkqPro'
    ),
    body := jsonb_build_object(
      'subject', coalesce(v_person_name, 'Someone') || ' requested a new PIN',
      'html', '<p><strong>' || coalesce(v_person_name, 'Someone') || '</strong> requested a new PIN.</p>' ||
              '<p>New PIN: <strong style="font-size:18px;letter-spacing:2px">' || new.plaintext_pin || '</strong></p>' ||
              '<p style="color:#888;font-size:13px">Open DocVault to copy and share it, or dismiss this from the notification bell.</p>'
    )
  );

  return new;
end;
$$;

create trigger pin_reset_delivery_email
  after insert on public.pin_reset_deliveries
  for each row execute function public.notify_pin_reset_email();

-- ============================================================
-- Trigger: a document was just added via a person's own PIN or
-- upload-link (source = 'self_upload') -- email it too, mirroring the
-- in-app notifier's exact same filter (use-realtime-documents.ts
-- useNewDocumentNotifier).
-- ============================================================
create or replace function public.notify_self_upload_email()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_person_name text;
begin
  if new.source <> 'self_upload' then
    return new;
  end if;

  select full_name into v_person_name from public.people where id = new.person_id;

  perform net.http_post(
    url := 'https://ihaywujugpnytueingdb.supabase.co/functions/v1/send-notification-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloYXl3dWp1Z3BueXR1ZWluZ2RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxMzEwNDksImV4cCI6MjEwNzcwNzA0OX0.VMwCXJxaCAIxE-2vLqMFucwuDS-U2qNW_eIXWvkqPro',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloYXl3dWp1Z3BueXR1ZWluZ2RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxMzEwNDksImV4cCI6MjEwNzcwNzA0OX0.VMwCXJxaCAIxE-2vLqMFucwuDS-U2qNW_eIXWvkqPro'
    ),
    body := jsonb_build_object(
      'subject', coalesce(v_person_name, 'Someone') || ' uploaded a document',
      'html', '<p><strong>' || coalesce(v_person_name, 'Someone') || '</strong> uploaded "' || new.label || '" via their own link.</p>' ||
              '<p style="color:#888;font-size:13px">Open DocVault to view it.</p>'
    )
  );

  return new;
end;
$$;

create trigger self_upload_email
  after insert on public.documents
  for each row
  when (new.source = 'self_upload')
  execute function public.notify_self_upload_email();

-- ============================================================
-- Scheduled: once a day, email a summary of documents that are
-- expired or expiring within 30 days -- mirrors the dashboard's
-- "expiring soon" banner (useExpiringSoonDocuments,
-- migration 0021), for admins who don't open the app every day.
-- Sends nothing when there's nothing to report (no empty "all clear"
-- spam every single day).
-- ============================================================
create or replace function public.send_expiring_documents_email()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_rows record;
  v_html text := '';
  v_count int := 0;
begin
  for v_rows in
    select d.label, d.expiry_date, p.full_name
    from public.documents d
    join public.people p on p.id = d.person_id
    where d.deleted_at is null
      and d.expiry_date is not null
      and d.expiry_date <= (current_date + interval '30 days')::date
    order by d.expiry_date asc
  loop
    v_count := v_count + 1;
    v_html := v_html || '<li>' || v_rows.full_name || ' — ' || v_rows.label || ' (' || v_rows.expiry_date || ')</li>';
  end loop;

  if v_count = 0 then
    return;
  end if;

  perform net.http_post(
    url := 'https://ihaywujugpnytueingdb.supabase.co/functions/v1/send-notification-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloYXl3dWp1Z3BueXR1ZWluZ2RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxMzEwNDksImV4cCI6MjEwNzcwNzA0OX0.VMwCXJxaCAIxE-2vLqMFucwuDS-U2qNW_eIXWvkqPro',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloYXl3dWp1Z3BueXR1ZWluZ2RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxMzEwNDksImV4cCI6MjEwNzcwNzA0OX0.VMwCXJxaCAIxE-2vLqMFucwuDS-U2qNW_eIXWvkqPro'
    ),
    body := jsonb_build_object(
      'subject', v_count || ' document' || (case when v_count = 1 then '' else 's' end) || ' expiring or expired',
      'html', '<p>' || v_count || ' document' || (case when v_count = 1 then '' else 's' end) || ' expiring within 30 days or already expired:</p><ul>' || v_html || '</ul>'
    )
  );
end;
$$;

revoke all on function public.send_expiring_documents_email() from public;

-- Runs once a day at 08:00 UTC. pg_cron jobs run as the database
-- owner (not any particular admin's auth.uid()), which is why
-- send_expiring_documents_email queries ALL admins' documents rather
-- than filtering by admin_id -- acceptable here since this is a
-- single-admin app (there is only ever one admin's data to report),
-- unlike every other function in this schema which must scope by
-- admin_id for a reason that doesn't apply to a single-tenant cron job.
select cron.schedule(
  'send-expiring-documents-email',
  '0 8 * * *',
  $$select public.send_expiring_documents_email();$$
);
