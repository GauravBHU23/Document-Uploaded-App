-- Adds a second, PIN-free self-access path: a per-person upload-only
-- link. Unlike the PIN link (0002_person_pin_access.sql), this one
-- grants no ability to view or list existing documents at all -- it
-- can only ever add a new one. There is no PIN to type; the link
-- itself carries a random, unguessable token
-- (encode(gen_random_bytes(24), 'base64url'), ~192 bits), so knowing
-- the link *is* the credential. This is the same trust model already
-- used for QR mobile-upload sessions (upload_sessions table), except
-- this token doesn't expire after 10 minutes -- it's meant to be
-- handed out once and reused, like the PIN link.
--
-- Because there's no PIN attempt to rate-limit, the security property
-- here rests entirely on the token being large and random enough that
-- guessing it is infeasible -- never on obscurity of the URL pattern.

alter table public.people
  add column upload_token text unique;

-- ============================================================
-- Admin-only: generate (or regenerate) a person's upload-only token.
-- ============================================================
create or replace function public.create_upload_token(p_person_id uuid)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_token text;
begin
  v_token := replace(replace(encode(gen_random_bytes(24), 'base64'), '/', '_'), '+', '-');
  v_token := rtrim(v_token, '=');

  update public.people
  set upload_token = v_token,
      updated_at = now()
  where id = p_person_id
    and admin_id = auth.uid()
    and exists (select 1 from public.admins a where a.id = auth.uid());

  if not found then
    raise exception 'Person not found or not permitted';
  end if;

  return v_token;
end;
$$;

revoke all on function public.create_upload_token(uuid) from public;
grant execute on function public.create_upload_token(uuid) to authenticated;

-- ============================================================
-- Admin-only: disable a person's upload-only link.
-- ============================================================
create or replace function public.clear_upload_token(p_person_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.people
  set upload_token = null,
      updated_at = now()
  where id = p_person_id
    and admin_id = auth.uid()
    and exists (select 1 from public.admins a where a.id = auth.uid());

  if not found then
    raise exception 'Person not found or not permitted';
  end if;
end;
$$;

revoke all on function public.clear_upload_token(uuid) from public;
grant execute on function public.clear_upload_token(uuid) to authenticated;

-- ============================================================
-- Public (anon-callable): resolve a token to a person's display name,
-- for the upload page's "Uploading for <name>" header -- mirrors
-- get_person_name's reasoning (0002). Returns null for an unknown or
-- disabled token.
-- ============================================================
create or replace function public.get_person_name_by_token(p_token text)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select full_name from public.people where upload_token = p_token;
$$;

revoke all on function public.get_person_name_by_token(text) from public;
grant execute on function public.get_person_name_by_token(text) to anon, authenticated;

-- ============================================================
-- Public (anon-callable): insert a document row for whichever person
-- this token belongs to. Mirrors insert_document_for_pin (0010) --
-- looks up person_id/admin_id itself from the token, never trusts a
-- client-supplied id, so the token only ever grants write access into
-- the one person's folder it belongs to.
-- ============================================================
create or replace function public.insert_document_for_token(
  p_token text,
  p_document_id uuid,
  p_label text,
  p_storage_path text,
  p_mime_type text,
  p_size_bytes bigint
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_person_id uuid;
  v_admin_id uuid;
begin
  select id, admin_id into v_person_id, v_admin_id
  from public.people
  where upload_token = p_token;

  if v_person_id is null then
    raise exception 'Invalid upload link';
  end if;

  insert into public.documents (
    id, person_id, admin_id, label, storage_path, mime_type, size_bytes, source
  ) values (
    p_document_id, v_person_id, v_admin_id, p_label, p_storage_path, p_mime_type, p_size_bytes, 'self_upload'
  );
end;
$$;

revoke all on function public.insert_document_for_token(text, uuid, text, text, text, bigint) from public;
grant execute on function public.insert_document_for_token(text, uuid, text, text, text, bigint) to anon, authenticated;
