-- Performance indexes for frequent queries

-- diaries by day / createdAt
create index if not exists idx_diaries_day_created on public.diaries("day", "createdAt");

-- community_likes lookup by userId + postId (already unique created in schema, but ensure)
create index if not exists idx_likes_user_post on public.community_likes("userId", "postId");

-- challenges by userId + status + startedAt (for rank computations)
create index if not exists idx_challenges_user_status_started on public.challenges("userId", "status", "startedAt");

