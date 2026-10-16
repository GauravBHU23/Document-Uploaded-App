-- Fixes list_documents_for_pin: when the PIN was valid but the person
-- had zero documents, `return query select true, d.*` over an empty
-- join produced zero rows -- indistinguishable from "PIN invalid" to
-- the caller (both cases returned an empty result set). A person with
-- a freshly-created PIN and no documents yet uploaded would see
-- "Invalid PIN" instead of an empty, correctly-authenticated document
-- list.
--
-- Fix: when the PIN is valid, always return at least one row with
-- pin_valid = true. Real document rows (if any) all carry
-- pin_valid = true as well, so the Edge Function's
-- `rows[0].pin_valid` check is reliable regardless of document count.

create or replace function public.list_documents_for_pin(p_person_id uuid, p_pin text)
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
  v_found boolean := false;
begin
  v_ok := public.verify_person_pin(p_person_id, p_pin);

  if not v_ok then
    return query select false, null::uuid, null::text, null::text, null::bigint, null::timestamptz, null::text;
    return;
  end if;

  for pin_valid, id, label, mime_type, size_bytes, created_at, storage_path in
    select true, d.id, d.label, d.mime_type, d.size_bytes, d.created_at, d.storage_path
    from public.documents d
    where d.person_id = p_person_id
    order by d.created_at desc
  loop
    v_found := true;
    return next;
  end loop;

  if not v_found then
    -- Valid PIN, zero documents: still emit a pin_valid marker row so
    -- the caller can tell this apart from an invalid PIN.
    return query select true, null::uuid, null::text, null::text, null::bigint, null::timestamptz, null::text;
  end if;
end;
$$;

revoke all on function public.list_documents_for_pin(uuid, text) from public;
grant execute on function public.list_documents_for_pin(uuid, text) to anon, authenticated;
