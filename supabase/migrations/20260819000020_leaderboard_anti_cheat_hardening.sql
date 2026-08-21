-- ============================================================================
-- ONE MORE RUSH — Migration 00020: Leaderboard Anti-Cheat & Score Integrity Hardening
-- Implements Server-Authoritative Score Submission RPC, Database Type & Range Checks,
-- Atomic Concurrency Protection, and Direct Table INSERT Revocation
-- ============================================================================

-- 1. Create Server-Authoritative Score Submission RPC
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

  -- Step 4: Game-Specific Maximum Score Plausibility Thresholds
  case p_game_id
    when 'aim' then v_max_score := 100000;
    when 'dodge' then v_max_score := 250000;
    when 'stack' then v_max_score := 150000;
    when 'number-rush' then v_max_score := 100000;
    when 'memory' then v_max_score := 100000;
    when 'color-maze' then v_max_score := 100000;
    else v_max_score := 100000;
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
  -- Deterministically serializes submissions for (user_id, game_id) across concurrent transactions,
  -- perfectly protecting both initial submissions (0 rows) and subsequent personal-best updates.
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

  -- Step 7: Authorized Insert
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

-- 2. Revoke Direct Table INSERT from public/authenticated (Closes direct client INSERT vulnerability)
revoke insert on table public.game_scores from anon, authenticated, public;

-- 3. Grant Execute on Authorized RPC
grant execute on function public.submit_game_score(text, bigint, jsonb) to authenticated;
revoke execute on function public.submit_game_score(text, bigint, jsonb) from anon, public;
