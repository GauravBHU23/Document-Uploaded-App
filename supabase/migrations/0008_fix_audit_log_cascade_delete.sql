-- Fixes a bug found while testing 0007: deleting a person cascades to
-- permanently delete their documents in the same statement, which
-- fires log_document_change()'s DELETE branch while the person row
-- may already be gone -- inserting old.person_id (a value no longer
-- present in people) violated audit_log's foreign key and made
-- "delete person" fail outright once this trigger went live.
--
-- Fix: never set audit_log.person_id for a document-delete log entry
-- (whether direct or cascading) -- only the denormalized person_label
-- text, which has no FK and survives the person being gone.

create or replace function public.log_document_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_person_label text;
begin
  if TG_OP = 'INSERT' then
    select full_name into v_person_label from public.people where id = new.person_id;
    insert into public.audit_log (admin_id, action, entity_type, entity_id, entity_label, person_id, person_label, metadata)
    values (new.admin_id, 'document_uploaded', 'document', new.id, new.label, new.person_id, v_person_label, jsonb_build_object('source', new.source));
    return new;

  elsif TG_OP = 'UPDATE' then
    select full_name into v_person_label from public.people where id = new.person_id;

    if old.deleted_at is null and new.deleted_at is not null then
      insert into public.audit_log (admin_id, action, entity_type, entity_id, entity_label, person_id, person_label)
      values (new.admin_id, 'document_trashed', 'document', new.id, new.label, new.person_id, v_person_label);
    elsif old.deleted_at is not null and new.deleted_at is null then
      insert into public.audit_log (admin_id, action, entity_type, entity_id, entity_label, person_id, person_label)
      values (new.admin_id, 'document_restored', 'document', new.id, new.label, new.person_id, v_person_label);
    elsif old.label is distinct from new.label then
      insert into public.audit_log (admin_id, action, entity_type, entity_id, entity_label, person_id, person_label, metadata)
      values (new.admin_id, 'document_renamed', 'document', new.id, new.label, new.person_id, v_person_label, jsonb_build_object('from', old.label, 'to', new.label));
    end if;
    return new;

  elsif TG_OP = 'DELETE' then
    -- person_id intentionally null -- see migration header comment.
    select full_name into v_person_label from public.people where id = old.person_id;
    insert into public.audit_log (admin_id, action, entity_type, entity_id, entity_label, person_id, person_label)
    values (old.admin_id, 'document_permanently_deleted', 'document', old.id, old.label, null, v_person_label);
    return old;
  end if;
  return null;
end;
$$;
