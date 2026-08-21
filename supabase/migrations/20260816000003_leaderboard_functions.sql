-- ============================================================================
-- ONE MORE RUSH — Phase 6C Global Leaderboard RPC & Aggregation Functions
-- Efficient database-level ranking aggregation (One Best Score per Player)
-- ============================================================================

-- 1. Function: Get Top Leaderboard for a Game (1 Entry per Player)
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
begin
  return query
  with ranked_scores as (
    select
      s.user_id,
      s.score,
      s.created_at,
      row_number() over (partition by s.user_id order by s.score desc, s.created_at asc) as rn
    from public.game_scores s
    where s.game_id = p_game_id
  ),
  player_bests as (
    select
      r.user_id,
      r.score as best_score,
      r.created_at as achieved_at
    from ranked_scores r
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
  order by rank asc, b.achieved_at asc
  limit p_limit;
end;
$$ language plpgsql stable security definer set search_path = public;

-- 2. Function: Get Specific User's Rank and Best Score for a Game
create or replace function public.get_user_game_rank(p_game_id text, p_user_id uuid)
returns table (
  rank bigint,
  best_score bigint,
  total_players bigint
) as $$
begin
  return query
  with ranked_scores as (
    select
      s.user_id,
      s.score,
      s.created_at,
      row_number() over (partition by s.user_id order by s.score desc, s.created_at asc) as rn
    from public.game_scores s
    where s.game_id = p_game_id
  ),
  player_bests as (
    select
      r.user_id,
      r.score as best_score,
      r.created_at as achieved_at
    from ranked_scores r
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

-- 3. Grant Execute Permissions to API Roles
grant execute on function public.get_game_leaderboard(text, int) to anon, authenticated;
grant execute on function public.get_user_game_rank(text, uuid) to anon, authenticated;
