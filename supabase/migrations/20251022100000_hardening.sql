-- Security and integrity hardening
-- - Set security_invoker for selected views to avoid owner-privilege execution
-- - Add partial unique index to prevent multiple active challenges per user
-- - Add non-negative check constraints for community_posts counters

-- Ensure views run with invoker privileges (do nothing if view is missing)
do $$ begin
  if exists (
    select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where c.relkind = 'v'
       and n.nspname = 'public'
       and c.relname = 'community_posts_v'
  ) then
    execute 'alter view public.community_posts_v set (security_invoker = true)';
  end if;
  if exists (
    select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where c.relkind = 'v'
       and n.nspname = 'public'
       and c.relname = 'community_comments_v'
  ) then
    execute 'alter view public.community_comments_v set (security_invoker = true)';
  end if;
  if exists (
    select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where c.relkind = 'v'
       and n.nspname = 'public'
       and c.relname = 'diaries_v'
  ) then
    execute 'alter view public.diaries_v set (security_invoker = true)';
  end if;
end $$;

-- Prevent race conditions: at most one active challenge per user
create unique index if not exists idx_challenges_user_active
  on public.challenges("userId")
  where status = 'active';

-- Guard counters against negative values (add only if absent)
do $$ begin
  if not exists (
    select 1
      from information_schema.table_constraints tc
     where tc.constraint_schema = 'public'
       and tc.table_name = 'community_posts'
       and tc.constraint_name = 'community_posts_likes_nonneg'
  ) then
    alter table public.community_posts
      add constraint community_posts_likes_nonneg
      check (likes >= 0);
  end if;
  if not exists (
    select 1
      from information_schema.table_constraints tc
     where tc.constraint_schema = 'public'
       and tc.table_name = 'community_posts'
       and tc.constraint_name = 'community_posts_comments_nonneg'
  ) then
    alter table public.community_posts
      add constraint community_posts_comments_nonneg
      check (comments >= 0);
  end if;
end $$;

