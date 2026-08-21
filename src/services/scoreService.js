/**
 * ONE MORE RUSH — Score Submission & Global Leaderboard Service (Phase 6C)
 * Connects authenticated arcade runs to Supabase public.game_scores & aggregates global rankings.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase.js';

export const SUPPORTED_GAMES = ['aim', 'dodge', 'stack', 'number-rush', 'memory', 'color-maze'];

export const MAX_SCORE_THRESHOLDS = {
  aim: 10000000,          // 10,000,000 (10M)
  dodge: 50000000,        // 50,000,000 (50M)
  stack: 10000000,        // 10,000,000 (10M)
  'number-rush': 5000000, // 5,000,000 (5M)
  memory: 5000000,        // 5,000,000 (5M)
  'color-maze': 1000000,  // 1,000,000 (1M)
};

export const GAME_RANKING_CONFIG = {
  aim: { direction: 'DESC', label: 'HIGHER IS BETTER', scoreUnit: 'PTS', title: 'AIM' },
  dodge: { direction: 'DESC', label: 'HIGHER IS BETTER', scoreUnit: 'PTS', title: 'DODGE' },
  stack: { direction: 'DESC', label: 'HIGHER IS BETTER', scoreUnit: 'PTS', title: 'STACK' },
  'number-rush': { direction: 'DESC', label: 'HIGHER IS BETTER', scoreUnit: 'PTS', title: 'NUMBER RUSH' },
  memory: { direction: 'DESC', label: 'HIGHER IS BETTER', scoreUnit: 'PTS', title: 'MEMORY' },
  'color-maze': { direction: 'DESC', label: 'HIGHER IS BETTER', scoreUnit: 'PTS', title: 'COLOR MAZE' },
};

/**
 * Submits an authenticated arcade run score to Supabase public.game_scores via server-authoritative RPC
 */
export async function submitGameScore({ gameId, score, metadata = {} }) {
  if (!isSupabaseConfigured || !supabase) {
    return { submitted: false, reason: 'SUPABASE_NOT_CONFIGURED' };
  }

  console.log(`[ScorePipeline:submitGameScore] Invoked for ${gameId} with raw score:`, score, 'metadata:', metadata);

  // 1. Strict Game Identifier Whitelist
  if (!SUPPORTED_GAMES.includes(gameId)) {
    console.warn(`[ScorePipeline:submitGameScore] Rejected: INVALID_GAME_ID (${gameId})`);
    return { submitted: false, reason: 'INVALID_GAME_ID' };
  }

  // 2. Strict Numeric Type Integrity & Non-Negative Validation
  if (score === null || score === undefined || typeof score === 'boolean' || Array.isArray(score) || typeof score === 'object') {
    console.warn('[ScorePipeline:submitGameScore] Rejected: INVALID_SCORE type:', typeof score, score);
    return { submitted: false, reason: 'INVALID_SCORE' };
  }

  const numericScore = Number(score);
  if (!Number.isFinite(numericScore) || isNaN(numericScore) || numericScore < 0 || !Number.isInteger(numericScore)) {
    console.warn('[ScorePipeline:submitGameScore] Rejected: INVALID_SCORE non-integer/finite/negative:', numericScore);
    return { submitted: false, reason: 'INVALID_SCORE' };
  }

  // 3. Game-Specific Maximum Score Plausibility Barrier
  const maxAllowed = MAX_SCORE_THRESHOLDS[gameId] || 100000;
  console.log(`[ScorePipeline:submitGameScore] Threshold check for ${gameId}: score=${numericScore}, maxAllowed=${maxAllowed}`);
  if (numericScore > maxAllowed) {
    console.warn(`[ScorePipeline:submitGameScore] Rejected: EXCEEDS_MAX_SCORE (score=${numericScore} > maxAllowed=${maxAllowed})`);
    return {
      submitted: false,
      reason: 'EXCEEDS_MAX_SCORE',
      maxAllowed,
      score: numericScore,
    };
  }

  const safeIntegerScore = numericScore;

  // 4. Sanitize Metadata Payload
  const sanitizedMetadata = (typeof metadata === 'object' && metadata !== null && !Array.isArray(metadata))
    ? metadata
    : {};

  try {
    // 5. Authoritative Session Identity Verification
    const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
    if (sessionErr) {
      console.warn('[ScorePipeline:submitGameScore] Auth getSession error:', sessionErr);
    }
    if (!session || !session.user) {
      console.warn('[ScorePipeline:submitGameScore] Rejected: GUEST_USER (No active authenticated Supabase session)');
      return { submitted: false, reason: 'GUEST_USER' };
    }

    const userId = session.user.id;
    console.log(`[ScorePipeline:submitGameScore] Calling Supabase RPC 'submit_game_score' for user ${userId}, game ${gameId}, score ${safeIntegerScore}...`);

    // 6. Execute Server-Authoritative RPC (submit_game_score)
    const { data: rpcData, error: rpcError } = await supabase.rpc('submit_game_score', {
      p_game_id: gameId,
      p_score: safeIntegerScore,
      p_metadata: sanitizedMetadata,
    });

    if (rpcError) {
      console.error('[ScorePipeline:submitGameScore] Supabase RPC returned error:', rpcError.message, rpcError);
      return {
        submitted: false,
        reason: 'DATABASE_ERROR',
        error: rpcError.message,
      };
    }

    console.log('[ScorePipeline:submitGameScore] Supabase RPC returned response:', rpcData);

    if (rpcData && typeof rpcData === 'object') {
      return {
        submitted: Boolean(rpcData.submitted),
        isNewPersonalBest: Boolean(rpcData.is_new_personal_best),
        score: safeIntegerScore,
        scoreId: rpcData.score_id,
        prevBest: Number(rpcData.prev_best || 0),
        reason: rpcData.reason,
        message: rpcData.message,
      };
    }

    return {
      submitted: false,
      reason: 'UNEXPECTED_RESPONSE',
    };
  } catch (err) {
    console.error('[ScorePipeline:submitGameScore] Exception during submission:', err);
    return { submitted: false, reason: 'NETWORK_ERROR', error: err.message };
  }
}

/**
 * Fetches top global leaderboard entries for a given game (1 best entry per player)
 * Server-authoritative RPC exclusively — zero raw table query fallback
 */
export async function fetchLeaderboard(gameId, limit = 50) {
  if (!isSupabaseConfigured || !supabase) {
    return { entries: [], error: null, source: 'EMPTY_OFFLINE' };
  }

  if (!SUPPORTED_GAMES.includes(gameId)) {
    return { entries: [], error: 'Invalid game identifier', source: 'INVALID_GAME_ID' };
  }

  try {
    // Authoritative Server RPC: get_game_leaderboard
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_game_leaderboard', {
      p_game_id: gameId,
      p_limit: limit,
    });

    if (rpcError) {
      console.warn('Leaderboard fetch RPC warning:', rpcError.message);
      return { entries: [], error: rpcError.message, source: 'RPC_ERROR' };
    }

    if (Array.isArray(rpcData)) {
      return {
        entries: rpcData.map((item) => ({
          rank: Number(item.rank),
          userId: item.user_id,
          username: item.username || 'Player',
          displayName: item.display_name || 'Player',
          avatarFrame: item.avatar_frame || 'classic',
          title: item.title || 'rookie',
          victoryEffect: item.victory_effect || 'none',
          score: Number(item.best_score),
          achievedAt: item.achieved_at,
        })),
        error: null,
        source: 'RPC',
      };
    }

    return { entries: [], error: null, source: 'EMPTY' };
  } catch (err) {
    return { entries: [], error: err.message, source: 'EXCEPTION' };
  }
}

/**
 * Fetches the user's best submitted score and global rank for a game
 * Server-authoritative RPC exclusively
 */
export async function fetchUserGameRank(gameId, userId) {
  if (!isSupabaseConfigured || !supabase || !userId || !SUPPORTED_GAMES.includes(gameId)) {
    return { rank: null, bestScore: null, totalPlayers: 0 };
  }

  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_user_game_rank', {
      p_game_id: gameId,
      p_user_id: userId,
    });

    if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0) {
      return {
        rank: Number(rpcData[0].rank),
        bestScore: Number(rpcData[0].best_score),
        totalPlayers: Number(rpcData[0].total_players),
      };
    }

    return { rank: null, bestScore: null, totalPlayers: 0 };
  } catch (err) {
    return { rank: null, bestScore: null, totalPlayers: 0 };
  }
}
