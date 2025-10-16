-- Bulk version of get_user_current_days_for_rank
-- Returns current days for rank for a list of user IDs in one call

create or replace function public.get_users_current_days_for_rank(p_user_ids text[])
returns table(user_id text, days integer)
language sql
security definer
set search_path = public
as $$
  with latest as (
    select c."userId" as user_id,
           max(c."startedAt") as started_at
      from public.challenges c
     where c."userId" = any(p_user_ids) and c.status = 'active'
     group by c."userId"
  )
  select l.user_id,
         greatest(0, floor(extract(epoch from (now() - l.started_at)) / 86400.0))::int as days
    from latest l;
$$;

revoke all on function public.get_users_current_days_for_rank(text[]) from public;
grant execute on function public.get_users_current_days_for_rank(text[]) to authenticated;

