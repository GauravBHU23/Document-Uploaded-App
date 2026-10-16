-- Fixes a bug in the PIN rate-limiting introduced in
-- 0002_person_pin_access.sql: list_documents_for_pin raised an
-- exception when the PIN was wrong, which rolled back the ENTIRE
-- function's effects as a subtransaction -- including the attempt
-- row that verify_person_pin had just inserted for rate-limiting.
-- Net effect: failed attempts were never actually recorded, so the
-- "8 attempts per 10 minutes" limit never engaged. A PIN (4-6 digits,
-- at most 1,000,000 combinations) was effectively guessable with
-- unlimited automated attempts.
--
-- Fix: no function in this PIN-access path raises an exception for a
-- "wrong PIN" or "rate limited" outcome anymore. Every path returns
-- a normal value (false / null / empty result), so nothing it did
-- earlier in the same call -- like logging the attempt -- ever gets
-- rolled back. Only truly exceptional input (a malformed PIN format
-- in set_person_pin, which never touches pin_attempts) still raises.

create or replace function public.verify_person_pin(p_person_id uuid, p_pin text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash text;
  v_recent_attempts int;
  v_ok boolean;
begin
  select count(*) into v_recent_attempts
  from public.pin_attempts
  where person_id = p_person_id
    and attempted_at > now() - interval '10 minutes';

  if v_recent_attempts >= 8 then
    return false;
  end if;

  insert into public.pin_attempts (person_id) values (p_person_id);

  select access_pin_hash into v_hash
  from public.people
  where id = p_person_id;

  if v_hash is null then
    return false;
  end if;

  v_ok := (v_hash = crypt(p_pin, v_hash));
  return v_ok;
end;
$$;

revoke all on function public.verify_person_pin(uuid, text) from public;
grant execute on function public.verify_person_pin(uuid, text) to anon, authenticated;

-- list_documents_for_pin: returns pin_valid alongside the rows, so the
-- Edge Function can tell "wrong PIN" apart from "correct PIN, zero
-- documents" in a single call -- no second verify, so only one
-- attempt is logged per request.
-- The return shape changed (added pin_valid), so the old signature
-- must be dropped before Postgres will let it be redefined.
drop function if exists public.list_documents_for_pin(uuid, text);

create function public.list_documents_for_pin(p_person_id uuid, p_pin text)
returns table (
  pin_valid boolean,
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
declare
  v_ok boolean;
begin
  v_ok := public.verify_person_pin(p_person_id, p_pin);

  if not v_ok then
    return query select false, null::uuid, null::text, null::text, null::bigint, null::timestamptz, null::text;
    return;
  end if;

  return query
  select true, d.id, d.label, d.mime_type, d.size_bytes, d.created_at, d.storage_path
  from public.documents d
  where d.person_id = p_person_id
  order by d.created_at desc;
end;
$$;

revoke all on function public.list_documents_for_pin(uuid, text) from public;
grant execute on function public.list_documents_for_pin(uuid, text) to anon, authenticated;
