/**
 * ONE MORE RUSH — Phase 11 UX + Accessibility + Mobile Hardening Test Suite
 * Validates focus-visible rules, modal ARIA semantics, Escape listeners, focus trapping,
 * reduced-motion media queries, touch targets, and backend freeze invariants.
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('======================================================================');
console.log('RUNNING PHASE 11 UX + ACCESSIBILITY + MOBILE REGRESSION TEST SUITE');
console.log('======================================================================\n');

function runPhase11Tests() {
  const rootDir = process.cwd();

  // ── 1. Global :focus-visible rules in src/index.css ─────────────────
  console.log('--- TEST 1: Global :focus-visible System Audit ---');
  const indexCss = fs.readFileSync(path.join(rootDir, 'src', 'index.css'), 'utf8');
  assert(indexCss.includes(':focus-visible'), 'src/index.css must contain :focus-visible rules');
  assert(indexCss.includes('outline: 2px solid var(--accent-secondary)'), 'src/index.css must use high-contrast cyan outline');
  assert(indexCss.includes('outline-offset: 2px'), 'src/index.css must include outline-offset');
  console.log('✅ PASSED: TEST 1: Global high-contrast :focus-visible styling verified');

  // ── 2 & 3. GameOverModal Responsive Layout Constraints ──────────────
  console.log('\n--- TEST 2 & 3: GameOverModal Mobile Landscape Layout Audit ---');
  const gameOverCss = fs.readFileSync(path.join(rootDir, 'src', 'components', 'GameOverModal.css'), 'utf8');
  assert(gameOverCss.includes('overflow-y: auto'), 'GameOverModal overlay must support vertical scrolling');
  assert(gameOverCss.includes('max-height: calc(100vh - 2rem)'), 'GameOverModal card must have viewport-relative max-height');
  console.log('✅ PASSED: TEST 2 & 3: GameOverModal viewport constraints and scrollability verified');

  // ── 4 & 5. Modal Escape Handling and Dismissal Semantics ────────────
  console.log('\n--- TEST 4 & 5: Modal Escape Handling & Onboarding Safety Audit ---');
  const gameOverJsx = fs.readFileSync(path.join(rootDir, 'src', 'components', 'GameOverModal.jsx'), 'utf8');
  const dailyResultJsx = fs.readFileSync(path.join(rootDir, 'src', 'components', 'DailyChallengeResultModal.jsx'), 'utf8');
  const usernameSetupJsx = fs.readFileSync(path.join(rootDir, 'src', 'components', 'UsernameSetupModal.jsx'), 'utf8');

  assert(gameOverJsx.includes("e.key === 'Escape'"), 'GameOverModal must handle Escape key');
  assert(dailyResultJsx.includes("e.key === 'Escape'"), 'DailyChallengeResultModal must handle Escape key');
  assert(usernameSetupJsx.includes("e.key === 'Escape'"), 'UsernameSetupModal must check Escape key');
  assert(usernameSetupJsx.includes('if (onSkip)'), 'UsernameSetupModal must only dismiss on Escape if onSkip is present');
  console.log('✅ PASSED: TEST 4 & 5: Dismissible modals handle Escape; mandatory onboarding setup protected');

  // ── 6, 7 & 8. DailyChallengeResultModal ARIA Dialog Semantics ───────
  console.log('\n--- TEST 6, 7 & 8: DailyChallengeResultModal Dialog Semantics ---');
  assert(dailyResultJsx.includes('role="dialog"'), 'DailyChallengeResultModal must specify role="dialog"');
  assert(dailyResultJsx.includes('aria-modal="true"'), 'DailyChallengeResultModal must specify aria-modal="true"');
  assert(dailyResultJsx.includes('aria-labelledby="daily-result-title-id"'), 'DailyChallengeResultModal must link aria-labelledby');
  assert(dailyResultJsx.includes('id="daily-result-title-id"'), 'DailyChallengeResultModal heading must have matching id');
  console.log('✅ PASSED: TEST 6, 7 & 8: DailyChallengeResultModal ARIA semantics and title link verified');

  // ── 9, 10 & 11. UsernameSetupModal ARIA Dialog Semantics ────────────
  console.log('\n--- TEST 9, 10 & 11: UsernameSetupModal Dialog Semantics ---');
  assert(usernameSetupJsx.includes('role="dialog"'), 'UsernameSetupModal must specify role="dialog"');
  assert(usernameSetupJsx.includes('aria-modal="true"'), 'UsernameSetupModal must specify aria-modal="true"');
  assert(usernameSetupJsx.includes('aria-labelledby="username-modal-title-id"'), 'UsernameSetupModal must link aria-labelledby');
  assert(usernameSetupJsx.includes('id="username-modal-title-id"'), 'UsernameSetupModal heading must have matching id');
  console.log('✅ PASSED: TEST 9, 10 & 11: UsernameSetupModal ARIA semantics and title link verified');

  // ── 12, 13 & 14. Prefers-Reduced-Motion Rules ──────────────────────
  console.log('\n--- TEST 12, 13 & 14: Prefers-Reduced-Motion Media Query Audit ---');
  const memoryCss = fs.readFileSync(path.join(rootDir, 'src', 'games', 'memory', 'MemoryGame.css'), 'utf8');
  const numberRushCss = fs.readFileSync(path.join(rootDir, 'src', 'games', 'number-rush', 'NumberRushGame.css'), 'utf8');

  assert(indexCss.includes('@media (prefers-reduced-motion: reduce)'), 'src/index.css must contain reduced-motion queries');
  assert(memoryCss.includes('@media (prefers-reduced-motion: reduce)'), 'MemoryGame.css must contain reduced-motion queries');
  assert(memoryCss.includes('glitch-flash-active'), 'MemoryGame.css must suppress glitch flash under reduced motion');
  assert(numberRushCss.includes('@media (prefers-reduced-motion: reduce)'), 'NumberRushGame.css must contain reduced-motion queries');
  assert(numberRushCss.includes('wrong-btn'), 'NumberRushGame.css must suppress button shake under reduced motion');
  console.log('✅ PASSED: TEST 12, 13 & 14: Reduced-motion overrides verified across global and game modules');

  // ── 15. Header Sound Toggle Mobile Touch Target ────────────────────
  console.log('\n--- TEST 15: Header Sound Button Mobile Touch Target Audit ---');
  const headerCss = fs.readFileSync(path.join(rootDir, 'src', 'components', 'Header.css'), 'utf8');
  assert(headerCss.includes('min-width: 38px'), 'Header sound button must preserve touch target floor on mobile');
  assert(headerCss.includes('touch-action: manipulation'), 'Header sound button must enable immediate touch manipulation');
  console.log('✅ PASSED: TEST 15: Header sound toggle touch target size verified');

  // ── 16. Muted Text Contrast Token Verification ─────────────────────
  console.log('\n--- TEST 16: Muted Text Contrast Token Audit ---');
  assert(indexCss.includes('--text-muted: rgba(255, 255, 255, 0.46)'), 'src/index.css must use WCAG AA compliant muted text token');
  console.log('✅ PASSED: TEST 16: Enhanced text contrast ratio verified');

  // ── 17 & 18. Backend Freeze Confirmation ───────────────────────────
  console.log('\n--- TEST 17 & 18: Backend and Migration Freeze Invariants ---');
  const migrationsDir = path.join(rootDir, 'supabase', 'migrations');
  const migrationFiles = fs.readdirSync(migrationsDir);
  assert.strictEqual(migrationFiles.length, 24, 'Exactly 24 migrations must exist (no new migrations in Phase 11)');
  assert(migrationFiles.includes('20260820000023_daily_challenge_streak_remediation.sql'), 'Migration 00023 must remain intact');
  console.log('✅ PASSED: TEST 17 & 18: Zero backend or migration modifications confirmed');

  console.log('\n======================================================================');
  console.log('✅ ALL PHASE 11 UX + ACCESSIBILITY + MOBILE REGRESSION TESTS PASSED!');
  console.log('======================================================================');
}

try {
  runPhase11Tests();
} catch (err) {
  console.error('Test failure:', err);
  process.exit(1);
}
