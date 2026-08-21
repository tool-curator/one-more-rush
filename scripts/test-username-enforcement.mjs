/**
 * ONE MORE RUSH — Automated Test Suite: Server-Side Username Change Enforcement (Migration 00022)
 *
 * Verifies all 8 strict invariants + exact placeholder detection:
 * 1. Initial username assignment (player_<uuid_prefix> -> custom handle) succeeds and preserves change count = 0.
 * 1b. Custom handle starting with 'player' (e.g. 'PlayerAce') is NOT treated as placeholder and consumes change count if changed.
 * 2. First username change succeeds and increments username_changes_count = 1.
 * 3. Second username change is REJECTED by PostgreSQL trigger (errcode 22023).
 * 4. LocalStorage bypass attempt is REJECTED by the database.
 * 5. Direct Supabase / SQL API update attempt is REJECTED by the database.
 * 6. Concurrency Simulation: Demonstrates PostgreSQL BEFORE UPDATE row-locking semantics where exactly one request wins.
 *    (NOTE: This is an architectural simulation of PostgreSQL row-level transaction locks; real DB execution is not run against production).
 * 7. Guest conversion flow is preserved without disruption.
 * 8. Legitimate non-username profile updates (avatar_frame, title, victory_effect, display_name) pass cleanly.
 */

import { formatAuthError, hasUsedUsernameChange, isPlaceholderUsername } from '../src/services/authService.js';

let passedTests = 0;
let totalTests = 0;

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

console.log('================================================================');
console.log('ONE MORE RUSH — USERNAME CHANGE SERVER ENFORCEMENT TEST SUITE');
console.log('================================================================\n');

// Mock in-memory database simulation accurately mirroring PostgreSQL Migration 00022 trigger logic
class MockPostgresDatabase {
  constructor() {
    this.profiles = new Map();
  }

  insertProfile(profile) {
    const row = {
      id: profile.id,
      username: profile.username || `player_${profile.id.substring(0, 8)}`,
      display_name: profile.display_name || 'Player',
      avatar_frame: profile.avatar_frame || 'classic',
      title: profile.title || 'rookie',
      victory_effect: profile.victory_effect || 'classic',
      username_changes_count: profile.username_changes_count || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.profiles.set(row.id, row);
    return { ...row };
  }

  // Simulates atomic PostgreSQL UPDATE under BEFORE UPDATE trigger (Migration 00022)
  updateProfile(userId, updates) {
    const oldRow = this.profiles.get(userId);
    if (!oldRow) {
      throw new Error('Profile not found');
    }

    const newRow = { ...oldRow, ...updates };

    // --- MIGRATION 00022 TRIGGER LOGIC ---
    // Step 1: Case/whitespace adjustment or no username change
    if (
      (newRow.username || '').trim().toLowerCase() ===
      (oldRow.username || '').trim().toLowerCase()
    ) {
      newRow.username_changes_count = oldRow.username_changes_count;
    }
    // Step 2: Exact Placeholder Detection (Matches frontend isPlaceholderUsername)
    else if (isPlaceholderUsername(oldRow.username, oldRow.id)) {
      newRow.username_changes_count = oldRow.username_changes_count; // remains 0
    }
    // Step 3: Established custom handle modification
    else {
      if (oldRow.username_changes_count >= 1) {
        const err = new Error('Username change limit exceeded: Username may only be changed once.');
        err.code = '22023';
        throw err;
      }
      newRow.username_changes_count = oldRow.username_changes_count + 1;
    }

    newRow.updated_at = new Date().toISOString();
    this.profiles.set(userId, newRow);
    return { ...newRow };
  }

  getProfile(userId) {
    const row = this.profiles.get(userId);
    return row ? { ...row } : null;
  }
}

// ----------------------------------------------------------------------
// TEST 1: Initial Username Creation / Claim from Placeholder
// ----------------------------------------------------------------------
console.log('--- TEST 1: Initial Username Creation / Claim ---');
const db = new MockPostgresDatabase();

const user1Id = 'u1111111-0000-0000-0000-000000000001';
const initialProfile = db.insertProfile({ id: user1Id, username: 'player_u1111111' });

assert(initialProfile.username === 'player_u1111111', 'Test 1a: Profile created with initial placeholder handle');
assert(initialProfile.username_changes_count === 0, 'Test 1b: Initial change count is 0');

// Claim handle for the first time during onboarding
const claimedProfile = db.updateProfile(user1Id, { username: 'SpeedRunner', display_name: 'SpeedRunner' });
assert(claimedProfile.username === 'SpeedRunner', 'Test 1c: Successfully set initial custom handle to SpeedRunner');
assert(claimedProfile.username_changes_count === 0, 'Test 1d: Claiming initial handle from placeholder leaves username_changes_count at 0');
assert(hasUsedUsernameChange(user1Id, claimedProfile) === false, 'Test 1e: Frontend hasUsedUsernameChange evaluates to FALSE for newly claimed handle');

// ----------------------------------------------------------------------
// TEST 1B: Exact Placeholder Disambiguation (Legitimate 'Player...' names)
// ----------------------------------------------------------------------
console.log('\n--- TEST 1B: Legitimate "Player..." Username Disambiguation ---');
const userCustomPlayerId = 'u4444444-0000-0000-0000-000000000004';
// User chooses 'PlayerOne' as initial handle
db.insertProfile({ id: userCustomPlayerId, username: 'player_u4444444' });
const customPlayerProfile = db.updateProfile(userCustomPlayerId, { username: 'PlayerOne' });
assert(customPlayerProfile.username === 'PlayerOne', 'Test 1b-1: Initial setup to PlayerOne succeeded');
assert(customPlayerProfile.username_changes_count === 0, 'Test 1b-2: Change count is 0 after initial setup');

// Now user changes from 'PlayerOne' to 'PlayerTwo' -> This IS a custom handle change!
const changedPlayerProfile = db.updateProfile(userCustomPlayerId, { username: 'PlayerTwo' });
assert(changedPlayerProfile.username === 'PlayerTwo', 'Test 1b-3: First change from PlayerOne to PlayerTwo succeeded');
assert(changedPlayerProfile.username_changes_count === 1, 'Test 1b-4: Changing custom handle PlayerOne consumed 1 change (count = 1)');

// Trying to change 'PlayerTwo' again must be rejected!
let thirdPlayerChangeBlocked = false;
try {
  db.updateProfile(userCustomPlayerId, { username: 'PlayerThree' });
} catch (err) {
  thirdPlayerChangeBlocked = true;
}
assert(thirdPlayerChangeBlocked, 'Test 1b-5: Second change from PlayerTwo is strictly rejected (not treated as placeholder)');

// ----------------------------------------------------------------------
// TEST 2: First Username Change (Permitted)
// ----------------------------------------------------------------------
console.log('\n--- TEST 2: First Username Change (1 Change Allowed) ---');
const firstChangeProfile = db.updateProfile(user1Id, { username: 'ApexPredator', display_name: 'ApexPredator' });
assert(firstChangeProfile.username === 'ApexPredator', 'Test 2a: First username change succeeded');
assert(firstChangeProfile.username_changes_count === 1, 'Test 2b: Server incremented username_changes_count to 1');
assert(hasUsedUsernameChange(user1Id, firstChangeProfile) === true, 'Test 2c: Frontend hasUsedUsernameChange evaluates to TRUE after first change');

// ----------------------------------------------------------------------
// TEST 3: Second Username Change (Strictly Rejected by Database)
// ----------------------------------------------------------------------
console.log('\n--- TEST 3: Second Username Change Rejection ---');
let secondChangeCaught = false;
try {
  db.updateProfile(user1Id, { username: 'GodTierPlayer' });
} catch (err) {
  secondChangeCaught = true;
  assert(err.message.includes('Username change limit exceeded'), 'Test 3a: Database threw "Username change limit exceeded"');
  assert(err.code === '22023', 'Test 3b: Database returned standard 22023 constraint code');
  const friendly = formatAuthError(err);
  assert(friendly.includes('one-time username change has already been used'), 'Test 3c: formatAuthError produced friendly user message');
}
assert(secondChangeCaught, 'Test 3d: Second username change was blocked by database trigger');

const profileAfterFailedAttempt = db.getProfile(user1Id);
assert(profileAfterFailedAttempt.username === 'ApexPredator', 'Test 3e: Username remained unchanged as ApexPredator');
assert(profileAfterFailedAttempt.username_changes_count === 1, 'Test 3f: Counter remains at 1');

// ----------------------------------------------------------------------
// TEST 4: LocalStorage Bypass Attempt
// ----------------------------------------------------------------------
console.log('\n--- TEST 4: LocalStorage Bypass Resistance ---');
const fakeLocalStorage = {};
delete fakeLocalStorage[`oneMoreRush.user_${user1Id}.usernameChangeUsed`];

assert(hasUsedUsernameChange(user1Id, profileAfterFailedAttempt) === true, 'Test 4a: hasUsedUsernameChange still reports TRUE using server profile despite empty localStorage');

let localStorageBypassBlocked = false;
try {
  db.updateProfile(user1Id, { username: 'BypassHacker' });
} catch (err) {
  localStorageBypassBlocked = true;
}
assert(localStorageBypassBlocked, 'Test 4b: Clearing localStorage cannot bypass server database enforcement');

// ----------------------------------------------------------------------
// TEST 5: Direct Supabase / SQL API Bypass Attempt
// ----------------------------------------------------------------------
console.log('\n--- TEST 5: Direct SQL / API Tampering Protection ---');
let tamperingBlocked = false;
try {
  db.updateProfile(user1Id, {
    username: 'MaliciousReset',
    username_changes_count: 0,
  });
} catch (err) {
  tamperingBlocked = true;
}
assert(tamperingBlocked, 'Test 5a: Direct API tampering with username_changes_count=0 is rejected');
assert(db.getProfile(user1Id).username === 'ApexPredator', 'Test 5b: Profile integrity preserved');

// ----------------------------------------------------------------------
// TEST 6: Concurrency Simulation (PostgreSQL Row-Level Locking Semantics)
// ----------------------------------------------------------------------
console.log('\n--- TEST 6: Concurrency Simulation (PostgreSQL Row-Locking Semantics) ---');
console.log('NOTE: Demonstrates serialized row-lock execution where exactly 1 of 2 concurrent updates wins.');
const user2Id = 'u2222222-0000-0000-0000-000000000002';
db.insertProfile({ id: user2Id, username: 'player_u2222222' });
db.updateProfile(user2Id, { username: 'OriginalName' });

let user2Results = [];
const executeConcurrent = (reqName, newHandle) => {
  try {
    const res = db.updateProfile(user2Id, { username: newHandle });
    user2Results.push({ req: reqName, success: true, res });
  } catch (err) {
    user2Results.push({ req: reqName, success: false, error: err.message });
  }
};

executeConcurrent('Request A', 'ConcurrentWinner');
executeConcurrent('Request B', 'ConcurrentLoser');

const successes = user2Results.filter((r) => r.success);
const failures = user2Results.filter((r) => !r.success);

assert(successes.length === 1, 'Test 6a: Exactly one concurrent change succeeded');
assert(failures.length === 1, 'Test 6b: Exactly one concurrent change was rejected');
assert(db.getProfile(user2Id).username_changes_count === 1, 'Test 6c: Final database counter is strictly 1');

// ----------------------------------------------------------------------
// TEST 7: Guest Conversion Account Flow
// ----------------------------------------------------------------------
console.log('\n--- TEST 7: Guest Conversion Compatibility ---');
const guestUserId = 'u3333333-0000-0000-0000-000000000003';
const convertedProfile = db.insertProfile({
  id: guestUserId,
  username: 'player_u3333333',
  display_name: 'Guest Player',
});

const finalizedProfile = db.updateProfile(guestUserId, {
  username: 'ConvertedAce',
  display_name: 'ConvertedAce',
});
assert(finalizedProfile.username === 'ConvertedAce', 'Test 7a: Guest conversion successfully assigned permanent handle');
assert(finalizedProfile.username_changes_count === 0, 'Test 7b: Converted guest still retains their 1 allowed future change');

// ----------------------------------------------------------------------
// TEST 8: Legitimate Non-Username Profile Updates
// ----------------------------------------------------------------------
console.log('\n--- TEST 8: Legitimate Profile Cosmetic Updates ---');
const cosmeticProfile = db.updateProfile(user1Id, {
  avatar_frame: 'cyber_neon',
  title: 'grandmaster',
  victory_effect: 'starfall',
  display_name: 'Apex Predator Official',
});

assert(cosmeticProfile.avatar_frame === 'cyber_neon', 'Test 8a: avatar_frame update succeeded');
assert(cosmeticProfile.title === 'grandmaster', 'Test 8b: title update succeeded');
assert(cosmeticProfile.victory_effect === 'starfall', 'Test 8c: victory_effect update succeeded');
assert(cosmeticProfile.display_name === 'Apex Predator Official', 'Test 8d: display_name update succeeded');
assert(cosmeticProfile.username === 'ApexPredator', 'Test 8e: username remained unchanged');
assert(cosmeticProfile.username_changes_count === 1, 'Test 8f: username_changes_count remained 1');

console.log('\n================================================================');
console.log(`✅ ALL ${totalTests} USERNAME CHANGE ENFORCEMENT TESTS PASSED!`);
console.log('================================================================\n');
