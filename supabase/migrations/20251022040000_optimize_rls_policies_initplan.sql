-- Optimize RLS policies by wrapping auth.uid() calls with SELECT to avoid per-row initplan
-- Mirrors the definitions from 20251003123000_rls.sql with (select auth.uid())

-- feedback
alter table if exists public.feedback enable row level security;
drop policy if exists feedback_insert_auth on public.feedback;
create policy feedback_insert_auth on public.feedback for insert to authenticated with check ("userId" = (select auth.uid())::text);

-- community_posts
alter table if exists public.community_posts enable row level security;
drop policy if exists community_posts_select_public on public.community_posts;
drop policy if exists community_posts_insert_auth on public.community_posts;
drop policy if exists community_posts_update_auth on public.community_posts;
drop policy if exists community_posts_delete_auth on public.community_posts;
create policy community_posts_select_public on public.community_posts for select using (true);
create policy community_posts_insert_auth on public.community_posts for insert to authenticated with check ("authorId" = (select auth.uid())::text);
create policy community_posts_update_auth on public.community_posts for update to authenticated using ("authorId" = (select auth.uid())::text) with check ("authorId" = (select auth.uid())::text);
create policy community_posts_delete_auth on public.community_posts for delete to authenticated using ("authorId" = (select auth.uid())::text);

-- community_comments
alter table if exists public.community_comments enable row level security;
drop policy if exists community_comments_select_public on public.community_comments;
drop policy if exists community_comments_insert_auth on public.community_comments;
drop policy if exists community_comments_update_auth on public.community_comments;
drop policy if exists community_comments_delete_auth on public.community_comments;
create policy community_comments_select_public on public.community_comments for select using (true);
create policy community_comments_insert_auth on public.community_comments for insert to authenticated with check ("authorId" = (select auth.uid())::text);
create policy community_comments_update_auth on public.community_comments for update to authenticated using ("authorId" = (select auth.uid())::text) with check ("authorId" = (select auth.uid())::text);
create policy community_comments_delete_auth on public.community_comments for delete to authenticated using ("authorId" = (select auth.uid())::text);

-- community_likes
alter table if exists public.community_likes enable row level security;
drop policy if exists community_likes_select_public on public.community_likes;
drop policy if exists community_likes_mutate_auth on public.community_likes;
create policy community_likes_select_public on public.community_likes for select using (true);
create policy community_likes_mutate_auth on public.community_likes for all to authenticated using ("userId" = (select auth.uid())::text) with check ("userId" = (select auth.uid())::text);

-- follows
alter table if exists public.follows enable row level security;
drop policy if exists follows_select_self on public.follows;
drop policy if exists follows_mutate_self on public.follows;
create policy follows_select_self on public.follows for select to authenticated using ("followerId" = (select auth.uid())::text);
create policy follows_mutate_self on public.follows for all to authenticated using ("followerId" = (select auth.uid())::text) with check ("followerId" = (select auth.uid())::text);

-- blocks
alter table if exists public.blocks enable row level security;
drop policy if exists blocks_select_self on public.blocks;
drop policy if exists blocks_mutate_self on public.blocks;
create policy blocks_select_self on public.blocks for select to authenticated using ("blockerId" = (select auth.uid())::text);
create policy blocks_mutate_self on public.blocks for all to authenticated using ("blockerId" = (select auth.uid())::text) with check ("blockerId" = (select auth.uid())::text);

-- challenges
alter table if exists public.challenges enable row level security;
drop policy if exists challenges_select_active_public on public.challenges;
drop policy if exists challenges_select_self on public.challenges;
drop policy if exists challenges_mutate_self on public.challenges;
create policy challenges_select_active_public on public.challenges for select using (status = 'active');
create policy challenges_select_self on public.challenges for select to authenticated using ("userId" = (select auth.uid())::text);
create policy challenges_mutate_self on public.challenges for all to authenticated using ("userId" = (select auth.uid())::text) with check ("userId" = (select auth.uid())::text);

-- diaries
alter table if exists public.diaries enable row level security;
drop policy if exists diaries_select_public on public.diaries;
drop policy if exists diaries_mutate_self on public.diaries;
create policy diaries_select_public on public.diaries for select using (true);
create policy diaries_mutate_self on public.diaries for all to authenticated using ("userId" = (select auth.uid())::text) with check ("userId" = (select auth.uid())::text);

-- tournaments
alter table if exists public.tournaments enable row level security;
drop policy if exists tournaments_select_public on public.tournaments;
drop policy if exists tournaments_insert_owner on public.tournaments;
drop policy if exists tournaments_update_owner on public.tournaments;
create policy tournaments_select_public on public.tournaments for select using (true);
create policy tournaments_insert_owner on public.tournaments for insert to authenticated with check ("ownerId" = (select auth.uid())::text);
create policy tournaments_update_owner on public.tournaments for update to authenticated using ("ownerId" = (select auth.uid())::text) with check ("ownerId" = (select auth.uid())::text);

-- tournament_participants
alter table if exists public.tournament_participants enable row level security;
drop policy if exists participants_select_public on public.tournament_participants;
drop policy if exists participants_insert_self on public.tournament_participants;
create policy participants_select_public on public.tournament_participants for select using (true);
create policy participants_insert_self on public.tournament_participants for insert to authenticated with check ("userId" = (select auth.uid())::text);

-- tournament_join_requests
alter table if exists public.tournament_join_requests enable row level security;
drop policy if exists join_requests_select_self_or_owner on public.tournament_join_requests;
drop policy if exists join_requests_insert_self on public.tournament_join_requests;
drop policy if exists join_requests_owner_update on public.tournament_join_requests;
create policy join_requests_select_self_or_owner on public.tournament_join_requests for select using (
  "userId" = (select auth.uid())::text or exists (
    select 1 from public.tournaments t where t.id = "tournamentId" and t."ownerId" = (select auth.uid())::text
  )
);
create policy join_requests_insert_self on public.tournament_join_requests for insert to authenticated with check ("userId" = (select auth.uid())::text);
create policy join_requests_owner_update on public.tournament_join_requests for update to authenticated using (
  exists (select 1 from public.tournaments t where t.id = "tournamentId" and t."ownerId" = (select auth.uid())::text)
) with check (true);

-- tournament_messages
alter table if exists public.tournament_messages enable row level security;
drop policy if exists tournament_messages_select_public on public.tournament_messages;
drop policy if exists tournament_messages_insert_auth on public.tournament_messages;
create policy tournament_messages_select_public on public.tournament_messages for select using (true);
create policy tournament_messages_insert_auth on public.tournament_messages for insert to authenticated with check ("authorId" = (select auth.uid())::text);

