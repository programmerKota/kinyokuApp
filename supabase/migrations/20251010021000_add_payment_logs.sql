-- payment_logs table for capturing client-side purchase flow events
-- Safe/idempotent creation with RLS

create extension if not exists pgcrypto;

create table if not exists public.payment_logs (
  id uuid primary key default gen_random_uuid(),
  "userId" text not null,
  event text not null,           -- 'purchase' | 'restore' | 'show' | 'error'
  status text not null,          -- 'success' | 'error' | 'cancel' | 'ok'
  amount integer,
  productId text,
  platform text,
  "transactionId" text,
  errorCode text,
  errorMessage text,
  raw jsonb,
  "createdAt" timestamptz not null default now()
);

-- add columns defensively if table exists but missing cols
alter table public.payment_logs add column if not exists "userId" text not null;
alter table public.payment_logs add column if not exists event text not null;
alter table public.payment_logs add column if not exists status text not null;
alter table public.payment_logs add column if not exists amount integer;
alter table public.payment_logs add column if not exists productId text;
alter table public.payment_logs add column if not exists platform text;
alter table public.payment_logs add column if not exists "transactionId" text;
alter table public.payment_logs add column if not exists errorCode text;
alter table public.payment_logs add column if not exists errorMessage text;
alter table public.payment_logs add column if not exists raw jsonb;
alter table public.payment_logs add column if not exists "createdAt" timestamptz not null default now();

-- indexes
create index if not exists idx_payment_logs_user_created on public.payment_logs("userId", "createdAt");

-- RLS
alter table public.payment_logs enable row level security;
drop policy if exists payment_logs_select_self on public.payment_logs;
drop policy if exists payment_logs_insert_self on public.payment_logs;
create policy payment_logs_select_self on public.payment_logs for select to authenticated using ("userId" = auth.uid()::text);
create policy payment_logs_insert_self on public.payment_logs for insert to authenticated with check ("userId" = auth.uid()::text);

