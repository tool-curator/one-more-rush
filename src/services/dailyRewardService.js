/**
 * ONE MORE RUSH — Daily Visit Reward Service (Phase 6D-B2 Hotfix)
 * Server-authoritative RPC for authenticated users, LocalStorage for guests.
 * IMPORTANT: Protects existing local Rush Points balances from being prematurely overwritten
 * before the dedicated RP migration phase.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import { addRushPoints, getCurrentRushPoints } from './lockerService.js';
import { getScopedKey, emitScopeChange } from './storageScopeService.js';
import { loadDailyProgress, saveDailyProgress } from './dailyChallengeService.js';
import { isMigrationBarrierActive } from './migrationBarrierService.js';

export const STORAGE_KEY_DAILY_VISIT = 'onemore_daily_visit_date';

/**
 * Returns today's local date formatted as YYYY-MM-DD
 */
export function getTodayDateString(d = new Date()) {
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Claims the daily visit reward (+10 RP):
 * - If user is authenticated: Calls server RPC public.claim_daily_visit() to record the cloud transaction.
 *   Synchronizes the returned authoritative cloud balance to the authenticated UI state.
 * - If user is guest: Uses idempotent LocalStorage date check.
 */
export async function claimDailyVisitReward({ user = null, isGuest = true } = {}) {
  // 1. Server-Authoritative Flow (Anonymous Guests & Permanent Accounts)
  if (user && user.id && isSupabaseConfigured && supabase) {
    // Migration barrier check: Daily visit claim is strictly suppressed if user is in a blocked/unmigrated state
    if (isMigrationBarrierActive(user.id)) {
      console.warn(`[DailyReward] DAILY_VISIT_SKIPPED_DUE_TO_MIGRATION: Migration barrier active for user ${user.id}.`);
      return {
        mode: 'AUTHENTICATED',
        awarded: false,
        reason: 'MIGRATION_BARRIER_ACTIVE',
        balance: getCurrentRushPoints(),
      };
    }

    if (typeof window !== 'undefined' && window.localStorage) {
      const isPendingHandoff = Boolean(window.localStorage.getItem(`oneMoreRush.user_${user.id}.pendingGuestConversion`));
      const isMigrated = Boolean(window.localStorage.getItem(`oneMoreRush.user_${user.id}.cloudMigrationCompleted`));
      if (isPendingHandoff && !isMigrated) {
        console.warn(`[DailyReward] DAILY_VISIT_SKIPPED_DUE_TO_MIGRATION: Pending guest conversion handoff not yet migrated for user ${user.id}.`);
        return {
          mode: 'AUTHENTICATED',
          awarded: false,
          reason: 'MIGRATION_PENDING',
          balance: getCurrentRushPoints(),
        };
      }
    }

    try {
      const { data, error } = await supabase.rpc('claim_daily_visit');

      if (error) {
        console.warn('Daily visit RPC warning:', error.message);
        return {
          mode: 'AUTHENTICATED',
          awarded: false,
          error: error.message,
          balance: getCurrentRushPoints(),
        };
      }

      const record = Array.isArray(data) ? data[0] : data;
      if (!record) {
        return {
          mode: 'AUTHENTICATED',
          awarded: false,
          balance: getCurrentRushPoints(),
        };
      }

      const awarded = Boolean(record.awarded);
      const amount = Number(record.amount) || 0;
      const cloudBalance = Number(record.balance) || 0;

      if (awarded) {
        console.info('[DailyReward] DAILY_VISIT_GRANTED', {
          userId: user.id,
          amount,
          cloudBalance,
        });
      }

      // Synchronize authoritative cloud balance into authenticated UI state
      if (record.balance !== undefined && record.balance !== null) {
        const currentProgress = loadDailyProgress();
        currentProgress.rushPoints = cloudBalance;
        saveDailyProgress(currentProgress);
        emitScopeChange();
      }

      if (record.claim_date) {
        window.localStorage.setItem(getScopedKey('dailyVisit'), record.claim_date);
      }

      return {
        mode: 'AUTHENTICATED',
        awarded,
        reward: amount,
        cloudBalance,
        balance: cloudBalance,
        claimDate: record.claim_date,
      };
    } catch (err) {
      console.warn('Network error during daily visit claim:', err.message);
      return {
        mode: 'AUTHENTICATED',
        awarded: false,
        error: err.message,
        balance: getCurrentRushPoints(),
      };
    }
  }

  // 2. Guest User Flow -> LocalStorage
  if (typeof window !== 'undefined' && window.localStorage) {
    const today = getTodayDateString();
    const lastClaimed = window.localStorage.getItem(getScopedKey('dailyVisit'));

    if (lastClaimed === today) {
      return {
        mode: 'GUEST',
        awarded: false,
        reason: 'ALREADY_CLAIMED_TODAY',
        today,
        balance: getCurrentRushPoints(),
      };
    }

    // Idempotently record claim date locally
    window.localStorage.setItem(getScopedKey('dailyVisit'), today);
    const newBalance = addRushPoints(10);

    return {
      mode: 'GUEST',
      awarded: true,
      reward: 10,
      newBalance,
      balance: newBalance,
      today,
    };
  }

  return { mode: 'GUEST', awarded: false, reason: 'NO_STORAGE' };
}

// Backwards compatibility alias
export const checkAndClaimDailyVisitReward = claimDailyVisitReward;
