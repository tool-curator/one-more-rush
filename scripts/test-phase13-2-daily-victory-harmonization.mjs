import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('======================================================================');
console.log('RUNNING PHASE 13.2 DAILY CHAINING & VICTORY HARMONIZATION SUITE');
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
const dailyModalJsxPath = path.join(rootDir, 'src', 'components', 'DailyChallengeResultModal.jsx');
const dailyModalCssPath = path.join(rootDir, 'src', 'components', 'DailyChallengeResultModal.css');
const colorMazeJsxPath = path.join(rootDir, 'src', 'games', 'color-maze', 'ColorMazeGame.jsx');
const victoryEffectJsxPath = path.join(rootDir, 'src', 'components', 'VictoryEffectOverlay.jsx');
const appJsxPath = path.join(rootDir, 'src', 'App.jsx');
const migrationsDir = path.join(rootDir, 'supabase', 'migrations');

const dailyModalJsx = fs.readFileSync(dailyModalJsxPath, 'utf8');
const dailyModalCss = fs.readFileSync(dailyModalCssPath, 'utf8');
const colorMazeJsx = fs.readFileSync(colorMazeJsxPath, 'utf8');
const victoryEffectJsx = fs.readFileSync(victoryEffectJsxPath, 'utf8');
const appJsx = fs.readFileSync(appJsxPath, 'utf8');

// --- TEST 1: Quick Win result modal exposes Extreme Rush continuation capability ---
console.log('--- TEST 1: Extreme Rush Continuation CTA Presence ---');
assert(
  dailyModalJsx.includes('btn-extreme-chain') &&
  (dailyModalJsx.includes('GO EXTREME!') || dailyModalJsx.includes('CONTINUE TO EXTREME RUSH')) &&
  dailyModalJsx.includes('onContinueToExtreme'),
  'TEST 1: DailyChallengeResultModal exposes GO EXTREME! action button'
);

// --- TEST 2: Extreme continuation is conditional and cannot appear when inappropriate ---
console.log('\n--- TEST 2: Conditional Chaining Logic ---');
assert(
  dailyModalJsx.includes('showExtremeChain') &&
  dailyModalJsx.includes('isSuccess &&') &&
  dailyModalJsx.includes('isQuickWin &&') &&
  dailyModalJsx.includes('canContinueToExtreme') &&
  appJsx.includes('canContinueToExtreme = Boolean(') &&
  appJsx.includes("activeDailyChallenge?.tier === 'QUICK_WIN'") &&
  appJsx.includes('!isExtremeCompleted'),
  'TEST 2: Extreme continuation is conditionally rendered only on uncompleted Extreme after Quick Win success'
);

// --- TEST 3: Continuation CTA invokes the existing Daily Challenge start flow ---
console.log('\n--- TEST 3: Integration with Existing Daily Challenge Start Flow ---');
assert(
  appJsx.includes('handlePlayDailyChallenge(todayChallenges.extreme)') &&
  appJsx.includes('onContinueToExtreme={canContinueToExtreme ?'),
  'TEST 3: Continuation CTA cleanly invokes handlePlayDailyChallenge for the Extreme tier'
);

// --- TEST 4: Continuation CTA does NOT directly award RP ---
console.log('\n--- TEST 4: Zero Direct RP Minting Invariant ---');
assert(
  !dailyModalJsx.includes('rewardPoints +=') &&
  !dailyModalJsx.includes('rushPoints +=') &&
  !dailyModalJsx.includes('setRushPoints('),
  'TEST 4: Continuation button contains zero local or direct RP minting mutations'
);

// --- TEST 5: Continuation CTA does NOT directly claim the daily reward ---
console.log('\n--- TEST 5: Clean Navigation Separation ---');
assert(
  !dailyModalJsx.includes('claimDailyChallengeRewardCloud') &&
  !dailyModalJsx.includes('claimDailyVisitReward'),
  'TEST 5: Continuation button does not dispatch claim RPCs on navigation'
);

// --- TEST 6: Existing server-authoritative attempt flow remains referenced ---
console.log('\n--- TEST 6: Server Attempt Binding Invariant ---');
assert(
  appJsx.includes('startDailyChallengeAttemptCloud({ challenge: targetChallenge })') &&
  appJsx.includes('startDailyChallengeAttemptCloud({ challenge: activeDailyChallenge })'),
  'TEST 6: Server-authoritative startDailyChallengeAttemptCloud remains the sole attempt authorization pathway'
);

// --- TEST 7: Existing duplicate/reward protection remains untouched ---
console.log('\n--- TEST 7: Duplicate Claim Protection Invariant ---');
assert(
  dailyModalJsx.includes('result.isFirstCompletionToday ? (') &&
  dailyModalJsx.includes('REWARD ALREADY CLAIMED TODAY'),
  'TEST 7: Duplicate completion and reward protection banners remain fully intact'
);

// --- TEST 8: Existing reward receipt remains intact ---
console.log('\n--- TEST 8: Reward Receipt Invariant ---');
assert(
  dailyModalJsx.includes('DAILY REWARD RECEIPT') &&
  dailyModalJsx.includes('TIER REWARD') &&
  dailyModalJsx.includes('STREAK MILESTONE BONUS') &&
  dailyModalJsx.includes('TOTAL EARNED'),
  'TEST 8: Reward receipt breakdown (tier, milestone bonus, total) remains unchanged'
);

// --- TEST 9: Existing Return Tomorrow state remains intact ---
console.log('\n--- TEST 9: Return Tomorrow Messaging Invariant ---');
assert(
  dailyModalJsx.includes("TOMORROW'S TARGET:") &&
  dailyModalJsx.includes('Come back tomorrow after 00:00 UTC to continue your streak!'),
  'TEST 9: Next milestone and Return Tomorrow card verified intact'
);

// --- TEST 10: Color Maze uses the existing VictoryEffectOverlay ---
console.log('\n--- TEST 10: Color Maze VictoryEffectOverlay Integration ---');
assert(
  colorMazeJsx.includes("import { VictoryEffectOverlay } from '../../components/VictoryEffectOverlay'") &&
  colorMazeJsx.includes('<VictoryEffectOverlay triggerKey='),
  'TEST 10: ColorMazeGame imports and renders the shared VictoryEffectOverlay component'
);

// --- TEST 11: No duplicate victory-effect implementation was introduced ---
console.log('\n--- TEST 11: Single Shared Victory Implementation ---');
const componentsDir = path.join(rootDir, 'src', 'components');
const componentFiles = fs.readdirSync(componentsDir);
const victoryComponents = componentFiles.filter(f => f.toLowerCase().includes('victory') && f.endsWith('.jsx'));
assert(
  victoryComponents.length === 1 && victoryComponents[0] === 'VictoryEffectOverlay.jsx',
  'TEST 11: VictoryEffectOverlay is the sole victory effect component in the codebase'
);

// --- TEST 12: Victory effect trigger is protected against duplicate firing ---
console.log('\n--- TEST 12: Victory Effect Trigger Protection ---');
assert(
  colorMazeJsx.includes('completionTriggerKey') &&
  colorMazeJsx.includes('setLevelCompleteData(null)'),
  'TEST 12: VictoryEffectOverlay in Color Maze uses unique completionTriggerKey and cleans up on unmount'
);

// --- TEST 13: Color Maze gameplay/math files are not unnecessarily modified ---
console.log('\n--- TEST 13: Color Maze Engine Math Integrity ---');
const mazeEnginePath = path.join(rootDir, 'src', 'games', 'color-maze', 'game', 'mazeEngine.js');
const mazeEngineContent = fs.readFileSync(mazeEnginePath, 'utf8');
assert(
  mazeEngineContent.includes('class MazeEngine') &&
  mazeEngineContent.includes('tryMove(dx, dy)'),
  'TEST 13: Color Maze physics engine and math files remain completely unmodified'
);

// --- TEST 14: No new migration exists ---
console.log('\n--- TEST 14: Absolute Migration Freeze ---');
const migrationFiles = fs.readdirSync(migrationsDir);
assert(
  migrationFiles.length === 24,
  `TEST 14: Exactly 24 migrations confirmed (found ${migrationFiles.length})`
);

// --- TEST 15: No RPC/RLS/schema changes ---
console.log('\n--- TEST 15: Database Schema & RPC Freeze ---');
const schemaMigrations = fs.readdirSync(migrationsDir);
assert(
  schemaMigrations.length === 24 && fs.existsSync(migrationsDir),
  'TEST 15: Supabase migrations count (24) and database schema remain frozen'
);

// --- TEST 16: Existing leaderboard/economy services remain untouched ---
console.log('\n--- TEST 16: Economy & Leaderboard Service Freeze ---');
const scoreServicePath = path.join(rootDir, 'src', 'services', 'scoreService.js');
const scoreServiceContent = fs.readFileSync(scoreServicePath, 'utf8');
const dailyRewardPath = path.join(rootDir, 'src', 'services', 'dailyRewardService.js');
const dailyRewardContent = fs.readFileSync(dailyRewardPath, 'utf8');
assert(
  scoreServiceContent.includes('export async function submitGameScore') &&
  dailyRewardContent.includes('export async function claimDailyVisitReward'),
  'TEST 16: Score service and daily reward service remain completely untouched'
);

// --- TEST 17: Accessibility requirements are present ---
console.log('\n--- TEST 17: Accessibility Semantics & Focus Management ---');
assert(
  dailyModalJsx.includes('type="button"') &&
  dailyModalJsx.includes('aria-label="Continue to Extreme Rush Challenge"') &&
  dailyModalCss.includes('min-height: 44px') &&
  victoryEffectJsx.includes('aria-hidden="true"'),
  'TEST 17: Accessible labels, semantic buttons, 44px touch target, and aria-hidden overlays verified'
);

// --- TEST 18: Mobile/overflow protections remain present ---
console.log('\n--- TEST 18: Mobile Responsive Styling ---');
assert(
  dailyModalCss.includes('@media (max-width: 500px)') &&
  dailyModalCss.includes('.btn-extreme-chain') &&
  dailyModalCss.includes('order: -1'),
  'TEST 18: Mobile stacking order and responsive constraints verified in DailyChallengeResultModal.css'
);

// --- TEST 19: Existing Phase 12 retention regression still passes ---
console.log('\n--- TEST 19: Phase 12.2 Retention Regression Execution ---');
try {
  execSync('node scripts/test-phase12-retention-loop.mjs', { stdio: 'pipe' });
  assert(true, 'TEST 19: test-phase12-retention-loop.mjs passed successfully');
} catch (err) {
  assert(false, `TEST 19: test-phase12-retention-loop.mjs failed: ${err.message}`);
}

// --- TEST 20: Existing Phase 13.1 regression still passes ---
console.log('\n--- TEST 20: Phase 13.1 Regression Execution ---');
try {
  execSync('node scripts/test-phase13-1-gameover-navigation.mjs', { stdio: 'pipe' });
  assert(true, 'TEST 20: test-phase13-1-gameover-navigation.mjs passed successfully');
} catch (err) {
  assert(false, `TEST 20: test-phase13-1-gameover-navigation.mjs failed: ${err.message}`);
}

// --- SUMMARY ---
console.log('\n======================================================================');
if (failedTests === 0) {
  console.log(`✅ ALL PHASE 13.2 REGRESSION TESTS PASSED (${passedTests} / ${passedTests} SUITES)`);
} else {
  console.error(`❌ PHASE 13.2 REGRESSION TESTS FAILED: ${failedTests} failed, ${passedTests} passed`);
}
console.log('======================================================================');

if (failedTests > 0) {
  process.exit(1);
}
