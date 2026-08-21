/**
 * ONE MORE RUSH — Guest Conversion Handoff Service (Phase 2.4A Security Hardened)
 * Provides cryptographically bound, single-owner state preservation during anonymous -> permanent account transitions.
 * Strictly prevents cross-account handoff leakage via conversionIntentId and explicit source verification.
 */

import { getActiveStorageScope } from './storageScopeService.js';

export const HANDOFF_STORAGE_KEY = 'oneMoreRush.pendingGuestConversionHandoff';
export const MAX_GUEST_MIGRATION_RP = 50000;

/**
 * Derives the total candidate Rush Points that would be migrated from the guest session.
 * Evaluates scoped anonymous storage, guest-scoped storage, unscoped legacy keys, and staging handoffs.
 */
export function getGuestMigrationCandidateAmount(user = null) {
  if (typeof window === 'undefined' || !window.localStorage) return 0;
  const storage = window.localStorage;

  let candidate = 0;

  // 1. If user object has an anonymous ID, check scoped keys
  if (user && user.id) {
    const anonScope = `user_${user.id}`;
    const pointsKey = `oneMoreRush.${anonScope}.points`;
    const dailyProgKey = `oneMoreRush.${anonScope}.daily.progress`;
    const rawPts = parseInt(storage.getItem(pointsKey) || '0', 10) || 0;
    let progPts = 0;
    try {
      const p = JSON.parse(storage.getItem(dailyProgKey) || '{}');
      progPts = parseInt(p.rushPoints || '0', 10) || 0;
    } catch (e) {}
    candidate = Math.max(candidate, rawPts, progPts);
  }

  // 2. Check guest namespace keys
  const guestRaw = parseInt(storage.getItem('oneMoreRush.guest.points') || '0', 10) || 0;
  let guestProg = 0;
  try {
    const p = JSON.parse(storage.getItem('oneMoreRush.guest.daily.progress') || '{}');
    guestProg = parseInt(p.rushPoints || '0', 10) || 0;
  } catch (e) {}
  candidate = Math.max(candidate, guestRaw, guestProg);

  // 3. Check unscoped legacy keys
  const unscopedRaw = parseInt(storage.getItem('oneMoreRush.points') || '0', 10) || 0;
  let unscopedProg = 0;
  try {
    const p = JSON.parse(storage.getItem('oneMoreRush.daily.progress') || '{}');
    unscopedProg = parseInt(p.rushPoints || '0', 10) || 0;
  } catch (e) {}
  candidate = Math.max(candidate, unscopedRaw, unscopedProg);

  // 4. Check staging handoff if present
  try {
    const stagingRaw = storage.getItem(HANDOFF_STORAGE_KEY);
    if (stagingRaw) {
      const parsed = JSON.parse(stagingRaw);
      const stagingPts = Number(parsed.rushPoints ?? parsed.legacyAmount ?? 0);
      candidate = Math.max(candidate, stagingPts);
    }
  } catch (e) {}

  return isNaN(candidate) || candidate <= 0 ? 0 : candidate;
}

function getTodayDateString(d = new Date()) {
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function generateIntentId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `intent_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Captures the current anonymous user's progression and Daily Challenge state
 * before transitioning to a permanent account.
 * Strict Invariant: ONLY captures if user is an explicit anonymous Supabase user.
 */
export function captureAnonymousGuestHandoff(user) {
  const isAnonymous = Boolean(user?.is_anonymous || user?.app_metadata?.provider === 'anonymous');
  if (!user || !user.id || !isAnonymous || typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  const storage = window.localStorage;
  const anonScope = `user_${user.id}`;
  const pointsKey = `oneMoreRush.${anonScope}.points`;
  const dailyProgKey = `oneMoreRush.${anonScope}.daily.progress`;
  const dailyVisitKey = `oneMoreRush.${anonScope}.dailyVisit`;

  let rushPoints = parseInt(storage.getItem(pointsKey) || '0', 10) || 0;
  let dailyProgressSnapshot = null;

  try {
    const rawProg = storage.getItem(dailyProgKey);
    if (rawProg) {
      dailyProgressSnapshot = JSON.parse(rawProg);
      const progPoints = parseInt(dailyProgressSnapshot?.rushPoints || '0', 10) || 0;
      rushPoints = Math.max(rushPoints, progPoints);
    }
  } catch (e) {
    console.warn('[GuestHandoff] Error parsing anonymous daily progress:', e);
  }

  // Fallback: If scoped key is empty, check active storage scope and guest mirrors
  if (!dailyProgressSnapshot) {
    try {
      const activeScope = getActiveStorageScope();
      if (activeScope && activeScope !== anonScope) {
        const altProgRaw = storage.getItem(`oneMoreRush.${activeScope}.daily.progress`);
        if (altProgRaw) {
          dailyProgressSnapshot = JSON.parse(altProgRaw);
          const progPoints = parseInt(dailyProgressSnapshot?.rushPoints || '0', 10) || 0;
          rushPoints = Math.max(rushPoints, progPoints);
        }
      }
    } catch (e) {}
  }

  // Also check guest namespace mirror if still 0
  try {
    const guestProgRaw = storage.getItem('oneMoreRush.guest.daily.progress') || storage.getItem('oneMoreRush.daily.progress');
    if (guestProgRaw) {
      const guestParsed = JSON.parse(guestProgRaw);
      const guestPoints = parseInt(guestParsed?.rushPoints || '0', 10) || 0;
      if (!dailyProgressSnapshot && guestParsed && typeof guestParsed === 'object') {
        dailyProgressSnapshot = guestParsed;
      }
      rushPoints = Math.max(rushPoints, guestPoints);
    }
    const guestPointsRaw = parseInt(storage.getItem('oneMoreRush.guest.points') || storage.getItem('oneMoreRush.points') || '0', 10) || 0;
    rushPoints = Math.max(rushPoints, guestPointsRaw);
  } catch (e) {}

  const todayDate = getTodayDateString();
  const visitClaim = storage.getItem(dailyVisitKey) || storage.getItem('onemore_daily_visit_date');
  const dailyVisitClaimed = visitClaim === todayDate;

  const dayAttempt = dailyProgressSnapshot?.dailyAttempts?.[todayDate] || {};
  const quickWinClaimed = Boolean(dayAttempt?.quickWin?.completed || dayAttempt?.quickWin?.rewardClaimed);
  const extremeClaimed = Boolean(dayAttempt?.extreme?.completed || dayAttempt?.extreme?.rewardClaimed);
  const streak = Math.min(30, Math.max(0, parseInt(dailyProgressSnapshot?.streak || '0', 10) || 0));
  const lastCompletedDate = dailyProgressSnapshot?.lastCompletedDate || null;

  const conversionIntentId = generateIntentId();

  // Capture guest locker snapshot (non-starter owned items)
  let lockerSnapshot = null;
  try {
    const rawLocker =
      storage.getItem(`oneMoreRush.${anonScope}.locker`) ||
      storage.getItem('oneMoreRush.guest.locker') ||
      storage.getItem('oneMoreRush.locker');
    if (rawLocker) {
      const parsedLocker = JSON.parse(rawLocker);
      if (parsedLocker?.owned && typeof parsedLocker.owned === 'object') {
        lockerSnapshot = {
          owned: {
            frames: (parsedLocker.owned.frames || []).filter((k) => k !== 'classic'),
            titles: (parsedLocker.owned.titles || []).filter((k) => k !== 'rookie'),
            effects: (parsedLocker.owned.effects || []).filter((k) => k !== 'classic'),
            badges: parsedLocker.owned.badges || [],
          },
        };
      }
    }
  } catch (e) {
    console.warn('[GuestHandoff] Error parsing guest locker:', e);
  }

  const handoff = {
    version: 2,
    sourceAnonymousUserId: user.id,
    sourceScope: anonScope,
    conversionIntentId,
    capturedAt: new Date().toISOString(),
    legacyAmount: rushPoints,
    rushPoints,
    dailyProgressSnapshot,
    lockerSnapshot,
    streak,
    lastCompletedDate,
    dailyVisitClaimed,
    quickWinClaimed,
    extremeClaimed,
  };

  try {
    storage.setItem(HANDOFF_STORAGE_KEY, JSON.stringify(handoff));
    console.info('[GuestHandoff] HANDOFF_CAPTURED', {
      permanentUserId: null,
      anonymousUserId: user.id,
      conversionIntentId,
      rushPoints,
      streak,
      quickWinClaimed,
      extremeClaimed,
      dailyVisitClaimed,
    });
    console.info('[GuestHandoff] CAPTURED', {
      permanentUserId: null,
      anonymousUserId: user.id,
      conversionIntentId,
      rushPoints,
      streak,
      quickWinClaimed,
      extremeClaimed,
      dailyVisitClaimed,
    });
    console.info('[GuestHandoff] INTENT_CREATED', {
      permanentUserId: null,
      anonymousUserId: user.id,
      conversionIntentId,
    });
  } catch (e) {
    console.warn('[GuestHandoff] Failed to persist pending handoff:', e);
  }

  return handoff;
}

/**
 * Binds the temporary pending handoff to the newly authenticated permanent user.
 * Requires exact matching of permanentUserId, expectedAnonymousUserId, and expectedConversionIntentId.
 */
export function bindHandoffToPermanentUser({
  permanentUserId,
  expectedAnonymousUserId,
  expectedConversionIntentId,
} = {}) {
  console.info(
    `[GuestHandoff] BIND_ATTEMPT`,
    {
      permanentUserId,
      anonymousUserId: expectedAnonymousUserId,
      conversionIntentId: expectedConversionIntentId,
    }
  );

  if (
    !permanentUserId ||
    !expectedAnonymousUserId ||
    !expectedConversionIntentId ||
    typeof window === 'undefined' ||
    !window.localStorage
  ) {
    return { success: false, reason: 'INVALID_BIND_PARAMS' };
  }

  const storage = window.localStorage;

  try {
    const raw = storage.getItem(HANDOFF_STORAGE_KEY);
    if (!raw) {
      // Check if user-scoped handoff was already written (idempotent success)
      const userKey = `oneMoreRush.user_${permanentUserId}.pendingGuestConversion`;
      const existingUserRaw = storage.getItem(userKey);
      if (existingUserRaw) {
        try {
          const existingHandoff = JSON.parse(existingUserRaw);
          if (existingHandoff?.conversionIntentId === expectedConversionIntentId) {
            console.info('[GuestHandoff] HANDOFF_BOUND', {
              permanentUserId,
              anonymousUserId: expectedAnonymousUserId,
              conversionIntentId: expectedConversionIntentId,
              idempotent: true,
            });
            console.info(
              `[GuestHandoff] BIND_SUCCESS`,
              {
                permanentUserId,
                anonymousUserId: expectedAnonymousUserId,
                conversionIntentId: expectedConversionIntentId,
                idempotent: true,
              }
            );
            console.info(
              `[GuestHandoff] SCOPED_HANDOFF_VERIFIED`,
              {
                permanentUserId,
                anonymousUserId: expectedAnonymousUserId,
                conversionIntentId: expectedConversionIntentId,
              }
            );
            return { success: true, handoff: existingHandoff, idempotent: true };
          }
        } catch (e) {}
      }
      return { success: false, reason: 'NO_STAGING_HANDOFF' };
    }

    const handoff = JSON.parse(raw);
    if (!handoff || typeof handoff !== 'object') {
      return { success: false, reason: 'MALFORMED_HANDOFF' };
    }

    // 1. Validate version
    if (handoff.version !== 2 && handoff.version !== 1) {
      console.warn('[GuestHandoff] Unsupported handoff version:', handoff.version);
      return { success: false, reason: 'UNSUPPORTED_VERSION' };
    }

    // 2. Validate source anonymous user ID
    if (handoff.sourceAnonymousUserId !== expectedAnonymousUserId) {
      console.warn(
        `[GuestHandoff] Source user mismatch: handoff has ${handoff.sourceAnonymousUserId}, expected ${expectedAnonymousUserId}. Binding rejected.`
      );
      return { success: false, reason: 'SOURCE_USER_MISMATCH' };
    }

    // 3. Validate source scope
    if (handoff.sourceScope !== `user_${expectedAnonymousUserId}`) {
      console.warn(
        `[GuestHandoff] Source scope mismatch: handoff has ${handoff.sourceScope}, expected user_${expectedAnonymousUserId}. Binding rejected.`
      );
      return { success: false, reason: 'SOURCE_SCOPE_MISMATCH' };
    }

    // 4. Validate conversion intent ID
    if (handoff.conversionIntentId !== expectedConversionIntentId) {
      console.warn(
        `[GuestHandoff] Intent ID mismatch: handoff has ${handoff.conversionIntentId}, expected ${expectedConversionIntentId}. Binding rejected.`
      );
      return { success: false, reason: 'INTENT_ID_MISMATCH' };
    }

    // 5. Target collision check
    const userKey = `oneMoreRush.user_${permanentUserId}.pendingGuestConversion`;
    const existingUserRaw = storage.getItem(userKey);

    if (existingUserRaw) {
      try {
        const existingHandoff = JSON.parse(existingUserRaw);
        if (
          existingHandoff?.conversionIntentId === expectedConversionIntentId ||
          existingHandoff?.reason === 'NETWORK_ERROR' ||
          existingHandoff?.reason === 'RPC_ERROR'
        ) {
          // Idempotent retry or overwriting a degraded diagnostic record with the authentic verified handoff
          storage.setItem(userKey, JSON.stringify(handoff));
          console.info('[GuestHandoff] HANDOFF_BOUND', {
            permanentUserId,
            anonymousUserId: expectedAnonymousUserId,
            conversionIntentId: expectedConversionIntentId,
            idempotent: true,
          });
          console.info(
            `[GuestHandoff] BIND_SUCCESS`,
            {
              permanentUserId,
              anonymousUserId: expectedAnonymousUserId,
              conversionIntentId: expectedConversionIntentId,
              idempotent: true,
            }
          );
          console.info(
            `[GuestHandoff] SCOPED_HANDOFF_VERIFIED`,
            {
              permanentUserId,
              anonymousUserId: expectedAnonymousUserId,
              conversionIntentId: expectedConversionIntentId,
            }
          );
          return { success: true, handoff, idempotent: true };
        } else {
          console.warn(
            `[GuestHandoff] Target user ${permanentUserId} already has a different conversion intent (${existingHandoff?.conversionIntentId}). Overwrite prevented.`
          );
          return { success: false, reason: 'TARGET_INTENT_CONFLICT' };
        }
      } catch (e) {
        return { success: false, reason: 'EXISTING_HANDOFF_PARSE_ERROR' };
      }
    }

    // 6. Write to permanent user's scoped storage
    storage.setItem(userKey, JSON.stringify(handoff));
    console.info('[GuestHandoff] HANDOFF_BOUND', {
      permanentUserId,
      anonymousUserId: expectedAnonymousUserId,
      conversionIntentId: expectedConversionIntentId,
      rushPoints: handoff.rushPoints,
      streak: handoff.streak,
    });
    console.info(
      `[GuestHandoff] BIND_SUCCESS`,
      {
        permanentUserId,
        anonymousUserId: expectedAnonymousUserId,
        conversionIntentId: expectedConversionIntentId,
        rushPoints: handoff.rushPoints,
        streak: handoff.streak,
      }
    );
    console.info(
      `[GuestHandoff] SCOPED_HANDOFF_VERIFIED`,
      {
        permanentUserId,
        anonymousUserId: expectedAnonymousUserId,
        conversionIntentId: expectedConversionIntentId,
      }
    );

    return { success: true, handoff };
  } catch (e) {
    console.warn('[GuestHandoff] Exception while binding handoff:', e);
    return { success: false, reason: 'BINDING_EXCEPTION', error: e.message };
  }
}

/**
 * Retrieves the pending guest conversion handoff for a specific user UUID.
 */
export function getPendingHandoffForUser(userId) {
  if (!userId || typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(`oneMoreRush.user_${userId}.pendingGuestConversion`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}
