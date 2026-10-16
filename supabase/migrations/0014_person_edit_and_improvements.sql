-- Several improvements found in a full feature audit:
--
-- 1. Person edit was entirely missing -- people could only be created
--    or deleted, never corrected (a typo'd name meant delete + lose
--    every one of their documents via the cascade). log_person_change
--    (0007_audit_log.sql) only had INSERT/DELETE branches; this adds
--    an UPDATE branch, but only logs when a *profile* field actually
--    changed (full_name/category/date_of_birth/notes) -- set_person_pin,
--    clear_person_pin, create_upload_token, and clear_upload_token all
--    also UPDATE the people row (access_pin_hash / upload_token), and
--    those are intentionally NOT re-logged as "person_updated" here;
--    they're a different concern from editing someone's profile.
--
-- 2. usePeople's dashboard search only matched full_name -- category
--    (OBC/General/SC/ST/EWS) was a real filterable field with no way
--    to search by it. search_people lets the client pass one query
--    that matches either field server-side.
--
-- 3. Trash had no search/filter despite being a single bin across
--    every person (an admin with many trashed documents from many
--    people had no way to narrow the view) -- search_trash mirrors
--    search_people's reasoning, matching document label or person name.

create or replace function public.log_person_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    insert into public.audit_log (admin_id, action, entity_type, entity_id, entity_label, person_id, person_label)
    values (new.admin_id, 'person_created', 'person', new.id, new.full_name, new.id, new.full_name);
    return new;
  elsif TG_OP = 'UPDATE' then
    if old.full_name is distinct from new.full_name
      or old.category is distinct from new.category
      or old.date_of_birth is distinct from new.date_of_birth
      or old.notes is distinct from new.notes
    then
      insert into public.audit_log (admin_id, action, entity_type, entity_id, entity_label, person_id, person_label, metadata)
      values (
        new.admin_id, 'person_updated', 'person', new.id, new.full_name, new.id, new.full_name,
        jsonb_build_object('from_name', old.full_name, 'to_name', new.full_name)
      );
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
