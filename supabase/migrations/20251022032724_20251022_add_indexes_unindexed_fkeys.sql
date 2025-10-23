-- Add indexes for advisor-reported unindexed foreign keys
create index if not exists idx_community_likes_post on public.community_likes("postId");
create index if not exists idx_profiles_user_id on public.profiles(user_id);

