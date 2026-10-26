-- Makes the trash retention window and expiry-warning lookahead
-- admin-configurable -- found in a feature audit: both were hardcoded
-- 30-day magic numbers duplicated across three separate places
-- (purge_expired_trash in 0006, the dashboard's "expiring soon" query
-- and its index in 0021, and send_expiring_documents_email in 0023),
-- with no way to change either without editing SQL directly.
--
-- Per-admin columns (not a separate settings table) since this is a
-- single-admin app and these values conceptually belong with the
-- admin's other preferences (display_name, 0016).

alter table public.admins
  add column trash_retention_days int not null default 30
    check (trash_retention_days between 1 and 365),
  add column expiry_warning_days int not null default 30
    check (expiry_warning_days between 1 and 365);

-- ============================================================
-- Lets the signed-in admin change their own retention windows.
-- Mirrors update_my_display_name's shape (0016).
-- ============================================================
create or replace function public.update_retention_settings(
  p_trash_retention_days int,
  p_expiry_warning_days int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_trash_retention_days not between 1 and 365 then
    raise exception 'Trash retention must be between 1 and 365 days';
  end if;
  if p_expiry_warning_days not between 1 and 365 then
    raise exception 'Expiry warning window must be between 1 and 365 days';
  end if;

  update public.admins
  set trash_retention_days = p_trash_retention_days,
      expiry_warning_days = p_expiry_warning_days
  where id = auth.uid();

  if not found then
    raise exception 'Not permitted';
  end if;
end;
$$;

revoke all on function public.update_retention_settings(int, int) from public;
grant execute on function public.update_retention_settings(int, int) to authenticated;

-- ============================================================
-- purge_expired_trash (0006): now reads the calling admin's own
-- trash_retention_days instead of a hardcoded '30 days' interval.
-- Signature is unchanged, so lib/documents/trash.ts needs no changes.
-- ============================================================
create or replace function public.purge_expired_trash()
returns table (storage_path text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_retention_days int;
begin
  select trash_retention_days into v_retention_days
  from public.admins
  where id = auth.uid();

  -- Table alias "d" disambiguates documents.storage_path from this
  -- function's own `returns table (storage_path text)` output column
  -- of the same name -- without it, plpgsql can't tell which
  -- "storage_path" the bare RETURNING clause means.
  return query
  delete from public.documents d
  where d.admin_id = auth.uid()
    and exists (select 1 from public.admins a where a.id = auth.uid())
    and d.deleted_at is not null
    and d.deleted_at < now() - make_interval(days => coalesce(v_retention_days, 30))
  returning d.storage_path;
end;
$$;

revoke all on function public.purge_expired_trash() from public;
grant execute on function public.purge_expired_trash() to authenticated;

-- ============================================================
-- send_expiring_documents_email (0023): now reads each admin's own
-- expiry_warning_days. Still single-admin-scoped in practice (there's
-- only ever one admin row), but written generically over all admins
-- rather than assuming a single hardcoded window, in case that ever
-- changes.
-- ============================================================
create or replace function public.send_expiring_documents_email()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_admin record;
  v_rows record;
  v_items jsonb;
  v_count int;
begin
  for v_admin in select id, expiry_warning_days from public.admins loop
    v_items := '[]'::jsonb;
    v_count := 0;

    for v_rows in
      select d.label, d.expiry_date, p.full_name
      from public.documents d
      join public.people p on p.id = d.person_id
      where d.admin_id = v_admin.id
        and d.deleted_at is null
        and d.expiry_date is not null
        and d.expiry_date <= (current_date + make_interval(days => v_admin.expiry_warning_days))::date
      order by d.expiry_date asc
    loop
      v_count := v_count + 1;
      v_items := v_items || to_jsonb(v_rows.full_name || ' — ' || v_rows.label || ' (' || v_rows.expiry_date || ')');
    end loop;

    if v_count = 0 then
      continue;
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
        'intro', 'The following documents are expiring within ' || v_admin.expiry_warning_days || ' days or already expired:',
        'items', v_items
      )
    );
  end loop;
end;
$$;
