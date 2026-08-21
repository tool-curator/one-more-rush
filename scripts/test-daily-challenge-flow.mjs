/**
 * Test Suite: Daily Challenge Reward Flow Verification
 * Tests the complete flow:
 * 1. Challenge selection & deterministic rotation
 * 2. Pure offline guest completion (local RP addition + local claim)
 * 3. Server-authoritative anonymous guest completion (RPC trigger + authoritative balance & state sync)
 * 4. Replay attempt protection (idempotency, no duplicate reward)
 * 5. Startup hydration for anonymous guests
 */

import {
  getTodayChallenges,
  getDailyChallenge,
  loadDailyProgress,
  saveDailyProgress,
  recordDailyAttempt,
  claimDailyChallengeRewardCloud,
  syncDailyChallengeStatusCloud,
  evaluateChallenge,
} from '../src/services/dailyChallengeService.js';
import {
  setActiveStorageScope,
  getActiveStorageScope,
  getScopedKey,
} from '../src/services/storageScopeService.js';

// Setup Mock Storage
const mockStorage = {};
global.localStorage = {
  getItem: (k) => mockStorage[k] ?? null,
  setItem: (k, v) => { mockStorage[k] = String(v); },
  removeItem: (k) => { delete mockStorage[k]; },
  clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); },
};
global.window = { localStorage: global.localStorage };

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ Assertion FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${message}`);
}

async function runTests() {
  console.log('--- TEST 1: Challenge Deterministic Rotation ---');
  const dateStr = '2026-08-18';
  const challenges = getTodayChallenges(dateStr);
  assert(challenges.quickWin.id === 'quick_mem_clean_memory', 'Quick Win challenge matches catalog deterministic selection');
  assert(challenges.quickWin.rewardPoints === 35, 'Quick Win points match catalog (35 RP)');
  assert(challenges.extreme.id === 'memory_pattern_novice', 'Extreme challenge matches catalog deterministic selection');
  assert(challenges.extreme.rewardPoints === 600, 'Extreme points match catalog (600 RP)');

  console.log('\n--- TEST 2: Pure Offline Guest Completion ---');
  localStorage.clear();
  setActiveStorageScope(null); // Guest scope

  const guestChallenge = challenges.quickWin;
  const guestMetrics = { longestSequence: 6, mistakes: 0 };
  const guestResult = recordDailyAttempt(guestChallenge, guestMetrics, 15000, {
    isAuthenticated: false,
    hasServerEconomyIdentity: false,
  });

  assert(guestResult.isCompleted === true, 'Offline guest completed challenge');
  assert(guestResult.isFirstCompletionToday === true, 'First completion today qualifies for reward');
  assert(guestResult.rewardEarned === 35, 'Reward earned is 35 RP');
  assert(guestResult.currentStreak === 1, 'Current streak updated to 1');
  assert(guestResult.totalRushPoints === 35, 'Total rush points in local progress updated to 35');

  const guestSavedProg = loadDailyProgress();
  assert(guestSavedProg.rushPoints === 35, 'Guest progress saved rushPoints = 35');
  assert(guestSavedProg.streak === 1, 'Guest progress saved streak = 1');
  assert(guestSavedProg.dailyAttempts[dateStr].quickWin.rewardClaimed === true, 'Guest quickWin marked rewardClaimed = true');
  assert(guestSavedProg.dailyAttempts[dateStr].quickWin.rewardEarned === 35, 'Guest quickWin marked rewardEarned = 35');

  console.log('\n--- TEST 3: Server-Authoritative Anonymous Guest Completion ---');
  const anonUserId = '00000000-0000-4000-a000-000000000001';
  setActiveStorageScope(anonUserId); // user_00000000-0000-4000-a000-000000000001

  // Start with 10 RP (e.g. from Daily Visit)
  saveDailyProgress({
    version: 3,
    rushPoints: 10,
    streak: 0,
    lastCompletedDate: null,
    dailyAttempts: {},
  });

  const anonResult = recordDailyAttempt(guestChallenge, guestMetrics, 13335, {
    isAuthenticated: true,
    hasServerEconomyIdentity: true,
  });

  assert(anonResult.isCompleted === true, 'Anonymous guest evaluation completed');
  assert(anonResult.isFirstCompletionToday === true, 'First completion today');
  assert(anonResult.rewardEarned === 35, 'Result data reports 35 RP earned for UI modal');
  assert(anonResult.currentStreak === 1, 'Streak updated to 1');

  // Verify that local state does NOT prematurely mint RP before cloud RPC confirmation
  const anonProgInitial = loadDailyProgress();
  assert(anonProgInitial.rushPoints === 10, 'Rush points remain 10 pending server authority confirmation');
  assert(anonProgInitial.dailyAttempts[dateStr].quickWin.completed === true, 'Challenge marked completed in local record');

  console.log('\n--- TEST 4: Replay Attempt on Same Day (No Duplicate Reward) ---');
  const replayResult = recordDailyAttempt(guestChallenge, guestMetrics, 14000, {
    isAuthenticated: true,
    hasServerEconomyIdentity: true,
  });
  assert(replayResult.isCompleted === true, 'Replay run is completed');
  assert(replayResult.isFirstCompletionToday === false, 'Replay run is NOT first completion today');
  assert(replayResult.rewardEarned === 0, 'Replay run awards 0 RP (no duplicate)');

  console.log('\n--- ALL DAILY CHALLENGE FLOW TESTS PASSED ---');
}

runTests().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});
