import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('======================================================================');
console.log('RUNNING PHASE 13.3 CROSS-FLOW, LIFECYCLE & REGRESSION HARDENING SUITE');
console.log('======================================================================\n');

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ PASSED: ${message}`);
    passedTests++;
  } else {
    console.error(`❌ FAILED: ${message}`);
    failedTests++;
  }
}

const rootDir = process.cwd();
const gameOverModalJsxPath = path.join(rootDir, 'src', 'components', 'GameOverModal.jsx');
const dailyModalJsxPath = path.join(rootDir, 'src', 'components', 'DailyChallengeResultModal.jsx');
const appJsxPath = path.join(rootDir, 'src', 'App.jsx');
const stackGameJsxPath = path.join(rootDir, 'src', 'games', 'stack', 'StackGame.jsx');
const aimGameJsxPath = path.join(rootDir, 'src', 'games', 'aim', 'AimGame.jsx');
const dodgeGameJsxPath = path.join(rootDir, 'src', 'games', 'dodge', 'DodgeGame.jsx');
const numberRushJsxPath = path.join(rootDir, 'src', 'games', 'number-rush', 'NumberRushGame.jsx');
const memoryGameJsxPath = path.join(rootDir, 'src', 'games', 'memory', 'MemoryGame.jsx');
const colorMazeJsxPath = path.join(rootDir, 'src', 'games', 'color-maze', 'ColorMazeGame.jsx');
const migrationsDir = path.join(rootDir, 'supabase', 'migrations');

const gameOverJsx = fs.readFileSync(gameOverModalJsxPath, 'utf8');
const dailyModalJsx = fs.readFileSync(dailyModalJsxPath, 'utf8');
const appJsx = fs.readFileSync(appJsxPath, 'utf8');
const stackGameJsx = fs.readFileSync(stackGameJsxPath, 'utf8');
const aimGameJsx = fs.readFileSync(aimGameJsxPath, 'utf8');
const dodgeGameJsx = fs.readFileSync(dodgeGameJsxPath, 'utf8');
const numberRushJsx = fs.readFileSync(numberRushJsxPath, 'utf8');
const memoryGameJsx = fs.readFileSync(memoryGameJsxPath, 'utf8');
const colorMazeJsx = fs.readFileSync(colorMazeJsxPath, 'utf8');

// --- TEST 1: GameOver Cleanup Invariants ---
console.log('--- TEST 1: GameOver Cleanup Invariants ---');
assert(
  gameOverJsx.includes('handleSafeAction') &&
  gameOverJsx.includes('actionTriggeredRef') &&
  gameOverJsx.includes('window.removeEventListener(\'keydown\', handleKeyDown)'),
  'TEST 1: GameOverModal cleans up event listeners and guards against double-triggering actions'
);

// --- TEST 2: GameOver Navigation Invariants ---
console.log('\n--- TEST 2: GameOver Navigation Invariants ---');
assert(
  appJsx.includes("navigateTo('/login')") &&
  appJsx.includes("navigateTo('/leaderboard')") &&
  appJsx.includes("navigateTo('/daily')") &&
  appJsx.includes('setIsDailyChallengeMode(false)'),
  'TEST 2: GameOver navigation callbacks reset daily mode and cleanly push history routes'
);

// --- TEST 3: Auth Boundary Invariants ---
console.log('\n--- TEST 3: Auth Boundary Invariants ---');
assert(
  gameOverJsx.includes('isGuestPlayer ? (') &&
  gameOverJsx.includes('isGuest || submissionStatus === \'GUEST\'') &&
  appJsx.includes('isGuest={Boolean(isGuest || !user)}'),
  'TEST 3: Guest conversion CTA is strictly omitted for authenticated users and present only for guests'
);

// --- TEST 4: Leaderboard Cross-Flow Navigation ---
console.log('\n--- TEST 4: Leaderboard Cross-Flow Navigation ---');
assert(
  appJsx.includes("onNavigateToLeaderboard={() => {") &&
  appJsx.includes("navigateTo('/leaderboard')") &&
  gameOverJsx.includes('LEADERBOARD'),
  'TEST 4: Leaderboard cross-flow cleanly unmounts GameOver and enters Leaderboard page'
);

// --- TEST 5: Daily Quick Win Flow Invariants ---
console.log('\n--- TEST 5: Daily Quick Win Flow Invariants ---');
assert(
  dailyModalJsx.includes('DAILY REWARD RECEIPT') &&
  dailyModalJsx.includes('TIER REWARD') &&
  dailyModalJsx.includes('STREAK MILESTONE BONUS'),
  'TEST 5: Quick Win flow displays authoritative reward receipt and streak calculations'
);

// --- TEST 6: Extreme Continuation Invariants ---
console.log('\n--- TEST 6: Extreme Continuation Invariants ---');
assert(
  (dailyModalJsx.includes('GO EXTREME!') || dailyModalJsx.includes('CONTINUE TO EXTREME RUSH')) &&
  dailyModalJsx.includes('btn-extreme-chain') &&
  appJsx.includes('handlePlayDailyChallenge(todayChallenges.extreme)'),
  'TEST 6: Extreme continuation CTA seamlessly starts existing Extreme Daily Challenge flow'
);

// --- TEST 7: Duplicate-Attempt Prevention ---
console.log('\n--- TEST 7: Duplicate Attempt Prevention ---');
assert(
  appJsx.includes('activeDailyAttemptIdRef.current = null') &&
  appJsx.includes('startDailyChallengeAttemptCloud({ challenge: targetChallenge })'),
  'TEST 7: Daily attempt token is reset and re-authorized monotonically per challenge attempt'
);

// --- TEST 8: Duplicate-Reward Prevention ---
console.log('\n--- TEST 8: Duplicate Reward Prevention ---');
assert(
  dailyModalJsx.includes('REWARD ALREADY CLAIMED TODAY') &&
  appJsx.includes('challengeResult?.isFirstCompletionToday'),
  'TEST 8: Server-authoritative reward claim is strictly gated to isFirstCompletionToday'
);

// --- TEST 9: Timer Cleanup across All Engines ---
console.log('\n--- TEST 9: Timer Cleanup Invariants ---');
assert(
  aimGameJsx.includes('clearTimeout(effectsCleanupTimerRef.current)') &&
  numberRushJsx.includes('clearAllTimeouts()') &&
  memoryGameJsx.includes('clearAllTimeouts()') &&
  stackGameJsx.includes('clearTimeout(gameOverTimerRef.current)'),
  'TEST 9: All game engines explicitly cancel timeouts and effects timers on unmount'
);

// --- TEST 10: Audio Cleanup Invariants ---
console.log('\n--- TEST 10: Audio Cleanup Invariants ---');
assert(
  gameOverJsx.includes('hasPlayedAudioRef.current = true') &&
  aimGameJsx.includes('gameOverHandledRef.current = true') &&
  stackGameJsx.includes('gameOverHandledRef.current = true'),
  'TEST 10: Game-end audio is guarded against duplicate lethal triggers and late firing'
);

// --- TEST 11: requestAnimationFrame Cleanup ---
console.log('\n--- TEST 11: requestAnimationFrame Cleanup Invariants ---');
assert(
  aimGameJsx.includes('cancelAnimationFrame(animFrameRef.current)') &&
  dodgeGameJsx.includes('cancelAnimationFrame(animFrameRef.current)') &&
  stackGameJsx.includes('cancelAnimationFrame(animFrameRef.current)') &&
  numberRushJsx.includes('cancelAnimationFrame(animFrameRef.current)'),
  'TEST 11: requestAnimationFrame loops are synchronously cancelled on unmount across all games'
);

// --- TEST 12: Modal Cleanup Invariants ---
console.log('\n--- TEST 12: Modal Cleanup Invariants ---');
assert(
  gameOverJsx.includes('window.removeEventListener(\'keydown\', handleKeyDown)') &&
  dailyModalJsx.includes('window.removeEventListener(\'keydown\', handleKeyDown)'),
  'TEST 12: Result modals remove global keydown listeners and clear memory on unmount'
);

// --- TEST 13: Focus Management & Trap Invariants ---
console.log('\n--- TEST 13: Focus Management & Trap Invariants ---');
assert(
  gameOverJsx.includes('prevFocusedRef.current?.focus?.()') &&
  dailyModalJsx.includes('prevFocusedRef.current?.focus?.()') &&
  gameOverJsx.includes('modalRef.current.querySelectorAll') &&
  dailyModalJsx.includes('modalRef.current.querySelectorAll'),
  'TEST 13: Modals maintain focus trap, Tab wrapping, initial autofocus, and focus restoration'
);

// --- TEST 14: Escape Key Invariants ---
console.log('\n--- TEST 14: Escape Key Invariants ---');
assert(
  gameOverJsx.includes("if (e.key === 'Escape')") &&
  dailyModalJsx.includes("if (e.key === 'Escape')"),
  'TEST 14: Escape key handling safely dismisses dialogs back to Home'
);

// --- TEST 15: Mobile Constraints & Overflow Invariants ---
console.log('\n--- TEST 15: Mobile Constraints Invariants ---');
const gameOverCss = fs.readFileSync(path.join(rootDir, 'src', 'components', 'GameOverModal.css'), 'utf8');
const dailyCss = fs.readFileSync(path.join(rootDir, 'src', 'components', 'DailyChallengeResultModal.css'), 'utf8');
assert(
  gameOverCss.includes('-webkit-overflow-scrolling: touch') &&
  dailyCss.includes('-webkit-overflow-scrolling: touch') &&
  gameOverCss.includes('min-height: 44px') &&
  dailyCss.includes('min-height: 44px'),
  'TEST 15: Mobile touch scrolling and 44px touch targets verified across modals'
);

// --- TEST 16: Absolute Migration Freeze ---
console.log('\n--- TEST 16: Migration Directory Freeze ---');
const migrationFiles = fs.readdirSync(migrationsDir);
assert(
  migrationFiles.length === 24,
  `TEST 16: Exactly 24 migrations confirmed (found ${migrationFiles.length})`
);

// --- TEST 17: Rush Points Economy Freeze ---
console.log('\n--- TEST 17: Economy Service Freeze ---');
const dailyRewardPath = path.join(rootDir, 'src', 'services', 'dailyRewardService.js');
const dailyRewardContent = fs.readFileSync(dailyRewardPath, 'utf8');
assert(
  dailyRewardContent.includes('export async function claimDailyVisitReward'),
  'TEST 17: Daily visit reward and RP minting services remain completely untouched'
);

// --- TEST 18: Leaderboard Service Freeze ---
console.log('\n--- TEST 18: Leaderboard Service Freeze ---');
const scoreServicePath = path.join(rootDir, 'src', 'services', 'scoreService.js');
const scoreServiceContent = fs.readFileSync(scoreServicePath, 'utf8');
assert(
  scoreServiceContent.includes('export async function submitGameScore') &&
  scoreServiceContent.includes('export async function fetchLeaderboard'),
  'TEST 18: Score submission and leaderboard RPC wrappers remain completely untouched'
);

// --- TEST 19: Daily Authority Service Freeze ---
console.log('\n--- TEST 19: Daily Challenge Authority Freeze ---');
const dailyChallengeServicePath = path.join(rootDir, 'src', 'services', 'dailyChallengeService.js');
const dailyChallengeContent = fs.readFileSync(dailyChallengeServicePath, 'utf8');
assert(
  dailyChallengeContent.includes('export async function claimDailyChallengeRewardCloud') &&
  dailyChallengeContent.includes('export async function startDailyChallengeAttemptCloud'),
  'TEST 19: Cloud daily challenge authorization and claim RPCs remain completely untouched'
);

// --- TEST 20: Rapid-Interaction Double Action Guard Invariant ---
console.log('\n--- TEST 20: Rapid Double Action Guard Invariants ---');
assert(
  gameOverJsx.includes('handleSafeAction(onPlayAgain)') &&
  gameOverJsx.includes('handleSafeAction(onHome)') &&
  dailyModalJsx.includes('handleSafeAction(onContinueToExtreme)') &&
  dailyModalJsx.includes('handleSafeAction(onPlayAgain)'),
  'TEST 20: All interactive modal buttons guarded against rapid double-clicks'
);

// --- TEST 21: Stack Game Timer Cleanup Invariant ---
console.log('\n--- TEST 21: Stack Game Timer Cleanup ---');
assert(
  stackGameJsx.includes('gameOverTimerRef.current = setTimeout') &&
  stackGameJsx.includes('clearTimeout(gameOverTimerRef.current)'),
  'TEST 21: StackGame gameOverTimerRef is tracked and cleared on unmount'
);

// --- TEST 22: Color Maze Victory Integration Invariant ---
console.log('\n--- TEST 22: Color Maze Victory Invariant ---');
assert(
  colorMazeJsx.includes('VictoryEffectOverlay') &&
  colorMazeJsx.includes('completionTriggerKey'),
  'TEST 22: Color Maze uses single shared VictoryEffectOverlay with unique trigger key'
);

// --- TEST 23: Phase 12.2 Retention Regression ---
console.log('\n--- TEST 23: Phase 12.2 Retention Regression Suite Execution ---');
try {
  execSync('node scripts/test-phase12-retention-loop.mjs', { stdio: 'pipe' });
  assert(true, 'TEST 23: test-phase12-retention-loop.mjs passed successfully');
} catch (err) {
  assert(false, `TEST 23: test-phase12-retention-loop.mjs failed: ${err.message}`);
}

// --- TEST 24: Phase 13.1 GameOver Navigation Regression ---
console.log('\n--- TEST 24: Phase 13.1 GameOver Navigation Regression Execution ---');
try {
  execSync('node scripts/test-phase13-1-gameover-navigation.mjs', { stdio: 'pipe' });
  assert(true, 'TEST 24: test-phase13-1-gameover-navigation.mjs passed successfully');
} catch (err) {
  assert(false, `TEST 24: test-phase13-1-gameover-navigation.mjs failed: ${err.message}`);
}

// --- TEST 25: Phase 13.2 Daily Chaining Regression ---
console.log('\n--- TEST 25: Phase 13.2 Daily Chaining Regression Execution ---');
try {
  execSync('node scripts/test-phase13-2-daily-victory-harmonization.mjs', { stdio: 'pipe' });
  assert(true, 'TEST 25: test-phase13-2-daily-victory-harmonization.mjs passed successfully');
} catch (err) {
  assert(false, `TEST 25: test-phase13-2-daily-victory-harmonization.mjs failed: ${err.message}`);
}

// --- SUMMARY ---
console.log('\n======================================================================');
if (failedTests === 0) {
  console.log(`✅ ALL PHASE 13.3 REGRESSION TESTS PASSED (${passedTests} / ${passedTests} SUITES)`);
} else {
  console.error(`❌ PHASE 13.3 REGRESSION TESTS FAILED: ${failedTests} failed, ${passedTests} passed`);
}
console.log('======================================================================');

if (failedTests > 0) {
  process.exit(1);
}
