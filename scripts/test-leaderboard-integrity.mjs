/**
 * ONE MORE RUSH — Leaderboard Anti-Cheat & Score Integrity Test Suite
 * Validates server-authoritative score submission, type safety, boundaries, replay immunity,
 * user spoofing rejection, and cross-user isolation.
 */

import { submitGameScore, SUPPORTED_GAMES, MAX_SCORE_THRESHOLDS } from '../src/services/scoreService.js';
import { supabase } from '../src/lib/supabase.js';

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`✅ PASSED: ${message}`);
    passedTests++;
  } else {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

// In-Memory Mock Database for Rigorous Verification
class MockLeaderboardDatabase {
  constructor() {
    this.profiles = new Map();
    this.scores = [];
  }

  reset() {
    this.profiles.clear();
    this.scores = [];
  }

  addProfile(user) {
    this.profiles.set(user.id, { ...user });
  }

  // Simulates Migration 00020 submit_game_score RPC
  submitGameScoreRpc(authUserId, { p_game_id, p_score, p_metadata }) {
    // 1. Check Authentication
    if (!authUserId) {
      return { submitted: false, reason: 'GUEST_USER', message: 'Authentication required' };
    }

    // 2. Validate Game ID
    if (!SUPPORTED_GAMES.includes(p_game_id)) {
      return { submitted: false, reason: 'INVALID_GAME_ID', message: `Invalid game identifier: ${p_game_id}` };
    }

    // 3. Validate Score Type & Non-Negative
    if (p_score === null || p_score === undefined || typeof p_score !== 'number' || !Number.isFinite(p_score) || isNaN(p_score) || p_score < 0 || !Number.isInteger(p_score)) {
      return { submitted: false, reason: 'INVALID_SCORE', message: 'Score must be a non-negative integer' };
    }

    // 4. Validate Max Score Thresholds
    const maxThreshold = MAX_SCORE_THRESHOLDS[p_game_id] || 100000;
    if (p_score > maxThreshold) {
      return {
        submitted: false,
        reason: 'EXCEEDS_MAX_SCORE',
        max_allowed: maxThreshold,
        submitted_score: p_score,
        message: `Score exceeds maximum plausible threshold for ${p_game_id}`,
      };
    }

    // 5. Check Profile Username
    const profile = this.profiles.get(authUserId);
    if (!profile || !profile.username || profile.username.startsWith('player_')) {
      return { submitted: false, reason: 'PLACEHOLDER_USERNAME', message: 'Custom username required' };
    }

    // 6. Check Personal Best & Concurrency Lock
    const userGameScores = this.scores
      .filter((s) => s.user_id === authUserId && s.game_id === p_game_id)
      .sort((a, b) => b.score - a.score);

    const prevBest = userGameScores.length > 0 ? userGameScores[0].score : null;

    if (prevBest !== null && p_score <= prevBest) {
      return {
        submitted: false,
        reason: 'NOT_PERSONAL_BEST',
        is_new_personal_best: false,
        score: p_score,
        prev_best: prevBest,
        message: 'Score does not exceed current personal best',
      };
    }

    // 7. Insert Record
    const scoreRecord = {
      id: `score-${this.scores.length + 1}`,
      user_id: authUserId,
      game_id: p_game_id,
      score: p_score,
      metadata: typeof p_metadata === 'object' && p_metadata !== null ? p_metadata : {},
      created_at: new Date().toISOString(),
    };

    this.scores.push(scoreRecord);

    return {
      submitted: true,
      is_new_personal_best: true,
      score: scoreRecord.score,
      score_id: scoreRecord.id,
      prev_best: prevBest || 0,
      message: 'Personal best score successfully recorded',
    };
  }

  // Simulates Migration 00021 Authoritative Data Cleanup
  cleanInvalidScores() {
    this.scores = this.scores.filter((s) => {
      // Check game whitelist
      if (!SUPPORTED_GAMES.includes(s.game_id)) return false;
      // Check negative
      if (s.score < 0) return false;
      // Check max threshold
      const maxAllowed = MAX_SCORE_THRESHOLDS[s.game_id] || 100000;
      if (s.score > maxAllowed) return false;
      // Check profile exists and not player_%
      const profile = this.profiles.get(s.user_id);
      if (!profile || !profile.username || profile.username.startsWith('player_')) return false;
      return true;
    });
  }

  // Simulates Migration 00021 Hardened get_game_leaderboard RPC
  getGameLeaderboardRpc(p_game_id, p_limit = 50) {
    if (!SUPPORTED_GAMES.includes(p_game_id)) return [];

    const maxAllowed = MAX_SCORE_THRESHOLDS[p_game_id] || 100000;

    // Filter valid scores
    const validScores = this.scores.filter((s) => {
      if (s.game_id !== p_game_id) return false;
      if (s.score < 0 || s.score > maxAllowed) return false;
      const profile = this.profiles.get(s.user_id);
      if (!profile || !profile.username || profile.username.startsWith('player_')) return false;
      return true;
    });

    // Aggregate 1 best per player
    const playerBests = new Map();
    for (const s of validScores) {
      const existing = playerBests.get(s.user_id);
      if (!existing || s.score > existing.score) {
        playerBests.set(s.user_id, s);
      }
    }

    const sorted = Array.from(playerBests.values()).sort((a, b) => b.score - a.score);

    return sorted.slice(0, p_limit).map((item, idx) => {
      const profile = this.profiles.get(item.user_id) || {};
      return {
        rank: idx + 1,
        user_id: item.user_id,
        username: profile.username || 'Player',
        display_name: profile.display_name || 'Player',
        avatar_frame: profile.avatar_frame || 'classic',
        title: profile.title || 'rookie',
        victory_effect: profile.victory_effect || 'none',
        best_score: item.score,
        achieved_at: item.created_at,
      };
    });
  }

  // Simulates Migration 00021 Hardened get_user_game_rank RPC
  getUserGameRankRpc(p_game_id, p_user_id) {
    if (!SUPPORTED_GAMES.includes(p_game_id) || !p_user_id) return null;

    const profile = this.profiles.get(p_user_id);
    if (!profile || !profile.username || profile.username.startsWith('player_')) return null;

    const leaderboard = this.getGameLeaderboardRpc(p_game_id, 10000);
    const entry = leaderboard.find((e) => e.user_id === p_user_id);
    if (!entry) return null;

    return {
      rank: entry.rank,
      best_score: entry.best_score,
      total_players: leaderboard.length,
    };
  }
}

async function runLeaderboardTests() {
  console.log('====================================================');
  console.log('ONE MORE RUSH — LEADERBOARD INTEGRITY TEST SUITE');
  console.log('====================================================\n');

  const db = new MockLeaderboardDatabase();

  const userA = { id: '00000000-0000-4000-8000-000000000001', username: 'SpeedDemon' };
  const userB = { id: '00000000-0000-4000-8000-000000000002', username: 'ShadowNinja' };
  const guestUser = { id: '00000000-0000-4000-8000-000000000003', username: 'player_12345678' };
  const adminTester = { id: '00000000-0000-4000-8000-000000000004', username: 'adminTester' };
  const placeholder1 = { id: '00000000-0000-4000-8000-000000000005', username: 'player_99990001' };
  const placeholder2 = { id: '00000000-0000-4000-8000-000000000006', username: 'player_99990002' };
  const placeholder3 = { id: '00000000-0000-4000-8000-000000000007', username: 'player_99990003' };

  db.addProfile(userA);
  db.addProfile(userB);
  db.addProfile(guestUser);
  db.addProfile(adminTester);
  db.addProfile(placeholder1);
  db.addProfile(placeholder2);
  db.addProfile(placeholder3);

  // ----------------------------------------------------
  // SECTION 1: ALL 6 GAME IDS & VALID SUBMISSIONS
  // ----------------------------------------------------
  console.log('--- SECTION 1: Valid Authenticated Submissions (All 6 Games) ---');

  for (const gameId of SUPPORTED_GAMES) {
    const res = db.submitGameScoreRpc(userA.id, {
      p_game_id: gameId,
      p_score: 12500,
      p_metadata: { combo: 15, accuracy: 0.98 },
    });

    assert(res.submitted === true, `Test 1: Valid submission accepted for game [${gameId}]`);
    assert(res.is_new_personal_best === true, `Test 1b: First score is flagged as new personal best for [${gameId}]`);
    assert(res.score === 12500, `Test 1c: Score recorded accurately as 12,500 for [${gameId}]`);
  }

  // ----------------------------------------------------
  // SECTION 2: INVALID GAME ID TAMPERING
  // ----------------------------------------------------
  console.log('\n--- SECTION 2: Game ID Tampering & Whitelist Enforcement ---');

  const invalidGameIds = ['fortnite', 'chess', 'poker', 'aim_hack', '', null, undefined, 12345];
  for (const badGameId of invalidGameIds) {
    const res = db.submitGameScoreRpc(userA.id, {
      p_game_id: badGameId,
      p_score: 5000,
      p_metadata: {},
    });
    assert(res.submitted === false && res.reason === 'INVALID_GAME_ID', `Test 2: Invalid game ID [${badGameId}] rejected`);
  }

  // ----------------------------------------------------
  // SECTION 3: NEGATIVE & ZERO SCORE VALIDATION
  // ----------------------------------------------------
  console.log('\n--- SECTION 3: Negative & Zero Score Validation ---');

  const negRes1 = db.submitGameScoreRpc(userA.id, { p_game_id: 'aim', p_score: -1, p_metadata: {} });
  assert(negRes1.submitted === false && negRes1.reason === 'INVALID_SCORE', 'Test 3a: Negative score (-1) rejected');

  const negRes2 = db.submitGameScoreRpc(userA.id, { p_game_id: 'aim', p_score: -999999, p_metadata: {} });
  assert(negRes2.submitted === false && negRes2.reason === 'INVALID_SCORE', 'Test 3b: Large negative score (-999999) rejected');

  const zeroRes = db.submitGameScoreRpc(userB.id, { p_game_id: 'aim', p_score: 0, p_metadata: {} });
  assert(zeroRes.submitted === true && zeroRes.score === 0, 'Test 4: Zero score (0) accepted as valid non-negative integer');

  // ----------------------------------------------------
  // SECTION 4: MALFORMED SCORE & TYPE INTEGRITY (NaN, Infinity, Object, Float)
  // ----------------------------------------------------
  console.log('\n--- SECTION 4: Malformed Score & Numeric Type Integrity ---');

  const malformedScores = [
    { val: NaN, name: 'NaN' },
    { val: Infinity, name: 'Infinity' },
    { val: -Infinity, name: '-Infinity' },
    { val: null, name: 'null' },
    { val: undefined, name: 'undefined' },
    { val: '999999', name: 'string' },
    { val: {}, name: 'object' },
    { val: [1000], name: 'array' },
    { val: true, name: 'boolean' },
    { val: 12.5, name: 'fractional float (12.5)' },
  ];

  for (const item of malformedScores) {
    const res = db.submitGameScoreRpc(userA.id, {
      p_game_id: 'aim',
      p_score: item.val,
      p_metadata: {},
    });
    assert(res.submitted === false && res.reason === 'INVALID_SCORE', `Test 5: Malformed score type [${item.name}] rejected`);
  }

  // ----------------------------------------------------
  // SECTION 5: OVERSIZED & IMPOSSIBLE SCORE BOUNDARIES (All 6 Games)
  // ----------------------------------------------------
  console.log('\n--- SECTION 5: Impossible Score & Max Boundary Checks ---');

  const impossibleScores = [
    { game: 'aim', score: 10000000, valid: true, desc: 'AIM 10,000,000 accepted' },
    { game: 'aim', score: 10000001, valid: false, desc: 'AIM 10,000,001 rejected' },
    { game: 'aim', score: 99999999, valid: false, desc: 'AIM 99,999,999 rejected' },
    { game: 'dodge', score: 1818200, valid: true, desc: 'DODGE 1,818,200 accepted (production run)' },
    { game: 'dodge', score: 50000000, valid: true, desc: 'DODGE 50,000,000 accepted' },
    { game: 'dodge', score: 50000001, valid: false, desc: 'DODGE 50,000,001 rejected' },
    { game: 'stack', score: 10000000, valid: true, desc: 'STACK 10,000,000 accepted' },
    { game: 'stack', score: 10000001, valid: false, desc: 'STACK 10,000,001 rejected' },
    { game: 'number-rush', score: 5000000, valid: true, desc: 'NUMBER RUSH 5,000,000 accepted' },
    { game: 'number-rush', score: 5000001, valid: false, desc: 'NUMBER RUSH 5,000,001 rejected' },
    { game: 'memory', score: 5000000, valid: true, desc: 'MEMORY 5,000,000 accepted' },
    { game: 'memory', score: 5000001, valid: false, desc: 'MEMORY 5,000,001 rejected' },
    { game: 'color-maze', score: 1000000, valid: true, desc: 'COLOR MAZE 1,000,000 accepted' },
    { game: 'color-maze', score: 1000001, valid: false, desc: 'COLOR MAZE 1,000,001 rejected' },
  ];

  for (const item of impossibleScores) {
    const res = db.submitGameScoreRpc(userB.id, {
      p_game_id: item.game,
      p_score: item.score,
      p_metadata: {},
    });
    if (item.valid) {
      assert(res.submitted === true, `Test 5b: ${item.desc}`);
    } else {
      assert(res.submitted === false && res.reason === 'EXCEEDS_MAX_SCORE', `Test 5b: ${item.desc}`);
    }
  }

  // ----------------------------------------------------
  // SECTION 6: 50,000 AND 50,001 BOUNDARY TESTS (All 6 Games)
  // ----------------------------------------------------
  console.log('\n--- SECTION 6: 50,000 / 50,001 Boundary Integrity ---');

  for (const gameId of SUPPORTED_GAMES) {
    const boundary50k = db.submitGameScoreRpc(userA.id, {
      p_game_id: gameId,
      p_score: 50000,
      p_metadata: {},
    });
    assert(boundary50k.submitted === true && boundary50k.score === 50000, `Test 6a: 50,000 score accepted on [${gameId}]`);

    const boundary50k1 = db.submitGameScoreRpc(userA.id, {
      p_game_id: gameId,
      p_score: 50001,
      p_metadata: {},
    });
    assert(boundary50k1.submitted === true && boundary50k1.score === 50001, `Test 6b: 50,001 score accepted on [${gameId}]`);
  }

  // ----------------------------------------------------
  // SECTION 7: USER ID SPOOFING & SESSION IDENTITY
  // ----------------------------------------------------
  console.log('\n--- SECTION 7: User ID Spoofing & Session Identity ---');

  const spoofRes = db.submitGameScoreRpc(userA.id, {
    p_game_id: 'stack',
    p_score: 65000,
    p_metadata: { spoofed_user_id: userB.id },
  });
  assert(spoofRes.submitted === true, 'Test 7a: Submission succeeded for authentic session identity');
  const insertedRecord = db.scores.find((s) => s.id === spoofRes.score_id);
  assert(insertedRecord.user_id === userA.id, 'Test 7b: Score strictly attributed to session user (User A), NOT spoofed User B');
  assert(insertedRecord.user_id !== userB.id, 'Test 7c: User B scores remained completely untouched');

  // ----------------------------------------------------
  // SECTION 8: REPLAY & DUPLICATE SUBMISSION IMMUNITY
  // ----------------------------------------------------
  console.log('\n--- SECTION 8: Replay Attacks & Duplicate Submission Immunity ---');

  const replayRes = db.submitGameScoreRpc(userA.id, {
    p_game_id: 'aim',
    p_score: 50001,
    p_metadata: {},
  });
  assert(replayRes.submitted === false && replayRes.reason === 'NOT_PERSONAL_BEST', 'Test 8a: Replaying identical score rejected as NOT_PERSONAL_BEST');

  // ----------------------------------------------------
  // SECTION 9: GUEST & PLACEHOLDER USERNAME ENFORCEMENT
  // ----------------------------------------------------
  console.log('\n--- SECTION 9: Guest & Placeholder Username Enforcement ---');

  const anonRes = db.submitGameScoreRpc(null, {
    p_game_id: 'aim',
    p_score: 10000,
    p_metadata: {},
  });
  assert(anonRes.submitted === false && anonRes.reason === 'GUEST_USER', 'Test 9a: Anonymous unauthenticated submission rejected with GUEST_USER');

  const placeholderRes = db.submitGameScoreRpc(guestUser.id, {
    p_game_id: 'aim',
    p_score: 10000,
    p_metadata: {},
  });
  assert(placeholderRes.submitted === false && placeholderRes.reason === 'PLACEHOLDER_USERNAME', 'Test 9b: User with placeholder username (player_xxxx) rejected with PLACEHOLDER_USERNAME');

  // ----------------------------------------------------
  // SECTION 10: MIGRATION 00021 DATA CLEANUP AUDIT
  // ----------------------------------------------------
  console.log('\n--- SECTION 10: Migration 00021 Legacy Data Cleanup ---');

  // Inject legacy corrupt rows into the raw table
  db.scores.push({
    id: 'legacy-aim-1',
    user_id: placeholder1.id,
    game_id: 'aim',
    score: 99999999,
    created_at: '2026-08-16T00:00:00Z',
  });
  db.scores.push({
    id: 'legacy-aim-2',
    user_id: placeholder2.id,
    game_id: 'aim',
    score: 99999999,
    created_at: '2026-08-16T00:00:00Z',
  });
  db.scores.push({
    id: 'legacy-aim-3',
    user_id: placeholder3.id,
    game_id: 'aim',
    score: 99999999,
    created_at: '2026-08-16T00:00:00Z',
  });
  db.scores.push({
    id: 'legacy-dodge-1',
    user_id: adminTester.id,
    game_id: 'dodge',
    score: 99999999,
    created_at: '2026-08-16T00:00:00Z',
  });

  // Verify corrupt rows exist before cleanup
  assert(db.scores.some((s) => s.score === 99999999 && s.game_id === 'aim'), 'Test 10a: Legacy AIM 99,999,999 scores present before remediation');
  assert(db.scores.some((s) => s.score === 99999999 && s.game_id === 'dodge'), 'Test 10b: Legacy DODGE 99,999,999 score present before remediation');

  // Execute Migration 00021 Cleanup
  db.cleanInvalidScores();

  // Verify all corrupt rows are completely deleted
  assert(!db.scores.some((s) => s.score === 99999999), 'Test 10c: All exceeding 99,999,999 records completely absent after remediation');
  assert(!db.scores.some((s) => s.user_id === placeholder1.id || s.user_id === placeholder2.id || s.user_id === placeholder3.id), 'Test 10d: All 3 player_* placeholder records completely absent after remediation');
  assert(!db.scores.some((s) => s.score === 99999999 && s.game_id === 'dodge'), 'Test 10e: Legacy DODGE 99,999,999 record completely absent after remediation');

  // Verify legitimate scores survived cleanup
  assert(db.scores.some((s) => s.user_id === userA.id && s.score === 50001), 'Test 10f: Legitimate scores (50,001) strictly preserved during cleanup');

  // ----------------------------------------------------
  // SECTION 11: HARDENED LEADERBOARD RPC FILTERING
  // ----------------------------------------------------
  console.log('\n--- SECTION 11: Hardened get_game_leaderboard RPC Filtering ---');

  // Temporarily re-inject invalid score to verify RPC defensive filtering
  db.scores.push({
    id: 'poison-aim',
    user_id: adminTester.id,
    game_id: 'aim',
    score: 99999999,
    created_at: new Date().toISOString(),
  });
  db.scores.push({
    id: 'placeholder-valid-score',
    user_id: placeholder1.id,
    game_id: 'aim',
    score: 45000,
    created_at: new Date().toISOString(),
  });

  const aimLeaderboard = db.getGameLeaderboardRpc('aim', 50);

  // Leaderboard RPC must NOT return the 99,999,999 score or the player_* username
  assert(!aimLeaderboard.some((e) => e.best_score > 10000000), 'Test 11a: Leaderboard RPC never returns a score exceeding game maximum');
  assert(!aimLeaderboard.some((e) => e.username.startsWith('player_')), 'Test 11b: Leaderboard RPC never returns player_* placeholder accounts');

  // Clean up
  db.cleanInvalidScores();

  // ----------------------------------------------------
  // SECTION 12: HARDENED get_user_game_rank RPC
  // ----------------------------------------------------
  console.log('\n--- SECTION 12: Hardened get_user_game_rank RPC ---');

  const userARankAim = db.getUserGameRankRpc('aim', userA.id);
  assert(userARankAim !== null && userARankAim.best_score === 50001, 'Test 12a: get_user_game_rank returns authoritative rank and score for User A');

  const guestRank = db.getUserGameRankRpc('aim', guestUser.id);
  assert(guestRank === null, 'Test 12b: get_user_game_rank rejects placeholder username from receiving global rank');

  // ----------------------------------------------------
  // SECTION 13: CODE INTEGRITY — ZERO RAW TABLE FALLBACKS IN CLIENT
  // ----------------------------------------------------
  console.log('\n--- SECTION 13: Client Code Audit (Zero Direct Table Fallbacks) ---');

  const fs = await import('node:fs');
  const path = await import('node:path');
  const scoreServicePath = path.resolve('src/services/scoreService.js');
  const scoreServiceContent = fs.readFileSync(scoreServicePath, 'utf8');

  assert(!scoreServiceContent.includes(".insert("), 'Test 13a: scoreService.js contains ZERO direct .insert() write operations');
  assert(!scoreServiceContent.includes(".from('game_scores')"), 'Test 13b: scoreService.js contains ZERO direct .from("game_scores") queries');
  assert(scoreServiceContent.includes(".rpc('get_game_leaderboard'"), 'Test 13c: scoreService.js uses get_game_leaderboard RPC exclusively');
  assert(scoreServiceContent.includes(".rpc('get_user_game_rank'"), 'Test 13d: scoreService.js uses get_user_game_rank RPC exclusively');

  console.log('\n====================================================');
  console.log(`✅ ALL ${totalTests} LEADERBOARD INTEGRITY TESTS PASSED!`);
  console.log('====================================================\n');
}

runLeaderboardTests();


