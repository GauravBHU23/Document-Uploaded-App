-- Soft-delete for documents: "deleting" a document from the UI now
-- just marks it deleted_at = now() instead of immediately removing
-- the storage object and database row. It can be restored, or is
-- permanently purged automatically after 30 days.
--
-- Existing RLS policy "admins manage their own documents" already
-- covers select/insert/update/delete generically (no per-column
-- restriction), so it does not need to change for this column to
-- work -- an admin can already read/update/delete their own rows
-- regardless of deleted_at.

alter table public.documents
  add column deleted_at timestamptz;

create index documents_deleted_at_idx on public.documents (admin_id, deleted_at);

-- Permanently deletes the DATABASE ROW for any document this admin
-- soft-deleted more than 30 days ago, returning the storage_path of
-- each one removed. This does NOT touch Supabase Storage (an RPC
-- function cannot call the Storage API) -- the client is responsible
-- for removing those storage objects using the returned paths. See
-- lib/documents/trash.ts, which does both together.
create or replace function public.purge_expired_trash()
returns table (storage_path text)
language sql
security definer
set search_path = public
as $$
  delete from public.documents
  where admin_id = auth.uid()
    and exists (select 1 from public.admins a where a.id = auth.uid())
    and deleted_at is not null
    and deleted_at < now() - interval '30 days'
  returning storage_path;
$$;

revoke all on function public.purge_expired_trash() from public;
grant execute on function public.purge_expired_trash() to authenticated;
