-- Ensure deduplication of payments by (userId, transactionId) when transactionId present
do $$ begin
  if not exists (
    select 1 from pg_indexes where schemaname='public' and indexname='uq_payments_user_tx_not_null'
  ) then
    create unique index uq_payments_user_tx_not_null
      on public.payments ("userId", "transactionId")
      where "transactionId" is not null;
  end if;
end $$;

