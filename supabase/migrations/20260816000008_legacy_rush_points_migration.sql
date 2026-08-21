-- ============================================================================
-- ONE MORE RUSH — Phase 6D-D Server-Authoritative Legacy RP Migration (Step 5)
-- Safe, idempotent one-time migration of LocalStorage Rush Points to Cloud Ledger
-- Prevents guest balance inflation on established cloud accounts
-- ============================================================================

create or replace function public.migrate_legacy_rush_points(
  p_legacy_amount bigint
)
returns table (
  migration_status text,
  amount_migrated bigint,
  cloud_balance bigint
) as $$
declare
  v_user_id uuid;
  v_has_legacy_migration boolean := false;
  v_has_existing_cloud boolean := false;
  v_inserted_amount bigint := 0;
  v_balance bigint := 0;
  c_max_legacy_cap constant bigint := 50000;
begin
  -- 1. Validate Authenticated Session
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized: Authenticated player session required for legacy migration.'
      using errcode = '42501';
  end if;

  -- 2. Validate Upper Bound (No Clamping: Reject Oversized Values)
  if p_legacy_amount is not null and p_legacy_amount > c_max_legacy_cap then
    raise exception 'Invalid legacy amount: % exceeds maximum threshold of % RP',
      p_legacy_amount, c_max_legacy_cap
      using errcode = '22003';
  end if;

  -- 3. Check If Migration Was Already Completed For This Account
  select exists(
    select 1 from public.rush_point_transactions
    where user_id = v_user_id
      and source = 'legacy_migration'
      and source_id = 'initial_migration'
  ) into v_has_legacy_migration;

  if v_has_legacy_migration then
    select coalesce(sum(amount), 0)::bigint
    into v_balance
    from public.rush_point_transactions
    where user_id = v_user_id;

    return query select 'already_migrated'::text, 0::bigint, v_balance;
    return;
  end if;

  -- 4. Check If Account Already Has An Established Cloud Economy
  -- Any existing row in rush_point_transactions represents an established
  -- server-authoritative economic account. Do not migrate guest/local RP.
  select exists(
    select 1 from public.rush_point_transactions
    where user_id = v_user_id
  ) into v_has_existing_cloud;

  if v_has_existing_cloud then
    select coalesce(sum(amount), 0)::bigint
    into v_balance
    from public.rush_point_transactions
    where user_id = v_user_id;

    return query select 'skipped_existing_cloud'::text, 0::bigint, v_balance;
    return;
  end if;

  -- 5. Validate Candidate Amount For Clean Account
  if p_legacy_amount is null or p_legacy_amount <= 0 then
    select coalesce(sum(amount), 0)::bigint
    into v_balance
    from public.rush_point_transactions
    where user_id = v_user_id;

    return query select 'no_legacy_balance'::text, 0::bigint, v_balance;
    return;
  end if;

  -- 6. Atomic Insert For Clean Account (1 <= amount <= 50,000)
  insert into public.rush_point_transactions (
    user_id,
    amount,
    source,
    source_id,
    metadata
  )
  values (
    v_user_id,
    p_legacy_amount,
    'legacy_migration',
    'initial_migration',
    jsonb_build_object(
      'migration_type', 'localstorage_v1_to_cloud',
      'credited_amount', p_legacy_amount,
      'migrated_at_utc', timezone('utc'::text, now())
    )
  )
  on conflict (user_id, source, source_id) where source_id is not null
  do nothing
  returning rush_point_transactions.amount into v_inserted_amount;

  -- 7. Calculate Authoritative Total Cloud Balance
  select coalesce(sum(t.amount), 0)::bigint
  into v_balance
  from public.rush_point_transactions t
  where t.user_id = v_user_id;

  -- 8. Return Final Migration Result
  if v_inserted_amount > 0 then
    return query select 'migrated'::text, v_inserted_amount, v_balance;
  else
    return query select 'already_migrated'::text, 0::bigint, v_balance;
  end if;
end;
$$ language plpgsql volatile security definer set search_path = public;

-- Security & Privilege Hardening
revoke all on function public.migrate_legacy_rush_points(bigint) from public, anon;
grant execute on function public.migrate_legacy_rush_points(bigint) to authenticated;
