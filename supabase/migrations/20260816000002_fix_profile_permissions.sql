-- ============================================================================
-- ONE MORE RUSH — Phase 6B Profile Permissions & Role Grants
-- Grants required table-level privileges to anon and authenticated roles
-- while preserving strict Row Level Security (RLS) enforcement
-- ============================================================================

-- 1. Grant Schema Usage to API Roles
grant usage on schema public to anon, authenticated;

-- 2. Grant Table-Level Privileges for Profiles
-- anon role can only read public profiles (for leaderboards/display)
grant select on table public.profiles to anon;
-- authenticated role can read, insert own, and update own profile
grant select, insert, update on table public.profiles to authenticated;

-- 3. Grant Table-Level Privileges for Game Scores
-- anon role can only read scores (for global leaderboards)
grant select on table public.game_scores to anon;
-- authenticated role can read and submit own scores
grant select, insert on table public.game_scores to authenticated;

-- 4. Ensure RLS is active on both tables
alter table public.profiles enable row level security;
alter table public.game_scores enable row level security;

-- 5. Re-assert Strict Profiles RLS Policies (Idempotent)
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using (true);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 6. Re-assert Strict Game Scores RLS Policies (Idempotent)
drop policy if exists "Game scores are viewable by everyone" on public.game_scores;
create policy "Game scores are viewable by everyone"
  on public.game_scores for select
  using (true);

drop policy if exists "Users can submit own game scores" on public.game_scores;
create policy "Users can submit own game scores"
  on public.game_scores for insert
  with check (auth.uid() = user_id);

-- 7. Ensure Robust Profile Creation Trigger
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'player_' || substring(new.id::text from 1 for 8)),
    coalesce(new.raw_user_meta_data->>'display_name', 'Player')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;
