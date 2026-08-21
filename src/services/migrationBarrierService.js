/**
 * ONE MORE RUSH — Migration Barrier Service
 * Leaf module providing synchronization barrier and pending guest conversion snapshot management.
 * Ensures zero circular dependencies between legacyMigrationService, dailyChallengeService, and App components.
 */

export const MIGRATION_OUTCOME = {
  SUCCESS: 'SUCCESS',
  ALREADY_MIGRATED: 'ALREADY_MIGRATED',
  SKIPPED_EXISTING_CLOUD: 'SKIPPED_EXISTING_CLOUD',
  NO_LEGACY_BALANCE: 'NO_LEGACY_BALANCE',
  ALREADY_COMPLETED_LOCALLY: 'ALREADY_COMPLETED_LOCALLY',
  NOT_APPLICABLE: 'NOT_APPLICABLE',
  EXCEEDS_CAP: 'EXCEEDS_CAP',
  RPC_ERROR: 'RPC_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  EMPTY_RESPONSE: 'EMPTY_RESPONSE',
  UNKNOWN_FAILURE: 'UNKNOWN_FAILURE',
};

// In-memory active barriers for fast synchronous lookups
const activeBarriers = new Map();

/**
 * Activates a migration synchronization barrier for a given user account and optionally
 * stores the pending guest conversion snapshot to preserve state across restarts.
 * Strictly guarantees that valid conversion handoff state is NEVER overwritten by a degraded diagnostic failure.
 */
export function setMigrationBarrier(userId, outcome, snapshotDetails = null) {
  if (!userId) return;
  const outcomeStr = outcome || 'ACTIVE';
  activeBarriers.set(userId, outcomeStr);

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(`oneMoreRush.user_${userId}.migrationBarrier`, outcomeStr);
      if (snapshotDetails) {
        const userKey = `oneMoreRush.user_${userId}.pendingGuestConversion`;
        const existingRaw = window.localStorage.getItem(userKey);
        let existingObj = null;
        try {
          if (existingRaw) existingObj = JSON.parse(existingRaw);
        } catch (e) {}

        const isExistingValidHandoff = Boolean(
          existingObj &&
          !existingObj.reason &&
          (existingObj.conversionIntentId || (existingObj.dailyProgressSnapshot && existingObj.dailyProgressSnapshot.dailyAttempts))
        );

        const isNewDiagnosticFailure = Boolean(
          snapshotDetails.reason === 'NETWORK_ERROR' || snapshotDetails.reason === 'RPC_ERROR'
        );

        // Never overwrite a valid explicit handoff with a degraded diagnostic failure
        if (!isExistingValidHandoff || !isNewDiagnosticFailure) {
          window.localStorage.setItem(userKey, JSON.stringify(snapshotDetails));
        } else {
          console.info(`[MigrationBarrier] Preserving existing valid conversion handoff for user ${userId} against diagnostic ${snapshotDetails.reason} overwrite.`);
        }
      }
    } catch (e) {
      console.warn('[MigrationBarrier] Failed to persist barrier to localStorage:', e);
    }
  }
}

/**
 * Clears the migration synchronization barrier upon successful conversion or verified cloud account.
 * Staging handoff is removed ONLY when stagingParsed.conversionIntentId strictly equals targetIntentId.
 */
export function clearMigrationBarrier(userId, finalizedIntentId = null) {
  if (!userId) return;
  activeBarriers.delete(userId);
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const userKey = `oneMoreRush.user_${userId}.pendingGuestConversion`;
      let userScoped = null;
      try {
        const raw = window.localStorage.getItem(userKey);
        if (raw) userScoped = JSON.parse(raw);
      } catch (e) {}

      // 1. Capture conversionIntentId before removing user-scoped pending snapshot
      const targetIntentId = finalizedIntentId || userScoped?.conversionIntentId || null;

      // 2. Remove barrier and user-scoped snapshot
      window.localStorage.removeItem(`oneMoreRush.user_${userId}.migrationBarrier`);
      window.localStorage.removeItem(userKey);

      // 3. Inspect global staging key and remove ONLY when stagingParsed.conversionIntentId === targetIntentId
      const stagingRaw = window.localStorage.getItem('oneMoreRush.pendingGuestConversionHandoff');
      if (stagingRaw && targetIntentId) {
        try {
          const stagingParsed = JSON.parse(stagingRaw);
          const stagingIntent = stagingParsed?.conversionIntentId;

          const isExactMatch = Boolean(stagingIntent === targetIntentId);

          if (isExactMatch) {
            window.localStorage.removeItem('oneMoreRush.pendingGuestConversionHandoff');
            console.info(`[MigrationBarrier] Cleaned up matched staging handoff (${stagingIntent}) for user ${userId}.`);
          }
        } catch (e) {}
      }
    } catch (e) {
      console.warn('[MigrationBarrier] Failed to remove barrier from localStorage:', e);
    }
  }
}

/**
 * Checks whether a migration synchronization barrier is active for this user.
 * Checked synchronously before any cloud hydration or daily visit claim.
 */
export function isMigrationBarrierActive(userId) {
  if (!userId) return false;
  if (activeBarriers.has(userId)) return true;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = window.localStorage.getItem(`oneMoreRush.user_${userId}.migrationBarrier`);
      if (stored) {
        activeBarriers.set(userId, stored);
        return true;
      }
    } catch (e) {
      return false;
    }
  }
  return false;
}

/**
 * Gets the current barrier outcome string if active, or null if clean.
 */
export function getMigrationBarrierOutcome(userId) {
  if (!userId) return null;
  if (activeBarriers.has(userId)) return activeBarriers.get(userId);
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      return window.localStorage.getItem(`oneMoreRush.user_${userId}.migrationBarrier`);
    } catch (e) {
      return null;
    }
  }
  return null;
}

/**
 * Retrieves the pending guest conversion snapshot preserved for this user if available.
 * Resolves authentic explicit handoffs strictly for THIS user's verified conversion operation.
 * Deterministic Resolution Hierarchy:
 * 1. User-scoped pendingGuestConversion with matching intent
 * 2. Authenticated signup context with matching intent (when provided or active)
 * 3. Same-UUID upgraded-anonymous staging handoff (staging.sourceAnonymousUserId === userId)
 * 4. Otherwise NULL
 * NEVER allows an unrelated user to consume a global staging handoff.
 */
export function getPendingGuestConversion(userId, signupContext = null) {
  if (!userId || typeof window === 'undefined' || !window.localStorage) return null;
  const storage = window.localStorage;
  let userScoped = null;
  try {
    const raw = storage.getItem(`oneMoreRush.user_${userId}.pendingGuestConversion`);
    if (raw) userScoped = JSON.parse(raw);
  } catch (e) {}

  // Inspect staging key
  let stagingHandoff = null;
  try {
    const stagingRaw = storage.getItem('oneMoreRush.pendingGuestConversionHandoff');
    if (stagingRaw) {
      const parsed = JSON.parse(stagingRaw);
      if (
        parsed &&
        (parsed.version === 2 || parsed.version === 1) &&
        parsed.sourceAnonymousUserId &&
        parsed.conversionIntentId
      ) {
        stagingHandoff = parsed;
      }
    }
  } catch (e) {}

  // 1. Priority 1: User-scoped pendingGuestConversion with matching intent
  if (userScoped) {
    if (stagingHandoff) {
      const isMatchingIntent = Boolean(
        userScoped.conversionIntentId &&
        stagingHandoff.conversionIntentId === userScoped.conversionIntentId &&
        stagingHandoff.sourceAnonymousUserId === userScoped.sourceAnonymousUserId
      );

      const isDegradedDiagnostic = Boolean(
        userScoped.reason === 'NETWORK_ERROR' ||
        userScoped.reason === 'RPC_ERROR' ||
        !userScoped.conversionIntentId
      );

      if (isMatchingIntent || isDegradedDiagnostic) {
        if (
          userScoped.reason === 'NETWORK_ERROR' ||
          userScoped.reason === 'RPC_ERROR' ||
          !userScoped.dailyProgressSnapshot?.dailyAttempts ||
          Object.keys(userScoped.dailyProgressSnapshot.dailyAttempts).length === 0
        ) {
          return stagingHandoff;
        }
      }
    }
    return userScoped;
  }

  // 2. Priority 2: Authenticated signup context with matching intent
  if (
    signupContext &&
    signupContext.expectedConversionIntentId &&
    signupContext.expectedAnonymousUserId &&
    (!signupContext.boundPermanentUserId || signupContext.boundPermanentUserId === userId)
  ) {
    if (
      stagingHandoff &&
      stagingHandoff.conversionIntentId === signupContext.expectedConversionIntentId &&
      stagingHandoff.sourceAnonymousUserId === signupContext.expectedAnonymousUserId
    ) {
      return stagingHandoff;
    }
  }

  // 3. Priority 3: Same-UUID upgraded-anonymous staging handoff
  if (stagingHandoff && stagingHandoff.sourceAnonymousUserId === userId) {
    console.info(`[MigrationBarrier] Resolved pending conversion handoff (${stagingHandoff.conversionIntentId}) for upgraded anonymous user ${userId}.`);
    return stagingHandoff;
  }

  // 4. Otherwise NULL
  return null;
}
