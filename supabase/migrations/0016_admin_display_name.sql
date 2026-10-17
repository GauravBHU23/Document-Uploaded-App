-- Lets the signed-in admin change their own display_name (the name
-- shown in "Welcome back, <name>" and the header). Deliberately
-- narrow: email and password are NOT editable here, or anywhere in
-- the app -- those stay a one-time Supabase Dashboard operation
-- (0001_init.sql's reasoning), since a self-service email/password
-- change is the one mistake that could lock the single admin out of
-- their own account with no recovery path in this app.
create or replace function public.update_my_display_name(p_display_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_display_name is not null and length(trim(p_display_name)) = 0 then
    p_display_name := null;
  end if;

  update public.admins
  set display_name = p_display_name
  where id = auth.uid();

  if not found then
    raise exception 'Not permitted';
  end if;
end;
$$;

revoke all on function public.update_my_display_name(text) from public;
grant execute on function public.update_my_display_name(text) to authenticated;
