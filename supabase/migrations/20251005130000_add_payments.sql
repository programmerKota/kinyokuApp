-- payments table for in-app purchase records
-- Safe/idempotent creation with basic constraints and RLS

create extension if not exists pgcrypto;

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  "userId" text not null,
  amount integer not null,
  type text not null,
  status text not null,
  "transactionId" text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

-- add columns in case table exists but columns are missing
alter table public.payments add column if not exists "userId" text not null;
alter table public.payments add column if not exists amount integer not null;
alter table public.payments add column if not exists type text not null;
alter table public.payments add column if not exists status text not null;
alter table public.payments add column if not exists "transactionId" text;
alter table public.payments add column if not exists "createdAt" timestamptz not null default now();
alter table public.payments add column if not exists "updatedAt" timestamptz not null default now();

-- indexes
create index if not exists idx_payments_user_created on public.payments("userId", "createdAt");

-- check constraints
do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema='public' and table_name='payments' and constraint_name='payments_type_chk'
  ) then
    alter table public.payments
      add constraint payments_type_chk check (type in ('penalty','entry_fee','prize'));
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema='public' and table_name='payments' and constraint_name='payments_status_chk'
  ) then
    alter table public.payments
      add constraint payments_status_chk check (status in ('pending','completed','failed','refunded'));
  end if;
end $$;

-- RLS
alter table public.payments enable row level security;
drop policy if exists payments_select_self on public.payments;
drop policy if exists payments_mutate_self on public.payments;
create policy payments_select_self on public.payments for select to authenticated using ("userId" = auth.uid()::text);
create policy payments_mutate_self on public.payments for all to authenticated using ("userId" = auth.uid()::text) with check ("userId" = auth.uid()::text);

-- updatedAt trigger (re-use set_updated_at() defined in earlier migrations if present)
do $$ begin
  if exists (
    select 1 from information_schema.columns where table_schema='public' and table_name='payments' and column_name='updatedAt'
  ) then
    if not exists (select 1 from pg_trigger where tgname='tr_payments_updated_at') then
      create trigger tr_payments_updated_at before update on public.payments
      for each row execute function public.set_updated_at();
    end if;
  end if;
end $$;

