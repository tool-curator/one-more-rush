-- ============================================================================
-- ONE MORE RUSH — Migration 00019: Remove Obsolete 3-Argument Daily Challenge RPC Overload
-- Drops the obsolete public.claim_daily_challenge_reward(text, text, jsonb) overload
-- so that public.claim_daily_challenge_reward(text, text, jsonb, uuid) is the sole
-- active and callable RPC for Daily Challenge reward claims.
-- ============================================================================

-- 1. Safely drop obsolete 3-argument function overload
drop function if exists public.claim_daily_challenge_reward(text, text, jsonb);

-- 2. Explicitly ensure privileges on sole 4-argument function
revoke all on function public.claim_daily_challenge_reward(text, text, jsonb, uuid) from public, anon;
grant execute on function public.claim_daily_challenge_reward(text, text, jsonb, uuid) to authenticated;
