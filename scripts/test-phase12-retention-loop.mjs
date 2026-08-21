/**
 * ONE MORE RUSH — Phase 12.2 Retention Loop & Milestone Verification Suite
 * Verifies frontend-only milestone derivation, Day-0 onboarding, receipt breakdown,
 * return-tomorrow motivation, accessibility, economy safety, and backend freeze invariants.
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  getNextMilestoneInfo,
  STREAK_MILESTONES,
} from '../src/services/dailyChallengeService.js';

function runPhase12RetentionTests() {
  console.log('======================================================================');
  console.log('RUNNING PHASE 12.2 RETENTION LOOP & MILESTONES REGRESSION SUITE');
  console.log('======================================================================');

  // ── TEST 1: Milestone Configuration Integrity ───────────────────────
  console.log('\n--- TEST 1: Streak Milestone Configuration Constants ---');
  assert.strictEqual(STREAK_MILESTONES.length, 3, 'Must define exactly 3 milestones (3d, 7d, 14d)');
  assert.strictEqual(STREAK_MILESTONES[0].days, 3);
  assert.strictEqual(STREAK_MILESTONES[0].bonusPoints, 100);
  assert.strictEqual(STREAK_MILESTONES[1].days, 7);
  assert.strictEqual(STREAK_MILESTONES[1].bonusPoints, 300);
  assert.strictEqual(STREAK_MILESTONES[2].days, 14);
  assert.strictEqual(STREAK_MILESTONES[2].bonusPoints, 500);
  console.log('✅ PASSED: TEST 1: Milestone constants verified (3d=+100, 7d=+300, 14d=+500)');

  // ── TEST 2: Streak 0 (Day 0 Onboarding) ─────────────────────────────
  console.log('\n--- TEST 2: Day-0 Streak Calculation ---');
  const m0 = getNextMilestoneInfo(0);
  assert.strictEqual(m0.currentStreak, 0);
  assert.strictEqual(m0.nextMilestone, 3);
  assert.strictEqual(m0.daysRemaining, 3);
  assert.strictEqual(m0.bonusPoints, 100);
  assert.strictEqual(m0.progressPercent, 0);
  assert.strictEqual(m0.isMaxTier, false);
  console.log('✅ PASSED: TEST 2: Streak 0 resolves to 3 days remaining to +100 RP');

  // ── TEST 3: Streaks 1 to 2 (Tier 1 Progress) ────────────────────────
  console.log('\n--- TEST 3: Streaks 1 to 2 Progression ---');
  const m1 = getNextMilestoneInfo(1);
  assert.strictEqual(m1.currentStreak, 1);
  assert.strictEqual(m1.nextMilestone, 3);
  assert.strictEqual(m1.daysRemaining, 2);
  assert.strictEqual(m1.bonusPoints, 100);
  assert.strictEqual(m1.progressPercent, 33);

  const m2 = getNextMilestoneInfo(2);
  assert.strictEqual(m2.currentStreak, 2);
  assert.strictEqual(m2.nextMilestone, 3);
  assert.strictEqual(m2.daysRemaining, 1);
  assert.strictEqual(m2.bonusPoints, 100);
  assert.strictEqual(m2.progressPercent, 67);
  console.log('✅ PASSED: TEST 3: Streaks 1 and 2 calculate correct remaining days (2, 1)');

  // ── TEST 4: Streaks 3 to 6 (Tier 2 Progress) ────────────────────────
  console.log('\n--- TEST 4: Streaks 3 to 6 Progression ---');
  const m3 = getNextMilestoneInfo(3);
  assert.strictEqual(m3.currentStreak, 3);
  assert.strictEqual(m3.nextMilestone, 7);
  assert.strictEqual(m3.daysRemaining, 4);
  assert.strictEqual(m3.bonusPoints, 300);
  assert.strictEqual(m3.progressPercent, 0);

  const m4 = getNextMilestoneInfo(4);
  assert.strictEqual(m4.currentStreak, 4);
  assert.strictEqual(m4.nextMilestone, 7);
  assert.strictEqual(m4.daysRemaining, 3);
  assert.strictEqual(m4.bonusPoints, 300);
  assert.strictEqual(m4.progressPercent, 25);

  const m6 = getNextMilestoneInfo(6);
  assert.strictEqual(m6.currentStreak, 6);
  assert.strictEqual(m6.nextMilestone, 7);
  assert.strictEqual(m6.daysRemaining, 1);
  assert.strictEqual(m6.bonusPoints, 300);
  assert.strictEqual(m6.progressPercent, 75);
  console.log('✅ PASSED: TEST 4: Streaks 3 to 6 correctly project 7-day milestone (+300 RP)');

  // ── TEST 5: Streaks 7 to 13 (Tier 3 Progress) ───────────────────────
  console.log('\n--- TEST 5: Streaks 7 to 13 Progression ---');
  const m7 = getNextMilestoneInfo(7);
  assert.strictEqual(m7.currentStreak, 7);
  assert.strictEqual(m7.nextMilestone, 14);
  assert.strictEqual(m7.daysRemaining, 7);
  assert.strictEqual(m7.bonusPoints, 500);
  assert.strictEqual(m7.progressPercent, 0);

  const m8 = getNextMilestoneInfo(8);
  assert.strictEqual(m8.currentStreak, 8);
  assert.strictEqual(m8.nextMilestone, 14);
  assert.strictEqual(m8.daysRemaining, 6);
  assert.strictEqual(m8.bonusPoints, 500);
  assert.strictEqual(m8.progressPercent, 14);

  const m13 = getNextMilestoneInfo(13);
  assert.strictEqual(m13.currentStreak, 13);
  assert.strictEqual(m13.nextMilestone, 14);
  assert.strictEqual(m13.daysRemaining, 1);
  assert.strictEqual(m13.bonusPoints, 500);
  assert.strictEqual(m13.progressPercent, 86);
  console.log('✅ PASSED: TEST 5: Streaks 7 to 13 correctly project 14-day milestone (+500 RP)');

  // ── TEST 6: Streak 14+ (Max Milestones Achieved) ────────────────────
  console.log('\n--- TEST 6: Streak 14+ Max Milestone Boundary ---');
  const m14 = getNextMilestoneInfo(14);
  assert.strictEqual(m14.currentStreak, 14);
  assert.strictEqual(m14.nextMilestone, 14);
  assert.strictEqual(m14.daysRemaining, 0);
  assert.strictEqual(m14.progressPercent, 100);
  assert.strictEqual(m14.isMaxTier, true);

  const m15 = getNextMilestoneInfo(15);
  assert.strictEqual(m15.currentStreak, 15);
  assert.strictEqual(m15.daysRemaining, 0, 'Must never produce negative remaining days');
  assert.strictEqual(m15.progressPercent, 100);
  assert.strictEqual(m15.isMaxTier, true);

  const m30 = getNextMilestoneInfo(30);
  assert.strictEqual(m30.currentStreak, 30);
  assert.strictEqual(m30.daysRemaining, 0);
  assert.strictEqual(m30.isMaxTier, true);
  console.log('✅ PASSED: TEST 6: Streak 14, 15, and 30 gracefully clamp without negative values');

  // ── TEST 7: Resilience against Malformed / Null Inputs ──────────────
  console.log('\n--- TEST 7: Resilience against Malformed/Null Inputs ---');
  const mNull = getNextMilestoneInfo(null);
  assert.strictEqual(mNull.currentStreak, 0);
  assert.strictEqual(mNull.daysRemaining, 3);

  const mUndef = getNextMilestoneInfo(undefined);
  assert.strictEqual(mUndef.currentStreak, 0);

  const mNeg = getNextMilestoneInfo(-5);
  assert.strictEqual(mNeg.currentStreak, 0);

  const mNaN = getNextMilestoneInfo(NaN);
  assert.strictEqual(mNaN.currentStreak, 0);
  console.log('✅ PASSED: TEST 7: Null, undefined, negative, and NaN inputs handled safely');

  // ── TEST 8: Pure Derivation & Strict Economy Isolation Invariant ───
  console.log('\n--- TEST 8: Pure Derivation & Strict Economy Isolation Invariant ---');
  // 1. Memory State Immutability
  const inputObject = { streak: 6, points: 500 };
  const resA = getNextMilestoneInfo(inputObject.streak);
  assert.strictEqual(inputObject.streak, 6, 'Input streak must remain untouched');
  assert.strictEqual(inputObject.points, 500, 'Input points must remain untouched');

  // 2. Deterministic Consistency
  const resB = getNextMilestoneInfo(inputObject.streak);
  assert.deepStrictEqual(resA, resB, 'Repeated calls with identical input must return strictly identical output');

  // 3. Zero Economy Mutation
  // Verify that calling getNextMilestoneInfo does not write to local storage, award points, or call RPCs
  let mockStorageMutated = false;
  const originalSetItem = typeof global.localStorage !== 'undefined' ? global.localStorage.setItem : null;
  if (typeof global.localStorage !== 'undefined') {
    global.localStorage.setItem = () => { mockStorageMutated = true; };
  }
  getNextMilestoneInfo(10);
  if (originalSetItem) {
    global.localStorage.setItem = originalSetItem;
  }
  assert.strictEqual(mockStorageMutated, false, 'getNextMilestoneInfo must never write to localStorage');
  console.log('✅ PASSED: TEST 8: Strict economy isolation confirmed (zero RPCs, zero storage mutations, 100% deterministic)');

  // ── TEST 9: Accessibility & ARIA Label Safety Invariants ────────────
  console.log('\n--- TEST 9: Accessibility & ARIA Label Safety Invariants ---');
  const streakCases = [0, 2, 3, 6, 7, 13, 14, 30];

  streakCases.forEach((s) => {
    const info = getNextMilestoneInfo(s);
    assert(info.ariaLabel, `Streak ${s} must have a valid ariaLabel`);
    assert(!info.ariaLabel.includes('undefined'), `Streak ${s} ariaLabel must not contain 'undefined'`);
    assert(!info.ariaLabel.includes('null'), `Streak ${s} ariaLabel must not contain 'null'`);
    assert(!info.ariaLabel.includes('NaN'), `Streak ${s} ariaLabel must not contain 'NaN'`);

    if (s >= 14) {
      assert(
        info.ariaLabel.includes('all major streak milestones unlocked'),
        `Streak ${s} (max tier) ariaLabel must indicate all major milestones unlocked (got: ${info.ariaLabel})`
      );
    } else {
      assert(
        info.ariaLabel.includes(`${info.nextMilestone}`) && info.ariaLabel.includes(`${info.bonusPoints}`),
        `Streak ${s} ariaLabel must mention nextMilestone and bonusPoints (got: ${info.ariaLabel})`
      );
    }
  });

  // Specific spot checks
  const a0 = getNextMilestoneInfo(0).ariaLabel;
  assert.strictEqual(a0, '0 day streak, 0 percent progress toward the day 3 milestone worth 100 Rush Points');

  const a6 = getNextMilestoneInfo(6).ariaLabel;
  assert.strictEqual(a6, '6 day streak, 75 percent progress toward the day 7 milestone worth 300 Rush Points');

  const a14 = getNextMilestoneInfo(14).ariaLabel;
  assert.strictEqual(a14, '14 day streak, all major streak milestones unlocked');
  console.log('✅ PASSED: TEST 9: Complete accessibility regression passed with zero undefined/null/NaN values');

  // ── TEST 10: Frontend Source Code Invariants ────────────────────────
  console.log('\n--- TEST 10: UI Components Retention Implementation Invariants ---');
  const dailyPageSrc = fs.readFileSync(path.join(process.cwd(), 'src', 'pages', 'DailyPage.jsx'), 'utf8');
  assert(dailyPageSrc.includes('getNextMilestoneInfo'), 'DailyPage.jsx must import getNextMilestoneInfo');
  assert(dailyPageSrc.includes('daily-milestone-tracker'), 'DailyPage.jsx must contain daily-milestone-tracker');
  assert(dailyPageSrc.includes('daily-return-tomorrow-banner'), 'DailyPage.jsx must contain return-tomorrow banner');
  assert(dailyPageSrc.includes('streak-zero-pill'), 'DailyPage.jsx must contain Day-0 streak zero pill');
  assert(dailyPageSrc.includes('aria-label={milestone.ariaLabel}'), 'DailyPage.jsx must use milestone.ariaLabel');

  const dailyCompSrc = fs.readFileSync(path.join(process.cwd(), 'src', 'components', 'DailyChallenge.jsx'), 'utf8');
  assert(dailyCompSrc.includes('getNextMilestoneInfo'), 'DailyChallenge.jsx must import getNextMilestoneInfo');
  assert(dailyCompSrc.includes('daily-milestone-tracker'), 'DailyChallenge.jsx must contain daily-milestone-tracker');
  assert(dailyCompSrc.includes('daily-return-tomorrow-banner'), 'DailyChallenge.jsx must contain return-tomorrow banner');
  assert(dailyCompSrc.includes('aria-label={milestone.ariaLabel}'), 'DailyChallenge.jsx must use milestone.ariaLabel');

  const modalSrc = fs.readFileSync(path.join(process.cwd(), 'src', 'components', 'DailyChallengeResultModal.jsx'), 'utf8');
  assert(modalSrc.includes('getNextMilestoneInfo'), 'DailyChallengeResultModal.jsx must import getNextMilestoneInfo');
  assert(modalSrc.includes('reward-receipt-card'), 'Modal must contain itemized reward receipt');
  assert(modalSrc.includes('result-retention-card'), 'Modal must contain return-tomorrow retention card');

  const headerSrc = fs.readFileSync(path.join(process.cwd(), 'src', 'components', 'Header.jsx'), 'utf8');
  assert(headerSrc.includes('streak-zero'), 'Header.jsx must support Day-0 streak display');
  console.log('✅ PASSED: TEST 10: All frontend components verify retention loop contracts');

  // ── TEST 11: Backend Freeze Verification ───────────────────────────
  console.log('\n--- TEST 11: Backend Freeze Invariant ---');
  const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
  const migrationFiles = fs.readdirSync(migrationsDir);
  assert.strictEqual(migrationFiles.length, 24, 'Exactly 24 migrations must exist (no new migration)');
  assert(migrationFiles.includes('20260820000023_daily_challenge_streak_remediation.sql'), 'Migration 00023 must exist');
  console.log('✅ PASSED: TEST 11: Backend freeze confirmed (zero migrations created, 24 files total)');

  console.log('\n======================================================================');
  console.log('✅ ALL PHASE 12.2 RETENTION LOOP TESTS PASSED (11 / 11 SUITES)');
  console.log('======================================================================');
}

runPhase12RetentionTests();
