-- Document Upload admin app: initial schema + Row Level Security
-- Run this once in the Supabase SQL editor on a fresh project.

-- ============================================================
-- admins: explicit allowlist. Being a valid auth.users row is NOT
-- enough to be treated as admin -- a row must exist here too.
-- ============================================================
create table public.admins (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

create policy "admins can read their own admin row"
  on public.admins for select
  using (id = auth.uid());

-- No insert/update/delete policy for admins table: rows are only ever
-- added manually via the Supabase SQL editor by a project owner, never
-- through the app or the public API.

-- ============================================================
-- people: per-person profiles (not app accounts, just records)
-- ============================================================
create table public.people (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.admins(id) on delete cascade,
  full_name text not null,
  date_of_birth date,
  category text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index people_admin_id_idx on public.people (admin_id);

alter table public.people enable row level security;

create policy "admins manage their own people"
  on public.people for all
  using (
    admin_id = auth.uid()
    and exists (select 1 from public.admins a where a.id = auth.uid())
  )
  with check (
    admin_id = auth.uid()
    and exists (select 1 from public.admins a where a.id = auth.uid())
  );

-- ============================================================
-- documents: file metadata, strictly scoped to one person
-- ============================================================
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete cascade,
  admin_id uuid not null references public.admins(id) on delete cascade,
  label text not null,
  storage_path text not null,
  mime_type text not null,
  size_bytes bigint not null,
  source text not null default 'upload' check (source in ('upload', 'camera', 'qr_mobile', 'tool_generated')),
  created_at timestamptz not null default now()
);

create index documents_person_id_idx on public.documents (person_id);
create index documents_admin_id_idx on public.documents (admin_id);

alter table public.documents enable row level security;

create policy "admins manage their own documents"
  on public.documents for all
  using (
    admin_id = auth.uid()
    and exists (select 1 from public.admins a where a.id = auth.uid())
  )
  with check (
    admin_id = auth.uid()
    and exists (select 1 from public.admins a where a.id = auth.uid())
  );

-- ============================================================
-- upload_sessions: QR mobile-capture convenience only.
-- This table grants no special privilege by itself -- it only
-- remembers which person a QR code points to, and expires quickly.
-- ============================================================
create table public.upload_sessions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.admins(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index upload_sessions_admin_id_idx on public.upload_sessions (admin_id);

alter table public.upload_sessions enable row level security;

create policy "admins manage their own upload sessions"
  on public.upload_sessions for all
  using (
    admin_id = auth.uid()
    and exists (select 1 from public.admins a where a.id = auth.uid())
  )
  with check (
    admin_id = auth.uid()
    and exists (select 1 from public.admins a where a.id = auth.uid())
  );

-- ============================================================
-- Storage bucket + policies
-- ============================================================
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

create policy "admins read own storage folder"
  on storage.objects for select
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (select 1 from public.admins a where a.id = auth.uid())
  );

create policy "admins upload to own storage folder"
  on storage.objects for insert
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (select 1 from public.admins a where a.id = auth.uid())
  );

create policy "admins update own storage folder"
  on storage.objects for update
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (select 1 from public.admins a where a.id = auth.uid())
  );

create policy "admins delete own storage folder"
  on storage.objects for delete
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (select 1 from public.admins a where a.id = auth.uid())
  );

-- ============================================================
-- After running this file:
-- 1. Go to Authentication -> Users -> Add user, create the admin's
--    email + password manually.
-- 2. Copy that user's UUID, then run:
--      insert into public.admins (id, email, display_name)
--      values ('<uuid-from-step-1>', 'admin@example.com', 'Admin Name');
-- 3. Go to Authentication -> Settings and disable "Allow new users to
--    sign up" so the project itself refuses any signup call, even
--    though the app never exposes one.
-- ============================================================
