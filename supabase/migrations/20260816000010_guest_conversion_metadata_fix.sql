-- ============================================================================
-- ONE MORE RUSH — Migration 00010: Guest Conversion Metadata & Reward Fix
-- 1. Dynamically derives authoritative active challenge reward points from the server
--    catalog for converted guest accounts instead of using hardcoded fallbacks.
-- 2. Adds get_guest_conversion_status() RPC with strict semantic distinction between
--    genuine guest conversion records and established cloud economy transactions.
-- 3. Hardens get_user_rush_points_balance(uuid) with strict caller ownership checks
--    and explicit least-privilege REVOKE / GRANT statements.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Dynamic Active Reward Lookup in get_daily_challenge_status()
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
  v_expected_qw_id text;
  v_expected_ext_id text;
  v_active_qw_points bigint := 0;
  v_active_ext_points bigint := 0;
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

  -- 6. Dynamically resolve server catalog reward points for today's active rotation
  v_expected_qw_id := public.get_active_challenge_for_date(v_today_str, 'quick_win');
  select c.points into v_active_qw_points from public.get_challenge_catalog_info(v_expected_qw_id) c;

  v_expected_ext_id := public.get_active_challenge_for_date(v_today_str, 'extreme');
  select c.points into v_active_ext_points from public.get_challenge_catalog_info(v_expected_ext_id) c;

  -- Augment today's claimed status if conversion happened today
  if v_conv_date is not null and v_conv_date = v_today_date then
    if v_conv_qw then
      v_qw_claimed := true;
      if v_qw_points = 0 then
        v_qw_points := coalesce(v_active_qw_points, 25);
      end if;
    end if;

    if v_conv_ext then
      v_ext_claimed := true;
      if v_ext_points = 0 then
        v_ext_points := coalesce(v_active_ext_points, 750);
      end if;
    end if;
  end if;

  -- 7. Calculate Server-Authoritative Streak Seamlessly
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

  -- 8. Calculate Authoritative Total Cloud Balance
  select coalesce(sum(t.amount), 0)::bigint
  into v_balance
  from public.rush_point_transactions t
  where t.user_id = v_user_id;

  -- 9. Return Structured Status Table (Pure Read-Only)
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
-- 2. Server-Authoritative Guest Conversion Status RPC
-- Strictly distinguishes between genuine guest conversion records, legacy migration
-- transactions, and generic established cloud economy transactions.
-- ----------------------------------------------------------------------------
create or replace function public.get_guest_conversion_status()
returns table (
  has_conversion_record boolean,
  has_legacy_migration boolean,
  has_cloud_transactions boolean,
  has_established_cloud_economy boolean,
  conversion_date date,
  daily_visit_claimed boolean,
  quick_win_claimed boolean,
  extreme_claimed boolean,
  streak int,
  cloud_balance bigint
) as $$
declare
  v_user_id uuid;
  v_has_record boolean := false;
  v_has_legacy_tx boolean := false;
  v_has_any_tx boolean := false;
  v_conv_date date;
  v_dv boolean := false;
  v_qw boolean := false;
  v_ext boolean := false;
  v_streak int := 0;
  v_balance bigint := 0;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return query select false, false, false, false, null::date, false, false, false, 0, 0::bigint;
    return;
  end if;

  -- 1. Check if guest_conversion_records row exists
  select exists(
    select 1 from public.guest_conversion_records where user_id = v_user_id
  ), conversion_date, daily_visit_claimed, quick_win_claimed, extreme_claimed, streak
  into v_has_record, v_conv_date, v_dv, v_qw, v_ext, v_streak
  from public.guest_conversion_records
  where user_id = v_user_id;

  -- 2. Check if a legacy_migration transaction exists
  select exists(
    select 1 from public.rush_point_transactions
    where user_id = v_user_id
      and source = 'legacy_migration'
      and source_id = 'initial_migration'
  ) into v_has_legacy_tx;

  -- 3. Check if any transaction exists in rush_point_transactions
  select exists(
    select 1 from public.rush_point_transactions where user_id = v_user_id
  ), coalesce(sum(amount), 0)::bigint
  into v_has_any_tx, v_balance
  from public.rush_point_transactions
  where user_id = v_user_id;

  return query select
    coalesce(v_has_record, false),
    coalesce(v_has_legacy_tx, false),
    coalesce(v_has_any_tx, false),
    (coalesce(v_has_any_tx, false) and not coalesce(v_has_record, false) and not coalesce(v_has_legacy_tx, false)),
    v_conv_date,
    coalesce(v_dv, false),
    coalesce(v_qw, false),
    coalesce(v_ext, false),
    coalesce(v_streak, 0),
    coalesce(v_balance, 0)::bigint;
end;
$$ language plpgsql stable security definer set search_path = public;

revoke all on function public.get_guest_conversion_status() from public, anon;
grant execute on function public.get_guest_conversion_status() to authenticated;

-- ----------------------------------------------------------------------------
-- 3. Hardened get_user_rush_points_balance Function & Strict Privileges
-- Strict caller verification: caller can ONLY query their own balance.
-- Explicitly revokes all execution permissions from anon and public.
-- ----------------------------------------------------------------------------
create or replace function public.get_user_rush_points_balance(p_user_id uuid)
returns bigint as $$
declare
  v_caller_id uuid;
  v_balance bigint;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null or v_caller_id <> p_user_id then
    raise exception 'Unauthorized: You may only query your own Rush Points balance.'
      using errcode = '42501';
  end if;

  select coalesce(sum(amount), 0)::bigint
  into v_balance
  from public.rush_point_transactions
  where user_id = p_user_id;

  return v_balance;
end;
$$ language plpgsql stable security definer set search_path = public;

revoke all on function public.get_user_rush_points_balance(uuid) from public, anon;
grant execute on function public.get_user_rush_points_balance(uuid) to authenticated;
