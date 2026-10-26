-- Lets the admin delete several audit log entries at once, instead of
-- one click per entry -- the admin asked for a "select all / tick and
-- delete" flow on the audit log page, matching the multi-select
-- pattern already used on the Trash and person-folder pages.
--
-- Same security posture as delete_audit_log_entry (0013): this is
-- still the only two ways audit_log rows can ever be removed (this
-- RPC, or the automatic 30-day purge) -- there is still no ordinary
-- delete policy on the table, so a compromised client still can't
-- silently drop rows through a plain .delete() call, only through
-- this explicit, scoped-to-own-rows RPC.
create or replace function public.delete_audit_log_entries(p_entry_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.audit_log
  where id = any(p_entry_ids)
    and admin_id = auth.uid()
    and exists (select 1 from public.admins a where a.id = auth.uid());
end;
$$;

revoke all on function public.delete_audit_log_entries(uuid[]) from public;
grant execute on function public.delete_audit_log_entries(uuid[]) to authenticated;
