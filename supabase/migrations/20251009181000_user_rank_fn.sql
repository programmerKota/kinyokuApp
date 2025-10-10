-- Compute current days for rank for any user in a SECURITY DEFINER function
-- Allows clients to read other users' rank safely without broadening table RLS

create or replace function public.get_user_current_days_for_rank(p_user_id text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_started_at timestamptz;
  v_days integer := 0;
begin
  -- pick the latest active challenge for the user
  select "startedAt"
    into v_started_at
  from public.challenges
  where "userId" = p_user_id and status = 'active'
  order by "startedAt" desc
  limit 1;

  if v_started_at is null then
    return 0;
  end if;

  v_days := floor(extract(epoch from (now() - v_started_at)) / 86400.0);
  if v_days < 0 then
    v_days := 0;
  end if;
  return v_days;
end;
$$;

revoke all on function public.get_user_current_days_for_rank(text) from public;
grant execute on function public.get_user_current_days_for_rank(text) to authenticated;

