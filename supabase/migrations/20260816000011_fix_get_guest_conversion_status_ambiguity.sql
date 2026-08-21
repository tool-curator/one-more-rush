-- ============================================================================
-- ONE MORE RUSH — Migration 00011: Disambiguate get_guest_conversion_status Columns
-- Fixes PL/pgSQL column reference ambiguity between RETURNS TABLE output variables
-- and public.guest_conversion_records columns by using explicit table aliases.
-- ============================================================================

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

  -- 1. Check if guest_conversion_records row exists with explicit table aliases
  select
    exists(
      select 1
      from public.guest_conversion_records c2
      where c2.user_id = v_user_id
    ),
    c.conversion_date,
    c.daily_visit_claimed,
    c.quick_win_claimed,
    c.extreme_claimed,
    c.streak
  into
    v_has_record,
    v_conv_date,
    v_dv,
    v_qw,
    v_ext,
    v_streak
  from public.guest_conversion_records c
  where c.user_id = v_user_id;

  -- 2. Check if a legacy_migration transaction exists
  select exists(
    select 1
    from public.rush_point_transactions tx
    where tx.user_id = v_user_id
      and tx.source = 'legacy_migration'
      and tx.source_id = 'initial_migration'
  ) into v_has_legacy_tx;

  -- 3. Check if any transaction exists in rush_point_transactions
  select
    exists(
      select 1
      from public.rush_point_transactions tx_any
      where tx_any.user_id = v_user_id
    ),
    coalesce(sum(t.amount), 0)::bigint
  into v_has_any_tx, v_balance
  from public.rush_point_transactions t
  where t.user_id = v_user_id;

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
