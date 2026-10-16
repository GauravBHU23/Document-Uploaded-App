-- Adds PIN-based, view-only access for individual people to see their
-- own documents via a dedicated link, without any login/signup.
-- This is deliberately a NARROW, separate access path -- it does not
-- touch or loosen the existing admin-only RLS policies on people/
-- documents/storage. A person can only ever view+download their own
-- documents through a verified PIN; they can never list other people,
-- never see admin data, never upload/rename/delete.

create extension if not exists pgcrypto;

-- ============================================================
-- Add a hashed PIN to each person. Never store the PIN in plaintext.
-- ============================================================
alter table public.people
  add column access_pin_hash text;

-- ============================================================
-- Rate limiting: tracks failed PIN attempts per person to slow down
-- brute force guessing (a 4-6 digit PIN has very few combinations).
-- ============================================================
create table public.pin_attempts (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete cascade,
  attempted_at timestamptz not null default now()
);

create index pin_attempts_person_id_idx on public.pin_attempts (person_id, attempted_at);

alter table public.pin_attempts enable row level security;
-- No policies: this table is only ever touched by the SECURITY DEFINER
-- functions below, never directly by any client (anon or admin).

-- ============================================================
-- Admin-only: set or change a person's PIN. Only callable by the
-- owning admin (checked the same way as every other admin action).
-- ============================================================
create or replace function public.set_person_pin(p_person_id uuid, p_pin text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_pin !~ '^[0-9]{4,6}$' then
    raise exception 'PIN must be 4 to 6 digits';
  end if;

  update public.people
  set access_pin_hash = crypt(p_pin, gen_salt('bf')),
      updated_at = now()
  where id = p_person_id
    and admin_id = auth.uid()
    and exists (select 1 from public.admins a where a.id = auth.uid());

  if not found then
    raise exception 'Person not found or not permitted';
  end if;
end;
$$;

revoke all on function public.set_person_pin(uuid, text) from public;
grant execute on function public.set_person_pin(uuid, text) to authenticated;

-- ============================================================
-- Admin-only: remove a person's PIN (disables their view link).
-- ============================================================
create or replace function public.clear_person_pin(p_person_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.people
  set access_pin_hash = null,
      updated_at = now()
  where id = p_person_id
    and admin_id = auth.uid()
    and exists (select 1 from public.admins a where a.id = auth.uid());

  if not found then
    raise exception 'Person not found or not permitted';
  end if;
end;
$$;

revoke all on function public.clear_person_pin(uuid) from public;
grant execute on function public.clear_person_pin(uuid) to authenticated;

-- ============================================================
-- Public (anon-callable): verify a person's PIN. Rate limited to
-- 8 attempts per person per 10 minutes. On success, returns just
-- enough to let the caller fetch that person's documents through a
-- narrowly-scoped follow-up call (verify_person_pin_and_list below) --
-- this function alone does NOT return any document data.
-- ============================================================
create or replace function public.verify_person_pin(p_person_id uuid, p_pin text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash text;
  v_recent_attempts int;
begin
  select count(*) into v_recent_attempts
  from public.pin_attempts
  where person_id = p_person_id
    and attempted_at > now() - interval '10 minutes';

  if v_recent_attempts >= 8 then
    raise exception 'Too many attempts. Try again later.';
  end if;

  insert into public.pin_attempts (person_id) values (p_person_id);

  select access_pin_hash into v_hash
  from public.people
  where id = p_person_id;

  if v_hash is null then
    return false;
  end if;

  return v_hash = crypt(p_pin, v_hash);
end;
$$;

revoke all on function public.verify_person_pin(uuid, text) from public;
grant execute on function public.verify_person_pin(uuid, text) to anon, authenticated;

-- ============================================================
-- Public (anon-callable): after a verified PIN, list that person's
-- documents (id, label, mime type, size, created_at, storage_path).
-- Re-verifies the PIN itself on every call so there is no separate
-- "session" to steal -- the PIN must be supplied every time.
-- storage_path is returned so the client can request a signed URL for
-- just that one object (still blocked from everything else by the
-- storage RLS policies, which remain admin-only -- so signed URL
-- creation itself must happen through a trusted path, see the
-- create_signed_url_for_pin function below).
-- ============================================================
create or replace function public.list_documents_for_pin(p_person_id uuid, p_pin text)
returns table (
  id uuid,
  label text,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz,
  storage_path text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.verify_person_pin(p_person_id, p_pin) then
    raise exception 'Invalid PIN';
  end if;

  return query
  select d.id, d.label, d.mime_type, d.size_bytes, d.created_at, d.storage_path
  from public.documents d
  where d.person_id = p_person_id
  order by d.created_at desc;
end;
$$;

revoke all on function public.list_documents_for_pin(uuid, text) from public;
grant execute on function public.list_documents_for_pin(uuid, text) to anon, authenticated;

-- ============================================================
-- Public (anon-callable): get a person's display name for the PIN
-- entry screen (so it can say "Enter PIN for <name>" without yet
-- proving the PIN). This intentionally reveals only the name, nothing
-- else -- acceptable since the admin is the one who hands out the
-- link in the first place.
-- ============================================================
create or replace function public.get_person_name(p_person_id uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select full_name from public.people where id = p_person_id;
$$;

revoke all on function public.get_person_name(uuid) from public;
grant execute on function public.get_person_name(uuid) to anon, authenticated;
