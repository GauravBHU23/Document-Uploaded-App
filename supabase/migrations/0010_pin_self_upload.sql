-- Lets a person upload their own documents through the same PIN link
-- that already lets them view/download (app/view/[id]). Before this,
-- that link was view+download only -- a person had no way to add a
-- new document themselves without the admin doing it for them.
--
-- The actual file upload to Storage happens in the pin-access Edge
-- Function using the service role key (the same trusted path already
-- used for PIN-gated downloads), since a PIN holder has no Supabase
-- Auth session and the storage bucket's RLS policies are admin-only.
-- This migration only adds:
--   1. a new 'self_upload' source value, so these documents are
--      visibly distinguishable from admin-uploaded ones
--   2. insert_document_for_pin, a SECURITY DEFINER RPC the Edge
--      Function calls to write the documents row after it has
--      already re-verified the PIN and uploaded the file to Storage
--      itself -- this function does not touch Storage, only the row
--
-- Every self-upload still goes through the same PIN + rate-limit
-- check as list/download (verify_person_pin, 8 attempts/10 min), and
-- is scoped to exactly the person_id the PIN belongs to -- there is
-- no way for a PIN holder to write into another person's folder.

alter table public.documents
  drop constraint documents_source_check;

alter table public.documents
  add constraint documents_source_check
  check (source in ('upload', 'camera', 'qr_mobile', 'tool_generated', 'self_upload'));

create or replace function public.insert_document_for_pin(
  p_person_id uuid,
  p_pin text,
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
  v_admin_id uuid;
begin
  if not public.verify_person_pin(p_person_id, p_pin) then
    raise exception 'Invalid PIN';
  end if;

  select admin_id into v_admin_id
  from public.people
  where id = p_person_id;

  if v_admin_id is null then
    raise exception 'Person not found';
  end if;

  insert into public.documents (
    id, person_id, admin_id, label, storage_path, mime_type, size_bytes, source
  ) values (
    p_document_id, p_person_id, v_admin_id, p_label, p_storage_path, p_mime_type, p_size_bytes, 'self_upload'
  );
end;
$$;

revoke all on function public.insert_document_for_pin(uuid, text, uuid, text, text, text, bigint) from public;
grant execute on function public.insert_document_for_pin(uuid, text, uuid, text, text, text, bigint) to anon, authenticated;
