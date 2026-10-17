-- Lets a person who forgot their PIN request a fresh one from their own
-- view/upload link, without the admin ever having to remember or
-- manually retype a PIN. A brand-new random PIN is generated and
-- hashed SERVER-SIDE (same crypt()/gen_salt('bf') as set_person_pin) --
-- the admin never chooses or sees it in the people-management UI, and
-- it is never stored in plaintext anywhere at rest.
--
-- Delivery: the plaintext PIN is written briefly to
-- pin_reset_deliveries, which only the owning admin can SELECT (RLS),
-- and the admin's browser picks it up via a realtime subscription (the
-- same postgres_changes pattern as the self-upload notifier in
-- use-realtime-documents.ts) and deletes the row immediately after
-- reading it client-side. So the plaintext PIN exists at rest for at
-- most a few seconds, in a row only the admin's own session can ever
-- read, before the admin's own client cleans it up.

-- ============================================================
-- Rate limiting: a person can request at most one reset per 10
-- minutes. Without this, anyone who merely has the (non-secret) link
-- URL -- no PIN needed to reach this screen -- could spam resets and
-- effectively lock the real person out by constantly invalidating
-- whatever PIN the admin just shared with them.
-- ============================================================
create table public.pin_reset_requests (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete cascade,
  requested_at timestamptz not null default now()
);

create index pin_reset_requests_person_id_idx on public.pin_reset_requests (person_id, requested_at);

alter table public.pin_reset_requests enable row level security;
-- No policies: only ever touched by the SECURITY DEFINER function below.

-- ============================================================
-- Holds the plaintext PIN just long enough for the admin's own
-- browser to pick it up over realtime and delete it. RLS restricts
-- reads (and the delete-after-read) to the owning admin only.
-- ============================================================
create table public.pin_reset_deliveries (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.admins(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  plaintext_pin text not null,
  created_at timestamptz not null default now()
);

alter table public.pin_reset_deliveries enable row level security;

create policy "admins read own pin reset deliveries"
  on public.pin_reset_deliveries for select
  to authenticated
  using (
    admin_id = auth.uid()
    and exists (select 1 from public.admins a where a.id = auth.uid())
  );

create policy "admins delete own pin reset deliveries"
  on public.pin_reset_deliveries for delete
  to authenticated
  using (
    admin_id = auth.uid()
    and exists (select 1 from public.admins a where a.id = auth.uid())
  );

-- No insert/update policy for any client -- only the SECURITY DEFINER
-- function below ever writes to this table.

-- ============================================================
-- Public (anon-callable): generates and sets a brand-new random 6-digit
-- PIN for a person who already has PIN access enabled, rate-limited to
-- one success per person per 10 minutes. Returns void -- the plaintext
-- PIN is delivered to the admin only, via pin_reset_deliveries, never
-- back to this anon caller's response.
-- ============================================================
create or replace function public.request_person_pin_reset(p_person_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_admin_id uuid;
  v_has_pin boolean;
  v_recent_requests int;
  v_new_pin text;
begin
  select admin_id, (access_pin_hash is not null)
    into v_admin_id, v_has_pin
  from public.people
  where id = p_person_id;

  -- Unknown person, or PIN access was never enabled for them: do
  -- nothing. Returning void either way (never an error) avoids
  -- leaking whether a given id exists.
  if v_admin_id is null or not v_has_pin then
    return;
  end if;

  select count(*) into v_recent_requests
  from public.pin_reset_requests
  where person_id = p_person_id
    and requested_at > now() - interval '10 minutes';

  if v_recent_requests >= 1 then
    return;
  end if;

  insert into public.pin_reset_requests (person_id) values (p_person_id);

  v_new_pin := lpad(floor(random() * 1000000)::text, 6, '0');

  update public.people
  set access_pin_hash = crypt(v_new_pin, gen_salt('bf')),
      updated_at = now()
  where id = p_person_id;

  insert into public.pin_reset_deliveries (admin_id, person_id, plaintext_pin)
  values (v_admin_id, p_person_id, v_new_pin);
end;
$$;

revoke all on function public.request_person_pin_reset(uuid) from public;
grant execute on function public.request_person_pin_reset(uuid) to anon, authenticated;

-- ============================================================
-- Realtime: lets the admin's browser receive the INSERT the instant
-- it happens (see usePinResetNotifier in
-- lib/documents/use-realtime-documents.ts), same mechanism as
-- 0009_enable_realtime_documents.sql. RLS on pin_reset_deliveries
-- still applies to this changefeed, so only the owning admin's
-- session ever receives the event.
-- ============================================================
alter publication supabase_realtime add table public.pin_reset_deliveries;
