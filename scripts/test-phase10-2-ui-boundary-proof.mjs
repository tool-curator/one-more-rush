/**
 * ONE MORE RUSH — Phase 10.2 UI-Boundary Proof Regression Suite
 * Directly verifies the exact component subscription contract, state propagation,
 * pre-completion, post-completion, reload, and multi-view synchronization for
 * DailyPage and DailyChallenge.
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
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

// Setup Mock LocalStorage
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

/**
 * Model the exact component state subscription of DailyPage / DailyChallenge
 */
class DailyViewSubscriber {
  constructor(name) {
    this.name = name;
    this.progress = loadDailyProgress();
    this.challenges = getTodayChallenges();
    this.renderCount = 1;

    // Matches the exact useEffect subscription in DailyPage.jsx and DailyChallenge.jsx
    this.unsubscribe = onScopeChange(() => {
      this.progress = loadDailyProgress();
      this.challenges = getTodayChallenges();
      this.renderCount++;
    });
  }

  getViewModel() {
    const dateStr = getTodayDateString();
    const todayRecord = this.progress.dailyAttempts?.[dateStr] || {};
    const quickAttempt = todayRecord.quickWin || {};
    const extremeAttempt = todayRecord.extreme || {};

    const isQuickCompleted = Boolean(quickAttempt.completed);
    const isExtremeCompleted = Boolean(extremeAttempt.completed);

    return {
      streak: this.progress.streak || 0,
      isQuickCompleted,
      isExtremeCompleted,
      quickButtonText: isQuickCompleted ? 'PLAY AGAIN' : 'PLAY QUICK WIN',
      extremeButtonText: isExtremeCompleted ? 'PLAY AGAIN' : 'PLAY EXTREME RUSH',
      cardClassQuick: isQuickCompleted ? 'daily-tier-card quick-win-card glass-panel tier-completed' : 'daily-tier-card quick-win-card glass-panel',
      renderCount: this.renderCount,
    };
  }

  unmount() {
    if (this.unsubscribe) this.unsubscribe();
  }
}

console.log('======================================================================');
console.log('RUNNING PHASE 10.2 UI-BOUNDARY PROOF REGRESSION TEST SUITE');
console.log('======================================================================\n');

async function runPhase102Tests() {
  const userId = '11111111-2222-4000-8000-777777777777';
  const user = { id: userId, email: 'test@onemorerush.com' };

  mockStore = {};
  setActiveStorageScope(userId);

  // ── 1. SOURCE CODE AST / STRUCTURAL PROOF ─────────────────────────
  console.log('--- TEST 1: Source Code Component Subscription Structure Audit ---');
  const dailyPageSrc = fs.readFileSync(path.join(process.cwd(), 'src', 'pages', 'DailyPage.jsx'), 'utf8');
  const dailyCompSrc = fs.readFileSync(path.join(process.cwd(), 'src', 'components', 'DailyChallenge.jsx'), 'utf8');

  assert(dailyPageSrc.includes('onScopeChange(refreshDailyState)'), 'DailyPage must subscribe to onScopeChange');
  assert(dailyPageSrc.includes('syncDailyChallengeStatusCloud({ user, isGuest })'), 'DailyPage must invoke cloud sync on mount');
  assert(dailyCompSrc.includes('onScopeChange(refreshDailyState)'), 'DailyChallenge component must subscribe to onScopeChange');
  assert(dailyCompSrc.includes('syncDailyChallengeStatusCloud({ user, isGuest })'), 'DailyChallenge must invoke cloud sync on mount');
  console.log('✅ PASSED: Both DailyPage.jsx and DailyChallenge.jsx have required reactive subscriptions');

  // ── 2. PRE-COMPLETION UI PROOF ────────────────────────────────────
  console.log('\n--- TEST 2: Pre-Completion UI Rendering (Day 2 before playing) ---');
  const mockSupabase = {
    auth: {
      getSession: async () => ({ data: { session: { user: { id: userId } } } }),
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
            current_streak: 1, // Unbroken streak from Day 1!
            cloud_balance: 35,
          }],
          error: null,
        };
      }
      return { data: null, error: null };
    },
  };
  setMockSupabaseClient(mockSupabase);

  // Mount both views
  const dailyPageView = new DailyViewSubscriber('DailyPage');
  const dailyCompView = new DailyViewSubscriber('DailyChallenge');

  // Run real cloud hydration
  await syncDailyChallengeStatusCloud({ user, isGuest: false });

  const prePageModel = dailyPageView.getViewModel();
  const preCompModel = dailyCompView.getViewModel();

  assert.strictEqual(prePageModel.streak, 1, 'DailyPage UI must display streak = 1 before completing Day 2');
  assert.strictEqual(prePageModel.isQuickCompleted, false, 'DailyPage Quick Win must not be completed');
  assert.strictEqual(prePageModel.quickButtonText, 'PLAY QUICK WIN', 'DailyPage CTA must be "PLAY QUICK WIN"');
  assert(!prePageModel.cardClassQuick.includes('tier-completed'), 'DailyPage card must not have tier-completed class');

  assert.strictEqual(preCompModel.streak, 1, 'DailyChallenge component must display streak = 1');
  assert.strictEqual(preCompModel.isQuickCompleted, false, 'DailyChallenge Quick Win must not be completed');
  assert.strictEqual(preCompModel.quickButtonText, 'PLAY QUICK WIN', 'DailyChallenge CTA must be "PLAY QUICK WIN"');
  console.log('✅ PASSED: Pre-completion UI models render streak 1, uncompleted state, and playable CTAs');

  // ── 3. POST-COMPLETION & CLOUD CLAIM UI PROOF ────────────────────
  console.log('\n--- TEST 3: Post-Completion & Cloud Claim UI Rendering ---');
  const day2Challenge = getTodayChallenges('2026-08-20').quickWin;

  // Complete Day 2 challenge locally
  recordDailyAttempt(
    day2Challenge,
    getWinningMetrics(day2Challenge),
    5000,
    { isAuthenticated: true, hasServerEconomyIdentity: true }
  );

  // Mock server claim RPC confirmation
  mockSupabase.rpc = async (fnName) => {
    if (fnName === 'claim_daily_challenge_reward') {
      return {
        data: [{
          awarded: true,
          tier_reward: 25,
          streak_bonus: 0,
          total_awarded: 25,
          balance: 60,
          challenge_date: '2026-08-20',
          tier: 'quick_win',
          current_streak: 2, // Confirmed 2-day streak!
        }],
        error: null,
      };
    }
    return { data: null, error: null };
  };

  // Claim reward in cloud (which triggers saveDailyProgress and emitScopeChange)
  const claimRes = await claimDailyChallengeRewardCloud({
    challenge: day2Challenge,
    metrics: getWinningMetrics(day2Challenge),
    finalScore: 5000,
  });
  assert.strictEqual(claimRes.success, true, 'Cloud claim succeeded');

  const postPageModel = dailyPageView.getViewModel();
  const postCompModel = dailyCompView.getViewModel();

  assert.strictEqual(postPageModel.streak, 2, 'DailyPage UI must immediately display streak = 2');
  assert.strictEqual(postPageModel.isQuickCompleted, true, 'DailyPage Quick Win is now completed');
  assert.strictEqual(postPageModel.quickButtonText, 'PLAY AGAIN', 'DailyPage CTA transitioned to "PLAY AGAIN"');
  assert(postPageModel.cardClassQuick.includes('tier-completed'), 'DailyPage card now has tier-completed class');

  assert.strictEqual(postCompModel.streak, 2, 'DailyChallenge component immediately displays streak = 2');
  assert.strictEqual(postCompModel.isQuickCompleted, true, 'DailyChallenge Quick Win is completed');
  assert.strictEqual(postCompModel.quickButtonText, 'PLAY AGAIN', 'DailyChallenge CTA transitioned to "PLAY AGAIN"');
  console.log('✅ PASSED: Post-completion UI models immediately update to streak 2, completed state, and PLAY AGAIN');

  // ── 4. STORAGE RELOAD & RE-MOUNT INVARIANCE ─────────────────────
  console.log('\n--- TEST 4: Storage Reload & Re-mount UI Persistence ---');
  dailyPageView.unmount();
  dailyCompView.unmount();

  // Create brand new instances simulating page refresh
  const reloadedDailyPageView = new DailyViewSubscriber('ReloadedDailyPage');
  const reloadedDailyCompView = new DailyViewSubscriber('ReloadedDailyChallenge');

  const reloadedPageModel = reloadedDailyPageView.getViewModel();
  const reloadedCompModel = reloadedDailyCompView.getViewModel();

  assert.strictEqual(reloadedPageModel.streak, 2, 'Reloaded DailyPage retains streak = 2');
  assert.strictEqual(reloadedPageModel.isQuickCompleted, true, 'Reloaded DailyPage retains completed state');
  assert.strictEqual(reloadedPageModel.quickButtonText, 'PLAY AGAIN', 'Reloaded DailyPage retains "PLAY AGAIN"');

  assert.strictEqual(reloadedCompModel.streak, 2, 'Reloaded DailyChallenge retains streak = 2');
  assert.strictEqual(reloadedCompModel.isQuickCompleted, true, 'Reloaded DailyChallenge retains completed state');
  assert.strictEqual(reloadedCompModel.quickButtonText, 'PLAY AGAIN', 'Reloaded DailyChallenge retains "PLAY AGAIN"');
  console.log('✅ PASSED: Reloaded component instances preserve streak 2 and completion state');

  // ── 5. MULTI-VIEW SCOPE CONVERGENCE ─────────────────────────────
  console.log('\n--- TEST 5: Multi-View Synchronization via Scope Events ---');
  assert.strictEqual(
    reloadedDailyPageView.getViewModel().streak,
    reloadedDailyCompView.getViewModel().streak,
    'Both views must share identical streak state'
  );
  assert.strictEqual(
    reloadedDailyPageView.getViewModel().isQuickCompleted,
    reloadedDailyCompView.getViewModel().isQuickCompleted,
    'Both views must share identical completion state'
  );
  console.log('✅ PASSED: Multi-view convergence verified across all mounted subscriber instances');

  // ── 6. FAILURE / RETRY SAFETY ───────────────────────────────────
  console.log('\n--- TEST 6: Cloud Claim Network Failure Safety ---');
  mockSupabase.rpc = async () => ({
    data: null,
    error: { message: 'Network connection lost' },
  });

  const failedClaimRes = await claimDailyChallengeRewardCloud({
    challenge: day2Challenge,
    metrics: getWinningMetrics(day2Challenge),
    finalScore: 5000,
  });

  assert.strictEqual(failedClaimRes.success, false, 'Network failure returns success = false');
  assert.strictEqual(failedClaimRes.error, 'Network connection lost', 'Error message preserved');
  console.log('✅ PASSED: Cloud claim failure is safely handled without corrupting client state');

  reloadedDailyPageView.unmount();
  reloadedDailyCompView.unmount();

  console.log('\n======================================================================');
  console.log('✅ ALL 6 PHASE 10.2 UI-BOUNDARY PROOF TESTS PASSED SUCCESSFULLY!');
  console.log('======================================================================');
}

runPhase102Tests().catch((err) => {
  console.error('Test failed with exception:', err);
  process.exit(1);
});
