-- Restrict SECURITY DEFINER RPCs (text signatures) to authenticated only
revoke all on function public.increment_post_likes(post_id text) from public;
revoke all on function public.increment_post_likes(p_post_id text, p_delta integer) from public;
revoke all on function public.increment_post_comments(post_id text) from public;
revoke all on function public.increment_post_comments(p_post_id text, p_delta integer) from public;

grant execute on function public.increment_post_likes(post_id text) to authenticated;
grant execute on function public.increment_post_likes(p_post_id text, p_delta integer) to authenticated;
grant execute on function public.increment_post_comments(post_id text) to authenticated;
grant execute on function public.increment_post_comments(p_post_id text, p_delta integer) to authenticated;

-- Lock down community_likes SELECT to self only
alter table if exists public.community_likes enable row level security;
drop policy if exists community_likes_select_public on public.community_likes;
create policy community_likes_select_self on public.community_likes for select to authenticated using ("userId" = (select auth.uid())::text);

