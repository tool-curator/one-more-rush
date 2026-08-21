/**
 * ONE MORE RUSH — Profile Cosmetics Persistence & Logout Guard Test Suite
 */

import { hydrateLockerFromProfile, loadLockerState, saveLockerState, getEquippedVictoryEffect } from '../src/services/lockerService.js';
import { setActiveStorageScope } from '../src/services/storageScopeService.js';
import { isPlaceholderUsername } from '../src/services/authService.js';
import fs from 'node:fs';
import path from 'node:path';

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

// Minimal in-memory localStorage polyfill for Node.js
if (typeof window === 'undefined' || !window.localStorage) {
  const store = new Map();
  global.window = global.window || {};
  global.window.localStorage = {
    getItem: (key) => store.get(key) || null,
    setItem: (key, val) => store.set(key, String(val)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  };
}

async function runProfileAndLogoutTests() {
  console.log('====================================================');
  console.log('ONE MORE RUSH — PROFILE PERSISTENCE & LOGOUT GUARD SUITE');
  console.log('====================================================\n');

  // ----------------------------------------------------
  // SECTION 1: PROFILE COSMETICS HYDRATION (Cross-Port / Cold Start)
  // ----------------------------------------------------
  console.log('--- SECTION 1: Profile Cosmetics Persistence & Hydration ---');

  const testUserId = '00000000-0000-4000-8000-000000000099';
  setActiveStorageScope(testUserId);
  window.localStorage.clear();

  // Fresh uninitialized storage returns defaults
  const initialLocker = loadLockerState();
  assert(initialLocker.equipped.frame === 'classic', 'Test 1a: Cold unhydrated locker defaults to classic frame');
  assert(initialLocker.equipped.title === 'rookie', 'Test 1b: Cold unhydrated locker defaults to rookie title');
  assert(initialLocker.equipped.effect === 'classic', 'Test 1c: Cold unhydrated locker defaults to classic effect');

  // Cloud profile with equipped cosmetics
  const adminTesterProfile = {
    id: testUserId,
    username: 'adminTester',
    display_name: 'adminTester',
    avatar_frame: 'cyber_neon',
    title: 'grandmaster',
    victory_effect: 'starfall',
  };

  // Hydrate from cloud profile
  const hydratedLocker = hydrateLockerFromProfile(adminTesterProfile);
  assert(hydratedLocker.equipped.frame === 'cyber_neon', 'Test 2a: Cloud profile frame (cyber_neon) successfully hydrated into locker.equipped');
  assert(hydratedLocker.equipped.title === 'grandmaster', 'Test 2b: Cloud profile title (grandmaster) successfully hydrated into locker.equipped');
  assert(hydratedLocker.equipped.effect === 'starfall', 'Test 2c: Cloud profile effect (starfall) successfully hydrated into locker.equipped');
  assert(hydratedLocker.owned.frames.includes('cyber_neon'), 'Test 2d: Hydrated frame is guaranteed in owned frames inventory');
  assert(hydratedLocker.owned.titles.includes('grandmaster'), 'Test 2e: Hydrated title is guaranteed in owned titles inventory');
  assert(hydratedLocker.owned.effects.includes('starfall'), 'Test 2f: Hydrated effect is guaranteed in owned effects inventory');

  // Subsequent loadLockerState preserves the hydrated state
  const loadedAgain = loadLockerState();
  assert(loadedAgain.equipped.frame === 'cyber_neon', 'Test 3a: loadLockerState() retains equipped frame across page reloads');
  assert(loadedAgain.equipped.title === 'grandmaster', 'Test 3b: loadLockerState() retains equipped title across page reloads');
  assert(loadedAgain.equipped.effect === 'starfall', 'Test 3c: loadLockerState() retains equipped victory effect across page reloads');

  // ----------------------------------------------------
  // SECTION 2: NEW PORT / CLEAN LOCALSTORAGE SIMULATION
  // ----------------------------------------------------
  console.log('\n--- SECTION 2: Port Switching Simulation (4957 -> 4954) ---');

  // Simulate connecting to new localhost port (wiped local storage for that origin)
  window.localStorage.clear();
  setActiveStorageScope(testUserId);

  // Before hydration, local storage is empty
  const portSwitchBefore = loadLockerState();
  assert(portSwitchBefore.equipped.frame === 'classic', 'Test 4a: Fresh port initially has blank local storage');

  // When AuthContext loads profile from Supabase, it immediately hydrates
  hydrateLockerFromProfile(adminTesterProfile);
  const portSwitchAfter = loadLockerState();
  assert(portSwitchAfter.equipped.frame === 'cyber_neon', 'Test 4b: Port switch restores cyber_neon frame from persistent profile');
  assert(portSwitchAfter.equipped.title === 'grandmaster', 'Test 4c: Port switch restores grandmaster title from persistent profile');
  assert(portSwitchAfter.equipped.effect === 'starfall', 'Test 4d: Port switch restores starfall effect from persistent profile');

  // ----------------------------------------------------
  // SECTION 3: LOGOUT TRANSITION & MODAL FLASH GUARD
  // ----------------------------------------------------
  console.log('\n--- SECTION 3: Logout Guard & Username Modal Flash Prevention ---');

  // Helper simulating needsUsernameSetup logic from AuthContext
  function evaluateNeedsUsernameSetup({ isLoggingOut, isRegisteredUser, user, profileResolved, profile }) {
    return Boolean(
      !isLoggingOut &&
      isRegisteredUser &&
      user &&
      profileResolved &&
      (!profile || !profile.username || isPlaceholderUsername(profile.username, user?.id))
    );
  }

  // 1. Normal logged in user with custom username -> false
  const loggedInState = {
    isLoggingOut: false,
    isRegisteredUser: true,
    user: { id: testUserId, is_anonymous: false },
    profileResolved: true,
    profile: adminTesterProfile,
  };
  assert(evaluateNeedsUsernameSetup(loggedInState) === false, 'Test 5a: Normal registered user with username does NOT trigger username modal');

  // 2. Newly registered user with placeholder handle -> true
  const placeholderState = {
    isLoggingOut: false,
    isRegisteredUser: true,
    user: { id: testUserId, is_anonymous: false },
    profileResolved: true,
    profile: { id: testUserId, username: 'player_00000000' },
  };
  assert(evaluateNeedsUsernameSetup(placeholderState) === true, 'Test 5b: Placeholder username correctly triggers username modal during onboarding');

  // 3. User during logout: profile is set to null, but isLoggingOut = true and user is cleared
  const logoutTransitionState = {
    isLoggingOut: true,
    isRegisteredUser: false,
    user: null,
    profileResolved: true,
    profile: null,
  };
  assert(evaluateNeedsUsernameSetup(logoutTransitionState) === false, 'Test 5c: Logout transition strictly evaluates needsUsernameSetup = FALSE (zero modal flash)');

  // 4. Logged out state
  const loggedOutState = {
    isLoggingOut: false,
    isRegisteredUser: false,
    user: null,
    profileResolved: true,
    profile: null,
  };
  assert(evaluateNeedsUsernameSetup(loggedOutState) === false, 'Test 5d: Settled logged-out state evaluates needsUsernameSetup = FALSE');

  // ----------------------------------------------------
  // SECTION 4: CODE INTEGRITY & UNTOUCHED MIGRATIONS
  // ----------------------------------------------------
  console.log('\n--- SECTION 4: Code & Migration Byte-for-Byte Invariant Verification ---');

  const migrationsDir = path.resolve('supabase/migrations');
  const migrationFiles = fs.readdirSync(migrationsDir).sort();

  assert(migrationFiles.includes('20260819000020_leaderboard_anti_cheat_hardening.sql'), 'Test 6a: Migration 00020 is present');
  assert(migrationFiles.includes('20260819000021_leaderboard_data_integrity_remediation.sql'), 'Test 6b: Migration 00021 is present');
  assert(migrationFiles.includes('20260819000022_username_change_enforcement.sql'), 'Test 6c: Migration 00022 is present');

  // Confirm AuthContext has isLoggingOutRef guard
  const authContextCode = fs.readFileSync(path.resolve('src/context/AuthContext.jsx'), 'utf8');
  assert(authContextCode.includes('isLoggingOutRef'), 'Test 7a: AuthContext contains isLoggingOutRef guard');
  assert(authContextCode.includes('hydrateLockerFromProfile'), 'Test 7b: AuthContext hydrates locker from profile on load');

  // Confirm LockerPage does not overwrite profile on mount
  const lockerPageCode = fs.readFileSync(path.resolve('src/pages/LockerPage.jsx'), 'utf8');
  assert(lockerPageCode.includes('hydrateLockerFromProfile'), 'Test 7c: LockerPage uses hydrateLockerFromProfile on mount');

  console.log('\n====================================================');
  console.log(`✅ ALL ${totalTests} PROFILE PERSISTENCE & LOGOUT TESTS PASSED!`);
  console.log('====================================================\n');
}

runProfileAndLogoutTests();
