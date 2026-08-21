-- ============================================================================
-- ONE MORE RUSH — Phase 6D-C Extension: Read-Only Daily Challenge Status RPC
-- Allows authenticated clients to hydrate today's Daily Challenge claim status,
-- current unbroken streak, and cloud balance without performing a write or claim.
-- ============================================================================

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

  -- 5. Calculate Server-Authoritative Streak
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
        exit when v_consecutive_days >= 30; -- Safeguard loop limit
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
        exit when v_consecutive_days >= 30; -- Safeguard loop limit
      else
        exit;
      end if;
    end loop;
    v_current_streak := v_consecutive_days;
  end if;

  -- 6. Calculate Authoritative Total Cloud Balance
  select coalesce(sum(t.amount), 0)::bigint
  into v_balance
  from public.rush_point_transactions t
  where t.user_id = v_user_id;

  -- 7. Return Structured Status Table
  return query
  select
    v_today_str,
    v_qw_claimed,
    v_ext_claimed,
    v_qw_points,
    v_ext_points,
    v_current_streak,
    v_balance;
end;
$$ language plpgsql stable security definer set search_path = public;

-- Revoke from public / anon and grant strictly to authenticated
revoke all on function public.get_daily_challenge_status() from public, anon;
grant execute on function public.get_daily_challenge_status() to authenticated;
