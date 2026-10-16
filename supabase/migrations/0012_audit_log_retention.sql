-- Audit log retention: without this, audit_log grows forever (every
-- create/rename/delete/trash/restore across every person logs a row,
-- via the triggers in 0007_audit_log.sql) and the Audit Log page would
-- eventually be showing years of noise. Purges rows older than 30
-- days, the same window and lazy-sweep-on-page-load pattern already
-- used for Trash (purge_expired_trash, 0006_document_trash.sql) --
-- there's no backend cron available, so the sweep runs whenever the
-- admin opens the Audit Log page rather than on a schedule.
--
-- 30 days is shorter than audit logs commonly use, but this is a
-- single-admin app with no compliance retention requirement -- the
-- log exists so the admin can answer "what happened recently", not as
-- a permanent record, and the explicit tradeoff is to keep the table
-- small rather than keep a long history nobody is required to retain.
create or replace function public.purge_expired_audit_log()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.audit_log
  where admin_id = auth.uid()
    and exists (select 1 from public.admins a where a.id = auth.uid())
    and created_at < now() - interval '30 days';
$$;

revoke all on function public.purge_expired_audit_log() from public;
grant execute on function public.purge_expired_audit_log() to authenticated;
