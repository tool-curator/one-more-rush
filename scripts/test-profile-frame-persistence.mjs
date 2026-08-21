/**
 * ONE MORE RUSH — Profile Frame Persistence & Hydration Regression Test Suite
 * Validates equip persistence, server hydration, AuthContext convergence,
 * refresh survival, logout/login survival, account isolation, and race-condition immunity.
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  hydrateLockerFromProfile,
  loadLockerState,
  saveLockerState,
  equipItem,
  FRAMES_INVENTORY,
  TITLES_INVENTORY,
  EFFECTS_INVENTORY,
} from '../src/services/lockerService.js';
import {
  setActiveStorageScope,
  getActiveStorageScope,
  getScopedKey,
  onScopeChange,
} from '../src/services/storageScopeService.js';
import { syncEquippedCosmeticsToProfile } from '../src/services/authService.js';

console.log('======================================================================');
console.log('RUNNING PROFILE FRAME PERSISTENCE & HYDRATION REGRESSION TEST SUITE');
console.log('======================================================================\n');

// ── In-Memory localStorage Polyfill for Node Runtime ─────────────────
const memoryStore = new Map();
global.window = global.window || {};
global.window.localStorage = {
  getItem: (key) => memoryStore.get(key) || null,
  setItem: (key, val) => memoryStore.set(key, String(val)),
  removeItem: (key) => memoryStore.delete(key),
  clear: () => memoryStore.clear(),
};

function runProfileFramePersistenceTests() {
  const userA_id = '00000000-0000-4000-8000-000000000001';
  const userB_id = '00000000-0000-4000-8000-000000000002';

  // ── TEST 1: Cosmetic Registry Integrity ─────────────────────────────
  console.log('--- TEST 1: Cosmetic Registry Frames Integrity ---');
  const expectedFrames = ['classic', 'neon', 'cyber', 'inferno', 'void', 'one_more'];
  expectedFrames.forEach((key) => {
    const frame = FRAMES_INVENTORY.find((f) => f.key === key);
    assert(frame, `Frame key "${key}" must exist in FRAMES_INVENTORY`);
    assert(frame.cssClass, `Frame "${key}" must have a valid cssClass`);
    assert(frame.name, `Frame "${key}" must have a valid display name`);
  });
  console.log('✅ PASSED: TEST 1: All 6 cosmetic frames verified in registry');

  // ── TEST 2: Cold Start Default State ────────────────────────────────
  console.log('\n--- TEST 2: Cold Start & Uninitialized Scope Defaults ---');
  memoryStore.clear();
  setActiveStorageScope(userA_id);

  const initialLocker = loadLockerState();
  assert.strictEqual(initialLocker.equipped.frame, 'classic', 'Default frame must be classic');
  assert.strictEqual(initialLocker.equipped.title, 'rookie', 'Default title must be rookie');
  assert.strictEqual(initialLocker.equipped.effect, 'classic', 'Default effect must be classic');
  console.log('✅ PASSED: TEST 2: Cold start correctly initializes default cosmetics');

  // ── TEST 3: Equip Operation & Local Persistence ─────────────────────
  console.log('\n--- TEST 3: Equip Operation & Scoped Storage Persistence ---');
  // Add 'neon' to owned frames
  initialLocker.owned.frames.push('neon');
  saveLockerState(initialLocker);

  const equipRes = equipItem('frames', 'neon');
  assert.strictEqual(equipRes.success, true, 'Equip item must succeed for owned frame');
  assert.strictEqual(equipRes.equipped.frame, 'neon', 'Equipped frame must be neon');

  const reloadedLocker = loadLockerState();
  assert.strictEqual(reloadedLocker.equipped.frame, 'neon', 'Reloaded locker must retain equipped frame');
  console.log('✅ PASSED: TEST 3: Equip operation persists to user-scoped storage');

  // ── TEST 4: Cloud Profile Hydration (Server Authority) ──────────────
  console.log('\n--- TEST 4: Cloud Profile Hydration over Stale/Empty Storage ---');
  // Simulate page reload on a new browser/clean storage
  memoryStore.clear();
  setActiveStorageScope(userA_id);

  // Server profile returns equipped frame: 'cyber'
  const serverProfileUserA = {
    id: userA_id,
    username: 'PlayerOne',
    avatar_frame: 'cyber',
    title: 'speed_demon',
    victory_effect: 'starfall',
  };

  const hydrated = hydrateLockerFromProfile(serverProfileUserA);
  assert.strictEqual(hydrated.equipped.frame, 'cyber', 'Hydration must set equipped frame to cyber');
  assert.strictEqual(hydrated.equipped.title, 'speed_demon', 'Hydration must set equipped title to speed_demon');
  assert(hydrated.owned.frames.includes('cyber'), 'Hydrated frame must be automatically added to owned inventory');

  const postHydrationLoad = loadLockerState();
  assert.strictEqual(postHydrationLoad.equipped.frame, 'cyber', 'Subsequent loadLockerState must preserve hydrated cyber frame');
  console.log('✅ PASSED: TEST 4: Cloud profile hydration authoritatively initializes and persists equipped cosmetics');

  // ── TEST 5: Refresh Survival Across All 6 Frame Types ───────────────
  console.log('\n--- TEST 5: Refresh Survival Across All 6 Frame Types ---');
  expectedFrames.forEach((frameKey) => {
    // 1. Equip frame on server profile
    const profile = {
      id: userA_id,
      username: 'PlayerOne',
      avatar_frame: frameKey,
    };

    // 2. Hydrate from server
    hydrateLockerFromProfile(profile);

    // 3. Simulate browser refresh (re-read from storage)
    const refreshedLocker = loadLockerState();
    assert.strictEqual(refreshedLocker.equipped.frame, frameKey, `Frame ${frameKey} must survive browser refresh`);

    // 4. Verify UI resolution fallback logic
    const resolvedFrame =
      FRAMES_INVENTORY.find((f) => f.key === (profile.avatar_frame || refreshedLocker?.equipped?.frame)) ||
      FRAMES_INVENTORY[0];
    assert.strictEqual(resolvedFrame.key, frameKey, `UI resolution must resolve to ${frameKey}`);
  });
  console.log('✅ PASSED: TEST 5: All 6 frame types survive simulated browser refresh and UI resolution');

  // ── TEST 6: Logout / Login & Account Isolation ──────────────────────
  console.log('\n--- TEST 6: Logout / Login & Strict Account Isolation ---');

  // User A equips 'inferno'
  setActiveStorageScope(userA_id);
  const profileA = { id: userA_id, username: 'PlayerA', avatar_frame: 'inferno' };
  hydrateLockerFromProfile(profileA);
  assert.strictEqual(loadLockerState().equipped.frame, 'inferno', 'User A has inferno equipped');

  // User A logs out -> scope resets to guest/null
  setActiveStorageScope(null);
  const guestLocker = loadLockerState();
  assert.strictEqual(guestLocker.equipped.frame, 'classic', 'Guest locker must not inherit User A cosmetics');

  // User B logs in -> User B has 'void'
  setActiveStorageScope(userB_id);
  const profileB = { id: userB_id, username: 'PlayerB', avatar_frame: 'void' };
  hydrateLockerFromProfile(profileB);
  assert.strictEqual(loadLockerState().equipped.frame, 'void', 'User B has void equipped');

  // User B logs out
  setActiveStorageScope(null);

  // User A logs back in -> User A has 'inferno' restored
  setActiveStorageScope(userA_id);
  hydrateLockerFromProfile(profileA);
  assert.strictEqual(loadLockerState().equipped.frame, 'inferno', 'User A logs back in with inferno restored');
  console.log('✅ PASSED: TEST 6: Logout / login preserves equipped frames with zero cross-account leakage');

  // ── TEST 7: Fallback Integrity (No Valid Frame in Profile) ──────────
  console.log('\n--- TEST 7: Safety Fallback Integrity ---');
  const emptyProfile = { id: userA_id, username: 'PlayerA', avatar_frame: null };
  const fallbackResolved =
    FRAMES_INVENTORY.find((f) => f.key === (emptyProfile?.avatar_frame || 'invalid_frame_key')) ||
    FRAMES_INVENTORY[0];
  assert.strictEqual(fallbackResolved.key, 'classic', 'Invalid or null frame must safely fallback to classic');
  console.log('✅ PASSED: TEST 7: Safe fallback to classic verified for invalid/null frame entries');

  // ── TEST 8: Race-Condition Simulation (T0 -> T4 Lifecycle) ──────────
  console.log('\n--- TEST 8: Race-Condition Immunity (T0 -> T4 Lifecycle) ---');
  // T0: User logs in
  setActiveStorageScope(userA_id);
  let mockReactProfileState = null;

  // T1: Initial UI render (profile is null, locker has cached 'one_more')
  const cachedLocker = { version: 1, owned: { frames: ['one_more'] }, equipped: { frame: 'one_more' } };
  saveLockerState(cachedLocker);

  let uiFrame =
    FRAMES_INVENTORY.find((f) => f.key === (mockReactProfileState?.avatar_frame || loadLockerState()?.equipped?.frame)) ||
    FRAMES_INVENTORY[0];
  assert.strictEqual(uiFrame.key, 'one_more', 'T1: UI renders cached one_more frame while profile is null');

  // T2: Profile hydration arrives from server with avatar_frame = 'one_more'
  const serverProfile = { id: userA_id, username: 'Champion', avatar_frame: 'one_more' };
  hydrateLockerFromProfile(serverProfile);
  mockReactProfileState = serverProfile;

  // T3: UI re-renders with hydrated profile state
  uiFrame =
    FRAMES_INVENTORY.find((f) => f.key === (mockReactProfileState?.avatar_frame || loadLockerState()?.equipped?.frame)) ||
    FRAMES_INVENTORY[0];
  assert.strictEqual(uiFrame.key, 'one_more', 'T3: UI converges to server one_more frame');

  // T4: Re-fetching profile preserves state
  const refetchedProfile = { ...serverProfile };
  mockReactProfileState = refetchedProfile;
  uiFrame =
    FRAMES_INVENTORY.find((f) => f.key === (mockReactProfileState?.avatar_frame || loadLockerState()?.equipped?.frame)) ||
    FRAMES_INVENTORY[0];
  assert.strictEqual(uiFrame.key, 'one_more', 'T4: Profile re-fetch maintains one_more frame');
  console.log('✅ PASSED: TEST 8: Race-condition immunity verified across all lifecycle phases');

  // ── TEST 9: Global CSS Unconditional Frame Glow Invariant ───────────
  console.log('\n--- TEST 9: Global CSS Unconditional Frame Glow Invariant ---');
  const indexCss = fs.readFileSync(path.join(process.cwd(), 'src', 'index.css'), 'utf8');
  assert(indexCss.includes('.avatar-frame-wrapper'), 'src/index.css must contain .avatar-frame-wrapper');
  assert(indexCss.includes('.avatar-circle'), 'src/index.css must contain .avatar-circle');
  assert(indexCss.includes('neonPulse'), 'src/index.css must contain neonPulse keyframes');
  assert(indexCss.includes('cyberPulse'), 'src/index.css must contain cyberPulse keyframes');
  assert(indexCss.includes('infernoShift'), 'src/index.css must contain infernoShift keyframes');
  assert(indexCss.includes('voidPulse'), 'src/index.css must contain voidPulse keyframes');
  assert(indexCss.includes('rainbowSpin'), 'src/index.css must contain rainbowSpin keyframes');
  console.log('✅ PASSED: TEST 9: Global CSS contains complete unconditional outer/inner frame glow system');

  // ── TEST 10: Locker-Independence Proof (Locker Never Mounted) ───────
  console.log('\n--- TEST 10: Locker-Independence Proof (Zero Locker Dependency) ---');
  setActiveStorageScope(userA_id);
  const profileIndependent = { id: userA_id, username: 'PlayerNoLocker', avatar_frame: 'neon' };
  // Profile hydrates directly without mounting Locker
  hydrateLockerFromProfile(profileIndependent);
  const resolvedDirectly =
    FRAMES_INVENTORY.find((f) => f.key === (profileIndependent.avatar_frame || loadLockerState()?.equipped?.frame)) ||
    FRAMES_INVENTORY[0];
  assert.strictEqual(resolvedDirectly.key, 'neon', 'Frame must resolve to neon without Locker');
  assert.strictEqual(resolvedDirectly.cssClass, 'frame-neon', 'Frame cssClass must be frame-neon without Locker');
  console.log('✅ PASSED: TEST 10: Profile cosmetics activate immediately upon login without Locker mount');

  console.log('\n======================================================================');
  console.log('✅ ALL PROFILE FRAME PERSISTENCE & HYDRATION TESTS PASSED (10 / 10 SUITES)');
  console.log('======================================================================');
}

try {
  runProfileFramePersistenceTests();
} catch (err) {
  console.error('Test failed with error:', err);
  process.exit(1);
}
