-- ============================================================================
-- ONE MORE RUSH — Phase 6D-B1 Secure Server-Authoritative Daily Visit Reward
-- Idempotent +10 RP Daily Reward RPC with UTC Calendar Day Protection
-- ============================================================================

-- Function: Claim Daily Visit Reward (+10 Rush Points)
-- Note: Zero client-provided parameters. Derives identity strictly from auth.uid()
-- and uses server UTC date as authoritative source_id.
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
begin
  -- 1. Validate Caller Authentication
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized: Authenticated player session required to claim daily visit reward.'
      using errcode = '42501';
  end if;

  -- 2. Determine Authoritative Server UTC Calendar Date
  v_today_date := (timezone('utc'::text, now()))::date;
  v_source_id := to_char(v_today_date, 'YYYY-MM-DD');

  -- 3. Atomic Idempotent Insert into Rush Points Ledger
  -- Relies on unique index (user_id, source, source_id) where source_id is not null
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

  -- 4. Evaluate Award Status
  if v_amount is not null and v_amount > 0 then
    v_awarded := true;
  else
    v_awarded := false;
    v_amount := 0;
  end if;

  -- 5. Calculate Current Authoritative Cloud Balance
  select coalesce(sum(t.amount), 0)::bigint
  into v_balance
  from public.rush_point_transactions t
  where t.user_id = v_user_id;

  -- 6. Return Structured Claim Result
  return query
  select v_awarded, v_amount, v_balance, v_today_date;
end;
$$ language plpgsql volatile security definer set search_path = public;

-- Security & Privilege Hardening
-- Revoke all generic public and anonymous execute privileges
revoke all on function public.claim_daily_visit() from public;
revoke all on function public.claim_daily_visit() from anon;

-- Grant EXECUTE exclusively to authenticated players
grant execute on function public.claim_daily_visit() to authenticated;
