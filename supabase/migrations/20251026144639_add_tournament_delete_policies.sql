-- Allow tournament owners to delete tournaments and dependent rows
-- as well as let users remove their own participation/request/message.

-- tournaments: owners can delete their tournament records
alter table if exists public.tournaments enable row level security;
drop policy if exists tournaments_delete_owner on public.tournaments;
create policy tournaments_delete_owner
  on public.tournaments for delete
  to authenticated
  using ("ownerId" = auth.uid()::text);

-- tournament_participants: allow participants themselves or tournament owners to delete rows
alter table if exists public.tournament_participants enable row level security;
drop policy if exists participants_delete_owner_or_self on public.tournament_participants;
create policy participants_delete_owner_or_self
  on public.tournament_participants for delete
  to authenticated
  using (
    "userId" = auth.uid()::text
    or exists (
      select 1 from public.tournaments t
      where t.id = "tournamentId" and t."ownerId" = auth.uid()::text
    )
  );

-- tournament_join_requests: same as above (owner or requester can remove row)
alter table if exists public.tournament_join_requests enable row level security;
drop policy if exists join_requests_delete_owner_or_self on public.tournament_join_requests;
create policy join_requests_delete_owner_or_self
  on public.tournament_join_requests for delete
  to authenticated
  using (
    "userId" = auth.uid()::text
    or exists (
      select 1 from public.tournaments t
      where t.id = "tournamentId" and t."ownerId" = auth.uid()::text
    )
  );

-- tournament_messages: message author or tournament owner can delete (used during cascade delete)
alter table if exists public.tournament_messages enable row level security;
drop policy if exists tournament_messages_delete_owner_or_author on public.tournament_messages;
create policy tournament_messages_delete_owner_or_author
  on public.tournament_messages for delete
  to authenticated
  using (
    "authorId" = auth.uid()::text
    or exists (
      select 1 from public.tournaments t
      where t.id = "tournamentId" and t."ownerId" = auth.uid()::text
    )
  );