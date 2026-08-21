-- ============================================================================
-- ONE MORE RUSH — Phase 6A Initial Database Architecture
-- PostgreSQL Schema for Supabase (Profiles, Game Scores, RLS Policies & Triggers)
-- ============================================================================

-- 1. Create Profiles Table (Linked 1:1 with Supabase Auth Users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique,
  display_name text,
  avatar_frame text not null default 'classic',
  title text not null default 'rookie',
  victory_effect text not null default 'none',
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint username_length check (char_length(username) >= 3 and char_length(username) <= 20)
);

-- 2. Create Normalized Game Scores Table
create table if not exists public.game_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  game_id text not null check (game_id in ('aim', 'dodge', 'stack', 'number-rush', 'memory', 'color-maze')),
  score bigint not null check (score >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- 3. Create Performance Indexes for Fast Leaderboard Queries
create index if not exists idx_game_scores_game_score on public.game_scores(game_id, score desc);
create index if not exists idx_game_scores_user_game on public.game_scores(user_id, game_id);
create index if not exists idx_game_scores_created on public.game_scores(created_at desc);

-- 4. Automatic Updated At Timestamp Trigger Function
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_profiles_updated_at on public.profiles;
create trigger trigger_profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

drop trigger if exists trigger_game_scores_updated_at on public.game_scores;
create trigger trigger_game_scores_updated_at
  before update on public.game_scores
  for each row execute function public.handle_updated_at();

-- 5. Automatic Profile Provisioning Trigger on New User Signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'player_' || substring(new.id::text from 1 for 8)),
    coalesce(new.raw_user_meta_data->>'display_name', 'Player')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 6. Row Level Security (RLS) Configuration
alter table public.profiles enable row level security;
alter table public.game_scores enable row level security;

-- 7. Profiles RLS Policies
-- Everyone can view public profile cards (username, frame, title) for leaderboards
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using (true);

-- Authenticated users can insert their own initial profile
drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Authenticated users can only update their own profile
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- 8. Game Scores RLS Policies
-- Everyone can view public leaderboard scores
drop policy if exists "Game scores are viewable by everyone" on public.game_scores;
create policy "Game scores are viewable by everyone"
  on public.game_scores for select
  using (true);

-- Authenticated users can insert their own scores (Zero anonymous insertion)
drop policy if exists "Users can submit own game scores" on public.game_scores;
create policy "Users can submit own game scores"
  on public.game_scores for insert
  with check (auth.uid() = user_id);
