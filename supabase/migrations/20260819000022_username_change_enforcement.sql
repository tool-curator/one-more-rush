-- ============================================================================
-- ONE MORE RUSH — Migration 00022: Server-Side Username Change Enforcement
-- Enforces the invariant: A player may change their custom username at most ONCE.
-- Initial handle assignment from auto-generated placeholder (player_<uuid_prefix>) is permitted.
-- Subsequent changes are tracked server-side and capped at 1 via PostgreSQL trigger.
-- Direct table updates and API calls attempting repeated changes are strictly rejected.
--
-- EXISTING USERS BASELINE:
-- Existing users receive a baseline username_changes_count of 0 because historical
-- username-change events are not stored. From Migration 00022 onward, the one-time
-- username-change rule is server-enforced.
-- ============================================================================

-- 1. Add username_changes_count Column to public.profiles
-- Defaults to 0 for all existing and newly created profiles.
alter table public.profiles
  add column if not exists username_changes_count int not null default 0;

-- 2. Add Defensive Constraint on username_changes_count (0 or 1 max)
alter table public.profiles
  drop constraint if exists chk_profiles_username_changes_count;

alter table public.profiles
  add constraint chk_profiles_username_changes_count
  check (username_changes_count >= 0 and username_changes_count <= 1);

-- 3. Create Server-Authoritative Trigger Function
create or replace function public.enforce_profile_username_change_limit()
returns trigger as $$
declare
  v_raw_id text;
  v_clean_id text;
  v_placeholder1 text;
  v_placeholder2 text;
  v_is_old_placeholder boolean;
begin
  -- Step 1: If username is not changing (or only case/whitespace differences), allow update
  -- and ensure client cannot maliciously override username_changes_count directly.
  if lower(trim(coalesce(new.username, ''))) = lower(trim(coalesce(old.username, ''))) then
    new.username_changes_count := old.username_changes_count;
    return new;
  end if;

  -- Step 2: Exact Placeholder Detection (Matches frontend isPlaceholderUsername)
  -- Checks whether OLD.username was NULL or the system-generated placeholder:
  -- 'player_' || <first 8 characters of user UUID with or without hyphens>
  v_raw_id := lower(old.id::text);
  v_clean_id := replace(v_raw_id, '-', '');
  v_placeholder1 := 'player_' || substring(v_raw_id from 1 for 8);
  v_placeholder2 := 'player_' || substring(v_clean_id from 1 for 8);

  v_is_old_placeholder := (
    old.username is null or
    trim(old.username) = '' or
    lower(trim(old.username)) = v_placeholder1 or
    lower(trim(old.username)) = v_placeholder2
  );

  -- If OLD.username was a system placeholder, this is the player's INITIAL handle claim.
  -- Initial handle claim does NOT consume the 1-time change allowance.
  if v_is_old_placeholder then
    new.username_changes_count := old.username_changes_count;
    return new;
  end if;

  -- Step 3: OLD.username was already an established custom handle, and NEW.username is different.
  -- Verify if the one-time username change allowance has already been exhausted.
  if old.username_changes_count >= 1 then
    raise exception 'Username change limit exceeded: Username may only be changed once.'
      using errcode = '22023';
  end if;

  -- Step 4: First legitimate custom handle change: increment server counter to 1.
  new.username_changes_count := old.username_changes_count + 1;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- 4. Attach Trigger to public.profiles
drop trigger if exists trigger_enforce_username_change_limit on public.profiles;
create trigger trigger_enforce_username_change_limit
  before update on public.profiles
  for each row execute function public.enforce_profile_username_change_limit();
