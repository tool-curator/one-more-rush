-- ============================================================================
-- ONE MORE RUSH — Migration 00009: Guest Account State Preservation (Hardened)
-- Preserves guest Rush Points, Daily Visit, Daily Challenge status, and streaks
-- upon conversion to an authenticated account with ZERO duplicate rewards.
--
-- TRUST MODEL & TRUST BOUNDARY DOCUMENTATION:
--  - In One More Rush, unauthenticated/guest player activity is stored entirely
--    client-side in browser localStorage. No server-side ledger exists for guests.
--  - Therefore, the legacy Rush Points amount (p_legacy_amount) is an UNTRUSTED
--    client-supplied migration payload from localStorage, NOT a server-proven balance.
--  - Security & Anti-Abuse Controls around this Trust Boundary:
--      1. Hard bounded ceiling: strictly rejected if > 50,000 RP (no clamping).
--      2. Non-negative validation: strictly rejected if < 0 RP.
--      3. Single-execution guarantee: exactly one legacy migration allowed per account
--         enforced by unique index on (user_id, 'legacy_migration', 'initial_migration').
--      4. Existing cloud account protection: if the account already has ANY transactions
--         in rush_point_transactions, migration is rejected ('skipped_existing_cloud')
--         to prevent post-registration local injection / balance inflation.
--      5. Authentication requirement: caller must have valid Supabase JWT session (auth.uid()).
--      6. Full auditability: ledger metadata records untrusted migration type, requested
--         amount, guest streak snapshot, and UTC conversion timestamp.
--      7. 64-bit Transaction-Scoped Advisory Locking: pg_advisory_xact_lock with 
--         hashtextextended() eliminates concurrency race conditions between parallel
--         tier claims on the same UTC calendar day.
--      8. Server-authoritative challenge rotation verification: every claim is verified
--         against public.get_active_challenge_for_date(v_today_str, tier) to ensure
--         only today's server-selected active challenge can be claimed.
--      9. Server catalog points enforcement: reward points are determined solely
--         by public.get_challenge_catalog_info(); client-provided values are ignored.
--
-- Security & Architectural Invariants Enforced:
--  INV-1:  No RP duplication (idempotent ON CONFLICT & ledger markers).
--  INV-2:  No RP loss (valid guest RP transferred safely).
--  INV-3:  Correct ownership (enforced strictly via server-side auth.uid()).
--  INV-4:  No cross-user claiming (zero client-provided target UUIDs).
--  INV-5:  No arbitrary UUID ownership (all operations scoped to auth.uid()).
--  INV-6:  Server-authoritative identity (caller verified via auth.uid()).
--  INV-7:  Transactional integrity (atomic PL/pgSQL function execution).
--  INV-8:  Race-condition safety (pg_advisory_xact_lock + unique constraints + atomic inserts).
--  INV-9:  RLS/security compatibility (explicit search_path = public, strict grants).
--  INV-10: No privilege escalation (no modification of foreign scores/profiles).
--  INV-11: Correct handling of zero values (0 RP balance is not treated as null).
--  INV-12: Correct handling of missing guest state (graceful fallbacks).
--  INV-13: Preserve unrelated user state (established cloud accounts protected).
--  INV-14: Bounded trust boundary (one-time bounded migration; server ledger authoritative thereafter).
--  INV-15: Complete auditability (metadata logging on every ledger row).
--  INV-16: Active challenge cannot be client-selected (verified against server UTC rotation).
--  INV-17: Reward amount cannot be client-selected (derived from server catalog).
--  INV-18: Completion verification boundary accurately represented (client-asserted canvas gameplay, server-bounded).
--  INV-19: UTC economy calendar consistency (server UTC date timezone('utc', now())::date).
--  INV-20: Frontend/backend RPC contract consistency (signatures match 1:1).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Helper Function: Deterministic 32-bit Hash (Matches frontend hashString)
-- ----------------------------------------------------------------------------
create or replace function public.hash_string_32(p_input text)
returns bigint as $$
declare
  v_hash bigint := 0;
  v_i int;
  v_len int := char_length(p_input);
  v_char_code int;
begin
  for v_i in 1..v_len loop
    v_char_code := ascii(substr(p_input, v_i, 1));
    v_hash := ((v_hash * 31) + v_char_code) % 4294967296;
  end loop;
  return v_hash;
end;
$$ language plpgsql immutable security definer set search_path = public;

-- ----------------------------------------------------------------------------
-- 2. Helper Function: Server Catalog for Challenge Rewards & Game Mapping
-- ----------------------------------------------------------------------------
create or replace function public.get_challenge_catalog_info(p_challenge_id text)
returns table (
  game_id text,
  tier text,
  points bigint
) as $$
begin
  case lower(trim(coalesce(p_challenge_id, '')))
    -- Quick Win Dodge
    when 'quick_dodge_safe_step' then return query select 'dodge'::text, 'quick_win'::text, 15::bigint;
    when 'quick_dodge_survival_scout' then return query select 'dodge'::text, 'quick_win'::text, 25::bigint;
    when 'quick_dodge_gem_harvest' then return query select 'dodge'::text, 'quick_win'::text, 20::bigint;
    when 'quick_dodge_danger_entry' then return query select 'dodge'::text, 'quick_win'::text, 30::bigint;
    when 'quick_dodge_drift_master' then return query select 'dodge'::text, 'quick_win'::text, 35::bigint;
    -- Quick Win Aim
    when 'quick_aim_first_shot' then return query select 'aim'::text, 'quick_win'::text, 15::bigint;
    when 'quick_aim_accuracy_check' then return query select 'aim'::text, 'quick_win'::text, 25::bigint;
    when 'quick_aim_target_drill' then return query select 'aim'::text, 'quick_win'::text, 20::bigint;
    when 'quick_aim_combo_spark' then return query select 'aim'::text, 'quick_win'::text, 20::bigint;
    when 'quick_aim_sharp_eye' then return query select 'aim'::text, 'quick_win'::text, 35::bigint;
    -- Quick Win Stack
    when 'quick_stack_first_tier' then return query select 'stack'::text, 'quick_win'::text, 15::bigint;
    when 'quick_stack_rooftop_drop' then return query select 'stack'::text, 'quick_win'::text, 25::bigint;
    when 'quick_stack_center_drop' then return query select 'stack'::text, 'quick_win'::text, 25::bigint;
    when 'quick_stack_tower_build' then return query select 'stack'::text, 'quick_win'::text, 20::bigint;
    when 'quick_stack_high_rise' then return query select 'stack'::text, 'quick_win'::text, 35::bigint;
    -- Quick Win Number Rush
    when 'quick_num_quick_math' then return query select 'number-rush'::text, 'quick_win'::text, 15::bigint;
    when 'quick_num_calculation_check' then return query select 'number-rush'::text, 'quick_win'::text, 25::bigint;
    when 'quick_num_steady_accuracy' then return query select 'number-rush'::text, 'quick_win'::text, 25::bigint;
    when 'quick_num_combo_focus' then return query select 'number-rush'::text, 'quick_win'::text, 20::bigint;
    when 'quick_num_speed_runner' then return query select 'number-rush'::text, 'quick_win'::text, 35::bigint;
    -- Quick Win Memory
    when 'quick_mem_short_recall' then return query select 'memory'::text, 'quick_win'::text, 15::bigint;
    when 'quick_mem_neural_spark' then return query select 'memory'::text, 'quick_win'::text, 25::bigint;
    when 'quick_mem_round_cleared' then return query select 'memory'::text, 'quick_win'::text, 20::bigint;
    when 'quick_mem_pattern_step' then return query select 'memory'::text, 'quick_win'::text, 20::bigint;
    when 'quick_mem_clean_memory' then return query select 'memory'::text, 'quick_win'::text, 35::bigint;
    -- Quick Win Color Maze
    when 'quick_maze_corridor_swipe' then return query select 'color-maze'::text, 'quick_win'::text, 20::bigint;
    when 'quick_maze_finisher' then return query select 'color-maze'::text, 'quick_win'::text, 25::bigint;
    when 'quick_maze_efficient_path' then return query select 'color-maze'::text, 'quick_win'::text, 25::bigint;
    when 'quick_maze_star_runner' then return query select 'color-maze'::text, 'quick_win'::text, 20::bigint;
    when 'quick_maze_swift_roller' then return query select 'color-maze'::text, 'quick_win'::text, 35::bigint;

    -- Extreme Dodge
    when 'dodge_swarm_survive' then return query select 'dodge'::text, 'extreme'::text, 750::bigint;
    when 'dodge_speed_rush' then return query select 'dodge'::text, 'extreme'::text, 650::bigint;
    when 'dodge_endurance_pro' then return query select 'dodge'::text, 'extreme'::text, 900::bigint;
    when 'dodge_gem_collector' then return query select 'dodge'::text, 'extreme'::text, 600::bigint;
    when 'dodge_combo_master' then return query select 'dodge'::text, 'extreme'::text, 700::bigint;
    -- Extreme Aim
    when 'aim_precision_strikes' then return query select 'aim'::text, 'extreme'::text, 600::bigint;
    when 'aim_reflex_test' then return query select 'aim'::text, 'extreme'::text, 700::bigint;
    when 'aim_deadeye_elite' then return query select 'aim'::text, 'extreme'::text, 850::bigint;
    when 'aim_speed_drill' then return query select 'aim'::text, 'extreme'::text, 650::bigint;
    when 'aim_combo_blitz' then return query select 'aim'::text, 'extreme'::text, 650::bigint;
    -- Extreme Stack
    when 'stack_tower_builder' then return query select 'stack'::text, 'extreme'::text, 600::bigint;
    when 'stack_perfect_tower' then return query select 'stack'::text, 'extreme'::text, 700::bigint;
    when 'stack_skyscraper_zen' then return query select 'stack'::text, 'extreme'::text, 850::bigint;
    when 'stack_precision_drop' then return query select 'stack'::text, 'extreme'::text, 650::bigint;
    when 'stack_flow_runner' then return query select 'stack'::text, 'extreme'::text, 750::bigint;
    -- Extreme Number Rush
    when 'number_rush_math_blitz' then return query select 'number-rush'::text, 'extreme'::text, 600::bigint;
    when 'number_rush_rapid_calc' then return query select 'number-rush'::text, 'extreme'::text, 650::bigint;
    when 'number_rush_flawless_mind' then return query select 'number-rush'::text, 'extreme'::text, 850::bigint;
    when 'number_rush_combo_surge' then return query select 'number-rush'::text, 'extreme'::text, 650::bigint;
    when 'number_rush_speed_solver' then return query select 'number-rush'::text, 'extreme'::text, 700::bigint;
    -- Extreme Memory
    when 'memory_pattern_novice' then return query select 'memory'::text, 'extreme'::text, 600::bigint;
    when 'memory_neural_matrix' then return query select 'memory'::text, 'extreme'::text, 750::bigint;
    when 'memory_mind_palace' then return query select 'memory'::text, 'extreme'::text, 900::bigint;
    when 'memory_recall_drill' then return query select 'memory'::text, 'extreme'::text, 650::bigint;
    when 'memory_zero_fault' then return query select 'memory'::text, 'extreme'::text, 700::bigint;
    -- Extreme Color Maze
    when 'color_maze_speed_painter' then return query select 'color-maze'::text, 'extreme'::text, 600::bigint;
    when 'color_maze_precision_path' then return query select 'color-maze'::text, 'extreme'::text, 750::bigint;
    when 'color_maze_grand_master' then return query select 'color-maze'::text, 'extreme'::text, 850::bigint;
    when 'color_maze_efficient_roll' then return query select 'color-maze'::text, 'extreme'::text, 650::bigint;
    when 'color_maze_star_collector' then return query select 'color-maze'::text, 'extreme'::text, 700::bigint;

    else
      raise exception 'Invalid or unknown challenge ID: %', p_challenge_id using errcode = '22023';
  end case;
end;
$$ language plpgsql immutable security definer set search_path = public;

-- ----------------------------------------------------------------------------
-- 3. Helper Function: Server Authoritative Rotation Verification
-- ----------------------------------------------------------------------------
create or replace function public.get_active_challenge_for_date(
  p_date_str text,
  p_tier text
)
returns text as $$
declare
  v_extreme_hash bigint;
  v_quick_hash bigint;
  v_extreme_idx int;
  v_quick_idx int;
  v_extreme_id text;
  v_quick_id text;
  v_extreme_game text;
  v_quick_game text;
  v_normalized_tier text;
  
  v_extreme_ids text[] := array[
    'dodge_swarm_survive', 'dodge_speed_rush', 'dodge_endurance_pro', 'dodge_gem_collector', 'dodge_combo_master',
    'aim_precision_strikes', 'aim_reflex_test', 'aim_deadeye_elite', 'aim_speed_drill', 'aim_combo_blitz',
    'stack_tower_builder', 'stack_perfect_tower', 'stack_skyscraper_zen', 'stack_precision_drop', 'stack_flow_runner',
    'number_rush_math_blitz', 'number_rush_rapid_calc', 'number_rush_flawless_mind', 'number_rush_combo_surge', 'number_rush_speed_solver',
    'memory_pattern_novice', 'memory_neural_matrix', 'memory_mind_palace', 'memory_recall_drill', 'memory_zero_fault',
    'color_maze_speed_painter', 'color_maze_precision_path', 'color_maze_grand_master', 'color_maze_efficient_roll', 'color_maze_star_collector'
  ];
  
  v_quick_ids text[] := array[
    'quick_dodge_safe_step', 'quick_dodge_survival_scout', 'quick_dodge_gem_harvest', 'quick_dodge_danger_entry', 'quick_dodge_drift_master',
    'quick_aim_first_shot', 'quick_aim_accuracy_check', 'quick_aim_target_drill', 'quick_aim_combo_spark', 'quick_aim_sharp_eye',
    'quick_stack_first_tier', 'quick_stack_rooftop_drop', 'quick_stack_center_drop', 'quick_stack_tower_build', 'quick_stack_high_rise',
    'quick_num_quick_math', 'quick_num_calculation_check', 'quick_num_steady_accuracy', 'quick_num_combo_focus', 'quick_num_speed_runner',
    'quick_mem_short_recall', 'quick_mem_neural_spark', 'quick_mem_round_cleared', 'quick_mem_pattern_step', 'quick_mem_clean_memory',
    'quick_maze_corridor_swipe', 'quick_maze_finisher', 'quick_maze_efficient_path', 'quick_maze_star_runner', 'quick_maze_swift_roller'
  ];
begin
  v_normalized_tier := lower(trim(coalesce(p_tier, 'extreme')));
  if v_normalized_tier in ('quickwin', 'quick_win', 'quick') then
    v_normalized_tier := 'quick_win';
  elsif v_normalized_tier in ('extreme', 'extreme_push', 'extreme_rush') then
    v_normalized_tier := 'extreme';
  else
    raise exception 'Invalid challenge tier: %', p_tier using errcode = '22023';
  end if;

  -- 1. Compute deterministic hash for extreme challenge
  v_extreme_hash := public.hash_string_32('onemore_daily_extreme_v3_' || p_date_str);
  v_extreme_idx := (v_extreme_hash % 30) + 1; -- 1-indexed in SQL arrays
  v_extreme_id := v_extreme_ids[v_extreme_idx];
  
  if v_normalized_tier = 'extreme' then
    return v_extreme_id;
  end if;

  -- 2. Compute deterministic hash for quick win challenge
  select c.game_id into v_extreme_game from public.get_challenge_catalog_info(v_extreme_id) c;

  v_quick_hash := public.hash_string_32('onemore_daily_quick_v3_' || p_date_str);
  v_quick_idx := (v_quick_hash % 30) + 1;
  v_quick_id := v_quick_ids[v_quick_idx];
  select c.game_id into v_quick_game from public.get_challenge_catalog_info(v_quick_id) c;

  -- Avoid collision on same game if possible
  if v_quick_game = v_extreme_game then
    v_quick_idx := ((v_quick_idx) % 30) + 1;
    v_quick_id := v_quick_ids[v_quick_idx];
  end if;

  return v_quick_id;
end;
$$ language plpgsql immutable security definer set search_path = public;

-- ----------------------------------------------------------------------------
-- 4. Create Guest Conversion Tracking Table & RLS
-- ----------------------------------------------------------------------------
create table if not exists public.guest_conversion_records (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  conversion_date date not null default (timezone('utc'::text, now()))::date,
  daily_visit_claimed boolean not null default false,
  quick_win_claimed boolean not null default false,
  extreme_claimed boolean not null default false,
  streak int not null default 0 check (streak >= 0 and streak <= 30),
  converted_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_gcr_user_date 
  on public.guest_conversion_records(user_id, conversion_date);

alter table public.guest_conversion_records enable row level security;

-- Idempotent RLS policy: Authenticated users can view only their own record
drop policy if exists "Users can view own conversion record" on public.guest_conversion_records;
create policy "Users can view own conversion record"
  on public.guest_conversion_records
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Restrict direct client writes; all writes happen via SECURITY DEFINER RPC
grant select on table public.guest_conversion_records to authenticated;
revoke all on table public.guest_conversion_records from anon, public;
revoke insert, update, delete on table public.guest_conversion_records from authenticated, anon, public;

-- ----------------------------------------------------------------------------
-- 5. Enhanced Guest Conversion RPC (One-Time Bounded Migration)
-- ----------------------------------------------------------------------------
create or replace function public.convert_guest_account(
  p_legacy_amount bigint,
  p_daily_visit_claimed boolean default false,
  p_quick_win_claimed boolean default false,
  p_extreme_claimed boolean default false,
  p_streak int default 0
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
begin
  -- 1. Validate Authenticated Session (INV-3, INV-6)
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized: Authenticated player session required.'
      using errcode = '42501';
  end if;

  -- 2. Acquire 64-bit Transaction-Scoped Advisory Lock for (Authenticated User + Conversion Namespace)
  perform pg_advisory_xact_lock(hashtextextended('one_more_rush:guest_conversion:' || v_user_id::text, 0));

  v_today_date := (timezone('utc'::text, now()))::date;

  -- 3. Validate Upper & Lower Bounds on Untrusted Client Payload (INV-11, INV-14)
  if p_legacy_amount is not null and p_legacy_amount < 0 then
    raise exception 'Invalid legacy amount: % cannot be negative', p_legacy_amount
      using errcode = '22003';
  end if;

  if p_legacy_amount is not null and p_legacy_amount > c_max_legacy_cap then
    raise exception 'Invalid legacy amount: % exceeds maximum threshold of % RP',
      p_legacy_amount, c_max_legacy_cap
      using errcode = '22003';
  end if;

  -- 4. Check If Migration Was Already Completed For This Account (INV-1)
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

  -- 5. Check If Account Already Has An Established Cloud Economy (INV-13)
  -- Any existing row in rush_point_transactions represents an established
  -- server-authoritative account. Never inject guest RP or state into it.
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

  -- 6. Sanitize Streak (Capped at 0-30 days max sanity range)
  v_sanitized_streak := least(greatest(coalesce(p_streak, 0), 0), 30);

  -- 7. Insert Conversion State Record for Clean Account (INV-7, INV-8)
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

  -- 8. Atomic Insert into Ledger For Clean Account (1 <= amount <= 50,000) (INV-1, INV-2)
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

  -- 9. Calculate Authoritative Total Cloud Balance (INV-14)
  select coalesce(sum(t.amount), 0)::bigint
  into v_balance
  from public.rush_point_transactions t
  where t.user_id = v_user_id;

  -- 10. Return Final Conversion Result
  if v_inserted_amount > 0 then
    return query select 'migrated'::text, v_inserted_amount, v_balance;
  elsif p_legacy_amount is null or p_legacy_amount <= 0 then
    return query select 'no_legacy_balance'::text, 0::bigint, v_balance;
  else
    return query select 'already_migrated'::text, 0::bigint, v_balance;
  end if;
end;
$$ language plpgsql volatile security definer set search_path = public;

revoke all on function public.convert_guest_account(bigint, boolean, boolean, boolean, int) from public, anon;
grant execute on function public.convert_guest_account(bigint, boolean, boolean, boolean, int) to authenticated;

-- ----------------------------------------------------------------------------
-- 6. Maintain Backward-Compatible Wrapper for migrate_legacy_rush_points
-- ----------------------------------------------------------------------------
create or replace function public.migrate_legacy_rush_points(
  p_legacy_amount bigint
)
returns table (
  migration_status text,
  amount_migrated bigint,
  cloud_balance bigint
) as $$
begin
  return query select * from public.convert_guest_account(p_legacy_amount, false, false, false, 0);
end;
$$ language plpgsql volatile security definer set search_path = public;

revoke all on function public.migrate_legacy_rush_points(bigint) from public, anon;
grant execute on function public.migrate_legacy_rush_points(bigint) to authenticated;

-- ----------------------------------------------------------------------------
-- 7. Update claim_daily_visit() to check guest conversion record
-- ----------------------------------------------------------------------------
create or replace function public.claim_daily_visit()
returns table (
  awarded boolean,
  amount bigint,
  balance bigint,
  claim_date date
) as $$
declare
  v_user_id uuid;
  v_today_date date;
  v_source_id text;
  v_awarded boolean := false;
  v_amount bigint := 0;
  v_balance bigint := 0;
  v_converted_today boolean := false;
begin
  -- 1. Validate Caller Authentication (INV-6)
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized: Authenticated player session required to claim daily visit reward.'
      using errcode = '42501';
  end if;

  -- 2. Determine Authoritative Server UTC Calendar Date
  v_today_date := (timezone('utc'::text, now()))::date;
  v_source_id := to_char(v_today_date, 'YYYY-MM-DD');

  -- 3. Acquire 64-bit Transaction-Scoped Advisory Lock for (Authenticated User + Daily Visit UTC Day)
  perform pg_advisory_xact_lock(hashtextextended('one_more_rush:daily_visit:' || v_user_id::text || ':' || v_source_id, 0));

  -- 4. Check if Daily Visit was already consumed as guest prior to today's conversion (INV-1)
  select exists(
    select 1 from public.guest_conversion_records
    where user_id = v_user_id
      and conversion_date = v_today_date
      and daily_visit_claimed = true
  ) into v_converted_today;

  -- 5. Calculate Current Authoritative Cloud Balance
  select coalesce(sum(t.amount), 0)::bigint
  into v_balance
  from public.rush_point_transactions t
  where t.user_id = v_user_id;

  if v_converted_today then
    -- Already claimed as guest today; award 0 additional RP to prevent double-claiming
    return query select false, 0::bigint, v_balance, v_today_date;
    return;
  end if;

  -- 6. Atomic Idempotent Insert into Rush Points Ledger
  insert into public.rush_point_transactions (
    user_id,
    amount,
    source,
    source_id,
    metadata
  )
  values (
    v_user_id,
    10,
    'daily_visit',
    v_source_id,
    jsonb_build_object(
      'reward_type', 'daily_visit',
      'calendar_day_utc', v_source_id,
      'claimed_at_utc', timezone('utc'::text, now())
    )
  )
  on conflict (user_id, source, source_id) where source_id is not null
  do nothing
  returning rush_point_transactions.amount into v_amount;

  -- 7. Evaluate Award Status
  if v_amount is not null and v_amount > 0 then
    v_awarded := true;
  else
    v_awarded := false;
    v_amount := 0;
  end if;

  -- 8. Recalculate Balance
  select coalesce(sum(t.amount), 0)::bigint
  into v_balance
  from public.rush_point_transactions t
  where t.user_id = v_user_id;

  -- 9. Return Structured Claim Result
  return query select v_awarded, v_amount, v_balance, v_today_date;
end;
$$ language plpgsql volatile security definer set search_path = public;

revoke all on function public.claim_daily_visit() from public, anon;
grant execute on function public.claim_daily_visit() to authenticated;

-- ----------------------------------------------------------------------------
-- 8. Update get_daily_challenge_status() to include guest conversion state
-- ----------------------------------------------------------------------------
create or replace function public.get_daily_challenge_status()
returns table (
  challenge_date text,
  quick_win_claimed boolean,
  extreme_claimed boolean,
  quick_win_points bigint,
  extreme_points bigint,
  current_streak int,
  cloud_balance bigint
) as $$
declare
  v_user_id uuid;
  v_today_date date;
  v_today_str text;
  v_qw_claimed boolean := false;
  v_ext_claimed boolean := false;
  v_qw_points bigint := 0;
  v_ext_points bigint := 0;
  v_check_date date;
  v_consecutive_days int := 0;
  v_day_has_claim boolean;
  v_current_streak int := 0;
  v_balance bigint := 0;
  v_conv_date date;
  v_conv_qw boolean := false;
  v_conv_ext boolean := false;
  v_conv_streak int := 0;
begin
  -- 1. Validate Caller Authentication (INV-6)
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized: Authenticated player session required.'
      using errcode = '42501';
  end if;

  -- 2. Determine Authoritative Server UTC Calendar Date
  v_today_date := (timezone('utc'::text, now()))::date;
  v_today_str := to_char(v_today_date, 'YYYY-MM-DD');

  -- 3. Check today's Quick Win claim in transaction ledger
  select exists(
    select 1 from public.rush_point_transactions
    where user_id = v_user_id
      and source = 'daily_challenge'
      and source_id = v_today_str || '_quick_win'
  ), coalesce((
    select amount from public.rush_point_transactions
    where user_id = v_user_id
      and source = 'daily_challenge'
      and source_id = v_today_str || '_quick_win'
    limit 1
  ), 0)
  into v_qw_claimed, v_qw_points;

  -- 4. Check today's Extreme claim in transaction ledger
  select exists(
    select 1 from public.rush_point_transactions
    where user_id = v_user_id
      and source = 'daily_challenge'
      and source_id = v_today_str || '_extreme'
  ), coalesce((
    select amount from public.rush_point_transactions
    where user_id = v_user_id
      and source = 'daily_challenge'
      and source_id = v_today_str || '_extreme'
    limit 1
  ), 0)
  into v_ext_claimed, v_ext_points;

  -- 5. Fetch guest conversion record for this user
  select
    c.conversion_date,
    coalesce(c.quick_win_claimed, false),
    coalesce(c.extreme_claimed, false),
    coalesce(c.streak, 0)
  into v_conv_date, v_conv_qw, v_conv_ext, v_conv_streak
  from public.guest_conversion_records c
  where c.user_id = v_user_id;

  -- Augment today's claimed status if conversion happened today
  if v_conv_date is not null and v_conv_date = v_today_date then
    if v_conv_qw then
      v_qw_claimed := true;
      if v_qw_points = 0 then
        v_qw_points := 25;
      end if;
    end if;

    if v_conv_ext then
      v_ext_claimed := true;
      if v_ext_points = 0 then
        v_ext_points := 750;
      end if;
    end if;
  end if;

  -- 6. Calculate Server-Authoritative Streak Seamlessly
  if v_qw_claimed or v_ext_claimed then
    -- Today is completed; count today (1) + unbroken preceding days
    v_check_date := v_today_date - 1;
    v_consecutive_days := 1;
    loop
      select exists(
        select 1 from public.rush_point_transactions
        where user_id = v_user_id
          and source = 'daily_challenge'
          and source_id like to_char(v_check_date, 'YYYY-MM-DD') || '_%'
      ) into v_day_has_claim;

      if v_day_has_claim then
        v_consecutive_days := v_consecutive_days + 1;
        v_check_date := v_check_date - 1;
        exit when v_consecutive_days >= 30;
      elsif v_conv_date is not null and v_check_date = v_conv_date and (v_conv_qw or v_conv_ext) then
        v_consecutive_days := v_consecutive_days + 1;
        v_check_date := v_check_date - 1;
        exit when v_consecutive_days >= 30;
      elsif v_conv_date is not null and (v_check_date = v_conv_date - 1 or (v_check_date = v_conv_date and not (v_conv_qw or v_conv_ext))) and v_conv_streak > 0 then
        declare
          v_prior_guest_days int := case when (v_conv_qw or v_conv_ext) then v_conv_streak - 1 else v_conv_streak end;
        begin
          if v_prior_guest_days > 0 then
            v_consecutive_days := least(30, v_consecutive_days + v_prior_guest_days);
          end if;
        end;
        exit;
      else
        exit;
      end if;
    end loop;
    v_current_streak := v_consecutive_days;
  else
    -- Today is not yet completed; check if unbroken streak from yesterday is alive
    v_check_date := v_today_date - 1;
    v_consecutive_days := 0;
    loop
      select exists(
        select 1 from public.rush_point_transactions
        where user_id = v_user_id
          and source = 'daily_challenge'
          and source_id like to_char(v_check_date, 'YYYY-MM-DD') || '_%'
      ) into v_day_has_claim;

      if v_day_has_claim then
        v_consecutive_days := v_consecutive_days + 1;
        v_check_date := v_check_date - 1;
        exit when v_consecutive_days >= 30;
      elsif v_conv_date is not null and v_check_date = v_conv_date and (v_conv_qw or v_conv_ext) then
        v_consecutive_days := v_consecutive_days + 1;
        v_check_date := v_check_date - 1;
        exit when v_consecutive_days >= 30;
      elsif v_conv_date is not null and (v_check_date = v_conv_date - 1 or (v_check_date = v_conv_date and not (v_conv_qw or v_conv_ext))) and v_conv_streak > 0 then
        declare
          v_prior_guest_days int := case when (v_conv_qw or v_conv_ext) then v_conv_streak - 1 else v_conv_streak end;
        begin
          if v_prior_guest_days > 0 then
            v_consecutive_days := least(30, v_consecutive_days + v_prior_guest_days);
          end if;
        end;
        exit;
      else
        exit;
      end if;
    end loop;
    v_current_streak := v_consecutive_days;
  end if;

  -- 7. Calculate Authoritative Total Cloud Balance
  select coalesce(sum(t.amount), 0)::bigint
  into v_balance
  from public.rush_point_transactions t
  where t.user_id = v_user_id;

  -- 8. Return Structured Status Table (Pure Read-Only)
  return query select
    v_today_str,
    v_qw_claimed,
    v_ext_claimed,
    v_qw_points,
    v_ext_points,
    v_current_streak,
    v_balance;
end;
$$ language plpgsql stable security definer set search_path = public;

revoke all on function public.get_daily_challenge_status() from public, anon;
grant execute on function public.get_daily_challenge_status() to authenticated;

-- ----------------------------------------------------------------------------
-- 9. Update claim_daily_challenge_reward() with Active Challenge Rotation Check & 64-bit Advisory Locking
-- ----------------------------------------------------------------------------
create or replace function public.claim_daily_challenge_reward(
  p_challenge_id text,
  p_tier text,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  awarded boolean,
  tier_reward bigint,
  streak_bonus bigint,
  total_awarded bigint,
  balance bigint,
  challenge_date text,
  tier text
) as $$
declare
  v_user_id uuid;
  v_today_date date;
  v_today_str text;
  v_normalized_tier text;
  v_expected_challenge_id text;
  v_catalog_game text;
  v_catalog_tier text;
  v_catalog_points bigint := 0;
  v_source_id text;
  v_tier_inserted bigint := 0;
  v_streak_inserted bigint := 0;
  v_total_amount bigint := 0;
  v_awarded boolean := false;
  v_balance bigint := 0;
  v_current_streak int := 0;
  v_check_date date;
  v_consecutive_days int := 0;
  v_day_has_claim boolean;
  v_calculated_streak_bonus bigint := 0;
  v_streak_source_id text;
  v_conv_date date;
  v_conv_qw boolean := false;
  v_conv_ext boolean := false;
  v_conv_streak int := 0;
  v_already_claimed_guest boolean := false;
  v_other_tier_already_claimed boolean := false;
begin
  -- 1. Validate Caller Authentication (INV-6)
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized: Authenticated player session required.'
      using errcode = '42501';
  end if;

  -- 2. Determine Authoritative Server UTC Calendar Date (INV-14, INV-19)
  v_today_date := (timezone('utc'::text, now()))::date;
  v_today_str := to_char(v_today_date, 'YYYY-MM-DD');

  -- 3. Normalize Requested Tier
  v_normalized_tier := case lower(trim(coalesce(p_tier, '')))
    when 'quick_win' then 'quick_win'
    when 'quickwin' then 'quick_win'
    when 'quick' then 'quick_win'
    when 'extreme' then 'extreme'
    when 'extreme_rush' then 'extreme'
    when 'extreme_push' then 'extreme'
    else null
  end;

  if v_normalized_tier is null then
    raise exception 'Invalid challenge tier: %', p_tier using errcode = '22023';
  end if;

  -- 4. Validate Challenge from Server Catalog (INV-10, INV-17)
  select game_id, tier, points
  into v_catalog_game, v_catalog_tier, v_catalog_points
  from public.get_challenge_catalog_info(p_challenge_id);

  if v_catalog_points is null or v_catalog_points <= 0 then
    raise exception 'Invalid challenge ID: %', p_challenge_id using errcode = '22023';
  end if;

  if v_catalog_tier <> v_normalized_tier then
    raise exception 'Tier mismatch: Challenge % belongs to % but % was requested',
      p_challenge_id, v_catalog_tier, v_normalized_tier using errcode = '22023';
  end if;

  -- 5. Verify Challenge is Legitimately Active for Server UTC Date (INV-16)
  v_expected_challenge_id := public.get_active_challenge_for_date(v_today_str, v_normalized_tier);
  if lower(trim(p_challenge_id)) <> lower(trim(v_expected_challenge_id)) then
    raise exception 'Challenge % is not active on server date % (active challenge is %)',
      p_challenge_id, v_today_str, v_expected_challenge_id
      using errcode = '22023';
  end if;

  -- 6. Acquire 64-bit Transaction-Scoped Advisory Lock for (Authenticated User + Daily Challenge UTC Date)
  -- Serializes the critical section for this user/day: first-completion qualification,
  -- streak calculation, and milestone bonus evaluation across concurrent requests.
  perform pg_advisory_xact_lock(hashtextextended('one_more_rush:daily_challenge:' || v_user_id::text || ':' || v_today_str, 0));

  -- 7. Check guest conversion record for today's converted status (INV-1)
  select
    c.conversion_date,
    coalesce(c.quick_win_claimed, false),
    coalesce(c.extreme_claimed, false),
    coalesce(c.streak, 0)
  into v_conv_date, v_conv_qw, v_conv_ext, v_conv_streak
  from public.guest_conversion_records c
  where c.user_id = v_user_id;

  if v_conv_date is not null and v_conv_date = v_today_date then
    if (v_normalized_tier = 'quick_win' and v_conv_qw = true) or
       (v_normalized_tier = 'extreme' and v_conv_ext = true) then
      v_already_claimed_guest := true;
    end if;
  end if;

  -- 8. Calculate Current Authoritative Balance
  select coalesce(sum(t.amount), 0)::bigint
  into v_balance
  from public.rush_point_transactions t
  where t.user_id = v_user_id;

  if v_already_claimed_guest then
    -- Already claimed as guest today prior to conversion; award 0 additional RP
    return query select false, 0::bigint, 0::bigint, 0::bigint, v_balance, v_today_str, v_normalized_tier;
    return;
  end if;

  -- 9. Atomic Insert for Tier Reward (INV-1, INV-7, INV-8)
  v_source_id := v_today_str || '_' || v_normalized_tier;

  insert into public.rush_point_transactions (
    user_id,
    amount,
    source,
    source_id,
    metadata
  )
  values (
    v_user_id,
    v_catalog_points,
    'daily_challenge',
    v_source_id,
    jsonb_build_object(
      'challenge_id', p_challenge_id,
      'tier', v_normalized_tier,
      'game_id', v_catalog_game,
      'challenge_date', v_today_str,
      'claimed_at_utc', timezone('utc'::text, now()),
      'client_metadata', p_metadata
    )
  )
  on conflict (user_id, source, source_id) where source_id is not null
  do nothing
  returning rush_point_transactions.amount into v_tier_inserted;

  -- 10. Evaluate Streak & Milestone Bonus (Guaranteed Race-Safe under Advisory Lock)
  if v_tier_inserted is not null and v_tier_inserted > 0 then
    -- Check if other tier was already completed today (in cloud ledger or guest conversion)
    v_other_tier_already_claimed := exists(
      select 1 from public.rush_point_transactions
      where user_id = v_user_id
        and source = 'daily_challenge'
        and source_id = v_today_str || '_' || case when v_normalized_tier = 'quick_win' then 'extreme' else 'quick_win' end
    ) or (
      v_conv_date is not null and v_conv_date = v_today_date and
      case when v_normalized_tier = 'quick_win' then v_conv_ext else v_conv_qw end
    );

    if not v_other_tier_already_claimed then
      -- First completion of the calendar day qualifies the streak
      v_check_date := v_today_date - 1;
      v_consecutive_days := 1;
      loop
        select exists(
          select 1 from public.rush_point_transactions
          where user_id = v_user_id
            and source = 'daily_challenge'
            and source_id like to_char(v_check_date, 'YYYY-MM-DD') || '_%'
        ) into v_day_has_claim;

        if v_day_has_claim then
          v_consecutive_days := v_consecutive_days + 1;
          v_check_date := v_check_date - 1;
          exit when v_consecutive_days >= 30;
        elsif v_conv_date is not null and v_check_date = v_conv_date and (v_conv_qw or v_conv_ext) then
          v_consecutive_days := v_consecutive_days + 1;
          v_check_date := v_check_date - 1;
          exit when v_consecutive_days >= 30;
        elsif v_conv_date is not null and (v_check_date = v_conv_date - 1 or (v_check_date = v_conv_date and not (v_conv_qw or v_conv_ext))) and v_conv_streak > 0 then
          declare
            v_prior_guest_days int := case when (v_conv_qw or v_conv_ext) then v_conv_streak - 1 else v_conv_streak end;
          begin
            if v_prior_guest_days > 0 then
              v_consecutive_days := least(30, v_consecutive_days + v_prior_guest_days);
            end if;
          end;
          exit;
        else
          exit;
        end if;
      end loop;
      v_current_streak := v_consecutive_days;

      if v_current_streak = 3 then
        v_calculated_streak_bonus := 100;
      elsif v_current_streak = 7 then
        v_calculated_streak_bonus := 300;
      elsif v_current_streak = 14 then
        v_calculated_streak_bonus := 500;
      else
        v_calculated_streak_bonus := 0;
      end if;

      if v_calculated_streak_bonus > 0 then
        v_streak_source_id := v_today_str || '_streak_bonus';

        insert into public.rush_point_transactions (
          user_id,
          amount,
          source,
          source_id,
          metadata
        )
        values (
          v_user_id,
          v_calculated_streak_bonus,
          'daily_challenge',
          v_streak_source_id,
          jsonb_build_object(
            'challenge_date', v_today_str,
            'streak_days', v_current_streak,
            'type', 'streak_bonus',
            'claimed_at_utc', timezone('utc'::text, now())
          )
        )
        on conflict (user_id, source, source_id) where source_id is not null
        do nothing
        returning rush_point_transactions.amount into v_streak_inserted;
      end if;
    end if;
  end if;

  -- 11. Evaluate Total Awarded Status
  v_total_amount := coalesce(v_tier_inserted, 0) + coalesce(v_streak_inserted, 0);
  if v_total_amount > 0 then
    v_awarded := true;
  else
    v_awarded := false;
    v_total_amount := 0;
  end if;

  -- 12. Calculate Authoritative Cloud Balance
  select coalesce(sum(t.amount), 0)::bigint
  into v_balance
  from public.rush_point_transactions t
  where t.user_id = v_user_id;

  -- 13. Return Structured Result Table
  return query select
    v_awarded,
    coalesce(v_tier_inserted, 0),
    coalesce(v_streak_inserted, 0),
    v_total_amount,
    v_balance,
    v_today_str,
    v_normalized_tier;
end;
$$ language plpgsql volatile security definer set search_path = public;

revoke all on function public.claim_daily_challenge_reward(text, text, jsonb) from public, anon;
grant execute on function public.claim_daily_challenge_reward(text, text, jsonb) to authenticated;
