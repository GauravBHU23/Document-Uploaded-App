-- Follow-up fixes from a second audit pass:
--
-- 1. log_person_change's UPDATE branch (0014) always logged
--    {from_name, to_name} regardless of which field actually changed
--    -- editing only category/DOB/notes produced an audit entry that
--    said "updated X" with zero indication of what changed, even
--    though renames showed specific old/new values. Now the metadata
--    records every field that changed, not just the name.
--
-- 2. This migration's own comment in 0014 claimed search_people and
--    search_trash were dedicated SQL functions -- they were never
--    implemented that way (people search uses a plain client-side
--    .or(ilike...) query, trash search a client-side .filter()). That
--    was a documentation error, not a missing feature; noted here so
--    a future reader isn't sent looking for functions that don't
--    exist. No functional change needed since the client-side
--    approach already works correctly at this app's scale.

create or replace function public.log_person_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_changes jsonb := '{}'::jsonb;
begin
  if TG_OP = 'INSERT' then
    insert into public.audit_log (admin_id, action, entity_type, entity_id, entity_label, person_id, person_label)
    values (new.admin_id, 'person_created', 'person', new.id, new.full_name, new.id, new.full_name);
    return new;
  elsif TG_OP = 'UPDATE' then
    if old.full_name is distinct from new.full_name then
      v_changes := v_changes || jsonb_build_object('full_name', jsonb_build_object('from', old.full_name, 'to', new.full_name));
    end if;
    if old.category is distinct from new.category then
      v_changes := v_changes || jsonb_build_object('category', jsonb_build_object('from', old.category, 'to', new.category));
    end if;
    if old.date_of_birth is distinct from new.date_of_birth then
      v_changes := v_changes || jsonb_build_object('date_of_birth', jsonb_build_object('from', old.date_of_birth, 'to', new.date_of_birth));
    end if;
    if old.notes is distinct from new.notes then
      v_changes := v_changes || jsonb_build_object('notes', jsonb_build_object('from', old.notes, 'to', new.notes));
    end if;

    if v_changes <> '{}'::jsonb then
      insert into public.audit_log (admin_id, action, entity_type, entity_id, entity_label, person_id, person_label, metadata)
      values (new.admin_id, 'person_updated', 'person', new.id, new.full_name, new.id, new.full_name, v_changes);
    end if;
    return new;
  elsif TG_OP = 'DELETE' then
    insert into public.audit_log (admin_id, action, entity_type, entity_id, entity_label, person_id, person_label)
    values (old.admin_id, 'person_deleted', 'person', old.id, old.full_name, null, old.full_name);
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists people_audit_log on public.people;
create trigger people_audit_log
  after insert or update or delete on public.people
  for each row execute function public.log_person_change();
