-- ============================================================================
-- ONE MORE RUSH — Migration 00021: Leaderboard Data Integrity Remediation
-- 1. Cleans up invalid legacy/test scores violating authoritative max thresholds or placeholder usernames
-- 2. Adds PostgreSQL database-level CHECK constraints against impossible scores and invalid game IDs
-- 3. Hardens get_game_leaderboard RPC with authoritative score filters and placeholder exclusion
-- 4. Hardens get_user_game_rank RPC with identical authoritative ranking criteria
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. AUTHORITATIVE DATA CLEANUP
-- ----------------------------------------------------------------------------

-- A. Remove game scores exceeding authoritative game maximums, negative scores, or invalid game IDs
delete from public.game_scores
where
  score < 0
  or game_id not in ('aim', 'dodge', 'stack', 'number-rush', 'memory', 'color-maze')
  or score > case game_id
    when 'aim' then 100000
    when 'dodge' then 250000
    when 'stack' then 150000
    when 'number-rush' then 100000
    when 'memory' then 100000
    when 'color-maze' then 100000
    else 0
  end;

-- B. Remove game scores belonging to placeholder usernames (player_%) or accounts without valid custom username
delete from public.game_scores gs
using public.profiles p
where gs.user_id = p.id
  and (p.username is null or p.username like 'player_%');

-- ----------------------------------------------------------------------------
-- 2. DATABASE DEFENSE IN DEPTH — CHECK CONSTRAINTS
-- ----------------------------------------------------------------------------

alter table public.game_scores
  drop constraint if exists chk_game_scores_valid_score;

alter table public.game_scores
  add constraint chk_game_scores_valid_score
  check (
    score >= 0
    and score <= case game_id
      when 'aim' then 100000
      when 'dodge' then 250000
      when 'stack' then 150000
      when 'number-rush' then 100000
      when 'memory' then 100000
      when 'color-maze' then 100000
      else 0
    end
  );

alter table public.game_scores
  drop constraint if exists chk_game_scores_valid_game_id;

alter table public.game_scores
  add constraint chk_game_scores_valid_game_id
  check (game_id in ('aim', 'dodge', 'stack', 'number-rush', 'memory', 'color-maze'));

-- ----------------------------------------------------------------------------
-- 3. HARDEN get_game_leaderboard RPC
-- ----------------------------------------------------------------------------

create or replace function public.get_game_leaderboard(p_game_id text, p_limit int default 50)
returns table (
  rank bigint,
  user_id uuid,
  username text,
  display_name text,
  avatar_frame text,
  title text,
  victory_effect text,
  best_score bigint,
  achieved_at timestamptz
) as $$
declare
  v_max_score bigint;
begin
  -- Validate game identifier
  if p_game_id not in ('aim', 'dodge', 'stack', 'number-rush', 'memory', 'color-maze') then
    return;
  end if;

  case p_game_id
    when 'aim' then v_max_score := 100000;
    when 'dodge' then v_max_score := 250000;
    when 'stack' then v_max_score := 150000;
    when 'number-rush' then v_max_score := 100000;
    when 'memory' then v_max_score := 100000;
    when 'color-maze' then v_max_score := 100000;
    else v_max_score := 0;
  end case;

  return query
  with valid_scores as (
    select
      s.user_id,
      s.score,
      s.created_at,
      row_number() over (partition by s.user_id order by s.score desc, s.created_at asc) as rn
    from public.game_scores s
    join public.profiles p on p.id = s.user_id
    where s.game_id = p_game_id
      and s.score >= 0
      and s.score <= v_max_score
      and p.username is not null
      and p.username not like 'player_%'
  ),
  player_bests as (
    select
      r.user_id,
      r.score as best_score,
      r.created_at as achieved_at
    from valid_scores r
    where r.rn = 1
  )
  select
    dense_rank() over (order by b.best_score desc, b.achieved_at asc) as rank,
    b.user_id,
    coalesce(p.username, 'Player') as username,
    coalesce(p.display_name, 'Player') as display_name,
    coalesce(p.avatar_frame, 'classic') as avatar_frame,
    coalesce(p.title, 'rookie') as title,
    coalesce(p.victory_effect, 'none') as victory_effect,
    b.best_score,
    b.achieved_at
  from player_bests b
  join public.profiles p on p.id = b.user_id
  where p.username is not null
    and p.username not like 'player_%'
  order by rank asc, b.achieved_at asc
  limit coalesce(p_limit, 50);
end;
$$ language plpgsql stable security definer set search_path = public;

-- ----------------------------------------------------------------------------
-- 4. HARDEN get_user_game_rank RPC
-- ----------------------------------------------------------------------------

create or replace function public.get_user_game_rank(p_game_id text, p_user_id uuid)
returns table (
  rank bigint,
  best_score bigint,
  total_players bigint
) as $$
declare
  v_max_score bigint;
  v_username text;
begin
  if p_game_id not in ('aim', 'dodge', 'stack', 'number-rush', 'memory', 'color-maze') or p_user_id is null then
    return;
  end if;

  -- Check if target user has a valid custom username
  select p.username into v_username
  from public.profiles p
  where p.id = p_user_id;

  if v_username is null or v_username like 'player_%' then
    return;
  end if;

  case p_game_id
    when 'aim' then v_max_score := 100000;
    when 'dodge' then v_max_score := 250000;
    when 'stack' then v_max_score := 150000;
    when 'number-rush' then v_max_score := 100000;
    when 'memory' then v_max_score := 100000;
    when 'color-maze' then v_max_score := 100000;
    else v_max_score := 0;
  end case;

  return query
  with valid_scores as (
    select
      s.user_id,
      s.score,
      s.created_at,
      row_number() over (partition by s.user_id order by s.score desc, s.created_at asc) as rn
    from public.game_scores s
    join public.profiles p on p.id = s.user_id
    where s.game_id = p_game_id
      and s.score >= 0
      and s.score <= v_max_score
      and p.username is not null
      and p.username not like 'player_%'
  ),
  player_bests as (
    select
      r.user_id,
      r.score as best_score,
      r.created_at as achieved_at
    from valid_scores r
    where r.rn = 1
  ),
  leaderboard as (
    select
      dense_rank() over (order by b.best_score desc, b.achieved_at asc) as player_rank,
      b.user_id,
      b.best_score
    from player_bests b
  )
  select
    l.player_rank as rank,
    l.best_score,
    (select count(*)::bigint from player_bests) as total_players
  from leaderboard l
  where l.user_id = p_user_id;
end;
$$ language plpgsql stable security definer set search_path = public;

-- ----------------------------------------------------------------------------
-- 5. GRANT PERMISSIONS
-- ----------------------------------------------------------------------------

grant execute on function public.get_game_leaderboard(text, int) to anon, authenticated;
grant execute on function public.get_user_game_rank(text, uuid) to anon, authenticated;
