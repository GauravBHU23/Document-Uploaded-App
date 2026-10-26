-- Rate-limits the admin's OWN login (email+password via Supabase
-- Auth) -- found in a feature audit: every OTHER credential-guessing
-- surface in this app (PIN access, PIN reset) already has explicit
-- app-level rate limiting, but the actual admin login itself had none,
-- relying solely on whatever Supabase Auth's project-level defaults
-- provide. Mirrors the exact pin_attempts pattern (0002/0003), keyed
-- by email instead of person_id, since there's no person_id here.
--
-- This never touches passwords or Supabase Auth's own tables -- it
-- only tracks "was there a failed attempt for this email recently,"
-- entirely separate from and in addition to signInWithPassword itself.
-- The login page (app/login/page.tsx) calls check_login_rate_limit
-- BEFORE attempting sign-in (to block without even trying), and
-- record_login_failure AFTER a failed signInWithPassword call (to log
-- it for future checks). A successful login records nothing -- the
-- window simply ages out on its own.

create table public.login_attempts (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  attempted_at timestamptz not null default now()
);

create index login_attempts_email_idx on public.login_attempts (email, attempted_at);

alter table public.login_attempts enable row level security;
-- No policies: only ever touched by the SECURITY DEFINER functions
-- below, never directly by any client (anon or authenticated).

-- Public (anon-callable, since this runs before the admin is signed
-- in): true if this email is currently allowed to attempt login, false
-- if it's been locked out by too many recent failures. Same limit
-- shape as the PIN flows (8 per 10 minutes) -- generous enough that a
-- legitimate admin who mistypes their password a few times is never
-- blocked, strict enough to make online password guessing impractical.
create or replace function public.check_login_rate_limit(p_email text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select count(*) < 8
  from public.login_attempts
  where email = lower(trim(p_email))
    and attempted_at > now() - interval '10 minutes';
$$;

revoke all on function public.check_login_rate_limit(text) from public;
grant execute on function public.check_login_rate_limit(text) to anon, authenticated;

-- Public (anon-callable): records one failed login attempt for this
-- email. Called only after Supabase Auth itself has already rejected
-- the credentials -- this function has no opinion on whether the
-- password was right, it just logs that an attempt happened.
create or replace function public.record_login_failure(p_email text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.login_attempts (email) values (lower(trim(p_email)));
$$;

revoke all on function public.record_login_failure(text) from public;
grant execute on function public.record_login_failure(text) to anon, authenticated;
