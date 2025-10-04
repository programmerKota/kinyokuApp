-- Safe/idempotent schema alignment for Abstinence Challenge app
-- Run this in Supabase SQL Editor or via migrations.

-- prerequisites
create extension if not exists pgcrypto;

-- profiles
create table if not exists public.profiles (
  id text primary key,
  displayName text not null default '',
  photoURL text,
  email text,
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now()
);
alter table public.profiles add column if not exists displayName text not null default '';
alter table public.profiles add column if not exists photoURL text;
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists createdAt timestamptz not null default now();
alter table public.profiles add column if not exists updatedAt timestamptz not null default now();
create index if not exists idx_profiles_updatedAt on public.profiles("updatedAt");

-- diaries
create table if not exists public.diaries (
  id uuid primary key default gen_random_uuid(),
  userId text not null,
  content text not null,
  challengeId uuid,
  day integer,
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now()
);
alter table public.diaries add column if not exists challengeId uuid;
alter table public.diaries add column if not exists day integer;
alter table public.diaries add column if not exists createdAt timestamptz not null default now();
alter table public.diaries add column if not exists updatedAt timestamptz not null default now();
create index if not exists idx_diaries_userId_createdAt on public.diaries("userId","createdAt");

-- blocks
create table if not exists public.blocks (
  id text primary key,
  blockerId text not null,
  blockedId text not null,
  createdAt timestamptz not null default now()
);
alter table public.blocks add column if not exists blockerId text not null;
alter table public.blocks add column if not exists blockedId text not null;
alter table public.blocks add column if not exists createdAt timestamptz not null default now();
create index if not exists idx_blocks_blocker on public.blocks("blockerId");
create index if not exists idx_blocks_blocked on public.blocks("blockedId");

-- follows
create table if not exists public.follows (
  id text primary key,
  followerId text not null,
  followeeId text not null,
  createdAt timestamptz not null default now()
);
alter table public.follows add column if not exists followerId text not null;
alter table public.follows add column if not exists followeeId text not null;
alter table public.follows add column if not exists createdAt timestamptz not null default now();
create index if not exists idx_follows_follower on public.follows("followerId");
create index if not exists idx_follows_followee on public.follows("followeeId");

-- challenges
create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  userId text not null,
  goalDays integer not null,
  penaltyAmount integer not null default 0,
  status text not null,
  startedAt timestamptz not null,
  completedAt timestamptz,
  failedAt timestamptz,
  totalPenaltyPaid integer not null default 0,
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now()
);
alter table public.challenges add column if not exists goalDays integer not null default 1;
alter table public.challenges add column if not exists penaltyAmount integer not null default 0;
alter table public.challenges add column if not exists status text not null default 'active';
alter table public.challenges add column if not exists startedAt timestamptz;
alter table public.challenges add column if not exists completedAt timestamptz;
alter table public.challenges add column if not exists failedAt timestamptz;
alter table public.challenges add column if not exists totalPenaltyPaid integer not null default 0;
alter table public.challenges add column if not exists createdAt timestamptz not null default now();
alter table public.challenges add column if not exists updatedAt timestamptz not null default now();
create index if not exists idx_challenges_user_status on public.challenges("userId","status");
create index if not exists idx_challenges_createdAt on public.challenges("createdAt");

-- community_posts
create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  authorId text not null,
  authorName text,
  authorAvatar text,
  title text,
  content text not null,
  imageUrl text,
  likes integer not null default 0,
  comments integer not null default 0,
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now()
);
alter table public.community_posts add column if not exists authorName text;
alter table public.community_posts add column if not exists authorAvatar text;
alter table public.community_posts add column if not exists title text;
alter table public.community_posts add column if not exists content text;
alter table public.community_posts add column if not exists imageUrl text;
alter table public.community_posts add column if not exists likes integer not null default 0;
alter table public.community_posts add column if not exists comments integer not null default 0;
alter table public.community_posts add column if not exists createdAt timestamptz not null default now();
alter table public.community_posts add column if not exists updatedAt timestamptz not null default now();
create index if not exists idx_posts_author_created on public.community_posts("authorId","createdAt");

-- community_comments
create table if not exists public.community_comments (
  id uuid primary key default gen_random_uuid(),
  postId uuid not null,
  authorId text not null,
  authorName text,
  authorAvatar text,
  content text not null,
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now()
);
alter table public.community_comments add column if not exists postId uuid;
alter table public.community_comments add column if not exists authorName text;
alter table public.community_comments add column if not exists authorAvatar text;
alter table public.community_comments add column if not exists content text;
alter table public.community_comments add column if not exists createdAt timestamptz not null default now();
alter table public.community_comments add column if not exists updatedAt timestamptz not null default now();
create index if not exists idx_comments_post_created on public.community_comments("postId","createdAt");

-- community_likes
create table if not exists public.community_likes (
  id text primary key,
  userId text not null,
  postId uuid not null,
  createdAt timestamptz not null default now()
);
alter table public.community_likes add column if not exists createdAt timestamptz not null default now();
create index if not exists idx_likes_post on public.community_likes("postId");
create index if not exists idx_likes_user on public.community_likes("userId");

-- tournaments
create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  ownerId text not null,
  maxParticipants integer not null default 100,
  entryFee integer not null default 0,
  prizePool integer not null default 0,
  status text not null,
  recruitmentOpen boolean not null default false,
  startDate timestamptz,
  endDate timestamptz,
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now()
);
alter table public.tournaments add column if not exists description text;
alter table public.tournaments add column if not exists maxParticipants integer not null default 100;
alter table public.tournaments add column if not exists entryFee integer not null default 0;
alter table public.tournaments add column if not exists prizePool integer not null default 0;
alter table public.tournaments add column if not exists recruitmentOpen boolean not null default false;
alter table public.tournaments add column if not exists startDate timestamptz;
alter table public.tournaments add column if not exists endDate timestamptz;
alter table public.tournaments add column if not exists createdAt timestamptz not null default now();
alter table public.tournaments add column if not exists updatedAt timestamptz not null default now();
create index if not exists idx_tournaments_owner on public.tournaments("ownerId");
create index if not exists idx_tournaments_status on public.tournaments("status");

-- tournament_join_requests
create table if not exists public.tournament_join_requests (
  id uuid primary key default gen_random_uuid(),
  tournamentId uuid not null,
  userId text not null,
  userName text not null,
  userAvatar text,
  status text not null default 'pending',
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now()
);
alter table public.tournament_join_requests add column if not exists userAvatar text;
alter table public.tournament_join_requests add column if not exists status text not null default 'pending';
alter table public.tournament_join_requests add column if not exists createdAt timestamptz not null default now();
alter table public.tournament_join_requests add column if not exists updatedAt timestamptz not null default now();
create index if not exists idx_join_requests_tournament on public.tournament_join_requests("tournamentId");
create index if not exists idx_join_requests_user on public.tournament_join_requests("userId");

-- tournament_participants
create table if not exists public.tournament_participants (
  id uuid primary key default gen_random_uuid(),
  tournamentId uuid not null,
  userId text not null,
  userName text,
  userAvatar text,
  status text not null default 'joined',
  joinedAt timestamptz not null default now(),
  leftAt timestamptz,
  progressPercent integer not null default 0,
  currentDay integer not null default 1
);
alter table public.tournament_participants add column if not exists userName text;
alter table public.tournament_participants add column if not exists userAvatar text;
alter table public.tournament_participants add column if not exists status text not null default 'joined';
alter table public.tournament_participants add column if not exists joinedAt timestamptz not null default now();
alter table public.tournament_participants add column if not exists leftAt timestamptz;
alter table public.tournament_participants add column if not exists progressPercent integer not null default 0;
alter table public.tournament_participants add column if not exists currentDay integer not null default 1;
create unique index if not exists uq_participant_unique on public.tournament_participants("tournamentId","userId");
create index if not exists idx_participants_tournament on public.tournament_participants("tournamentId");

-- tournament_messages
create table if not exists public.tournament_messages (
  id uuid primary key default gen_random_uuid(),
  tournamentId uuid not null,
  authorId text not null,
  authorName text,
  authorAvatar text,
  text text not null,
  type text not null default 'text',
  createdAt timestamptz not null default now()
);
alter table public.tournament_messages add column if not exists authorName text;
alter table public.tournament_messages add column if not exists authorAvatar text;
alter table public.tournament_messages add column if not exists type text not null default 'text';
alter table public.tournament_messages add column if not exists createdAt timestamptz not null default now();
create index if not exists idx_messages_tournament_created on public.tournament_messages("tournamentId","createdAt");

-- test_items (for connection tests)
create table if not exists public.test_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  created_at timestamptz not null default now()
);

-- RPCs: fix ambiguous overloads by keeping uuid-based variant
drop function if exists public.increment_post_likes(text, integer);
create or replace function public.increment_post_likes(p_post_id uuid, p_delta integer)
returns void
language sql
security definer
set search_path = public
as $$
  update public.community_posts
     set likes = greatest(0, coalesce(likes,0) + p_delta),
         "updatedAt" = now()
   where id::text = p_post_id::text;
$$;

drop function if exists public.increment_post_comments(text, integer);
create or replace function public.increment_post_comments(p_post_id uuid, p_delta integer)
returns void
language sql
security definer
set search_path = public
as $$
  update public.community_posts
     set comments = greatest(0, coalesce(comments,0) + p_delta),
         "updatedAt" = now()
   where id::text = p_post_id::text;
$$;

-- ---------------------------------------------------------------------------
-- Constraints, Foreign Keys, Unique Indexes, and Triggers (idempotent)
-- ---------------------------------------------------------------------------

-- Helper: auto update updatedAt
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new."updatedAt" = now();
  return new;
end;
$$;

-- Attach updatedAt trigger where column exists
do $$ begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='updatedAt') then
    if not exists (select 1 from pg_trigger where tgname='tr_profiles_updated_at') then
      create trigger tr_profiles_updated_at before update on public.profiles
      for each row execute function public.set_updated_at();
    end if;
  end if;
end $$;

do $$ begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='diaries' and column_name='updatedAt') then
    if not exists (select 1 from pg_trigger where tgname='tr_diaries_updated_at') then
      create trigger tr_diaries_updated_at before update on public.diaries
      for each row execute function public.set_updated_at();
    end if;
  end if;
end $$;

do $$ begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='challenges' and column_name='updatedAt') then
    if not exists (select 1 from pg_trigger where tgname='tr_challenges_updated_at') then
      create trigger tr_challenges_updated_at before update on public.challenges
      for each row execute function public.set_updated_at();
    end if;
  end if;
end $$;

do $$ begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='community_posts' and column_name='updatedAt') then
    if not exists (select 1 from pg_trigger where tgname='tr_community_posts_updated_at') then
      create trigger tr_community_posts_updated_at before update on public.community_posts
      for each row execute function public.set_updated_at();
    end if;
  end if;
end $$;

do $$ begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='community_comments' and column_name='updatedAt') then
    if not exists (select 1 from pg_trigger where tgname='tr_community_comments_updated_at') then
      create trigger tr_community_comments_updated_at before update on public.community_comments
      for each row execute function public.set_updated_at();
    end if;
  end if;
end $$;

do $$ begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='tournaments' and column_name='updatedAt') then
    if not exists (select 1 from pg_trigger where tgname='tr_tournaments_updated_at') then
      create trigger tr_tournaments_updated_at before update on public.tournaments
      for each row execute function public.set_updated_at();
    end if;
  end if;
end $$;

do $$ begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='tournament_join_requests' and column_name='updatedAt') then
    if not exists (select 1 from pg_trigger where tgname='tr_tournament_join_requests_updated_at') then
      create trigger tr_tournament_join_requests_updated_at before update on public.tournament_join_requests
      for each row execute function public.set_updated_at();
    end if;
  end if;
end $$;

-- Check constraints for statuses/types
do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema='public' and table_name='challenges' and constraint_name='challenges_status_chk'
  ) then
    alter table public.challenges
      add constraint challenges_status_chk check (status in ('active','completed','failed','paused'));
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema='public' and table_name='tournaments' and constraint_name='tournaments_status_chk'
  ) then
    alter table public.tournaments
      add constraint tournaments_status_chk check (status in ('upcoming','active','completed','cancelled'));
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema='public' and table_name='tournament_participants' and constraint_name='tournament_participants_status_chk'
  ) then
    alter table public.tournament_participants
      add constraint tournament_participants_status_chk check (status in ('joined','left','kicked','completed','failed'));
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema='public' and table_name='tournament_join_requests' and constraint_name='tournament_join_requests_status_chk'
  ) then
    alter table public.tournament_join_requests
      add constraint tournament_join_requests_status_chk check (status in ('pending','approved','rejected'));
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema='public' and table_name='tournament_messages' and constraint_name='tournament_messages_type_chk'
  ) then
    alter table public.tournament_messages
      add constraint tournament_messages_type_chk check (type in ('text','system'));
  end if;
end $$;

-- Foreign keys (with cascade where appropriate)
do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints where constraint_name='fk_comments_post'
  ) then
    alter table public.community_comments
      add constraint fk_comments_post foreign key ("postId") references public.community_posts(id) on delete cascade;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints where constraint_name='fk_comments_author'
  ) then
    alter table public.community_comments
      add constraint fk_comments_author foreign key ("authorId") references public.profiles(id) on delete cascade;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints where constraint_name='fk_posts_author'
  ) then
    alter table public.community_posts
      add constraint fk_posts_author foreign key ("authorId") references public.profiles(id) on delete cascade;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints where constraint_name='fk_likes_user'
  ) then
    alter table public.community_likes
      add constraint fk_likes_user foreign key ("userId") references public.profiles(id) on delete cascade;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints where constraint_name='fk_likes_post'
  ) then
    alter table public.community_likes
      add constraint fk_likes_post foreign key ("postId") references public.community_posts(id) on delete cascade;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints where constraint_name='fk_follows_follower'
  ) then
    alter table public.follows
      add constraint fk_follows_follower foreign key ("followerId") references public.profiles(id) on delete cascade;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints where constraint_name='fk_follows_followee'
  ) then
    alter table public.follows
      add constraint fk_follows_followee foreign key ("followeeId") references public.profiles(id) on delete cascade;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints where constraint_name='fk_blocks_blocker'
  ) then
    alter table public.blocks
      add constraint fk_blocks_blocker foreign key ("blockerId") references public.profiles(id) on delete cascade;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints where constraint_name='fk_blocks_blocked'
  ) then
    alter table public.blocks
      add constraint fk_blocks_blocked foreign key ("blockedId") references public.profiles(id) on delete cascade;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints where constraint_name='fk_diaries_user'
  ) then
    alter table public.diaries
      add constraint fk_diaries_user foreign key ("userId") references public.profiles(id) on delete cascade;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints where constraint_name='fk_diaries_challenge'
  ) then
    alter table public.diaries
      add constraint fk_diaries_challenge foreign key ("challengeId") references public.challenges(id) on delete set null;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints where constraint_name='fk_challenges_user'
  ) then
    alter table public.challenges
      add constraint fk_challenges_user foreign key ("userId") references public.profiles(id) on delete cascade;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints where constraint_name='fk_participants_tournament'
  ) then
    alter table public.tournament_participants
      add constraint fk_participants_tournament foreign key ("tournamentId") references public.tournaments(id) on delete cascade;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints where constraint_name='fk_participants_user'
  ) then
    alter table public.tournament_participants
      add constraint fk_participants_user foreign key ("userId") references public.profiles(id) on delete cascade;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints where constraint_name='fk_join_requests_tournament'
  ) then
    alter table public.tournament_join_requests
      add constraint fk_join_requests_tournament foreign key ("tournamentId") references public.tournaments(id) on delete cascade;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints where constraint_name='fk_join_requests_user'
  ) then
    alter table public.tournament_join_requests
      add constraint fk_join_requests_user foreign key ("userId") references public.profiles(id) on delete cascade;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints where constraint_name='fk_messages_tournament'
  ) then
    alter table public.tournament_messages
      add constraint fk_messages_tournament foreign key ("tournamentId") references public.tournaments(id) on delete cascade;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints where constraint_name='fk_messages_author'
  ) then
    alter table public.tournament_messages
      add constraint fk_messages_author foreign key ("authorId") references public.profiles(id) on delete cascade;
  end if;
end $$;

-- Additional unique indexes for data integrity
create unique index if not exists uq_likes_user_post on public.community_likes("userId","postId");
create unique index if not exists uq_follows on public.follows("followerId","followeeId");
create unique index if not exists uq_blocks on public.blocks("blockerId","blockedId");

-- ---------------------------------------------------------------------------
-- End of constraints section
-- ---------------------------------------------------------------------------
