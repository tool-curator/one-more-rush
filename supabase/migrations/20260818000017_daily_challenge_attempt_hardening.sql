-- ============================================================================
-- ONE MORE RUSH — Migration 00017: Daily Challenge Attempt Anti-Abuse Hardening
-- Adds public.daily_challenge_attempts table and public.start_daily_challenge_attempt()
-- RPC to bind Daily Challenge gameplay to server-issued, single-use attempt tokens.
-- Updates public.claim_daily_challenge_reward() to validate and consume the attempt.
-- ============================================================================

-- 1. Create Daily Challenge Attempts Table
create table if not exists public.daily_challenge_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  challenge_date date not null,
  challenge_id text not null,
  tier text not null,
  started_at timestamptz not null default timezone('utc'::text, now()),
  completed_at timestamptz null,
  consumed_at timestamptz null,
  expires_at timestamptz not null,
  constraint uq_daily_challenge_attempts unique (user_id, challenge_date, challenge_id, tier)
);

create index if not exists idx_daily_challenge_attempts_user_date
  on public.daily_challenge_attempts(user_id, challenge_date, tier);

alter table public.daily_challenge_attempts enable row level security;

-- Revoke direct mutations from anon and authenticated
revoke all on public.daily_challenge_attempts from public, anon;
grant select on public.daily_challenge_attempts to authenticated;

-- 2. Create Start Daily Challenge Attempt RPC
create or replace function public.start_daily_challenge_attempt(
  p_challenge_id text,
  p_tier text
)
returns uuid as $$
declare
  v_user_id uuid;
  v_today_date date;
  v_today_str text;
  v_normalized_tier text;
  v_expected_challenge_id text;
  v_catalog_game text;
  v_catalog_tier text;
  v_catalog_points bigint;
  v_attempt_id uuid;
begin
  -- 1. Validate Caller Authentication (INV-6)
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized: Authenticated player session required to start daily challenge.'
      using errcode = '42501';
  end if;

  -- 2. Determine Authoritative Server UTC Date (INV-14, INV-19)
  v_today_date := (timezone('utc'::text, now()))::date;
  v_today_str := to_char(v_today_date, 'YYYY-MM-DD');

  -- 3. Normalize Tier
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

  -- 4. Validate Challenge Catalog Info (INV-10, INV-17)
  select cat.game_id, cat.tier, cat.points
  into v_catalog_game, v_catalog_tier, v_catalog_points
  from public.get_challenge_catalog_info(p_challenge_id) cat;

  if v_catalog_points is null or v_catalog_points <= 0 then
    raise exception 'Invalid challenge ID: %', p_challenge_id using errcode = '22023';
  end if;

  if v_catalog_tier <> v_normalized_tier then
    raise exception 'Tier mismatch: Challenge % belongs to % but % was requested',
      p_challenge_id, v_catalog_tier, v_normalized_tier using errcode = '22023';
  end if;

  -- 5. Verify Challenge Active Today (INV-16)
  v_expected_challenge_id := public.get_active_challenge_for_date(v_today_str, v_normalized_tier);
  if lower(trim(p_challenge_id)) <> lower(trim(v_expected_challenge_id)) then
    raise exception 'Challenge % is not active on server date % (active challenge is %)',
      p_challenge_id, v_today_str, v_expected_challenge_id
      using errcode = '22023';
  end if;

  -- 6. Acquire Transaction Lock
  perform pg_advisory_xact_lock(hashtextextended('one_more_rush:daily_attempt:' || v_user_id::text || ':' || v_today_str || ':' || v_normalized_tier, 0));

  -- 7. Reuse active unconsumed attempt if valid
  select a.id into v_attempt_id
  from public.daily_challenge_attempts a
  where a.user_id = v_user_id
    and a.challenge_date = v_today_date
    and a.challenge_id = p_challenge_id
    and a.tier = v_normalized_tier
    and a.consumed_at is null
    and a.expires_at > timezone('utc'::text, now());

  if v_attempt_id is not null then
    return v_attempt_id;
  end if;

  -- 8. Insert new attempt or refresh unconsumed
  insert into public.daily_challenge_attempts (
    user_id,
    challenge_date,
    challenge_id,
    tier,
    started_at,
    expires_at
  )
  values (
    v_user_id,
    v_today_date,
    p_challenge_id,
    v_normalized_tier,
    timezone('utc'::text, now()),
    timezone('utc'::text, now()) + interval '30 minutes'
  )
  on conflict (user_id, challenge_date, challenge_id, tier)
  do update set
    started_at = timezone('utc'::text, now()),
    consumed_at = null,
    completed_at = null,
    expires_at = timezone('utc'::text, now()) + interval '30 minutes'
  where daily_challenge_attempts.consumed_at is null
  returning daily_challenge_attempts.id into v_attempt_id;

  if v_attempt_id is null then
    select a.id into v_attempt_id
    from public.daily_challenge_attempts a
    where a.user_id = v_user_id
      and a.challenge_date = v_today_date
      and a.challenge_id = p_challenge_id
      and a.tier = v_normalized_tier;
  end if;

  return v_attempt_id;
end;
$$ language plpgsql volatile security definer set search_path = public;

revoke all on function public.start_daily_challenge_attempt(text, text) from public, anon;
grant execute on function public.start_daily_challenge_attempt(text, text) to authenticated;

-- 3. Update claim_daily_challenge_reward to validate and consume attempt
create or replace function public.claim_daily_challenge_reward(
  p_challenge_id text,
  p_tier text,
  p_metadata jsonb default '{}'::jsonb,
  p_attempt_id uuid default null
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
  v_resolved_attempt_id uuid;
  v_att_row_id uuid;
  v_att_consumed timestamptz;
  v_att_expires timestamptz;
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
  select cat.game_id, cat.tier, cat.points
  into v_catalog_game, v_catalog_tier, v_catalog_points
  from public.get_challenge_catalog_info(p_challenge_id) cat;

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

  -- 6. Attempt Validation (if attempt_id provided)
  v_resolved_attempt_id := p_attempt_id;
  if v_resolved_attempt_id is null and p_metadata ? 'attempt_id' and (p_metadata->>'attempt_id') is not null then
    begin
      v_resolved_attempt_id := (p_metadata->>'attempt_id')::uuid;
    exception when others then
      v_resolved_attempt_id := null;
    end;
  end if;

  if v_resolved_attempt_id is not null then
    select a.id, a.consumed_at, a.expires_at
    into v_att_row_id, v_att_consumed, v_att_expires
    from public.daily_challenge_attempts a
    where a.id = v_resolved_attempt_id
      and a.user_id = v_user_id
      and a.challenge_id = p_challenge_id
      and a.tier = v_normalized_tier
      and a.challenge_date = v_today_date;

    if v_att_row_id is null then
      raise exception 'Invalid or mismatched daily challenge attempt: %', v_resolved_attempt_id
        using errcode = '22023';
    end if;

    if v_att_consumed is not null then
      -- Already consumed; let standard idempotent flow return zero additional credit
      null;
    elsif v_att_expires <= timezone('utc'::text, now()) then
      raise exception 'Daily challenge attempt expired: %', v_resolved_attempt_id
        using errcode = '22023';
    end if;
  end if;

  -- 7. Acquire 64-bit Transaction-Scoped Advisory Lock for (Authenticated User + Daily Challenge UTC Date)
  perform pg_advisory_xact_lock(hashtextextended('one_more_rush:daily_challenge:' || v_user_id::text || ':' || v_today_str, 0));

  -- 8. Check guest conversion record for today's converted status (INV-1)
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

  -- 9. Calculate Current Authoritative Balance
  select coalesce(sum(t.amount), 0)::bigint
  into v_balance
  from public.rush_point_transactions t
  where t.user_id = v_user_id;

  if v_already_claimed_guest then
    return query select false, 0::bigint, 0::bigint, 0::bigint, v_balance, v_today_str, v_normalized_tier;
    return;
  end if;

  -- 10. Atomic Insert for Tier Reward (INV-1, INV-7, INV-8)
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
      'attempt_id', v_resolved_attempt_id,
      'client_metadata', p_metadata
    )
  )
  on conflict (user_id, source, source_id) where source_id is not null
  do nothing
  returning rush_point_transactions.amount into v_tier_inserted;

  -- 11. Consume attempt atomically upon reward insertion
  if v_resolved_attempt_id is not null and v_tier_inserted is not null and v_tier_inserted > 0 then
    update public.daily_challenge_attempts
    set completed_at = timezone('utc'::text, now()),
        consumed_at = timezone('utc'::text, now())
    where id = v_resolved_attempt_id
      and user_id = v_user_id
      and consumed_at is null;
  end if;

  -- 12. Evaluate Streak & Milestone Bonus (Guaranteed Race-Safe under Advisory Lock)
  if v_tier_inserted is not null and v_tier_inserted > 0 then
    v_other_tier_already_claimed := exists(
      select 1 from public.rush_point_transactions tx_other
      where tx_other.user_id = v_user_id
        and tx_other.source = 'daily_challenge'
        and tx_other.source_id = v_today_str || '_' || case when v_normalized_tier = 'quick_win' then 'extreme' else 'quick_win' end
    ) or (
      v_conv_date is not null and v_conv_date = v_today_date and
      case when v_normalized_tier = 'quick_win' then v_conv_ext else v_conv_qw end
    );

    if not v_other_tier_already_claimed then
      v_check_date := v_today_date - 1;
      v_consecutive_days := 1;
      loop
        select exists(
          select 1 from public.rush_point_transactions tx_streak
          where tx_streak.user_id = v_user_id
            and tx_streak.source = 'daily_challenge'
            and tx_streak.source_id like to_char(v_check_date, 'YYYY-MM-DD') || '_%'
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

  -- 13. Evaluate Total Awarded Status
  v_total_amount := coalesce(v_tier_inserted, 0) + coalesce(v_streak_inserted, 0);
  if v_total_amount > 0 then
    v_awarded := true;
  else
    v_awarded := false;
    v_total_amount := 0;
  end if;

  -- 14. Calculate Authoritative Cloud Balance
  select coalesce(sum(t.amount), 0)::bigint
  into v_balance
  from public.rush_point_transactions t
  where t.user_id = v_user_id;

  -- 15. Return Structured Result Table
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

revoke all on function public.claim_daily_challenge_reward(text, text, jsonb, uuid) from public, anon;
grant execute on function public.claim_daily_challenge_reward(text, text, jsonb, uuid) to authenticated;
