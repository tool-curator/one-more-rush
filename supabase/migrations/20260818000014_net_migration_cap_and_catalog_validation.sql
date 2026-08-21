-- ============================================================================
-- ONE MORE RUSH — Migration 00014: Trusted Server-Authorized Legacy Migration
-- 1. Creates public.guest_migration_authorizations (strictly service_role controlled).
-- 2. Revokes ALL direct table INSERT/UPDATE/DELETE from anon, authenticated, and public.
-- 3. Revokes register_guest_migration_authorization() from authenticated/anon/public;
--    grants execute ONLY to service_role (trusted backend/Edge Function only).
-- 4. Replaces convert_guest_account(p_conversion_intent_id text) to derive all
--    economic values exclusively from the server authorization row, eliminating
--    all client-supplied economic parameters.
-- ============================================================================

-- 1. Safely drop previous function signatures to prevent overload ambiguity
drop function if exists public.convert_guest_account(bigint, boolean, boolean, boolean, int);
drop function if exists public.convert_guest_account(bigint, boolean, boolean, boolean, int, jsonb);
drop function if exists public.convert_guest_account(text, bigint, boolean, boolean, boolean, int, jsonb);
drop function if exists public.convert_guest_account(text);
drop function if exists public.register_guest_migration_authorization(text, bigint, boolean, boolean, boolean, int, jsonb);
drop function if exists public.register_guest_migration_authorization(uuid, text, bigint, boolean, boolean, boolean, int, jsonb, int);

-- 2. Create Server-Authoritative Guest Migration Authorizations Table
create table if not exists public.guest_migration_authorizations (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null references public.profiles(id) on delete cascade,
  conversion_intent_id text not null unique,
  authorized_legacy_amount bigint not null check (authorized_legacy_amount >= 0 and authorized_legacy_amount <= 50000),
  authorized_daily_visit_claimed boolean not null default false,
  authorized_quick_win_claimed boolean not null default false,
  authorized_extreme_claimed boolean not null default false,
  authorized_streak int not null default 0 check (authorized_streak >= 0 and authorized_streak <= 30),
  authorized_locker_items jsonb default null,
  expires_at timestamptz not null,
  consumed_at timestamptz null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_guest_migration_auth_target 
  on public.guest_migration_authorizations(target_user_id, conversion_intent_id);

alter table public.guest_migration_authorizations enable row level security;

create policy "Users can view own migration authorizations"
  on public.guest_migration_authorizations
  for select
  to authenticated
  using (auth.uid() = target_user_id);

grant select on table public.guest_migration_authorizations to authenticated;
revoke all on table public.guest_migration_authorizations from anon, public;
revoke insert, update, delete on table public.guest_migration_authorizations from authenticated, anon, public;


-- 3. Trusted Function: Register Legacy Migration Authorization (SERVICE_ROLE ONLY)
create or replace function public.register_guest_migration_authorization(
  p_target_user_id uuid,
  p_conversion_intent_id text,
  p_legacy_amount bigint,
  p_daily_visit_claimed boolean default false,
  p_quick_win_claimed boolean default false,
  p_extreme_claimed boolean default false,
  p_streak int default 0,
  p_locker_items jsonb default null,
  p_expires_in_hours int default 1
)
returns uuid as $$
declare
  v_auth_id uuid;
  c_max_legacy_cap constant bigint := 50000;
  v_sanitized_streak int;
  v_cat text;
  v_item text;
  v_cat_arr jsonb;
  v_item_elem text;
  v_item_price bigint;
  v_has_existing_cloud boolean;
begin
  if p_target_user_id is null then
    raise exception 'Invalid target user ID.' using errcode = '22023';
  end if;

  if p_conversion_intent_id is null or trim(p_conversion_intent_id) = '' then
    raise exception 'Invalid conversion intent ID.' using errcode = '22023';
  end if;

  -- Verify target user has no established cloud economy
  select exists(
    select 1 from public.rush_point_transactions where user_id = p_target_user_id
  ) into v_has_existing_cloud;

  if v_has_existing_cloud then
    raise exception 'Cannot create migration authorization: Account already has an established cloud ledger.'
      using errcode = '42501';
  end if;

  -- Validate amount (0 to 50,000 RP)
  if p_legacy_amount is not null and (p_legacy_amount < 0 or p_legacy_amount > c_max_legacy_cap) then
    raise exception 'Invalid legacy amount: Must be between 0 and % RP', c_max_legacy_cap
      using errcode = '22003';
  end if;

  -- Validate cosmetics against catalog if provided
  if p_locker_items is not null then
    if jsonb_typeof(p_locker_items) <> 'object' then
      raise exception 'Malformed p_locker_items: Expected JSON object' using errcode = '22023';
    end if;

    for v_cat in select jsonb_object_keys(p_locker_items) loop
      if v_cat not in ('frames', 'titles', 'effects', 'badges') then
        raise exception 'Invalid locker category in authorization payload: %', v_cat using errcode = '22023';
      end if;

      v_cat_arr := p_locker_items -> v_cat;
      if jsonb_typeof(v_cat_arr) <> 'array' then
        raise exception 'Malformed items array for category % in authorization payload', v_cat using errcode = '22023';
      end if;

      for v_item_elem in select jsonb_array_elements_text(v_cat_arr) loop
        v_item := lower(trim(v_item_elem));
        v_item_price := public.get_locker_item_price(v_cat, v_item);
      end loop;
    end loop;
  end if;

  v_sanitized_streak := least(greatest(coalesce(p_streak, 0), 0), 30);

  insert into public.guest_migration_authorizations (
    target_user_id,
    conversion_intent_id,
    authorized_legacy_amount,
    authorized_daily_visit_claimed,
    authorized_quick_win_claimed,
    authorized_extreme_claimed,
    authorized_streak,
    authorized_locker_items,
    expires_at
  )
  values (
    p_target_user_id,
    trim(p_conversion_intent_id),
    coalesce(p_legacy_amount, 0),
    coalesce(p_daily_visit_claimed, false),
    coalesce(p_quick_win_claimed, false),
    coalesce(p_extreme_claimed, false),
    v_sanitized_streak,
    p_locker_items,
    timezone('utc'::text, now()) + (least(greatest(coalesce(p_expires_in_hours, 1), 1), 24) || ' hours')::interval
  )
  on conflict (conversion_intent_id)
  do update set
    created_at = guest_migration_authorizations.created_at
  where guest_migration_authorizations.target_user_id = p_target_user_id
    and guest_migration_authorizations.consumed_at is null
    and guest_migration_authorizations.expires_at > timezone('utc'::text, now())
  returning id into v_auth_id;

  if v_auth_id is null then
    select id into v_auth_id
    from public.guest_migration_authorizations
    where conversion_intent_id = trim(p_conversion_intent_id)
      and target_user_id = p_target_user_id
      and consumed_at is null
      and expires_at > timezone('utc'::text, now());
  end if;

  if v_auth_id is null then
    raise exception 'Cannot create or reuse migration authorization: Intent is invalid, expired, or already consumed.'
      using errcode = '42501';
  end if;

  return v_auth_id;
end;
$$ language plpgsql volatile security definer set search_path = public;

-- Strictly REVOKE execute from authenticated, anon, and public
revoke all on function public.register_guest_migration_authorization(uuid, text, bigint, boolean, boolean, boolean, int, jsonb, int) from public, anon, authenticated;
grant execute on function public.register_guest_migration_authorization(uuid, text, bigint, boolean, boolean, boolean, int, jsonb, int) to service_role;


-- 4. Authoritative convert_guest_account: Strictly Consumes Server Authorization Row
create or replace function public.convert_guest_account(
  p_conversion_intent_id text
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
  v_auth record;
  v_cosmetic_cost bigint := 0;
  v_cat text;
  v_item text;
  v_cat_arr jsonb;
  v_item_elem text;
  v_item_price bigint;
begin
  -- 1. Validate Authenticated Session (Derived strictly from auth.uid())
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized: Authenticated player session required.'
      using errcode = '42501';
  end if;

  -- 2. Acquire 64-bit Transaction-Scoped Advisory Lock
  perform pg_advisory_xact_lock(hashtextextended('one_more_rush:guest_conversion:' || v_user_id::text, 0));

  v_today_date := (timezone('utc'::text, now()))::date;

  -- 3. Check If Migration Was Already Completed For This Account (Idempotency)
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

  -- 4. Check If Account Already Has An Established Cloud Economy (Protection)
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

  -- 5. Authoritative Server Authorization Gate (Must exist, belong to auth.uid(), be unexpired & unconsumed)
  if p_conversion_intent_id is null or trim(p_conversion_intent_id) = '' then
    raise exception 'Unauthorized: Valid conversion intent ID is required.' using errcode = '42501';
  end if;

  select *
  into v_auth
  from public.guest_migration_authorizations
  where target_user_id = v_user_id
    and conversion_intent_id = trim(p_conversion_intent_id)
    and consumed_at is null
    and expires_at > timezone('utc'::text, now())
  for update;

  if v_auth.id is null then
    raise exception 'Unauthorized: No valid, unconsumed server migration authorization found for account %', v_user_id
      using errcode = '42501';
  end if;

  -- 6. Strict Catalog Pre-Validation of Server-Authorized Locker Items
  if v_auth.authorized_locker_items is not null and jsonb_typeof(v_auth.authorized_locker_items) = 'object' then
    for v_cat in select jsonb_object_keys(v_auth.authorized_locker_items) loop
      if v_cat not in ('frames', 'titles', 'effects', 'badges') then
        raise exception 'Invalid locker category in authorization record: %', v_cat using errcode = '22023';
      end if;

      v_cat_arr := v_auth.authorized_locker_items -> v_cat;
      if jsonb_typeof(v_cat_arr) <> 'array' then
        raise exception 'Malformed items array for category % in authorization record', v_cat using errcode = '22023';
      end if;

      for v_item_elem in select jsonb_array_elements_text(v_cat_arr) loop
        v_item := lower(trim(v_item_elem));
        v_item_price := public.get_locker_item_price(v_cat, v_item);
        v_cosmetic_cost := v_cosmetic_cost + v_item_price;
      end loop;
    end loop;
  end if;

  -- 7. Insert Conversion State Record
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
    v_auth.authorized_daily_visit_claimed,
    v_auth.authorized_quick_win_claimed,
    v_auth.authorized_extreme_claimed,
    v_auth.authorized_streak
  )
  on conflict (user_id) do nothing;

  -- 8. Insert Server-Authorized Cosmetics into User Inventory
  if v_auth.authorized_locker_items is not null and jsonb_typeof(v_auth.authorized_locker_items) = 'object' then
    for v_cat in select jsonb_object_keys(v_auth.authorized_locker_items) loop
      v_cat_arr := v_auth.authorized_locker_items -> v_cat;
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

  -- 9. Atomic Insert of Authoritative Points into Ledger (0 <= authorized_amount <= 50,000)
  if v_auth.authorized_legacy_amount > 0 then
    insert into public.rush_point_transactions (
      user_id,
      amount,
      source,
      source_id,
      metadata
    )
    values (
      v_user_id,
      v_auth.authorized_legacy_amount,
      'legacy_migration',
      'initial_migration',
      jsonb_build_object(
        'migration_type', 'trusted_server_authorized_legacy_migration',
        'authorization_id', v_auth.id,
        'conversion_intent_id', v_auth.conversion_intent_id,
        'credited_amount', v_auth.authorized_legacy_amount,
        'cosmetic_valuation_amount', v_cosmetic_cost,
        'authorized_streak', v_auth.authorized_streak,
        'migrated_at_utc', timezone('utc'::text, now())
      )
    )
    on conflict (user_id, source, source_id) where source_id is not null
    do nothing
    returning rush_point_transactions.amount into v_inserted_amount;
  end if;

  -- 10. Mark Server Authorization & Handoff Record Consumed
  update public.guest_migration_authorizations
  set consumed_at = timezone('utc'::text, now())
  where id = v_auth.id;

  update public.guest_migration_handoffs
  set status = 'consumed', consumed_at = timezone('utc'::text, now())
  where conversion_intent_id = v_auth.conversion_intent_id
    and status in ('pending', 'provisioned')
    and consumed_at is null;

  -- 11. Calculate Authoritative Total Cloud Balance
  select coalesce(sum(t.amount), 0)::bigint
  into v_balance
  from public.rush_point_transactions t
  where t.user_id = v_user_id;

  -- 12. Return Final Conversion Result
  if v_inserted_amount > 0 then
    return query select 'migrated'::text, v_inserted_amount, v_balance;
  elsif v_auth.authorized_legacy_amount <= 0 then
    return query select 'no_legacy_balance'::text, 0::bigint, v_balance;
  else
    return query select 'already_migrated'::text, 0::bigint, v_balance;
  end if;
end;
$$ language plpgsql volatile security definer set search_path = public;

revoke all on function public.convert_guest_account(text) from public, anon;
grant execute on function public.convert_guest_account(text) to authenticated;


-- ----------------------------------------------------------------------------
-- 5. Server-Authoritative Guest Migration Handoffs Table & RPC
-- ----------------------------------------------------------------------------
create table if not exists public.guest_migration_handoffs (
  id uuid primary key default gen_random_uuid(),
  source_anonymous_user_id uuid not null references auth.users(id) on delete cascade,
  target_user_id uuid not null references public.profiles(id) on delete cascade,
  conversion_intent_id text not null unique,
  status text not null default 'pending' check (status in ('pending', 'provisioned', 'consumed', 'revoked')),
  expires_at timestamptz not null default (timezone('utc'::text, now()) + interval '1 hour'),
  consumed_at timestamptz null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_guest_migration_handoffs_lookup
  on public.guest_migration_handoffs(source_anonymous_user_id, target_user_id, conversion_intent_id);

alter table public.guest_migration_handoffs enable row level security;

create policy "Users can view own migration handoffs"
  on public.guest_migration_handoffs
  for select
  to authenticated
  using (auth.uid() = source_anonymous_user_id or auth.uid() = target_user_id);

grant select on table public.guest_migration_handoffs to authenticated;
revoke all on table public.guest_migration_handoffs from anon, public;
revoke insert, update, delete on table public.guest_migration_handoffs from authenticated, anon, public;

drop function if exists public.create_guest_migration_handoff(uuid);

create or replace function public.create_guest_migration_handoff(
  p_target_user_id uuid
)
returns text as $$
declare
  v_source_user_id uuid;
  v_intent_id text;
begin
  v_source_user_id := auth.uid();
  if v_source_user_id is null then
    raise exception 'Unauthorized: Authenticated player session required.'
      using errcode = '42501';
  end if;

  if p_target_user_id is null or p_target_user_id = v_source_user_id then
    raise exception 'Invalid target user ID.'
      using errcode = '22023';
  end if;

  v_intent_id := 'intent_' || gen_random_uuid()::text;

  insert into public.guest_migration_handoffs (
    source_anonymous_user_id,
    target_user_id,
    conversion_intent_id,
    status,
    expires_at
  ) values (
    v_source_user_id,
    p_target_user_id,
    v_intent_id,
    'pending',
    timezone('utc'::text, now()) + interval '1 hour'
  );

  return v_intent_id;
end;
$$ language plpgsql volatile security definer set search_path = public;

revoke all on function public.create_guest_migration_handoff(uuid) from public, anon;
grant execute on function public.create_guest_migration_handoff(uuid) to authenticated;

