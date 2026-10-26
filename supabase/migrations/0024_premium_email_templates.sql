-- Switches the three email triggers from hand-rolled raw HTML strings
-- to the structured payload (kind/heading/intro/highlight/items/
-- footerNote) the redesigned send-notification-email Edge Function
-- now expects -- the Edge Function alone owns the actual branded
-- markup (indigo/violet gradient header, card layout, DocVault
-- footer), so every notification shares one consistent, premium look
-- instead of each trigger building its own plain HTML by hand.
--
-- No schema change, no new triggers -- this only replaces the bodies
-- of the three functions created in 0023_email_notifications.sql.

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
      'kind', 'pin_reset',
      'heading', 'PIN reset requested',
      'intro', coalesce(v_person_name, 'Someone') || ' forgot their PIN and requested a new one for their document link.',
      'highlight', new.plaintext_pin,
      'highlightCaption', 'New PIN — share it with ' || coalesce(v_person_name, 'them'),
      'footerNote', 'Open DocVault to copy and share it, or dismiss this from the notification bell.'
    )
  );

  return new;
end;
$$;

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
      'kind', 'self_upload',
      'heading', 'New document uploaded',
      'intro', coalesce(v_person_name, 'Someone') || ' uploaded "' || new.label || '" using their own upload link.',
      'footerNote', 'Open DocVault to view it in their folder.'
    )
  );

  return new;
end;
$$;

create or replace function public.send_expiring_documents_email()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_rows record;
  v_items jsonb := '[]'::jsonb;
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
    v_items := v_items || to_jsonb(v_rows.full_name || ' — ' || v_rows.label || ' (' || v_rows.expiry_date || ')');
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
      'kind', 'expiring_summary',
      'heading', v_count || ' document' || (case when v_count = 1 then '' else 's' end) || ' need attention',
      'intro', 'The following documents are expiring within 30 days or already expired:',
      'items', v_items
    )
  );
end;
$$;
