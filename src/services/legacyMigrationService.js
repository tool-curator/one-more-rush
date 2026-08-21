/**
 * ONE MORE RUSH — Legacy Rush Points Migration Service (Phase 6D-D / Phase 2.4A Recovery Hardened)
 * Server-authoritative migration of LocalStorage Rush Points into the Supabase ledger.
 * Strictly prevents guest RP injection/inflation into accounts with established cloud economies.
 * Preserves Daily Challenge completion history, streak, claimed status, and all daily metrics.
 *
 * MIGRATION BARRIER & ASYNC OWNERSHIP INVARIANTS:
 * 1. ACTIVE MIGRATION BARRIER > SERVER CONVERSION STATUS > PENDING GUEST HANDOFF > LOCAL MIGRATION MARKER
 * 2. get_guest_conversion_status() is a MANDATORY prerequisite for unblocked accounts.
 * 3. has_cloud_transactions != has_converted:
 *    - Genuine conversion requires has_conversion_record = true OR has_legacy_migration = true.
 *    - Generic transactions without conversion are classified as ESTABLISHED_CLOUD_ACCOUNT.
 * 4. A server verification failure (network/RPC error) activates a persistent barrier but permits recovery retries.
 * 5. Unexpected/unknown migration statuses NEVER clear the barrier or allow cloud sync.
 * 6. Single-Owner Handoff: Candidate RP for converted anonymous guests comes from the explicit pending
 *    guest handoff bound to THIS user UUID, never from scanning arbitrary user namespaces.
 * 7. Synchronous Async Ownership Guards: Every async boundary re-validates that activeStorageScope === user_<expectedUserId>
 *    and that the migration barrier is inactive before modifying any local storage or emitting scope changes.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import { loadDailyProgress, saveDailyProgress } from './dailyChallengeService.js';
import { emitScopeChange, getActiveStorageScope } from './storageScopeService.js';
import {
  MIGRATION_OUTCOME,
  setMigrationBarrier,
  clearMigrationBarrier,
  isMigrationBarrierActive,
  getMigrationBarrierOutcome,
  getPendingGuestConversion,
} from './migrationBarrierService.js';

export {
  MIGRATION_OUTCOME,
  setMigrationBarrier,
  clearMigrationBarrier,
  isMigrationBarrierActive,
  getMigrationBarrierOutcome,
  getPendingGuestConversion,
};

export const MAX_LEGACY_MIGRATION_CAP = 50000;
export const MAX_GUEST_MIGRATION_RP = MAX_LEGACY_MIGRATION_CAP;

// Monotonic operation generation counter to invalidate stale async migration runs
let currentMigrationOpId = 0;

function getTodayDateString(d = new Date()) {
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Derives candidate legacy Rush Points balance from valid unauthenticated/unscoped legacy compatibility keys.
 * Strictly resolves intra-namespace mirrors with MAX and cross-namespace candidates with MAX.
 * NEVER scans arbitrary user-scoped keys.
 */
export function getCandidateLegacyRushPoints() {
  if (typeof window === 'undefined' || !window.localStorage) return 0;
  const storage = window.localStorage;

  // 1. Priority 1 (Unscoped Legacy Mirror)
  const unscopedRaw = parseInt(storage.getItem('oneMoreRush.points') || '0', 10) || 0;
  let unscopedProg = 0;
  try {
    const p = JSON.parse(storage.getItem('oneMoreRush.daily.progress') || '{}');
    unscopedProg = parseInt(p.rushPoints || '0', 10) || 0;
  } catch (e) {}
  const unscopedCandidate = Math.max(unscopedRaw, unscopedProg);

  // 2. Priority 2 (Guest Scoped Mirror)
  const guestRaw = parseInt(storage.getItem('oneMoreRush.guest.points') || '0', 10) || 0;
  let guestProg = 0;
  try {
    const p = JSON.parse(storage.getItem('oneMoreRush.guest.daily.progress') || '{}');
    guestProg = parseInt(p.rushPoints || '0', 10) || 0;
  } catch (e) {}
  const guestCandidate = Math.max(guestRaw, guestProg);

  // 3. Resolve Cross-Namespace Precedence (Never Add)
  const candidate = Math.max(unscopedCandidate, guestCandidate);

  // 4. Sanitize
  return isNaN(candidate) || candidate <= 0 ? 0 : candidate;
}

/**
 * Helper to safely zero out only the rushPoints field in a daily progress JSON object,
 * preserving streak, dailyAttempts, lastCompletedDate, rewardClaimed, and all challenge metrics.
 */
function zeroOutDailyProgressPoints(storageKey) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        parsed.rushPoints = 0;
        window.localStorage.setItem(storageKey, JSON.stringify(parsed));
      }
    }
  } catch (e) {
    console.warn(`[LegacyMigration] Failed to zero out ${storageKey} rushPoints:`, e);
  }
}

/**
 * Requests trusted server provisioning of a migration authorization via Supabase Edge Function
 */
export async function provisionServerMigrationAuthorization({
  user,
  conversionIntentId,
  sourceAnonymousUserId = null,
} = {}) {
  if (!user || !user.id || !isSupabaseConfigured || !supabase) {
    return { success: false, error: 'NOT_AUTHENTICATED' };
  }

  try {
    if (!supabase.functions) return { success: false, error: 'FUNCTIONS_NOT_AVAILABLE' };
    const { data, error } = await supabase.functions.invoke('provision-legacy-migration', {
      body: {
        conversionIntentId,
        sourceAnonymousUserId,
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Initiates the server-authoritative legacy RP migration for an authenticated user.
 * Must execute FIRST upon authentication before Daily Visit or Daily Challenge synchronization.
 */
export async function migrateLegacyRushPointsCloud({ user = null, isGuest = true, signupContext = null } = {}) {
  if (!user || isGuest || !isSupabaseConfigured || !supabase) {
    return { success: false, outcome: MIGRATION_OUTCOME.NOT_APPLICABLE, reason: 'GUEST_OR_NOT_CONFIGURED' };
  }

  const expectedUserId = user.id;
  const expectedScope = getActiveStorageScope();

  // 1. Pre-flight Scope Check: Must match user_<expectedUserId>
  if (expectedScope !== `user_${expectedUserId}`) {
    console.warn(
      `[LegacyMigration] Migration aborted: active storage scope (${expectedScope}) does not match expected user_${expectedUserId}.`
    );
    return {
      success: false,
      outcome: MIGRATION_OUTCOME.NOT_APPLICABLE,
      reason: 'STALE_SCOPE',
    };
  }

  // Operation generation token for async cancellation
  const opId = ++currentMigrationOpId;

  const isOwnershipValid = () => {
    const currentScope = getActiveStorageScope();
    return (
      opId === currentMigrationOpId &&
      currentScope === expectedScope &&
      currentScope === `user_${expectedUserId}`
    );
  };

  const markerKey = `oneMoreRush.user_${expectedUserId}.cloudMigrationCompleted`;

  // ==========================================================================
  // STEP 0: MIGRATION BARRIER PRECEDENCE (INVARIANT: BARRIER > SERVER > LOCAL)
  // Hard cap barrier (EXCEEDS_CAP) halts immediately.
  // Recoverable barriers (NETWORK_ERROR/RPC_ERROR) allow retry toward authoritative server verification.
  // ==========================================================================
  const isBarrierActive = isMigrationBarrierActive(expectedUserId);
  const existingOutcome = getMigrationBarrierOutcome(expectedUserId);

  if (isBarrierActive && existingOutcome === MIGRATION_OUTCOME.EXCEEDS_CAP) {
    const pending = getPendingGuestConversion(expectedUserId, signupContext);
    console.warn(
      `[LegacyMigration] MIGRATION_BARRIER_ACTIVE (EXCEEDS_CAP): Hard migration barrier detected for user ${expectedUserId}. Halting cloud migration and preserving local state.`
    );

    if (typeof window !== 'undefined' && window.localStorage && pending?.dailyProgressSnapshot && isOwnershipValid()) {
      const userScopeKey = `oneMoreRush.user_${expectedUserId}.daily.progress`;
      if (!window.localStorage.getItem(userScopeKey)) {
        window.localStorage.setItem(userScopeKey, JSON.stringify(pending.dailyProgressSnapshot));
        emitScopeChange();
      }
    }

    return {
      success: false,
      outcome: MIGRATION_OUTCOME.EXCEEDS_CAP,
      error: 'EXCEEDS_CAP',
      amount: pending?.legacyAmount || pending?.rushPoints || 0,
      preserved: true,
    };
  }

  // ==========================================================================
  // STEP 0-B: SINGLE-OWNER HANDOFF & CANDIDATE RESOLUTION
  // Priority 1: Explicit pending guest conversion handoff for THIS user UUID
  // Priority 2: Unscoped legacy compatibility mirrors (if NO signup conversion exists)
  // ==========================================================================
  console.info(`[Migration] MIGRATION_STARTED`, {
    permanentUserId: expectedUserId,
    anonymousUserId: signupContext?.expectedAnonymousUserId || null,
    conversionIntentId: signupContext?.expectedConversionIntentId || null,
  });

  const pendingHandoff = getPendingGuestConversion(expectedUserId, signupContext);
  let userScopedRaw = null;
  if (typeof window !== 'undefined' && window.localStorage) {
    userScopedRaw = window.localStorage.getItem(`oneMoreRush.user_${expectedUserId}.pendingGuestConversion`);
  }

  const isSignupConversion = Boolean(
    signupContext ||
    pendingHandoff?.conversionIntentId ||
    userScopedRaw
  );

  const conversionIntentId = pendingHandoff?.conversionIntentId || signupContext?.expectedConversionIntentId || null;
  const todayDate = getTodayDateString();
  let candidateAmount = 0;
  let isGuestVisitClaimedToday = false;
  let isGuestQuickWinClaimedToday = false;
  let isGuestExtremeClaimedToday = false;
  let guestStreak = 0;
  let guestDailyProgressClone = null;

  if (isSignupConversion) {
    // CASE A: Active Signup Conversion -> Handoff is MANDATORY.
    // Content verification (Bug 6): Assert handoff completeness
    const isValidHandoff = Boolean(
      pendingHandoff &&
      pendingHandoff.conversionIntentId &&
      pendingHandoff.sourceAnonymousUserId &&
      pendingHandoff.sourceScope === `user_${pendingHandoff.sourceAnonymousUserId}` &&
      typeof (pendingHandoff.rushPoints ?? pendingHandoff.legacyAmount) === 'number' &&
      typeof (pendingHandoff.streak ?? 0) === 'number' &&
      typeof (pendingHandoff.quickWinClaimed ?? false) === 'boolean' &&
      typeof (pendingHandoff.dailyVisitClaimed ?? false) === 'boolean'
    );

    if (!isValidHandoff) {
      console.warn(
        `[Migration] WAITING_FOR_HANDOFF: Active signup conversion for user ${expectedUserId} is missing valid handoff. Blocking fallback migration to prevent progression loss.`
      );
      setMigrationBarrier(expectedUserId, MIGRATION_OUTCOME.NETWORK_ERROR, {
        version: 2,
        reason: 'HANDOFF_NOT_READY',
        capturedAt: new Date().toISOString(),
        conversionIntentId,
        sourceAnonymousUserId: signupContext?.expectedAnonymousUserId || null,
      });
      return {
        success: false,
        outcome: MIGRATION_OUTCOME.NETWORK_ERROR,
        reason: 'HANDOFF_NOT_READY',
        error: 'HANDOFF_NOT_READY',
      };
    }

    candidateAmount = Number(pendingHandoff.legacyAmount ?? pendingHandoff.rushPoints ?? 0);
    isGuestVisitClaimedToday = Boolean(pendingHandoff.dailyVisitClaimed);
    isGuestQuickWinClaimedToday = Boolean(pendingHandoff.quickWinClaimed);
    isGuestExtremeClaimedToday = Boolean(pendingHandoff.extremeClaimed);
    guestStreak = Math.min(30, Math.max(0, parseInt(pendingHandoff.streak || '0', 10) || 0));
    guestDailyProgressClone = pendingHandoff.dailyProgressSnapshot || null;

    console.info(`[Migration] MIGRATION_READY`, {
      permanentUserId: expectedUserId,
      anonymousUserId: pendingHandoff.sourceAnonymousUserId,
      conversionIntentId: pendingHandoff.conversionIntentId,
    });
    console.info(`[Migration] CANDIDATE_VALUES`, {
      permanentUserId: expectedUserId,
      anonymousUserId: pendingHandoff.sourceAnonymousUserId,
      conversionIntentId: pendingHandoff.conversionIntentId,
      amount: candidateAmount,
      streak: guestStreak,
      quickWin: isGuestQuickWinClaimedToday,
      extreme: isGuestExtremeClaimedToday,
      dailyVisit: isGuestVisitClaimedToday,
    });
  } else {
    // CASE B: Ordinary Existing Permanent User (No active signup conversion)
    candidateAmount = getCandidateLegacyRushPoints();
    if (typeof window !== 'undefined' && window.localStorage) {
      const guestVisit =
        window.localStorage.getItem('oneMoreRush.guest.dailyVisit') ||
        window.localStorage.getItem('onemore_daily_visit_date');
      if (guestVisit === todayDate) {
        isGuestVisitClaimedToday = true;
      }

      try {
        const rawGuestProg =
          window.localStorage.getItem('oneMoreRush.guest.daily.progress') ||
          window.localStorage.getItem('oneMoreRush.daily.progress');
        if (rawGuestProg) {
          guestDailyProgressClone = JSON.parse(rawGuestProg);
          const dayAttempt = guestDailyProgressClone?.dailyAttempts?.[todayDate] || {};
          isGuestQuickWinClaimedToday = Boolean(
            dayAttempt?.quickWin?.completed || dayAttempt?.quickWin?.rewardClaimed
          );
          isGuestExtremeClaimedToday = Boolean(
            dayAttempt?.extreme?.completed || dayAttempt?.extreme?.rewardClaimed
          );
          guestStreak = Math.min(30, Math.max(0, parseInt(guestDailyProgressClone?.streak || '0', 10) || 0));
        }
      } catch (e) {
        console.warn('[LegacyMigration] Could not parse guest daily progress:', e);
      }
    }
  }

  const buildSnapshotDetails = (reason) => ({
    version: 2,
    reason,
    capturedAt: new Date().toISOString(),
    conversionIntentId: conversionIntentId,
    sourceAnonymousUserId: pendingHandoff?.sourceAnonymousUserId || null,
    sourceScope: pendingHandoff?.sourceScope || null,
    legacyAmount: candidateAmount,
    rushPoints: candidateAmount,
    dailyProgressSnapshot: guestDailyProgressClone,
    dailyVisitClaimed: isGuestVisitClaimedToday,
    quickWinClaimed: isGuestQuickWinClaimedToday,
    extremeClaimed: isGuestExtremeClaimedToday,
    streak: guestStreak,
  });

  const preserveCapturedStateInUserScope = () => {
    if (typeof window !== 'undefined' && window.localStorage && guestDailyProgressClone && isOwnershipValid()) {
      const userScopeKey = `oneMoreRush.user_${expectedUserId}.daily.progress`;
      if (!window.localStorage.getItem(userScopeKey)) {
        window.localStorage.setItem(userScopeKey, JSON.stringify(guestDailyProgressClone));
        emitScopeChange();
      }
    }
  };

  // ==========================================================================
  // STEP 1: Query Server-Authoritative Guest Conversion Status (MANDATORY PREREQUISITE)
  // ==========================================================================
  console.info('[Migration] SERVER_STATUS_CHECK', {
    permanentUserId: expectedUserId,
    anonymousUserId: pendingHandoff?.sourceAnonymousUserId || null,
    conversionIntentId,
  });

  let serverConversionStatus = null;
  let serverCheckError = null;

  try {
    const { data, error } = await supabase.rpc('get_guest_conversion_status');

    // Post-await 1: Verify async ownership before proceeding
    if (!isOwnershipValid()) {
      console.warn(
        `[LegacyMigration] Migration response discarded after get_guest_conversion_status: active scope changed from ${expectedScope} to ${getActiveStorageScope()} during in-flight RPC.`
      );
      return { success: false, outcome: MIGRATION_OUTCOME.NOT_APPLICABLE, reason: 'STALE_SCOPE' };
    }

    if (error) {
      serverCheckError = error.message;
    } else if (data) {
      serverConversionStatus = Array.isArray(data) ? data[0] : data;
      console.info('[Migration] SERVER_STATUS_RESULT', {
        permanentUserId: expectedUserId,
        status: serverConversionStatus,
      });
    } else {
      serverCheckError = 'EMPTY_SERVER_RESPONSE';
    }
  } catch (e) {
    if (!isOwnershipValid()) {
      return { success: false, outcome: MIGRATION_OUTCOME.NOT_APPLICABLE, reason: 'STALE_SCOPE' };
    }
    serverCheckError = e.message || 'NETWORK_EXCEPTION';
  }

  // ==========================================================================
  // STEP 1-B: Handle SERVER_CHECK_FAILED
  // A server verification failure must NEVER be interpreted as "no conversion".
  // It MUST activate a persistent barrier and halt all cloud operations.
  // ==========================================================================
  if (serverCheckError || !serverConversionStatus) {
    if (!isOwnershipValid()) {
      return { success: false, outcome: MIGRATION_OUTCOME.NOT_APPLICABLE, reason: 'STALE_SCOPE' };
    }

    console.warn(
      `[LegacyMigration] MIGRATION_BLOCKED: Could not verify server conversion status for user ${expectedUserId} (${serverCheckError}). Activating migration barrier and preserving local state.`
    );
    const snapshotDetails = buildSnapshotDetails(MIGRATION_OUTCOME.NETWORK_ERROR);
    setMigrationBarrier(expectedUserId, MIGRATION_OUTCOME.NETWORK_ERROR, snapshotDetails);
    preserveCapturedStateInUserScope();

    return {
      success: false,
      outcome: MIGRATION_OUTCOME.NETWORK_ERROR,
      error: 'SERVER_CONVERSION_STATUS_UNAVAILABLE',
      details: serverCheckError,
    };
  }

  // Semantic Classification based on authoritative server response
  const isGenuineGuestConversion = Boolean(
    serverConversionStatus.has_conversion_record || serverConversionStatus.has_legacy_migration
  );

  const isEstablishedCloudAccount = Boolean(
    !isGenuineGuestConversion && serverConversionStatus.has_cloud_transactions
  );

  // ==========================================================================
  // STEP 2: State 1 — GENUINE GUEST CONVERSION (Server Confirmed)
  // Evidence: guest_conversion_records row exists OR legacy_migration tx exists.
  // ==========================================================================
  if (isGenuineGuestConversion) {
    if (!isOwnershipValid()) {
      return { success: false, outcome: MIGRATION_OUTCOME.NOT_APPLICABLE, reason: 'STALE_SCOPE' };
    }

    console.info(
      `[LegacyMigration] MIGRATION_SERVER_CONFIRMED: Genuine guest conversion confirmed on server for user ${expectedUserId}.`,
      serverConversionStatus
    );
    if (typeof window !== 'undefined' && window.localStorage && isOwnershipValid()) {
      window.localStorage.setItem(markerKey, 'true');
    }
    clearMigrationBarrier(expectedUserId, conversionIntentId);
    return {
      success: true,
      skipped: true,
      outcome: MIGRATION_OUTCOME.ALREADY_MIGRATED,
      serverConfirmed: true,
      cloudBalance: Number(serverConversionStatus.cloud_balance || 0),
    };
  }

  // ==========================================================================
  // STEP 3: State 2 — ESTABLISHED CLOUD ACCOUNT (No Guest Conversion)
  // Evidence: No guest conversion record and no legacy migration tx, but other cloud tx exist.
  // Action:
  // - Case A (Ordinary existing user): Existing cloud economy is authoritative. Never inject guest RP into it.
  // - Case B (Active cross-identity conversion): Source != Target. Block to prevent guest progression loss.
  // - Case C (Same-identity in-place upgrade): Source === Target. Cloud transactions already belong to this identity. Existing cloud economy is authoritative.
  // ==========================================================================
  if (isEstablishedCloudAccount) {
    if (!isOwnershipValid()) {
      return { success: false, outcome: MIGRATION_OUTCOME.NOT_APPLICABLE, reason: 'STALE_SCOPE' };
    }

    const sourceAnonId = pendingHandoff?.sourceAnonymousUserId || signupContext?.expectedAnonymousUserId;
    const isSameIdentityUpgrade = Boolean(sourceAnonId && sourceAnonId === expectedUserId);

    if (isSignupConversion && !isSameIdentityUpgrade) {
      console.warn(
        `[LegacyMigration] MIGRATION_BLOCKED: Cross-identity signup conversion (source: ${sourceAnonId}, target: ${expectedUserId}) encountered established cloud transactions without conversion record. Blocking to prevent guest progression loss.`
      );
      const snapshotDetails = buildSnapshotDetails(MIGRATION_OUTCOME.NETWORK_ERROR);
      setMigrationBarrier(expectedUserId, MIGRATION_OUTCOME.NETWORK_ERROR, snapshotDetails);
      preserveCapturedStateInUserScope();
      return {
        success: false,
        outcome: MIGRATION_OUTCOME.NETWORK_ERROR,
        reason: 'CONVERSION_CONFLICT_EXISTING_CLOUD',
        error: 'CONVERSION_CONFLICT_EXISTING_CLOUD',
      };
    }

    if (isSameIdentityUpgrade) {
      console.info(
        `[LegacyMigration] SAME_IDENTITY_UPGRADE_ESTABLISHED: User ${expectedUserId} upgraded in-place from anonymous session with pre-existing cloud economy (${serverConversionStatus.cloud_balance} RP). Treating existing cloud economy as authoritative.`
      );
    } else {
      console.info(
        `[LegacyMigration] ESTABLISHED_CLOUD_ACCOUNT: Ordinary user ${expectedUserId} has established cloud transactions without guest conversion. Protecting cloud ledger.`
      );
    }

    if (typeof window !== 'undefined' && window.localStorage && isOwnershipValid()) {
      window.localStorage.setItem(markerKey, 'true');
    }
    clearMigrationBarrier(expectedUserId, conversionIntentId);
    return {
      success: true,
      skipped: true,
      outcome: MIGRATION_OUTCOME.SKIPPED_EXISTING_CLOUD,
      establishedCloud: true,
      sameIdentityUpgrade: isSameIdentityUpgrade,
      cloudBalance: Number(serverConversionStatus.cloud_balance || 0),
    };
  }

  // ==========================================================================
  // STEP 4: State 3 — GENUINELY UNMIGRATED ACCOUNT (has_conversion=false, has_tx=false)
  // ==========================================================================
  if (!isOwnershipValid()) {
    return { success: false, outcome: MIGRATION_OUTCOME.NOT_APPLICABLE, reason: 'STALE_SCOPE' };
  }

  if (typeof window !== 'undefined' && window.localStorage && window.localStorage.getItem(markerKey) === 'true') {
    console.warn(
      `[LegacyMigration] MIGRATION_LOCAL_MARKER_STALE: Local marker was true, but server has 0 conversion records and 0 transactions for user ${expectedUserId}. Purging stale local marker.`
    );
    window.localStorage.removeItem(markerKey);
  }

  console.info(`[LegacyMigration] MIGRATION_PENDING: Resolving legacy migration for unmigrated user ${expectedUserId}...`);

  // ==========================================================================
  // STEP 5: Safety Cap Check (Strict 50,000 RP Ceiling)
  // ==========================================================================
  if (candidateAmount > MAX_LEGACY_MIGRATION_CAP) {
    if (!isOwnershipValid()) {
      return { success: false, outcome: MIGRATION_OUTCOME.NOT_APPLICABLE, reason: 'STALE_SCOPE' };
    }

    console.warn(
      `[LegacyMigration] MIGRATION_BLOCKED: Candidate balance (${candidateAmount} RP) exceeds sanity cap (${MAX_LEGACY_MIGRATION_CAP} RP). Preserving local state.`
    );

    const snapshotDetails = buildSnapshotDetails(MIGRATION_OUTCOME.EXCEEDS_CAP);
    setMigrationBarrier(expectedUserId, MIGRATION_OUTCOME.EXCEEDS_CAP, snapshotDetails);
    preserveCapturedStateInUserScope();

    return {
      success: false,
      outcome: MIGRATION_OUTCOME.EXCEEDS_CAP,
      error: 'EXCEEDS_CAP',
      amount: candidateAmount,
    };
  }

  // ==========================================================================
  // STEP 6: Execute Server-Authoritative Guest Conversion RPC
  // ==========================================================================
  const intentId = conversionIntentId || pendingHandoff?.conversionIntentId;

  if (!intentId) {
    if (candidateAmount > 0) {
      console.warn(
        `[LegacyMigration] NO_SERVER_AUTHORIZATION: Candidate legacy points detected (${candidateAmount} RP) but no server migration authorization exists for user ${expectedUserId}. Preserving local state.`
      );
      const snapshotDetails = buildSnapshotDetails('NO_SERVER_AUTHORIZATION');
      setMigrationBarrier(expectedUserId, 'NO_SERVER_AUTHORIZATION', snapshotDetails);
      preserveCapturedStateInUserScope();
      return {
        success: false,
        outcome: 'NO_SERVER_AUTHORIZATION',
        error: 'NO_SERVER_AUTHORIZATION',
        preservedAmount: candidateAmount,
      };
    }

    if (typeof window !== 'undefined' && window.localStorage && isOwnershipValid()) {
      window.localStorage.setItem(markerKey, 'true');
    }
    return {
      success: true,
      outcome: MIGRATION_OUTCOME.NO_LEGACY_BALANCE,
      cloudBalance: 0,
      amountMigrated: 0,
    };
  }

  let activeIntentId = intentId;
  if (isSupabaseConfigured && supabase?.functions) {
    try {
      const provRes = await provisionServerMigrationAuthorization({
        user,
        conversionIntentId: activeIntentId,
        sourceAnonymousUserId: pendingHandoff?.sourceAnonymousUserId || signupContext?.expectedAnonymousUserId || null,
      });
      if (provRes.success && provRes.data?.conversionIntentId) {
        activeIntentId = provRes.data.conversionIntentId;
      }
    } catch (provErr) {
      // Continue to convert_guest_account
    }
  }

  console.info(`[Migration] MIGRATION_RPC_STARTED`, {
    permanentUserId: expectedUserId,
    anonymousUserId: pendingHandoff?.sourceAnonymousUserId || null,
    conversionIntentId: activeIntentId,
    amount: candidateAmount,
    streak: guestStreak,
    quickWin: isGuestQuickWinClaimedToday,
    extreme: isGuestExtremeClaimedToday,
    dailyVisit: isGuestVisitClaimedToday,
  });

  try {
    // Invoke authoritative convert_guest_account gated strictly by server authorization
    const { data, error } = await supabase.rpc('convert_guest_account', {
      p_conversion_intent_id: activeIntentId,
    });

    // Post-await 2: Verify async ownership before mutating local state or clearing barrier
    if (!isOwnershipValid()) {
      console.warn(
        `[LegacyMigration] Migration response discarded after convert_guest_account: active scope changed from ${expectedScope} to ${getActiveStorageScope()} during in-flight RPC.`
      );
      return { success: false, outcome: MIGRATION_OUTCOME.NOT_APPLICABLE, reason: 'STALE_SCOPE' };
    }

    if (error) {
      if (!isOwnershipValid()) {
        return { success: false, outcome: MIGRATION_OUTCOME.NOT_APPLICABLE, reason: 'STALE_SCOPE' };
      }
      console.warn('[LegacyMigration] MIGRATION_BLOCKED: RPC error during convert_guest_account:', error.message);
      const snapshotDetails = buildSnapshotDetails(MIGRATION_OUTCOME.RPC_ERROR);
      setMigrationBarrier(expectedUserId, MIGRATION_OUTCOME.RPC_ERROR, snapshotDetails);
      preserveCapturedStateInUserScope();
      return { success: false, outcome: MIGRATION_OUTCOME.RPC_ERROR, error: error.message };
    }

    const record = Array.isArray(data) ? data[0] : data;
    if (!record) {
      if (!isOwnershipValid()) {
        return { success: false, outcome: MIGRATION_OUTCOME.NOT_APPLICABLE, reason: 'STALE_SCOPE' };
      }
      const snapshotDetails = buildSnapshotDetails(MIGRATION_OUTCOME.EMPTY_RESPONSE);
      setMigrationBarrier(expectedUserId, MIGRATION_OUTCOME.EMPTY_RESPONSE, snapshotDetails);
      preserveCapturedStateInUserScope();
      return { success: false, outcome: MIGRATION_OUTCOME.EMPTY_RESPONSE, error: 'EMPTY_RESPONSE' };
    }

    console.info('[Migration] MIGRATION_RPC_RESULT', {
      permanentUserId: expectedUserId,
      record,
    });

    const status = record.migration_status;
    const cloudBalance = Number(record.cloud_balance ?? 0);
    const amountMigrated = Number(record.amount_migrated ?? 0);

    // Strict validation of known server statuses
    const KNOWN_SUCCESS_STATUSES = ['migrated', 'already_migrated', 'skipped_existing_cloud', 'no_legacy_balance'];

    if (!status || !KNOWN_SUCCESS_STATUSES.includes(status)) {
      if (!isOwnershipValid()) {
        return { success: false, outcome: MIGRATION_OUTCOME.NOT_APPLICABLE, reason: 'STALE_SCOPE' };
      }
      console.warn(`[LegacyMigration] UNKNOWN_MIGRATION_STATUS: Received unverified status '${status}' from convert_guest_account.`);
      const snapshotDetails = buildSnapshotDetails(MIGRATION_OUTCOME.UNKNOWN_FAILURE);
      setMigrationBarrier(expectedUserId, MIGRATION_OUTCOME.UNKNOWN_FAILURE, snapshotDetails);
      preserveCapturedStateInUserScope();
      return {
        success: false,
        outcome: MIGRATION_OUTCOME.UNKNOWN_FAILURE,
        error: 'UNKNOWN_MIGRATION_STATUS',
        details: status,
      };
    }

    // Invariant: For active signup conversions, skipped_existing_cloud is NOT acceptable without verified conversion record
    if (isSignupConversion && status === 'skipped_existing_cloud') {
      if (!isOwnershipValid()) {
        return { success: false, outcome: MIGRATION_OUTCOME.NOT_APPLICABLE, reason: 'STALE_SCOPE' };
      }
      console.warn(
        `[LegacyMigration] MIGRATION_BLOCKED: convert_guest_account returned 'skipped_existing_cloud' for active signup conversion. Preserving guest state in barrier.`
      );
      const snapshotDetails = buildSnapshotDetails(MIGRATION_OUTCOME.NETWORK_ERROR);
      setMigrationBarrier(expectedUserId, MIGRATION_OUTCOME.NETWORK_ERROR, snapshotDetails);
      preserveCapturedStateInUserScope();
      return {
        success: false,
        outcome: MIGRATION_OUTCOME.NETWORK_ERROR,
        reason: 'CONVERSION_CONFLICT_EXISTING_CLOUD',
        error: 'CONVERSION_CONFLICT_EXISTING_CLOUD',
      };
    }

    // Clear barrier ONLY after successful authoritative server response with verified ownership and exact intentId
    if (!isOwnershipValid()) {
      return { success: false, outcome: MIGRATION_OUTCOME.NOT_APPLICABLE, reason: 'STALE_SCOPE' };
    }
    clearMigrationBarrier(expectedUserId, conversionIntentId);

    if (typeof window !== 'undefined' && window.localStorage && isOwnershipValid()) {
      if (status === 'migrated') {
        console.info(`[Migration] MIGRATION_SUCCESS`, {
          permanentUserId: expectedUserId,
          anonymousUserId: pendingHandoff?.sourceAnonymousUserId || null,
          conversionIntentId: conversionIntentId,
          amountMigrated,
          cloudBalance,
        });
        window.localStorage.setItem(markerKey, 'true');

        window.localStorage.removeItem('oneMoreRush.points');
        window.localStorage.removeItem('oneMoreRush.guest.points');

        if (pendingHandoff?.sourceScope) {
          window.localStorage.removeItem(`oneMoreRush.${pendingHandoff.sourceScope}.points`);
          zeroOutDailyProgressPoints(`oneMoreRush.${pendingHandoff.sourceScope}.daily.progress`);
        }

        const userProgress = guestDailyProgressClone || loadDailyProgress();
        userProgress.rushPoints = cloudBalance;
        if (guestStreak > (userProgress.streak || 0)) {
          userProgress.streak = guestStreak;
        }
        if (pendingHandoff?.lastCompletedDate && !userProgress.lastCompletedDate) {
          userProgress.lastCompletedDate = pendingHandoff.lastCompletedDate;
        }
        saveDailyProgress(userProgress);

        if (isGuestVisitClaimedToday) {
          window.localStorage.setItem(`oneMoreRush.user_${expectedUserId}.dailyVisit`, todayDate);
        }

        zeroOutDailyProgressPoints('oneMoreRush.daily.progress');
        zeroOutDailyProgressPoints('oneMoreRush.guest.daily.progress');

        emitScopeChange();
      } else if (status === 'already_migrated') {
        console.info(`[LegacyMigration] MIGRATION_SERVER_CONFIRMED: Account was already migrated on server.`);
        window.localStorage.setItem(markerKey, 'true');
        const currentProg = loadDailyProgress();
        currentProg.rushPoints = cloudBalance;
        saveDailyProgress(currentProg);
        emitScopeChange();
      } else if (status === 'skipped_existing_cloud') {
        console.info(`[LegacyMigration] ESTABLISHED_CLOUD_ACCOUNT: Existing cloud economy detected, skipping guest injection.`);
        window.localStorage.setItem(markerKey, 'true');
        const currentProg = loadDailyProgress();
        currentProg.rushPoints = cloudBalance;
        saveDailyProgress(currentProg);
        emitScopeChange();
      } else if (status === 'no_legacy_balance') {
        console.info(`[LegacyMigration] MIGRATION_NO_LEGACY_BALANCE: Account converted with 0 legacy RP.`);
        window.localStorage.setItem(markerKey, 'true');
        const currentProg = loadDailyProgress();
        currentProg.rushPoints = cloudBalance;
        saveDailyProgress(currentProg);
        emitScopeChange();
      }
    }

    return {
      success: true,
      outcome: MIGRATION_OUTCOME.SUCCESS,
      status,
      amountMigrated,
      cloudBalance,
    };
  } catch (err) {
    if (!isOwnershipValid()) {
      return { success: false, outcome: MIGRATION_OUTCOME.NOT_APPLICABLE, reason: 'STALE_SCOPE' };
    }
    console.warn('[LegacyMigration] Network error during convert_guest_account:', err.message);
    const snapshotDetails = buildSnapshotDetails(MIGRATION_OUTCOME.NETWORK_ERROR);
    setMigrationBarrier(expectedUserId, MIGRATION_OUTCOME.NETWORK_ERROR, snapshotDetails);
    preserveCapturedStateInUserScope();
    return { success: false, outcome: MIGRATION_OUTCOME.NETWORK_ERROR, error: err.message };
  }
}
