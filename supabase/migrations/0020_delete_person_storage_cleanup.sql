-- Fixes a storage leak: deleting a person previously went straight to
-- `delete from people where id = ...`, which cascades to delete that
-- person's `documents` rows (on delete cascade, migration 0001) -- but
-- a DB cascade only ever removes database rows. The actual files in
-- the `documents` Storage bucket were never cleaned up, so every file
-- a deleted person ever had (including already-trashed ones) was left
-- behind permanently: unreachable through the app, but still consuming
-- storage quota forever.
--
-- Mirrors the purge_expired_trash pattern (migration 0006): an RPC
-- function cannot call the Storage API directly, so this collects
-- every storage_path belonging to the person (active AND trashed
-- documents alike) BEFORE deleting the person row (whose cascade would
-- otherwise remove those document rows out from under us), then
-- returns the paths for the client to remove in one batched Storage
-- call. See lib/people/hooks.ts useDeletePerson.

create or replace function public.delete_person_and_get_storage_paths(p_person_id uuid)
returns table (storage_path text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_paths text[];
begin
  if not exists (
    select 1 from public.people
    where id = p_person_id
      and admin_id = auth.uid()
      and exists (select 1 from public.admins a where a.id = auth.uid())
  ) then
    raise exception 'Person not found or not permitted';
  end if;

  select array_agg(d.storage_path) into v_paths
  from public.documents d
  where d.person_id = p_person_id;

  delete from public.people where id = p_person_id;

  return query select unnest(coalesce(v_paths, array[]::text[]));
end;
$$;

revoke all on function public.delete_person_and_get_storage_paths(uuid) from public;
grant execute on function public.delete_person_and_get_storage_paths(uuid) to authenticated;
