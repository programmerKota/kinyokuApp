-- Optimize RLS to avoid per-row re-evaluation of auth.uid()
-- Use (select auth.uid()) pattern recommended by Supabase Advisors

-- payments
alter table public.payments enable row level security;
drop policy if exists payments_select_self on public.payments;
drop policy if exists payments_mutate_self on public.payments;
create policy payments_select_self on public.payments for select to authenticated using ("userId" = (select auth.uid())::text);
create policy payments_mutate_self on public.payments for all to authenticated using ("userId" = (select auth.uid())::text) with check ("userId" = (select auth.uid())::text);

-- payment_logs
alter table public.payment_logs enable row level security;
drop policy if exists payment_logs_select_self on public.payment_logs;
drop policy if exists payment_logs_insert_self on public.payment_logs;
create policy payment_logs_select_self on public.payment_logs for select to authenticated using ("userId" = (select auth.uid())::text);
create policy payment_logs_insert_self on public.payment_logs for insert to authenticated with check ("userId" = (select auth.uid())::text);

