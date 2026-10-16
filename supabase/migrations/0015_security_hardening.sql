-- Two security gaps found in a full audit:
--
-- 1. The upload-only token path (0011_upload_only_link.sql) had no
--    rate limit at all, unlike the PIN path (which limits to 8
--    verify attempts / 10 min via pin_attempts). A leaked/forwarded
--    upload link could be used to write unlimited files with no
--    admin-visible throttle. This isn't about guessing the token
--    (it's a ~192-bit random value, guessing is infeasible) -- it's
--    about limiting how fast a *known* token can be abused. Adds
--    upload_token_attempts + a 30-uploads/10-min cap, mirroring the
--    PIN rate limit's shape.
--
-- 2. The documents storage bucket (0001_init.sql) had no
--    file_size_limit or allowed_mime_types -- the two self-service
--    Edge Function paths (pin-access, upload-link) each independently
--    enforce a 25MB cap in application code, but the admin's own
--    direct upload path (lib/documents/upload.ts, used by
--    UploadDropzone/CameraCapture/SaveToPersonPicker) had no limit of
--    any kind, client or server. Setting it at the bucket level closes
--    this for every upload path at once, including any future one.

create table public.upload_token_attempts (
  id uuid primary key default gen_random_uuid(),
  upload_token text not null,
  attempted_at timestamptz not null default now()
);

create index upload_token_attempts_token_idx on public.upload_token_attempts (upload_token, attempted_at);

alter table public.upload_token_attempts enable row level security;
-- No policies: only ever touched by insert_document_for_token below,
-- never directly by any client -- same pattern as pin_attempts.

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
  v_recent_attempts int;
begin
  select count(*) into v_recent_attempts
  from public.upload_token_attempts
  where upload_token = p_token
    and attempted_at > now() - interval '10 minutes';

  if v_recent_attempts >= 30 then
    raise exception 'Too many uploads from this link. Try again later.';
  end if;

  insert into public.upload_token_attempts (upload_token) values (p_token);

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

update storage.buckets
set file_size_limit = 26214400, -- 25MB, matching both Edge Functions' MAX_UPLOAD_BYTES
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf']
where id = 'documents';
