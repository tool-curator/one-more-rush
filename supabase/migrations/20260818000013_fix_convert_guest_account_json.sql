-- ============================================================================
-- ONE MORE RUSH — Migration 00013: Fix convert_guest_account JSONB Parsing
-- Replaces invalid '#>>' operator on jsonb_array_elements_text() output with
-- direct text trimming, resolving PostgreSQL 22P02 invalid input syntax error.
-- Safely drops any older 5-parameter signature to eliminate overload ambiguity.
-- ============================================================================

-- 1. Safely drop previous function signatures to prevent overload ambiguity
drop function if exists public.convert_guest_account(bigint, boolean, boolean, boolean, int);
drop function if exists public.convert_guest_account(bigint, boolean, boolean, boolean, int, jsonb);

-- 2. Create authoritative, hardened convert_guest_account
create or replace function public.convert_guest_account(
  p_legacy_amount bigint,
  p_daily_visit_claimed boolean default false,
  p_quick_win_claimed boolean default false,
  p_extreme_claimed boolean default false,
  p_streak int default 0,
  p_locker_items jsonb default null
)
returns table (
  migration_status text,
  amount_migrated bigint,
  cloud_balance bigint
) as $$
declare
  v_user_id uuid;
  v_today_date date;
  v_has_legacy_migration boolean := false;
  v_has_existing_cloud boolean := false;
  v_inserted_amount bigint := 0;
  v_balance bigint := 0;
  v_sanitized_streak int := 0;
  c_max_legacy_cap constant bigint := 50000;
  v_cosmetic_cost bigint := 0;
  v_gross_amount bigint := 0;
  v_cat text;
  v_item text;
  v_cat_arr jsonb;
  v_item_elem text;
  v_item_price bigint;
begin
  -- 1. Validate Authenticated Session
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized: Authenticated player session required.'
      using errcode = '42501';
  end if;

  -- 2. Acquire 64-bit Transaction-Scoped Advisory Lock
  perform pg_advisory_xact_lock(hashtextextended('one_more_rush:guest_conversion:' || v_user_id::text, 0));

  v_today_date := (timezone('utc'::text, now()))::date;

  -- 3. Strict Pre-Validation of JSON Payload (Fail-Closed on Non-Object or Unknown Items)
  if p_locker_items is not null then
    if jsonb_typeof(p_locker_items) <> 'object' then
      raise exception 'Malformed p_locker_items: Expected JSON object but received %', jsonb_typeof(p_locker_items)
        using errcode = '22023';
    end if;

    for v_cat in select jsonb_object_keys(p_locker_items) loop
      if v_cat not in ('frames', 'titles', 'effects', 'badges') then
        raise exception 'Invalid locker category in conversion payload: %', v_cat using errcode = '22023';
      end if;

      v_cat_arr := p_locker_items -> v_cat;
      if jsonb_typeof(v_cat_arr) <> 'array' then
        raise exception 'Malformed items array for category % in conversion payload', v_cat using errcode = '22023';
      end if;

      for v_item_elem in select jsonb_array_elements_text(v_cat_arr) loop
        v_item := lower(trim(v_item_elem));
        -- Throws 22023 on unknown item, failing closed immediately
        v_item_price := public.get_locker_item_price(v_cat, v_item);
        v_cosmetic_cost := v_cosmetic_cost + v_item_price;
      end loop;
    end loop;
  end if;

  v_gross_amount := coalesce(p_legacy_amount, 0) + v_cosmetic_cost;

  -- 4. Strict Upper & Lower Bounds Validation (Gross Economy <= 50,000 RP)
  if p_legacy_amount is not null and p_legacy_amount < 0 then
    raise exception 'Invalid legacy amount: % cannot be negative', p_legacy_amount
      using errcode = '22003';
  end if;

  if v_gross_amount > c_max_legacy_cap then
    raise exception 'Invalid guest conversion payload: Gross amount % RP (Points: %, Cosmetics: %) exceeds maximum threshold of % RP',
      v_gross_amount, coalesce(p_legacy_amount, 0), v_cosmetic_cost, c_max_legacy_cap
      using errcode = '22003';
  end if;

  -- 5. Check If Migration Was Already Completed For This Account
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

  -- 6. Check If Account Already Has An Established Cloud Economy
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

  -- 7. Sanitize Streak (0-30 days)
  v_sanitized_streak := least(greatest(coalesce(p_streak, 0), 0), 30);

  -- 8. Insert Conversion State Record
  insert into public.guest_conversion_records (
    user_id,
    conversion_date,
    daily_visit_claimed,
    quick_win_claimed,
    extreme_claimed,
    streak
  )
  values (
    v_user_id,
    v_today_date,
    coalesce(p_daily_visit_claimed, false),
    coalesce(p_quick_win_claimed, false),
    coalesce(p_extreme_claimed, false),
    v_sanitized_streak
  )
  on conflict (user_id) do nothing;

  -- 9. Insert Validated Cosmetics into User Inventory (Exact Same Set Validated in Step 3)
  if p_locker_items is not null and jsonb_typeof(p_locker_items) = 'object' then
    for v_cat in select jsonb_object_keys(p_locker_items) loop
      v_cat_arr := p_locker_items -> v_cat;
      for v_item_elem in select jsonb_array_elements_text(v_cat_arr) loop
        v_item := lower(trim(v_item_elem));
        if v_item not in ('classic', 'rookie') then
          insert into public.user_locker_items (user_id, category, item_key, acquired_source)
          values (v_user_id, v_cat, v_item, 'legacy_migration')
          on conflict (user_id, category, item_key) do nothing;
        end if;
      end loop;
    end loop;
  end if;

  -- 10. Atomic Insert into Ledger For Clean Account (1 <= amount <= 50,000)
  if p_legacy_amount is not null and p_legacy_amount > 0 then
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
        'migration_type', 'untrusted_localstorage_v1_bounded_migration',
        'requested_amount', p_legacy_amount,
        'credited_amount', p_legacy_amount,
        'cosmetic_valuation_amount', v_cosmetic_cost,
        'guest_daily_visit_claimed', coalesce(p_daily_visit_claimed, false),
        'guest_quick_win_claimed', coalesce(p_quick_win_claimed, false),
        'guest_extreme_claimed', coalesce(p_extreme_claimed, false),
        'guest_streak', v_sanitized_streak,
        'migrated_at_utc', timezone('utc'::text, now())
      )
    )
    on conflict (user_id, source, source_id) where source_id is not null
    do nothing
    returning rush_point_transactions.amount into v_inserted_amount;
  end if;

  -- 11. Calculate Authoritative Total Cloud Balance
  select coalesce(sum(t.amount), 0)::bigint
  into v_balance
  from public.rush_point_transactions t
  where t.user_id = v_user_id;

  -- 12. Return Final Conversion Result
  if v_inserted_amount > 0 then
    return query select 'migrated'::text, v_inserted_amount, v_balance;
  elsif p_legacy_amount is null or p_legacy_amount <= 0 then
    return query select 'no_legacy_balance'::text, 0::bigint, v_balance;
  else
    return query select 'already_migrated'::text, 0::bigint, v_balance;
  end if;
end;
$$ language plpgsql volatile security definer set search_path = public;

revoke all on function public.convert_guest_account(bigint, boolean, boolean, boolean, int, jsonb) from public, anon;
grant execute on function public.convert_guest_account(bigint, boolean, boolean, boolean, int, jsonb) to authenticated;
