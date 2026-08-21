/**
 * ONE MORE RUSH — Storage Scope Service (Final Pre-6D-D Stabilization)
 * Manages user-scoped and guest-scoped LocalStorage namespaces for 100% account isolation.
 * Prevents account cross-talk (Account A vs Account B vs Guest), game best score leakage,
 * Color Maze progression leakage, and ensures safe single-owner legacy migration.
 */

let currentScopeId = 'guest';
const scopeChangeListeners = new Set();

/**
 * Returns the current active storage scope ID (e.g. 'guest' or 'user_<UUID>')
 */
export function getActiveStorageScope() {
  return currentScopeId;
}

/**
 * Registers a listener callback invoked whenever the active storage scope switches.
 */
export function onScopeChange(callback) {
  if (typeof callback === 'function') {
    scopeChangeListeners.add(callback);
  }
  return () => {
    scopeChangeListeners.delete(callback);
  };
}

export function emitScopeChange(scopeId = currentScopeId) {
  scopeChangeListeners.forEach((cb) => {
    try {
      cb(scopeId);
    } catch (err) {
      console.warn('Scope change listener error:', err);
    }
  });
}

/**
 * Sets the active storage scope, migrates legacy data once if applicable, and notifies listeners.
 */
export function setActiveStorageScope(userId) {
  const newScopeId = userId ? `user_${userId}` : 'guest';
  const changed = currentScopeId !== newScopeId;
  currentScopeId = newScopeId;

  migrateLegacyDataIfNeeded(currentScopeId);

  if (changed) {
    emitScopeChange(currentScopeId);
  }

  return currentScopeId;
}

/**
 * Resolves a scoped key for the currently active storage scope.
 * Examples:
 *   getScopedKey('points') -> 'oneMoreRush.user_<UUID>.points' or 'oneMoreRush.guest.points'
 *   getScopedKey('best.aim') -> 'oneMoreRush.user_<UUID>.best.aim'
 *   getScopedKey('colorMaze.progress') -> 'oneMoreRush.user_<UUID>.colorMaze.progress'
 */
export function getScopedKey(baseKey) {
  return `oneMoreRush.${currentScopeId}.${baseKey}`;
}

/**
 * Safe, global ONE-TIME legacy migration.
 * Legacy data is copied to exactly ONE scope (the first active account or guest session)
 * and marked globally completed so it is NEVER duplicated into other user accounts.
 */
export function migrateLegacyDataIfNeeded(targetScopeId) {
  if (typeof window === 'undefined' || !window.localStorage) return;

  const GLOBAL_MIGRATION_MARKER = 'oneMoreRush.legacyMigrationCompleted';
  const existingMigrationOwner = window.localStorage.getItem(GLOBAL_MIGRATION_MARKER);

  // If migration has already completed for the single owner, do not migrate to other accounts
  if (existingMigrationOwner) return;

  try {
    const legacyKeys = {
      points: 'oneMoreRush.points',
      dailyProgress: 'oneMoreRush.daily.progress',
      locker: 'oneMoreRush.locker',
      dailyVisit: 'onemore_daily_visit_date',
      colorMazeProgress: 'oneMore.colorMaze.progress',
      colorMazeLegacyUnlocked: 'onemore_colormaze_unlocked_level',
      bestAim: 'onemore_best_aim',
      bestDodge: 'onemore_best_dodge',
      bestStack: 'onemore_best_stack',
      bestStackHeight: 'onemore_best_stack_height',
      bestNumberRush: 'onemore_best_number_rush',
      bestMemory: 'onemore_best_memory',
      bestColorMaze: 'onemore_best_color_maze',
    };

    // Check if any legacy data actually exists
    const hasLegacyData = Object.values(legacyKeys).some((key) => window.localStorage.getItem(key) !== null);
    if (!hasLegacyData) {
      // Mark completed so new clean environments don't repeatedly check
      window.localStorage.setItem(GLOBAL_MIGRATION_MARKER, targetScopeId);
      return;
    }

    // Migrate each key safely into the single designated target scope
    const copyIfPresent = (legacyKey, scopedBaseKey) => {
      const val = window.localStorage.getItem(legacyKey);
      const targetKey = `oneMoreRush.${targetScopeId}.${scopedBaseKey}`;
      if (val !== null && window.localStorage.getItem(targetKey) === null) {
        window.localStorage.setItem(targetKey, val);
      }
    };

    copyIfPresent(legacyKeys.points, 'points');
    copyIfPresent(legacyKeys.dailyProgress, 'daily.progress');
    copyIfPresent(legacyKeys.locker, 'locker');
    copyIfPresent(legacyKeys.dailyVisit, 'dailyVisit');
    copyIfPresent(legacyKeys.colorMazeProgress, 'colorMaze.progress');
    copyIfPresent(legacyKeys.colorMazeLegacyUnlocked, 'colorMaze.unlockedLevel');
    copyIfPresent(legacyKeys.bestAim, 'best.aim');
    copyIfPresent(legacyKeys.bestDodge, 'best.dodge');
    copyIfPresent(legacyKeys.bestStack, 'best.stack');
    copyIfPresent(legacyKeys.bestStackHeight, 'best.stack_height');
    copyIfPresent(legacyKeys.bestNumberRush, 'best.number_rush');
    copyIfPresent(legacyKeys.bestMemory, 'best.memory');
    copyIfPresent(legacyKeys.bestColorMaze, 'best.color_maze');

    // Mark global one-time migration as permanently complete for this single owner
    window.localStorage.setItem(GLOBAL_MIGRATION_MARKER, targetScopeId);
  } catch (err) {
    console.warn('Safe legacy migration warning:', err);
  }
}
