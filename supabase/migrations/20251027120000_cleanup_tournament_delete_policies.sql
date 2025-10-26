-- Remove legacy delete policies that were superseded by the new
-- *_delete_owner_or_self variants so policy definitions stay singular
-- and easier to maintain.

drop policy if exists participants_delete_owner
  on public.tournament_participants;

drop policy if exists join_requests_owner_delete
  on public.tournament_join_requests;

drop policy if exists tournament_messages_delete_owner
  on public.tournament_messages;
