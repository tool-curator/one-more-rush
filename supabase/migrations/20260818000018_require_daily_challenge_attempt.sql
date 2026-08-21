-- ============================================================================
-- ONE MORE RUSH — Migration 00018: Require Mandatory Daily Challenge Attempt ID
-- Updates public.claim_daily_challenge_reward() to make p_attempt_id strictly
-- mandatory and remove metadata fallback, ensuring direct claim RPC calls without
-- a valid server-issued attempt token are rejected immediately.
-- ============================================================================

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

  -- 2. Validate Mandatory Server-Issued Attempt ID (FIX: No NULL, No Metadata Fallback)
  if p_attempt_id is null then
    raise exception 'Daily challenge attempt ID is required.'
      using errcode = '22023';
  end if;

  -- 3. Determine Authoritative Server UTC Calendar Date (INV-14, INV-19)
  v_today_date := (timezone('utc'::text, now()))::date;
  v_today_str := to_char(v_today_date, 'YYYY-MM-DD');

  -- 4. Normalize Requested Tier
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

  -- 5. Validate Challenge from Server Catalog (INV-10, INV-17)
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

  -- 6. Verify Challenge is Legitimately Active for Server UTC Date (INV-16)
  v_expected_challenge_id := public.get_active_challenge_for_date(v_today_str, v_normalized_tier);
  if lower(trim(p_challenge_id)) <> lower(trim(v_expected_challenge_id)) then
    raise exception 'Challenge % is not active on server date % (active challenge is %)',
      p_challenge_id, v_today_str, v_expected_challenge_id
      using errcode = '22023';
  end if;

  -- 7. Validate Server-Issued Attempt Token (User, Challenge, Tier, Date, Expiry)
  select a.id, a.consumed_at, a.expires_at
  into v_att_row_id, v_att_consumed, v_att_expires
  from public.daily_challenge_attempts a
  where a.id = p_attempt_id
    and a.user_id = v_user_id
    and a.challenge_id = p_challenge_id
    and a.tier = v_normalized_tier
    and a.challenge_date = v_today_date;

  if v_att_row_id is null then
    raise exception 'Invalid or mismatched daily challenge attempt: %', p_attempt_id
      using errcode = '22023';
  end if;

  if v_att_consumed is not null then
    -- Already consumed; standard idempotent flow returns zero additional credit
    null;
  elsif v_att_expires <= timezone('utc'::text, now()) then
    raise exception 'Daily challenge attempt expired: %', p_attempt_id
      using errcode = '22023';
  end if;

  -- 8. Acquire 64-bit Transaction-Scoped Advisory Lock for (Authenticated User + Daily Challenge UTC Date)
  perform pg_advisory_xact_lock(hashtextextended('one_more_rush:daily_challenge:' || v_user_id::text || ':' || v_today_str, 0));

  -- 9. Check guest conversion record for today's converted status (INV-1)
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

  -- 10. Calculate Current Authoritative Balance
  select coalesce(sum(t.amount), 0)::bigint
  into v_balance
  from public.rush_point_transactions t
  where t.user_id = v_user_id;

  if v_already_claimed_guest then
    return query select false, 0::bigint, 0::bigint, 0::bigint, v_balance, v_today_str, v_normalized_tier;
    return;
  end if;

  -- 11. Atomic Insert for Tier Reward (INV-1, INV-7, INV-8)
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
      'attempt_id', p_attempt_id,
      'client_metadata', p_metadata
    )
  )
  on conflict (user_id, source, source_id) where source_id is not null
  do nothing
  returning rush_point_transactions.amount into v_tier_inserted;

  -- 12. Consume attempt atomically upon reward insertion
  if v_tier_inserted is not null and v_tier_inserted > 0 then
    update public.daily_challenge_attempts
    set completed_at = timezone('utc'::text, now()),
        consumed_at = timezone('utc'::text, now())
    where id = p_attempt_id
      and user_id = v_user_id
      and consumed_at is null;
  end if;

  -- 13. Evaluate Streak & Milestone Bonus (Guaranteed Race-Safe under Advisory Lock)
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

  -- 14. Evaluate Total Awarded Status
  v_total_amount := coalesce(v_tier_inserted, 0) + coalesce(v_streak_inserted, 0);
  if v_total_amount > 0 then
    v_awarded := true;
  else
    v_awarded := false;
    v_total_amount := 0;
  end if;

  -- 15. Calculate Authoritative Cloud Balance
  select coalesce(sum(t.amount), 0)::bigint
  into v_balance
  from public.rush_point_transactions t
  where t.user_id = v_user_id;

  -- 16. Return Structured Result Table
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
