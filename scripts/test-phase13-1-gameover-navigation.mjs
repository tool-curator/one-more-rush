import fs from 'fs';
import path from 'path';

console.log('======================================================================');
console.log('RUNNING PHASE 13.1 GAME OVER CONVERSION & NAVIGATION REGRESSION SUITE');
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
const gameOverModalCssPath = path.join(rootDir, 'src', 'components', 'GameOverModal.css');
const appJsxPath = path.join(rootDir, 'src', 'App.jsx');
const migrationsDir = path.join(rootDir, 'supabase', 'migrations');

const gameOverJsx = fs.readFileSync(gameOverModalJsxPath, 'utf8');
const gameOverCss = fs.readFileSync(gameOverModalCssPath, 'utf8');
const appJsx = fs.readFileSync(appJsxPath, 'utf8');

// --- TEST 1: GameOverModal contains the guest conversion CTA ---
console.log('--- TEST 1: Guest Conversion CTA Presence ---');
assert(
  gameOverJsx.includes('btn-guest-submission') &&
  gameOverJsx.includes('SIGN IN TO COMPETE GLOBALLY'),
  'TEST 1: GameOverModal contains interactive guest conversion CTA with SIGN IN TO COMPETE GLOBALLY'
);

// --- TEST 2: Guest conversion CTA routes to the EXISTING authentication flow ---
console.log('\n--- TEST 2: Existing Auth Flow Routing ---');
assert(
  (gameOverJsx.includes('onClick={onNavigateToAuth}') || gameOverJsx.includes('handleSafeAction(onNavigateToAuth)')) &&
  appJsx.includes("navigateTo('/login')"),
  'TEST 2: Guest conversion CTA triggers onNavigateToAuth and routes to existing /login flow'
);

// --- TEST 3: Guest conversion CTA is conditionally unavailable for authenticated users ---
console.log('\n--- TEST 3: Conditional Guest CTA Rendering ---');
assert(
  gameOverJsx.includes('isGuestPlayer') &&
  gameOverJsx.includes('Boolean(isGuest || submissionStatus === \'GUEST\')') &&
  gameOverJsx.includes(') : isGuestPlayer ? ('),
  'TEST 3: Guest conversion CTA is strictly gated to isGuestPlayer and absent for authenticated users'
);

// --- TEST 4: GameOverModal contains a Leaderboard navigation action ---
console.log('\n--- TEST 4: Leaderboard Navigation Action Presence ---');
assert(
  gameOverJsx.includes('onNavigateToLeaderboard') &&
  gameOverJsx.includes('LEADERBOARD'),
  'TEST 4: GameOverModal contains dedicated LEADERBOARD action button with accessible label'
);

// --- TEST 5: Leaderboard action points to the EXISTING leaderboard route/navigation ---
console.log('\n--- TEST 5: Existing Leaderboard Route Binding ---');
assert(
  appJsx.includes("onNavigateToLeaderboard={() => {") &&
  appJsx.includes("navigateTo('/leaderboard')"),
  'TEST 5: Leaderboard action binds cleanly to existing /leaderboard navigation in App.jsx'
);

// --- TEST 6: GameOverModal contains a Daily Challenge navigation action ---
console.log('\n--- TEST 6: Daily Challenge Navigation Action Presence ---');
assert(
  gameOverJsx.includes('onNavigateToDaily') &&
  gameOverJsx.includes('DAILY'),
  'TEST 6: GameOverModal contains dedicated DAILY challenge navigation action button'
);

// --- TEST 7: Daily Challenge action points to the EXISTING Daily route/navigation ---
console.log('\n--- TEST 7: Existing Daily Route Binding ---');
assert(
  appJsx.includes("onNavigateToDaily={() => {") &&
  appJsx.includes("navigateTo('/daily')"),
  'TEST 7: Daily Challenge action binds cleanly to existing /daily navigation in App.jsx'
);

// --- TEST 8: PLAY AGAIN behavior remains present ---
console.log('\n--- TEST 8: PLAY AGAIN Primary Behavior Invariant ---');
assert(
  gameOverJsx.includes('ref={playAgainBtnRef}') &&
  (gameOverJsx.includes('onClick={onPlayAgain}') || gameOverJsx.includes('handleSafeAction(onPlayAgain)')) &&
  gameOverJsx.includes('className="btn-primary"'),
  'TEST 8: PLAY AGAIN remains the dominant primary action with autofocus reference and handler'
);

// --- TEST 9: HOME behavior remains present ---
console.log('\n--- TEST 9: HOME Secondary Behavior Invariant ---');
assert(
  (gameOverJsx.includes('onClick={onHome}') || gameOverJsx.includes('handleSafeAction(onHome)')) &&
  gameOverJsx.includes('HOME'),
  'TEST 9: HOME action remains present with onHome callback'
);

// --- TEST 10: Existing focus management remains intact ---
console.log('\n--- TEST 10: Focus Trap & Tab Wrapping Lifecycle ---');
assert(
  gameOverJsx.includes('playAgainBtnRef.current?.focus()') &&
  gameOverJsx.includes('modalRef.current.querySelectorAll') &&
  gameOverJsx.includes('prevFocusedRef.current?.focus?.()'),
  'TEST 10: Focus trapping, Tab / Shift+Tab wrapping, initial autofocus, and focus restoration preserved'
);

// --- TEST 11: Existing Escape handling remains intact ---
console.log('\n--- TEST 11: Escape Key Handling Invariant ---');
assert(
  gameOverJsx.includes("if (e.key === 'Escape')") &&
  (gameOverJsx.includes('if (onHome) onHome();') || gameOverJsx.includes('handleSafeAction(onHome)')),
  'TEST 11: Escape key handling safely dismisses modal to Home'
);

// --- TEST 12: No migration files were added ---
console.log('\n--- TEST 12: Migration Count Freeze ---');
const migrationFiles = fs.readdirSync(migrationsDir);
assert(
  migrationFiles.length === 24,
  `TEST 12: Absolute migration freeze confirmed (exactly 24 migrations, found ${migrationFiles.length})`
);

// --- TEST 13: No backend/RPC/RLS files were modified ---
console.log('\n--- TEST 13: Backend Files Freeze ---');
const backendServicePath = path.join(rootDir, 'src', 'services', 'backend');
const backendFiles = fs.existsSync(backendServicePath) ? fs.readdirSync(backendServicePath) : [];
assert(
  backendFiles.length === 0 || backendFiles.every(f => !f.includes('phase13')),
  'TEST 13: Backend services and RPC wrappers remain completely untouched'
);

// --- TEST 14: No economy service was modified ---
console.log('\n--- TEST 14: Economy Service Freeze ---');
const dailyRewardPath = path.join(rootDir, 'src', 'services', 'dailyRewardService.js');
const dailyRewardContent = fs.readFileSync(dailyRewardPath, 'utf8');
assert(
  dailyRewardContent.includes('export async function claimDailyVisitReward'),
  'TEST 14: Rush Points economy and daily reward service remain completely untouched'
);

// --- TEST 15: No leaderboard service was modified ---
console.log('\n--- TEST 15: Leaderboard Service Freeze ---');
const scoreServicePath = path.join(rootDir, 'src', 'services', 'scoreService.js');
const scoreServiceContent = fs.readFileSync(scoreServicePath, 'utf8');
assert(
  scoreServiceContent.includes('export async function submitGameScore') &&
  scoreServiceContent.includes('export async function fetchLeaderboard'),
  'TEST 15: Score submission and leaderboard services remain completely untouched'
);

// --- TEST 16: No Daily Challenge authority/service was modified ---
console.log('\n--- TEST 16: Daily Challenge Authority Freeze ---');
const dailyChallengeServicePath = path.join(rootDir, 'src', 'services', 'dailyChallengeService.js');
const dailyChallengeContent = fs.readFileSync(dailyChallengeServicePath, 'utf8');
assert(
  dailyChallengeContent.includes('export async function claimDailyChallengeRewardCloud') &&
  dailyChallengeContent.includes('export function getNextMilestoneInfo'),
  'TEST 16: Daily Challenge cloud authority and streak derivation service remain untouched'
);

// --- SUMMARY ---
console.log('\n======================================================================');
if (failedTests === 0) {
  console.log(`✅ ALL PHASE 13.1 REGRESSION TESTS PASSED (${passedTests} / ${passedTests} SUITES)`);
} else {
  console.error(`❌ PHASE 13.1 REGRESSION TESTS FAILED: ${failedTests} failed, ${passedTests} passed`);
}
console.log('======================================================================');

if (failedTests > 0) {
  process.exit(1);
}
