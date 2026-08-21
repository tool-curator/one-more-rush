-- ============================================================================
-- ONE MORE RUSH — Migration 00024: Leaderboard Threshold Calibration
-- Forward production migration: Calibrates score plausibility thresholds across
-- all six arcade games to accommodate high-skill gameplay (combos, frenzy multipliers,
-- endless survival, flow mode) while maintaining strict anti-cheat and numeric integrity.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. UPDATE TABLE CHECK CONSTRAINT (DEFENSE IN DEPTH)
-- ----------------------------------------------------------------------------

alter table public.game_scores
  drop constraint if exists chk_game_scores_valid_score;

alter table public.game_scores
  add constraint chk_game_scores_valid_score
  check (
    score >= 0
    and score <= case game_id
      when 'aim' then 10000000          -- 10,000,000 (10M)
      when 'dodge' then 50000000        -- 50,000,000 (50M)
      when 'stack' then 10000000        -- 10,000,000 (10M)
      when 'number-rush' then 5000000   -- 5,000,000 (5M)
      when 'memory' then 5000000        -- 5,000,000 (5M)
      when 'color-maze' then 1000000    -- 1,000,000 (1M)
      else 0
    end
  );

-- ----------------------------------------------------------------------------
-- 2. UPDATE SERVER-AUTHORITATIVE submit_game_score RPC
-- ----------------------------------------------------------------------------

create or replace function public.submit_game_score(
  p_game_id text,
  p_score bigint,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb as $$
declare
  v_user_id uuid := auth.uid();
  v_username text;
  v_prev_best bigint;
  v_max_score bigint;
  v_score_id uuid;
begin
  -- Step 1: Authentication Check (Client session cannot forge identity)
  if v_user_id is null then
    return jsonb_build_object(
      'submitted', false,
      'reason', 'GUEST_USER',
      'message', 'Authentication required to submit global leaderboard scores'
    );
  end if;

  -- Step 2: Game Identifier Validation (Strict whitelist)
  if p_game_id not in ('aim', 'dodge', 'stack', 'number-rush', 'memory', 'color-maze') then
    return jsonb_build_object(
      'submitted', false,
      'reason', 'INVALID_GAME_ID',
      'message', 'Invalid game identifier: ' || coalesce(p_game_id, 'NULL')
    );
  end if;

  -- Step 3: Numeric Type and Range Validation
  if p_score is null or p_score < 0 then
    return jsonb_build_object(
      'submitted', false,
      'reason', 'INVALID_SCORE',
      'message', 'Score must be a non-negative integer'
    );
  end if;

  -- Step 4: Game-Specific Maximum Score Plausibility Thresholds (Calibrated)
  case p_game_id
    when 'aim' then v_max_score := 10000000;          -- 10M
    when 'dodge' then v_max_score := 50000000;        -- 50M
    when 'stack' then v_max_score := 10000000;        -- 10M
    when 'number-rush' then v_max_score := 5000000;   -- 5M
    when 'memory' then v_max_score := 5000000;        -- 5M
    when 'color-maze' then v_max_score := 1000000;    -- 1M
    else v_max_score := 1000000;
  end case;

  if p_score > v_max_score then
    return jsonb_build_object(
      'submitted', false,
      'reason', 'EXCEEDS_MAX_SCORE',
      'max_allowed', v_max_score,
      'submitted_score', p_score,
      'message', 'Score exceeds maximum plausible threshold for ' || p_game_id
    );
  end if;

  -- Step 5: Onboarding / Username Verification
  select username into v_username
  from public.profiles
  where id = v_user_id;

  if v_username is null or v_username like 'player_%' then
    return jsonb_build_object(
      'submitted', false,
      'reason', 'PLACEHOLDER_USERNAME',
      'message', 'Custom username required before appearing on global leaderboards'
    );
  end if;

  -- Step 6: Acquire Transaction-Scoped Advisory Lock
  perform pg_advisory_xact_lock(hashtext(v_user_id::text), hashtext(p_game_id));

  -- Step 7: Check Existing Personal Best
  select score into v_prev_best
  from public.game_scores
  where user_id = v_user_id and game_id = p_game_id
  order by score desc
  limit 1;

  if v_prev_best is not null and p_score <= v_prev_best then
    return jsonb_build_object(
      'submitted', false,
      'reason', 'NOT_PERSONAL_BEST',
      'is_new_personal_best', false,
      'score', p_score,
      'prev_best', v_prev_best,
      'message', 'Score does not exceed current personal best'
    );
  end if;

  -- Step 8: Authorized Insert
  insert into public.game_scores (
    user_id,
    game_id,
    score,
    metadata
  )
  values (
    v_user_id,
    p_game_id,
    p_score,
    case
      when jsonb_typeof(p_metadata) = 'object' then p_metadata
      else '{}'::jsonb
    end
  )
  returning id into v_score_id;

  return jsonb_build_object(
    'submitted', true,
    'is_new_personal_best', true,
    'score', p_score,
    'score_id', v_score_id,
    'prev_best', coalesce(v_prev_best, 0),
    'message', 'Personal best score successfully recorded on global leaderboard'
  );
end;
$$ language plpgsql security definer set search_path = public;

-- ----------------------------------------------------------------------------
-- 3. UPDATE get_game_leaderboard RPC
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
    when 'aim' then v_max_score := 10000000;
    when 'dodge' then v_max_score := 50000000;
    when 'stack' then v_max_score := 10000000;
    when 'number-rush' then v_max_score := 5000000;
    when 'memory' then v_max_score := 5000000;
    when 'color-maze' then v_max_score := 1000000;
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
-- 4. UPDATE get_user_game_rank RPC
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

  select p.username into v_username
  from public.profiles p
  where p.id = p_user_id;

  if v_username is null or v_username like 'player_%' then
    return;
  end if;

  case p_game_id
    when 'aim' then v_max_score := 10000000;
    when 'dodge' then v_max_score := 50000000;
    when 'stack' then v_max_score := 10000000;
    when 'number-rush' then v_max_score := 5000000;
    when 'memory' then v_max_score := 5000000;
    when 'color-maze' then v_max_score := 1000000;
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
-- 5. PERMISSIONS
-- ----------------------------------------------------------------------------

grant execute on function public.submit_game_score(text, bigint, jsonb) to authenticated;
revoke execute on function public.submit_game_score(text, bigint, jsonb) from anon, public;

grant execute on function public.get_game_leaderboard(text, int) to anon, authenticated;
grant execute on function public.get_user_game_rank(text, uuid) to anon, authenticated;
