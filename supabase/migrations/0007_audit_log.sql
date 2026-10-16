-- Audit log: a record of who did what and when, across people and
-- documents. Implemented with database triggers rather than relying
-- on the client to remember to log every action -- a trigger fires
-- regardless of which code path made the change (app, Edge Function,
-- or a manual SQL Editor edit), so the log can't drift out of sync
-- with reality the way a "the app also calls logEvent()" convention
-- eventually would.

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.admins(id) on delete cascade,
  action text not null,
  entity_type text not null check (entity_type in ('person', 'document')),
  entity_id uuid not null,
  -- Denormalized labels so the log reads clearly even after the
  -- underlying person/document has since been deleted (entity_id
  -- would otherwise point at nothing).
  entity_label text,
  person_id uuid references public.people(id) on delete set null,
  person_label text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_admin_id_idx on public.audit_log (admin_id, created_at desc);
create index audit_log_person_id_idx on public.audit_log (person_id);

alter table public.audit_log enable row level security;

-- Admins can only ever READ their own log. No insert/update/delete
-- policy exists for the admin role at all -- every row is written
-- exclusively by the SECURITY DEFINER trigger functions below, which
-- run as the table owner and bypass RLS for the insert itself. This
-- makes the log append-only from the app's perspective: there is no
-- code path, even a compromised client, that can insert a fake entry
-- or edit/delete a real one.
create policy "admins read their own audit log"
  on public.audit_log for select
  using (
    admin_id = auth.uid()
    and exists (select 1 from public.admins a where a.id = auth.uid())
  );

-- ============================================================
-- people: log create and delete
-- ============================================================
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
  elsif TG_OP = 'DELETE' then
    insert into public.audit_log (admin_id, action, entity_type, entity_id, entity_label, person_id, person_label)
    values (old.admin_id, 'person_deleted', 'person', old.id, old.full_name, null, old.full_name);
    return old;
  end if;
  return null;
end;
$$;

create trigger people_audit_log
  after insert or delete on public.people
  for each row execute function public.log_person_change();

-- ============================================================
-- documents: log upload, (soft) delete, restore, and permanent delete
-- ============================================================
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
    -- Do NOT set person_id here: this fires both for a direct
    -- document delete (person still exists) and for a cascading
    -- delete when the person row itself is removed (same statement,
    -- so the person row may already be gone by the time this runs) --
    -- the FK on audit_log.person_id would then reject the insert.
    -- person_label (denormalized text, no FK) carries the display
    -- name either way, which is all the Audit Log page needs.
    select full_name into v_person_label from public.people where id = old.person_id;
    insert into public.audit_log (admin_id, action, entity_type, entity_id, entity_label, person_id, person_label)
    values (old.admin_id, 'document_permanently_deleted', 'document', old.id, old.label, null, v_person_label);
    return old;
  end if;
  return null;
end;
$$;

create trigger documents_audit_log
  after insert or update or delete on public.documents
  for each row execute function public.log_document_change();
