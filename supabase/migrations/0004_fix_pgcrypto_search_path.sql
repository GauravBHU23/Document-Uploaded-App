-- Fixes a bug where set_person_pin and verify_person_pin could not
-- find crypt()/gen_salt(): Supabase installs the pgcrypto extension
-- into the `extensions` schema (not `public`), but both functions set
-- `search_path = public` only, so the functions were unusable --
-- set_person_pin would fail outright with "function gen_salt(unknown)
-- does not exist" every time an admin tried to create a PIN.

create or replace function public.set_person_pin(p_person_id uuid, p_pin text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if p_pin !~ '^[0-9]{4,6}$' then
    raise exception 'PIN must be 4 to 6 digits';
  end if;

  update public.people
  set access_pin_hash = crypt(p_pin, gen_salt('bf')),
      updated_at = now()
  where id = p_person_id
    and admin_id = auth.uid()
    and exists (select 1 from public.admins a where a.id = auth.uid());

  if not found then
    raise exception 'Person not found or not permitted';
  end if;
end;
$$;

create or replace function public.verify_person_pin(p_person_id uuid, p_pin text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
  v_recent_attempts int;
  v_ok boolean;
begin
  select count(*) into v_recent_attempts
  from public.pin_attempts
  where person_id = p_person_id
    and attempted_at > now() - interval '10 minutes';

  if v_recent_attempts >= 8 then
    return false;
  end if;

  insert into public.pin_attempts (person_id) values (p_person_id);

  select access_pin_hash into v_hash
  from public.people
  where id = p_person_id;

  if v_hash is null then
    return false;
  end if;

  v_ok := (v_hash = crypt(p_pin, v_hash));
  return v_ok;
end;
$$;
