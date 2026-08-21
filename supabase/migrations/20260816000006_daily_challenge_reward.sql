-- ============================================================================
-- ONE MORE RUSH — Phase 6D-C Final Security Hardened Daily Challenge Reward RPC
-- (Signature Mismatch Fix: Unified, Drop-in Compatible & 100% Server Authoritative)
-- ============================================================================

-- Safely drop old/mismatched function signatures if they exist in remote DB
drop function if exists public.claim_daily_challenge_reward(text, text, bigint, bigint, jsonb);
drop function if exists public.claim_daily_challenge_reward(text, text, jsonb);
drop function if exists public.get_challenge_catalog_reward(text, text);
drop function if exists public.get_challenge_catalog_info(text);
drop function if exists public.get_challenge_catalog_info(text, text, text, bigint);
drop function if exists public.get_active_challenge_for_date(text, text);
drop function if exists public.hash_string_32(text);

-- 1. Helper Function: Deterministic 32-bit Hash (Identical to Frontend hashString)
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


-- 2. Helper Function: Server Catalog for Challenge Rewards & Game Mapping
-- Strictly returns (game_id, tier, points) or throws on unknown ID (NO fallbacks!)
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


-- 3. Helper Function: Server Authoritative Rotation Verification
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
  if v_normalized_tier in ('quickwin', 'quick_win') then
    v_normalized_tier := 'quick_win';
  elsif v_normalized_tier in ('extreme', 'extreme_push') then
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


-- 4. Main RPC: Claim Daily Challenge Reward (100% Server Authoritative)
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
  v_catalog_points bigint;
  
  v_tier_source_id text;
  v_tier_inserted bigint := 0;
  
  -- Streak computation variables
  v_check_date date;
  v_consecutive_days int := 0;
  v_day_has_claim boolean;
  v_current_streak int := 0;
  v_calculated_streak_bonus bigint := 0;
  v_streak_source_id text;
  v_streak_inserted bigint := 0;
  
  v_total_amount bigint := 0;
  v_awarded boolean := false;
  v_balance bigint := 0;
begin
  -- 1. Validate Caller Authentication
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized: Authenticated player session required.'
      using errcode = '42501';
  end if;

  -- 2. Determine Authoritative Server UTC Calendar Date
  v_today_date := (timezone('utc'::text, now()))::date;
  v_today_str := to_char(v_today_date, 'YYYY-MM-DD');

  -- 3. Normalize Tier Name
  v_normalized_tier := lower(trim(coalesce(p_tier, 'extreme')));
  if v_normalized_tier in ('quickwin', 'quick_win') then
    v_normalized_tier := 'quick_win';
  elsif v_normalized_tier in ('extreme', 'extreme_push') then
    v_normalized_tier := 'extreme';
  else
    raise exception 'Invalid challenge tier: %', p_tier using errcode = '22023';
  end if;

  -- 4. Validate Challenge ID against Server Catalog (Throws 22023 on unknown ID)
  select c.game_id, c.tier, c.points
  into v_catalog_game, v_catalog_tier, v_catalog_points
  from public.get_challenge_catalog_info(p_challenge_id) c;

  if v_catalog_tier is null then
    raise exception 'Invalid or unknown challenge ID: %', p_challenge_id using errcode = '22023';
  end if;

  if v_catalog_tier <> v_normalized_tier then
    raise exception 'Challenge % tier mismatch: expected %, got %', p_challenge_id, v_catalog_tier, v_normalized_tier
      using errcode = '22023';
  end if;

  -- 5. Verify Challenge is Legitimately Active for Server UTC Date
  v_expected_challenge_id := public.get_active_challenge_for_date(v_today_str, v_normalized_tier);
  if lower(trim(p_challenge_id)) <> lower(trim(v_expected_challenge_id)) then
    raise exception 'Challenge % is not active on server date % (active challenge is %)',
      p_challenge_id, v_today_str, v_expected_challenge_id
      using errcode = '22023';
  end if;

  -- 6. Tier Completion Source ID for Idempotency
  v_tier_source_id := v_today_str || '_' || v_normalized_tier;

  -- 7. Atomic Insert for Base Tier Reward
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
    v_tier_source_id,
    jsonb_build_object(
      'challenge_id', p_challenge_id,
      'challenge_date', v_today_str,
      'tier', v_normalized_tier,
      'type', 'tier_reward',
      'client_metadata', p_metadata,
      'claimed_at_utc', timezone('utc'::text, now())
    )
  )
  on conflict (user_id, source, source_id) where source_id is not null
  do nothing
  returning rush_point_transactions.amount into v_tier_inserted;

  -- 8. Compute Server-Authoritative Streak Bonus
  -- Evaluated only on the first tier completed today
  if v_tier_inserted is not null and v_tier_inserted > 0 then
    -- Check if any other tier was already completed today
    select exists(
      select 1 from public.rush_point_transactions
      where user_id = v_user_id
        and source = 'daily_challenge'
        and source_id like v_today_str || '_%'
        and source_id <> v_tier_source_id
    ) into v_day_has_claim;

    -- If no previous tier completed today, this run advances the streak
    if not v_day_has_claim then
      v_check_date := v_today_date - 1;
      v_consecutive_days := 0;

      -- Check consecutive unbroken preceding days in transaction ledger
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
          exit when v_consecutive_days >= 30; -- Safeguard loop limit
        else
          exit;
        end if;
      end loop;

      v_current_streak := v_consecutive_days + 1;

      -- Milestone streak bonuses
      if v_current_streak = 3 then
        v_calculated_streak_bonus := 100;
      elsif v_current_streak = 7 then
        v_calculated_streak_bonus := 300;
      elsif v_current_streak = 14 then
        v_calculated_streak_bonus := 500;
      else
        v_calculated_streak_bonus := 0;
      end if;

      -- Insert streak bonus if eligible
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

  -- 9. Evaluate Total Awarded Status
  v_total_amount := coalesce(v_tier_inserted, 0) + coalesce(v_streak_inserted, 0);
  if v_total_amount > 0 then
    v_awarded := true;
  else
    v_awarded := false;
    v_total_amount := 0;
  end if;

  -- 10. Calculate Authoritative Cloud Balance
  select coalesce(sum(t.amount), 0)::bigint
  into v_balance
  from public.rush_point_transactions t
  where t.user_id = v_user_id;

  -- 11. Return Structured Result Table
  return query
  select 
    v_awarded, 
    coalesce(v_tier_inserted, 0), 
    coalesce(v_streak_inserted, 0), 
    v_total_amount, 
    v_balance, 
    v_today_str, 
    v_normalized_tier;
end;
$$ language plpgsql volatile security definer set search_path = public;

-- Security & Privilege Hardening
revoke all on function public.hash_string_32(text) from public, anon;
revoke all on function public.get_challenge_catalog_info(text) from public, anon;
revoke all on function public.get_active_challenge_for_date(text, text) from public, anon;
revoke all on function public.claim_daily_challenge_reward(text, text, jsonb) from public, anon;

grant execute on function public.hash_string_32(text) to authenticated;
grant execute on function public.get_challenge_catalog_info(text) to authenticated;
grant execute on function public.get_active_challenge_for_date(text, text) to authenticated;
grant execute on function public.claim_daily_challenge_reward(text, text, jsonb) to authenticated;
