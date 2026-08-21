-- ============================================================================
-- ONE MORE RUSH — Phase 6D-E Server-Authoritative Locker Purchases & Inventory
-- Authoritative item catalog, user inventory table, 64-bit advisory locking,
-- atomic negative ledger deductions, and atomic guest conversion locker binding.
-- ============================================================================

-- Safely drop old/mismatched function signatures
drop function if exists public.purchase_locker_item(text, text);
drop function if exists public.get_user_owned_locker_items();
drop function if exists public.reconcile_legacy_locker_items(jsonb);
drop function if exists public.get_locker_item_price(text, text);

-- 1. Create Server-Authoritative User Cosmetic Inventory Table
create table if not exists public.user_locker_items (
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null check (category in ('frames', 'titles', 'effects', 'badges')),
  item_key text not null,
  acquired_source text not null default 'purchase' check (acquired_source in ('purchase', 'profile_sync', 'legacy_migration', 'starter')),
  created_at timestamptz not null default timezone('utc'::text, now()),
  primary key (user_id, category, item_key)
);

create index if not exists idx_user_locker_items_user_id 
  on public.user_locker_items(user_id);

alter table public.user_locker_items enable row level security;

create policy "Users can view own locker inventory"
  on public.user_locker_items
  for select
  to authenticated
  using (auth.uid() = user_id);

grant select on table public.user_locker_items to authenticated;
revoke all on table public.user_locker_items from anon, public;
revoke insert, update, delete on table public.user_locker_items from authenticated;


-- 2. Helper Function: Server-Side Locker Catalog & Price Lookup
create or replace function public.get_locker_item_price(
  p_category text,
  p_item_key text
)
returns bigint as $$
declare
  v_norm_cat text;
  v_norm_key text;
begin
  v_norm_cat := lower(trim(coalesce(p_category, '')));
  v_norm_key := lower(trim(coalesce(p_item_key, '')));

  if v_norm_cat = 'frame' then v_norm_cat := 'frames';
  elsif v_norm_cat = 'title' then v_norm_cat := 'titles';
  elsif v_norm_cat = 'effect' then v_norm_cat := 'effects';
  elsif v_norm_cat = 'badge' then v_norm_cat := 'badges';
  end if;

  if v_norm_cat = 'frames' then
    case v_norm_key
      when 'classic' then return 0;
      when 'neon' then return 500;
      when 'cyber' then return 1000;
      when 'inferno' then return 2000;
      when 'void' then return 3500;
      when 'one_more' then return 5000;
      else raise exception 'Unknown frame item key: %', p_item_key using errcode = '22023';
    end case;

  elsif v_norm_cat = 'titles' then
    case v_norm_key
      when 'rookie' then return 0;
      when 'one_more' then return 500;
      when 'speed_demon' then return 1000;
      when 'reflex_master' then return 2500;
      when 'hunter' then return 5000;
      when 'rush_addict' then return 7500;
      when 'legend' then return 10000;
      else raise exception 'Unknown title item key: %', p_item_key using errcode = '22023';
    end case;

  elsif v_norm_cat = 'effects' then
    case v_norm_key
      when 'classic' then return 0;
      when 'confetti' then return 750;
      when 'neon_burst' then return 1500;
      when 'starfall' then return 2500;
      when 'lightning' then return 4000;
      when 'glitch' then return 5000;
      else raise exception 'Unknown effect item key: %', p_item_key using errcode = '22023';
    end case;

  elsif v_norm_cat = 'badges' then
    case v_norm_key
      when 'first_play' then return 0;
      when 'one_more' then return 0;
      when 'high_score' then return 0;
      when 'sharpshooter' then return 0;
      when 'survivor' then return 0;
      when 'builder' then return 0;
      when 'memory_master' then return 0;
      when 'colorist' then return 0;
      else raise exception 'Unknown badge item key: %', p_item_key using errcode = '22023';
    end case;

  else
    raise exception 'Invalid locker cosmetic category: %', p_category using errcode = '22023';
  end if;
end;
$$ language plpgsql immutable security definer set search_path = public;


-- 3. Read-Only RPC: Get Authenticated User's Server-Authoritative Owned Items
create or replace function public.get_user_owned_locker_items()
returns table (
  category text,
  item_key text,
  acquired_source text,
  acquired_at timestamptz
) as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized: Authenticated player session required.'
      using errcode = '42501';
  end if;

  return query
  select uli.category, uli.item_key, uli.acquired_source, uli.created_at as acquired_at
  from public.user_locker_items uli
  where uli.user_id = v_user_id
  order by uli.created_at asc;
end;
$$ language plpgsql stable security definer set search_path = public;


-- 4. Upgraded Atomic Guest Conversion with Gross Cap, Fail-Closed Type Checks, & Catalog Validation
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
  v_item_elem jsonb;
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
        v_item := lower(trim(v_item_elem #>> '{}'));
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
        v_item := lower(trim(v_item_elem #>> '{}'));
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


-- 5. Primary RPC Function: Purchase Locker Cosmetic Item (Badges Explicitly Blocked)
create or replace function public.purchase_locker_item(
  p_category text,
  p_item_key text
)
returns table (
  success boolean,
  already_owned boolean,
  price bigint,
  balance bigint
) as $$
declare
  v_user_id uuid;
  v_norm_cat text;
  v_norm_key text;
  v_item_price bigint;
  v_source_id text;
  v_current_balance bigint := 0;
  v_final_balance bigint := 0;
  v_already_owned boolean := false;
  v_inserted_amount bigint;
begin
  -- 1. Validate Caller Authentication
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized: Authenticated player session required to purchase locker items.'
      using errcode = '42501';
  end if;

  -- 2. Normalize Category & Item Key
  v_norm_cat := lower(trim(coalesce(p_category, '')));
  v_norm_key := lower(trim(coalesce(p_item_key, '')));

  if v_norm_cat = 'frame' then v_norm_cat := 'frames';
  elsif v_norm_cat = 'title' then v_norm_cat := 'titles';
  elsif v_norm_cat = 'effect' then v_norm_cat := 'effects';
  elsif v_norm_cat in ('badge', 'badges') then
    raise exception 'Achievement badges cannot be purchased through the locker store.'
      using errcode = '22023';
  end if;

  if v_norm_cat not in ('frames', 'titles', 'effects') then
    raise exception 'Invalid purchasable locker cosmetic category: %', p_category
      using errcode = '22023';
  end if;

  -- 3. Lookup Authoritative Price from Server Catalog (Throws 22023 on unknown item)
  v_item_price := public.get_locker_item_price(v_norm_cat, v_norm_key);

  -- 4. Calculate Current Authoritative Cloud Balance
  select coalesce(sum(t.amount), 0)::bigint
  into v_current_balance
  from public.rush_point_transactions t
  where t.user_id = v_user_id;

  -- 5. Handle Free Starter Items (Price = 0: Only 'classic' frame, 'rookie' title, 'classic' effect)
  if v_item_price = 0 then
    if (v_norm_cat = 'frames' and v_norm_key = 'classic') or
       (v_norm_cat = 'titles' and v_norm_key = 'rookie') or
       (v_norm_cat = 'effects' and v_norm_key = 'classic') then
      insert into public.user_locker_items (user_id, category, item_key, acquired_source)
      values (v_user_id, v_norm_cat, v_norm_key, 'starter')
      on conflict (user_id, category, item_key) do nothing;

      return query select true, true, 0::bigint, v_current_balance;
      return;
    else
      raise exception 'Item % in category % is not an authorized starter or purchasable item.', v_norm_key, v_norm_cat
        using errcode = '22023';
    end if;
  end if;

  -- 6. Acquire 64-bit Transaction-Scoped Advisory Lock on User ID
  perform pg_advisory_xact_lock(hashtextextended('locker:' || v_user_id::text, 0));

  -- 7. Re-evaluate Balance & Ownership Under Lock
  select coalesce(sum(t.amount), 0)::bigint
  into v_current_balance
  from public.rush_point_transactions t
  where t.user_id = v_user_id;

  -- Check if item is already in user inventory or transaction history
  select exists(
    select 1 from public.user_locker_items
    where user_id = v_user_id and category = v_norm_cat and item_key = v_norm_key
  ) or exists(
    select 1 from public.rush_point_transactions
    where user_id = v_user_id and source = 'locker_purchase' and source_id = v_norm_cat || ':' || v_norm_key
  ) into v_already_owned;

  if v_already_owned then
    insert into public.user_locker_items (user_id, category, item_key, acquired_source)
    values (v_user_id, v_norm_cat, v_norm_key, 'purchase')
    on conflict (user_id, category, item_key) do nothing;

    return query select true, true, v_item_price, v_current_balance;
    return;
  end if;

  -- 8. Check Insufficient Funds
  if v_current_balance < v_item_price then
    return query select false, false, v_item_price, v_current_balance;
    return;
  end if;

  -- 9. Atomic Insert of Negative Ledger Transaction
  v_source_id := v_norm_cat || ':' || v_norm_key;

  insert into public.rush_point_transactions (
    user_id,
    amount,
    source,
    source_id,
    metadata
  )
  values (
    v_user_id,
    -v_item_price,
    'locker_purchase',
    v_source_id,
    jsonb_build_object(
      'category', v_norm_cat,
      'item_key', v_norm_key,
      'price', v_item_price,
      'purchased_at_utc', timezone('utc'::text, now())
    )
  )
  on conflict (user_id, source, source_id) where source_id is not null
  do nothing
  returning rush_point_transactions.amount into v_inserted_amount;

  -- 10. Record in user_locker_items
  insert into public.user_locker_items (user_id, category, item_key, acquired_source)
  values (v_user_id, v_norm_cat, v_norm_key, 'purchase')
  on conflict (user_id, category, item_key) do nothing;

  -- 11. If Conflict Detected in-flight
  if v_inserted_amount is null then
    select coalesce(sum(t.amount), 0)::bigint
    into v_final_balance
    from public.rush_point_transactions t
    where t.user_id = v_user_id;

    return query select true, true, v_item_price, v_final_balance;
    return;
  end if;

  -- 12. Calculate Final Authoritative Cloud Balance
  select coalesce(sum(t.amount), 0)::bigint
  into v_final_balance
  from public.rush_point_transactions t
  where t.user_id = v_user_id;

  -- 13. Return Success Result
  return query select true, false, v_item_price, v_final_balance;
end;
$$ language plpgsql volatile security definer set search_path = public;

-- 6. Security & Privilege Hardening
revoke all on function public.get_locker_item_price(text, text) from public, anon;
revoke all on function public.get_user_owned_locker_items() from public, anon;
revoke all on function public.purchase_locker_item(text, text) from public, anon;

grant execute on function public.get_locker_item_price(text, text) to authenticated;
grant execute on function public.get_user_owned_locker_items() to authenticated;
grant execute on function public.purchase_locker_item(text, text) to authenticated;
