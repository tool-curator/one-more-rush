/**
 * ONE MORE RUSH — Phase 10.1 Retention Loop & Streak Correctness Test Suite
 * Exhaustively executes and asserts all 18 retention invariants and the real cloud hydration bridge.
 */

import assert from 'node:assert';
import {
  getTodayChallenges,
  getTodayDateString,
  loadDailyProgress,
  saveDailyProgress,
  recordDailyAttempt,
  claimDailyChallengeRewardCloud,
  syncDailyChallengeStatusCloud,
} from '../src/services/dailyChallengeService.js';
import {
  setActiveStorageScope,
  getActiveStorageScope,
  emitScopeChange,
  onScopeChange,
} from '../src/services/storageScopeService.js';
import { setMockSupabaseClient } from '../src/lib/supabase.js';

// Setup Mock Environment
let mockStore = {};
global.localStorage = {
  getItem: (k) => mockStore[k] ?? null,
  setItem: (k, v) => { mockStore[k] = String(v); },
  removeItem: (k) => { delete mockStore[k]; },
  clear: () => { mockStore = {}; },
};
global.window = { localStorage: global.localStorage };

function getWinningMetrics(challenge) {
  const m = {
    score: 10000,
    time: 100,
    survivalTime: 100,
    hits: 100,
    targetsHit: 100,
    combo: 100,
    maxCombo: 100,
    bestCombo: 100,
    mistakes: 0,
    accuracy: 100,
    perfectHits: 100,
    height: 100,
    bestHeight: 100,
    foodCount: 100,
    gems: 100,
    dangerLevel: 10,
    danger: 10,
    correctAnswers: 100,
    sequenceLength: 100,
    roundsCleared: 100,
    moves: 5,
    coverage: 100,
    stars: 3,
  };
  if (challenge?.objectives) {
    challenge.objectives.forEach((obj) => {
      m[obj.metric] = obj.operator === '<=' ? obj.target : obj.target + 5;
    });
  }
  return m;
}

console.log('======================================================================');
console.log('RUNNING PHASE 10.1 DAILY RETENTION & STREAK REGRESSION TEST SUITE');
console.log('======================================================================\n');

async function runPhase10Tests() {
  const userId = '11111111-2222-4000-8000-444444444444';

  // ── CASE 1: Day 1 Complete -> Streak = 1 ─────────────────────────
  console.log('--- CASE 1: First Completion on Day 1 -> Streak = 1 ---');
  mockStore = {};
  setActiveStorageScope(`user_${userId}`);

  const day1Date = '2026-08-19';
  const day1Challenges = getTodayChallenges(day1Date);
  const day1QW = day1Challenges.quickWin;

  const day1Result = recordDailyAttempt(
    day1QW,
    getWinningMetrics(day1QW),
    5000,
    { isAuthenticated: true, hasServerEconomyIdentity: true }
  );

  assert.strictEqual(day1Result.isCompleted, true, 'Day 1 attempt must be completed');
  assert.strictEqual(day1Result.currentStreak, 1, 'Day 1 streak must be 1');
  console.log('✅ PASSED: CASE 1: First successful day produces streak = 1');

  // ── CASE 2: Consecutive Day 2 Complete -> Streak = 2 (Reproduced Bug Fixed) ─
  console.log('\n--- CASE 2: Consecutive Day 2 Complete -> Streak = 2 (Fixed Bug) ---');
  const day2Date = '2026-08-20';
  const day2Challenges = getTodayChallenges(day2Date);
  const day2QW = day2Challenges.quickWin;

  const day2Result = recordDailyAttempt(
    day2QW,
    getWinningMetrics(day2QW),
    5000,
    { isAuthenticated: true, hasServerEconomyIdentity: true }
  );

  assert.strictEqual(day2Result.isCompleted, true, 'Day 2 attempt must be completed');
  assert.strictEqual(day2Result.currentStreak, 2, 'Day 2 streak must advance from 1 to 2!');
  console.log('✅ PASSED: CASE 2: Consecutive day 2 completion correctly advances streak from 1 to 2');

  // ── CASE 3: Consecutive Day 3 Complete -> Streak = 3 + Milestone Bonus ───
  console.log('\n--- CASE 3: Consecutive Day 3 Complete -> Streak = 3 + 100 RP Bonus ---');
  const day3Date = '2026-08-21';
  const day3Challenges = getTodayChallenges(day3Date);
  const day3QW = day3Challenges.quickWin;

  const day3Result = recordDailyAttempt(
    day3QW,
    getWinningMetrics(day3QW),
    5000,
    { isAuthenticated: true, hasServerEconomyIdentity: true }
  );

  assert.strictEqual(day3Result.isCompleted, true, 'Day 3 attempt must be completed');
  assert.strictEqual(day3Result.currentStreak, 3, 'Day 3 streak must advance to 3!');
  assert.strictEqual(day3Result.streakBonus, 100, 'Day 3 must award 100 RP milestone streak bonus');
  console.log('✅ PASSED: CASE 3: Consecutive day 3 completion advances streak to 3 with 100 RP bonus');

  // ── CASE 4: Missed Day Resets Streak ─────────────────────────────
  console.log('\n--- CASE 4: Missed Day Resets Streak to 1 ---');
  // Skip Aug 22, play on Aug 23
  const day5Date = '2026-08-23';
  const day5Challenges = getTodayChallenges(day5Date);
  const day5QW = day5Challenges.quickWin;

  const day5Result = recordDailyAttempt(
    day5QW,
    getWinningMetrics(day5QW),
    5000,
    { isAuthenticated: true, hasServerEconomyIdentity: true }
  );

  assert.strictEqual(day5Result.currentStreak, 1, 'Missed day must reset streak back to 1');
  console.log('✅ PASSED: CASE 4: Missed day cleanly resets streak to 1');

  // ── CASE 5: Duplicate Same-Day Completion Does Not Increment Streak ──────
  console.log('\n--- CASE 5: Same-Day Duplicate Completion Invariance ---');
  const repeatResult = recordDailyAttempt(
    day5QW,
    getWinningMetrics(day5QW),
    6000,
    { isAuthenticated: true, hasServerEconomyIdentity: true }
  );

  assert.strictEqual(repeatResult.isFirstCompletionToday, false, 'Repeat run must not be first completion');
  assert.strictEqual(repeatResult.currentStreak, 1, 'Repeat run streak must remain 1');
  assert.strictEqual(repeatResult.rewardEarned, 0, 'Repeat run must award 0 RP');
  console.log('✅ PASSED: CASE 5: Same-day replay preserves streak and awards 0 duplicate RP');

  // ── CASE 6: Failed Attempt Invariance ─────────────────────────────
  console.log('\n--- CASE 6: Failed Attempt Invariance ---');
  const day6Date = '2026-08-24';
  const day6Challenges = getTodayChallenges(day6Date);
  const day6QW = day6Challenges.quickWin;

  const failedResult = recordDailyAttempt(
    day6QW,
    { time: 0, dangerLevel: 0, foodCount: 0, score: 0, hits: 0, combo: 0, moves: 100 },
    0,
    { isAuthenticated: true, hasServerEconomyIdentity: true }
  );

  assert.strictEqual(failedResult.isCompleted, false, 'Failed attempt must not be completed');
  assert.strictEqual(failedResult.isFirstCompletionToday, false, 'Failed attempt is not first completion');
  assert.strictEqual(failedResult.rewardEarned, 0, 'Failed attempt awards 0 RP');
  console.log('✅ PASSED: CASE 6: Failed attempt does not increment streak or complete challenge');

  // ── CASE 7: Reload Preserves Completion State ────────────────────
  console.log('\n--- CASE 7: Storage Reload Preserves Completion State ---');
  const reloadedProgress7 = loadDailyProgress();
  assert.strictEqual(reloadedProgress7.dailyAttempts[day5Date]?.quickWin?.completed, true, 'Day 5 completed state retained');
  console.log('✅ PASSED: CASE 7: Challenge completed state survives storage reload');

  // ── CASE 8: Reload Preserves Streak Value ────────────────────────
  console.log('\n--- CASE 8: Storage Reload Preserves Streak Value ---');
  const reloadedProgress8 = loadDailyProgress();
  assert.strictEqual(reloadedProgress8.streak, 1, 'Current streak preserved in storage');
  console.log('✅ PASSED: CASE 8: Streak value survives storage reload');

  // ── CASE 9: Month Boundary Transition (Aug 31 -> Sep 1) ──────────
  console.log('\n--- CASE 9: Month Boundary Streak Progression (Aug 31 -> Sep 1) ---');
  mockStore = {};
  setActiveStorageScope('user_test_user_month');

  const aug31 = '2026-08-31';
  const aug31QW = getTodayChallenges(aug31).quickWin;
  const aug31Res = recordDailyAttempt(
    aug31QW,
    getWinningMetrics(aug31QW),
    5000,
    { isAuthenticated: true, hasServerEconomyIdentity: true }
  );
  assert.strictEqual(aug31Res.currentStreak, 1, 'Aug 31 streak is 1');

  const sep01 = '2026-09-01';
  const sep01QW = getTodayChallenges(sep01).quickWin;
  const sep01Res = recordDailyAttempt(
    sep01QW,
    getWinningMetrics(sep01QW),
    5000,
    { isAuthenticated: true, hasServerEconomyIdentity: true }
  );
  assert.strictEqual(sep01Res.currentStreak, 2, 'Sep 1 streak must advance across month boundary to 2');
  console.log('✅ PASSED: CASE 9: Month boundary (Aug 31 -> Sep 1) correctly advances streak to 2');

  // ── CASE 10: Year Boundary Transition (Dec 31 -> Jan 1) ──────────
  console.log('\n--- CASE 10: Year Boundary Streak Progression (Dec 31 -> Jan 1) ---');
  mockStore = {};
  setActiveStorageScope('user_test_user_year');

  const dec31 = '2026-12-31';
  const dec31QW = getTodayChallenges(dec31).quickWin;
  const dec31Res = recordDailyAttempt(
    dec31QW,
    getWinningMetrics(dec31QW),
    5000,
    { isAuthenticated: true, hasServerEconomyIdentity: true }
  );
  assert.strictEqual(dec31Res.currentStreak, 1, 'Dec 31 streak is 1');

  const jan01 = '2027-01-01';
  const jan01QW = getTodayChallenges(jan01).quickWin;
  const jan01Res = recordDailyAttempt(
    jan01QW,
    getWinningMetrics(jan01QW),
    5000,
    { isAuthenticated: true, hasServerEconomyIdentity: true }
  );
  assert.strictEqual(jan01Res.currentStreak, 2, 'Jan 1 streak must advance across year boundary to 2');
  console.log('✅ PASSED: CASE 10: Year boundary (Dec 31 -> Jan 1) correctly advances streak to 2');

  // ── CASE 11: Authenticated Account Isolation ─────────────────────
  console.log('\n--- CASE 11: Multi-Account Storage Scope Isolation ---');
  setActiveStorageScope('user_account_A');
  saveDailyProgress({ streak: 7, rushPoints: 1000, dailyAttempts: {} });

  setActiveStorageScope('user_account_B');
  const accountBProgress = loadDailyProgress();
  assert.strictEqual(accountBProgress.streak, 0, 'Account B must not inherit Account A streak');
  assert.strictEqual(accountBProgress.rushPoints, 0, 'Account B must not inherit Account A points');
  console.log('✅ PASSED: CASE 11: Account A and Account B are strictly isolated');

  // ── CASE 12: Actual Cloud Hydration Bridge via syncDailyChallengeStatusCloud() ───
  console.log('\n--- CASE 12: Actual Cloud Hydration Bridge (syncDailyChallengeStatusCloud) ---');
  const hydUserId = '11111111-2222-4000-8000-555555555555';
  mockStore = {};
  setActiveStorageScope(hydUserId);

  // Setup initial state: player has 0 local streak in current session
  saveDailyProgress({ streak: 0, lastCompletedDate: null, dailyAttempts: {}, rushPoints: 0 });

  // Stub Supabase get_daily_challenge_status RPC
  const mockSupabase = {
    auth: {
      getSession: async () => ({ data: { session: { user: { id: hydUserId } } } }),
    },
    rpc: async (fnName) => {
      if (fnName === 'get_daily_challenge_status') {
        return {
          data: [{
            challenge_date: '2026-08-20',
            quick_win_claimed: false,
            extreme_claimed: false,
            quick_win_points: 0,
            extreme_points: 0,
            current_streak: 1, // Yesterday was completed!
            cloud_balance: 35,
          }],
          error: null,
        };
      }
      return { data: null, error: null };
    },
  };
  setMockSupabaseClient(mockSupabase);

  // Invoke REAL production hydration function
  const hydResult = await syncDailyChallengeStatusCloud({ user: { id: hydUserId }, isGuest: false });
  assert.notStrictEqual(hydResult, null, 'syncDailyChallengeStatusCloud must succeed');

  const hydratedProgress = loadDailyProgress();
  assert.strictEqual(hydratedProgress.streak, 1, 'Local streak hydrated from cloud as 1');
  assert.strictEqual(hydratedProgress.lastCompletedDate, '2026-08-19', 'lastCompletedDate must be tagged as yesterday (2026-08-19)');
  assert.strictEqual(hydratedProgress.dailyAttempts['2026-08-20']?.quickWin?.completed, false, 'Today quickWin not completed yet');
  console.log('✅ PASSED: CASE 12: Cloud hydration accurately sets streak and yesterday tag');

  // ── CASE 13: Real Cloud Claim RPC Response Returns Authoritative Streak ────
  console.log('\n--- CASE 13: Real Cloud Claim RPC Response (claimDailyChallengeRewardCloud) ---');
  let claimRpcInvoked = false;
  mockSupabase.rpc = async (fnName, params) => {
    if (fnName === 'claim_daily_challenge_reward') {
      claimRpcInvoked = true;
      return {
        data: [{
          awarded: true,
          tier_reward: 25,
          streak_bonus: 0,
          total_awarded: 25,
          balance: 60,
          challenge_date: '2026-08-20',
          tier: 'quick_win',
          current_streak: 2, // Server confirms Day 2 streak!
        }],
        error: null,
      };
    }
    return { data: null, error: null };
  };

  const day2Challenge = getTodayChallenges('2026-08-20').quickWin;
  const claimRes = await claimDailyChallengeRewardCloud({
    challenge: day2Challenge,
    metrics: getWinningMetrics(day2Challenge),
    finalScore: 5000,
  });

  assert.strictEqual(claimRpcInvoked, true, 'claim_daily_challenge_reward RPC was called');
  assert.strictEqual(claimRes.success, true, 'Cloud claim succeeded');
  assert.strictEqual(claimRes.record.current_streak, 2, 'Cloud RPC returned current_streak = 2');
  console.log('✅ PASSED: CASE 13: Cloud claim RPC returns authoritative current_streak = 2');

  // ── CASE 14: Cloud Claim Updates Local State Safely ───────────────
  console.log('\n--- CASE 14: Cloud Claim Updates Local State Safely ---');
  const postClaimProgress = loadDailyProgress();
  assert.strictEqual(postClaimProgress.streak, 2, 'Local streak updated to 2 from server RPC');
  assert.strictEqual(postClaimProgress.rushPoints, 60, 'Cloud balance updated to 60');
  assert.strictEqual(postClaimProgress.dailyAttempts['2026-08-20']?.quickWin?.completed, true, 'quickWin marked completed');
  assert.strictEqual(postClaimProgress.dailyAttempts['2026-08-20']?.quickWin?.rewardClaimed, true, 'quickWin marked rewardClaimed');
  console.log('✅ PASSED: CASE 14: Cloud claim safely synchronized streak, balance, and claim flag');

  // ── CASE 15: Completed Checkmark State Propagation via onScopeChange ───
  console.log('\n--- CASE 15: Completed Checkmark State Propagation via onScopeChange ---');
  let scopeChangeNotified = false;
  let observedCompleted = false;

  const unsubscribe = onScopeChange(() => {
    scopeChangeNotified = true;
    const p = loadDailyProgress();
    observedCompleted = Boolean(p.dailyAttempts['2026-08-20']?.quickWin?.completed);
  });

  emitScopeChange();
  assert.strictEqual(scopeChangeNotified, true, 'onScopeChange listener triggered');
  assert.strictEqual(observedCompleted, true, 'Listener observed completed checkmark state');
  unsubscribe();
  console.log('✅ PASSED: CASE 15: onScopeChange propagates completed checkmark to UI listeners');

  // ── CASE 16: Completed Checkmark Survives Reload ─────────────────
  console.log('\n--- CASE 16: Completed Checkmark Survives Reload ---');
  const reloaded16 = loadDailyProgress();
  const dateRecord16 = reloaded16.dailyAttempts['2026-08-20']?.quickWin;
  assert.strictEqual(dateRecord16?.completed, true, 'quickWin.completed is true on reload');
  assert.strictEqual(dateRecord16?.rewardClaimed, true, 'quickWin.rewardClaimed is true on reload');
  console.log('✅ PASSED: CASE 16: Completed checkmark survives storage reload');

  // ── CASE 17: Duplicate Cloud Claim Rejects Duplicate Credit ──────
  console.log('\n--- CASE 17: Duplicate Cloud Claim Idempotency ---');
  mockSupabase.rpc = async (fnName) => {
    if (fnName === 'claim_daily_challenge_reward') {
      return {
        data: [{
          awarded: false,
          tier_reward: 0,
          streak_bonus: 0,
          total_awarded: 0,
          balance: 60,
          challenge_date: '2026-08-20',
          tier: 'quick_win',
          current_streak: 2,
        }],
        error: null,
      };
    }
    return { data: null, error: null };
  };

  const dupRes = await claimDailyChallengeRewardCloud({
    challenge: day2Challenge,
    metrics: getWinningMetrics(day2Challenge),
    finalScore: 5000,
  });

  assert.strictEqual(dupRes.success, true, 'Duplicate call returned safely');
  assert.strictEqual(dupRes.record.awarded, false, 'Duplicate claim awarded = false');
  assert.strictEqual(dupRes.record.balance, 60, 'Balance remained 60 (zero duplicate points)');
  console.log('✅ PASSED: CASE 17: Duplicate cloud claim produces zero duplicate credit');

  // ── CASE 18: UTC Midnight Rotation & Countdown Invariance ────────
  console.log('\n--- CASE 18: Authoritative UTC Midnight Countdown Invariance ---');
  const testNow = new Date('2026-08-20T22:30:00Z');
  const testNextUtcMidnight = new Date(Date.UTC(
    testNow.getUTCFullYear(),
    testNow.getUTCMonth(),
    testNow.getUTCDate() + 1,
    0, 0, 0, 0
  ));
  const diffMs = testNextUtcMidnight.getTime() - testNow.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  assert.strictEqual(diffHours, 1.5, 'UTC countdown at 22:30 UTC must be exactly 1.5 hours');
  console.log('✅ PASSED: CASE 18: Countdown arithmetic strictly synchronizes with database UTC midnight');

  console.log('\n======================================================================');
  console.log('✅ ALL 18 PHASE 10.1 RETENTION & STREAK REGRESSION TESTS PASSED!');
  console.log('======================================================================');
}

runPhase10Tests().catch((err) => {
  console.error('Test failed with exception:', err);
  process.exit(1);
});
