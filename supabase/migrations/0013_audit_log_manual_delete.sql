-- Lets the admin delete a single audit log entry manually, in
-- addition to the existing 30-day auto-purge (0012_audit_log_retention.sql).
-- audit_log has no delete policy for the admin role (by design, so the
-- app can't silently drop an entry through an ordinary .delete() call
-- and so a compromised client can't cover its tracks) -- this adds one
-- narrow, explicit path instead: a SECURITY DEFINER RPC the admin
-- calls on purpose, scoped to their own rows only.
create or replace function public.delete_audit_log_entry(p_entry_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.audit_log
  where id = p_entry_id
    and admin_id = auth.uid()
    and exists (select 1 from public.admins a where a.id = auth.uid());

  if not found then
    raise exception 'Entry not found or not permitted';
  end if;
end;
$$;

revoke all on function public.delete_audit_log_entry(uuid) from public;
grant execute on function public.delete_audit_log_entry(uuid) to authenticated;
