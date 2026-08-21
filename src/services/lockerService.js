/**
 * ONE MORE RUSH — Rush Locker Service
 * Cosmetic profile frames, player titles, victory effects, and achievement badges.
 * Play -> Earn -> Personalize (100% cosmetic, zero gameplay modifications).
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import { loadDailyProgress, saveDailyProgress } from './dailyChallengeService.js';
import { getScopedKey, getActiveStorageScope, emitScopeChange } from './storageScopeService.js';
import { isMigrationBarrierActive } from './migrationBarrierService.js';

export const STORAGE_KEY_LOCKER = 'oneMoreRush.locker';
export const STORAGE_KEY_RUSH_POINTS = 'oneMoreRush.points';

/**
 * Helper to check if the current active session belongs to an authenticated user with an active migration barrier.
 */
function isCurrentSessionBarrierActive() {
  const scope = getActiveStorageScope();
  if (scope && scope.startsWith('user_')) {
    const userId = scope.slice(5);
    return isMigrationBarrierActive(userId);
  }
  return false;
}

// ── 1. COSMETIC INVENTORIES ──────────────────────────────────────────────────

export const FRAMES_INVENTORY = [
  {
    id: 'frame_classic',
    key: 'classic',
    name: 'CLASSIC',
    category: 'frames',
    price: 0,
    rarity: 'COMMON',
    description: 'Clean brushed titanium border with subtle corner rivets.',
    cssClass: 'frame-classic',
    glowColor: 'rgba(148, 163, 184, 0.4)',
    accentColor: '#94a3b8',
  },
  {
    id: 'frame_neon',
    key: 'neon',
    name: 'NEON',
    category: 'frames',
    price: 500,
    rarity: 'RARE',
    description: 'Vibrant cyan neon luminescence with pulsing corner nodes.',
    cssClass: 'frame-neon',
    glowColor: 'rgba(0, 229, 255, 0.5)',
    accentColor: '#00e5ff',
  },
  {
    id: 'frame_cyber',
    key: 'cyber',
    name: 'CYBER',
    category: 'frames',
    price: 1000,
    rarity: 'RARE',
    description: 'Futuristic circuit matrix and emerald terminal scanlines.',
    cssClass: 'frame-cyber',
    glowColor: 'rgba(0, 230, 118, 0.5)',
    accentColor: '#00e676',
  },
  {
    id: 'frame_inferno',
    key: 'inferno',
    name: 'INFERNO',
    category: 'frames',
    price: 2000,
    rarity: 'EPIC',
    description: 'Fiery solar radiance with molten flame energy currents.',
    cssClass: 'frame-inferno',
    glowColor: 'rgba(255, 119, 0, 0.55)',
    accentColor: '#ff7700',
  },
  {
    id: 'frame_void',
    key: 'void',
    name: 'VOID',
    category: 'frames',
    price: 3500,
    rarity: 'EPIC',
    description: 'Deep cosmic violet event horizon with stardust particle shimmer.',
    cssClass: 'frame-void',
    glowColor: 'rgba(179, 136, 255, 0.55)',
    accentColor: '#b388ff',
  },
  {
    id: 'frame_one_more',
    key: 'one_more',
    name: 'ONE MORE',
    category: 'frames',
    price: 5000,
    rarity: 'LEGENDARY',
    description: 'The ultimate champion gold and ruby holographic border.',
    cssClass: 'frame-one-more',
    glowColor: 'rgba(255, 209, 102, 0.65)',
    accentColor: '#ffd166',
  },
];

export const TITLES_INVENTORY = [
  {
    id: 'title_rookie',
    key: 'rookie',
    name: 'ROOKIE',
    category: 'titles',
    price: 0,
    rarity: 'COMMON',
    description: 'Every champion started at round one.',
    accentColor: '#94a3b8',
  },
  {
    id: 'title_one_more',
    key: 'one_more',
    name: 'ONE MORE',
    category: 'titles',
    price: 500,
    rarity: 'RARE',
    description: 'Just one more game. Always.',
    accentColor: '#00e5ff',
  },
  {
    id: 'title_speed_demon',
    key: 'speed_demon',
    name: 'SPEED DEMON',
    category: 'titles',
    price: 1000,
    rarity: 'RARE',
    description: 'Faster than the shrinking countdown bar.',
    accentColor: '#00e676',
  },
  {
    id: 'title_reflex_master',
    key: 'reflex_master',
    name: 'REFLEX MASTER',
    category: 'titles',
    price: 2500,
    rarity: 'EPIC',
    description: 'Pinpoint precision and millisecond reactions.',
    accentColor: '#ffb703',
  },
  {
    id: 'title_hunter',
    key: 'hunter',
    name: 'HIGH SCORE HUNTER',
    category: 'titles',
    price: 5000,
    rarity: 'EPIC',
    description: 'Relentlessly pursuing personal records.',
    accentColor: '#ff3562',
  },
  {
    id: 'title_rush_addict',
    key: 'rush_addict',
    name: 'RUSH ADDICT',
    category: 'titles',
    price: 7500,
    rarity: 'LEGENDARY',
    description: 'Chasing the flow state every single day.',
    accentColor: '#b388ff',
  },
  {
    id: 'title_legend',
    key: 'legend',
    name: 'LEGEND',
    category: 'titles',
    price: 10000,
    rarity: 'LEGENDARY',
    description: 'A celebrated master of the ONE MORE RUSH arcade.',
    accentColor: '#ffd166',
  },
];

export const EFFECTS_INVENTORY = [
  {
    id: 'effect_classic',
    key: 'classic',
    name: 'CLASSIC',
    category: 'effects',
    price: 0,
    rarity: 'COMMON',
    icon: '⚡',
    description: 'Crisp minimal white flash upon stage clear.',
    accentColor: '#94a3b8',
  },
  {
    id: 'effect_confetti',
    key: 'confetti',
    name: 'CONFETTI',
    category: 'effects',
    price: 750,
    rarity: 'RARE',
    icon: '🎉',
    description: 'Celebratory multi-color confetti stream burst.',
    accentColor: '#00e5ff',
  },
  {
    id: 'effect_neon_burst',
    key: 'neon_burst',
    name: 'NEON BURST',
    category: 'effects',
    price: 1500,
    rarity: 'RARE',
    icon: '✨',
    description: 'Shockwave pulse of cyan and magenta lasers.',
    accentColor: '#00e676',
  },
  {
    id: 'effect_starfall',
    key: 'starfall',
    name: 'STARFALL',
    category: 'effects',
    price: 2500,
    rarity: 'EPIC',
    icon: '✨',
    description: 'A cascade of starlight for your biggest wins.',
    accentColor: '#ffd166',
  },
  {
    id: 'effect_lightning',
    key: 'lightning',
    name: 'LIGHTNING',
    category: 'effects',
    price: 4000,
    rarity: 'EPIC',
    icon: '⚡',
    description: 'High-voltage electric arc discharge across the screen.',
    accentColor: '#b388ff',
  },
  {
    id: 'effect_glitch',
    key: 'glitch',
    name: 'GLITCH',
    category: 'effects',
    price: 5000,
    rarity: 'LEGENDARY',
    icon: '🌀',
    description: 'Reality-bending cyber distortion scan wave.',
    accentColor: '#ffd166',
  },
];

export const BADGES_INVENTORY = [
  {
    id: 'badge_first_play',
    key: 'first_play',
    name: 'FIRST PLAY',
    category: 'badges',
    icon: '🎮',
    rarity: 'COMMON',
    description: 'Play your first game in the ONE MORE RUSH arcade.',
    unlockCondition: 'Play any game',
  },
  {
    id: 'badge_one_more',
    key: 'one_more',
    name: 'ONE MORE',
    category: 'badges',
    icon: '🔥',
    rarity: 'RARE',
    description: 'Maintain a 3+ day daily streak.',
    unlockCondition: 'Reach 3-Day Daily Streak',
  },
  {
    id: 'badge_high_score',
    key: 'high_score',
    name: 'HIGH SCORE',
    category: 'badges',
    icon: '🏆',
    rarity: 'RARE',
    description: 'Score 12,500+ points in any game.',
    unlockCondition: 'Score 12,500+ in Any Game',
  },
  {
    id: 'badge_sharpshooter',
    key: 'sharpshooter',
    name: 'SHARPSHOOTER',
    category: 'badges',
    icon: '🎯',
    rarity: 'EPIC',
    description: 'Achieve a score of 20,000+ in AIM.',
    unlockCondition: '20,000+ pts in AIM',
  },
  {
    id: 'badge_survivor',
    key: 'survivor',
    name: 'SURVIVOR',
    category: 'badges',
    icon: '🛡️',
    rarity: 'EPIC',
    description: 'Achieve a score of 20,000+ in DODGE.',
    unlockCondition: '20,000+ pts in DODGE',
  },
  {
    id: 'badge_builder',
    key: 'builder',
    name: 'BUILDER',
    category: 'badges',
    icon: '🧱',
    rarity: 'EPIC',
    description: 'Stack blocks up to Height 25+ in STACK.',
    unlockCondition: 'Height 25+ in STACK',
  },
  {
    id: 'badge_memory_master',
    key: 'memory_master',
    name: 'MEMORY MASTER',
    category: 'badges',
    icon: '🧠',
    rarity: 'EPIC',
    description: 'Achieve a score of 12,500+ in MEMORY.',
    unlockCondition: '12,500+ pts in MEMORY',
  },
  {
    id: 'badge_colorist',
    key: 'colorist',
    name: 'COLORIST',
    category: 'badges',
    icon: '🎨',
    rarity: 'EPIC',
    description: 'Score 4,000+ points on Color Maze levels.',
    unlockCondition: '4,000+ pts in COLOR MAZE',
  },
];
 
export function getBadgeByKey(key) {
  return BADGES_INVENTORY.find((b) => b.key === key || b.id === key) || null;
}

// Helper to access storage safely in any environment
function getStorage() {
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  if (typeof localStorage !== 'undefined') return localStorage;
  if (typeof global !== 'undefined' && global.window?.localStorage) return global.window.localStorage;
  return null;
}

// ── 2. LOCKER DATA ACCESS & MIGRATION ────────────────────────────────────────

function getDefaultLockerState() {
  return {
    version: 1,
    owned: {
      frames: ['classic'],
      titles: ['rookie'],
      effects: ['classic'],
      badges: [],
    },
    equipped: {
      frame: 'classic',
      title: 'rookie',
      effect: 'classic',
    },
  };
}

/**
 * Load persisted Locker state
 */
/**
 * Load persisted Locker state
 */
export function loadLockerState() {
  try {
    const storage = getStorage();
    if (!storage) return getDefaultLockerState();
    const raw = storage.getItem(getScopedKey('locker'));
    if (!raw) return getDefaultLockerState();
    const parsed = JSON.parse(raw);

    const defaultState = getDefaultLockerState();

    // Ensure all default items are owned
    const ownedFrames = Array.isArray(parsed.owned?.frames) ? parsed.owned.frames : ['classic'];
    if (!ownedFrames.includes('classic')) ownedFrames.push('classic');

    const ownedTitles = Array.isArray(parsed.owned?.titles) ? parsed.owned.titles : ['rookie'];
    if (!ownedTitles.includes('rookie')) ownedTitles.push('rookie');

    const rawEffects = Array.isArray(parsed.owned?.effects) ? parsed.owned.effects : ['classic'];
    const ownedEffects = Array.from(new Set(rawEffects.map((e) => (e === 'pixel_explosion' ? 'starfall' : e))));
    if (!ownedEffects.includes('classic')) ownedEffects.push('classic');

    const ownedBadges = Array.isArray(parsed.owned?.badges) ? parsed.owned.badges : [];

    const equippedEffectKey = parsed.equipped?.effect === 'pixel_explosion' ? 'starfall' : (parsed.equipped?.effect || 'classic');

    return {
      version: 1,
      owned: {
        frames: ownedFrames,
        titles: ownedTitles,
        effects: ownedEffects,
        badges: ownedBadges,
      },
      equipped: {
        frame: parsed.equipped?.frame || 'classic',
        title: parsed.equipped?.title || 'rookie',
        effect: equippedEffectKey,
      },
    };
  } catch (e) {
    console.warn('Failed to load locker state:', e);
    return getDefaultLockerState();
  }
}

/**
 * Get the currently equipped victory effect key
 */
export function getEquippedVictoryEffect() {
  const locker = loadLockerState();
  return locker.equipped?.effect || 'classic';
}

/**
 * Save Locker state to localStorage
 */
export function saveLockerState(state) {
  try {
    const storage = getStorage();
    if (!storage) return;
    storage.setItem(getScopedKey('locker'), JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save locker state:', e);
  }
}

/**
 * Get unified current Rush Points balance
 */
export function getCurrentRushPoints() {
  try {
    const dailyProg = loadDailyProgress();
    return dailyProg.rushPoints || 0;
  } catch (e) {
    const storage = getStorage();
    if (!storage) return 0;
    return parseInt(storage.getItem(getScopedKey('points')) || '0', 10) || 0;
  }
}

/**
 * Add Rush Points and synchronize both storage keys
 */
export function addRushPoints(amount) {
  if (!amount || amount <= 0) return getCurrentRushPoints();
  if (isCurrentSessionBarrierActive()) {
    console.warn('[Locker] ADD_POINTS_BLOCKED: Migration barrier active for current user. Mutation rejected.');
    return getCurrentRushPoints();
  }
  const dailyProg = loadDailyProgress();
  const current = dailyProg.rushPoints || 0;
  const newBalance = current + amount;
  dailyProg.rushPoints = newBalance;
  saveDailyProgress(dailyProg);

  const storage = getStorage();
  if (storage) {
    storage.setItem(getScopedKey('points'), String(newBalance));
  }
  return newBalance;
}

/**
 * Deduct Rush Points and synchronize both storage keys
 */
export function deductRushPoints(amount) {
  if (isCurrentSessionBarrierActive()) {
    console.warn('[Locker] DEDUCTION_BLOCKED: Migration barrier active for current user. Spending preserved snapshot is prohibited.');
    return false;
  }
  const dailyProg = loadDailyProgress();
  const current = dailyProg.rushPoints || 0;
  if (current < amount) return false;

  const newBalance = current - amount;
  dailyProg.rushPoints = newBalance;
  saveDailyProgress(dailyProg);

  const storage = getStorage();
  if (storage) {
    storage.setItem(getScopedKey('points'), String(newBalance));
  }
  return true;
}

// ── 3. PURCHASE & EQUIP ACTIONS ──────────────────────────────────────────────

/**
 * Hydrate equipped cosmetics and owned defaults from persistent cloud profile
 */
export function hydrateLockerFromProfile(profile) {
  if (!profile || typeof profile !== 'object') return loadLockerState();

  const locker = loadLockerState();
  let changed = false;

  // Hydrate equipped frame if valid
  if (profile.avatar_frame && profile.avatar_frame !== locker.equipped?.frame) {
    if (!locker.equipped) locker.equipped = {};
    locker.equipped.frame = profile.avatar_frame;
    if (!locker.owned.frames) locker.owned.frames = ['classic'];
    if (!locker.owned.frames.includes(profile.avatar_frame)) {
      locker.owned.frames.push(profile.avatar_frame);
    }
    changed = true;
  }

  // Hydrate equipped title if valid
  if (profile.title && profile.title !== locker.equipped?.title) {
    if (!locker.equipped) locker.equipped = {};
    locker.equipped.title = profile.title;
    if (!locker.owned.titles) locker.owned.titles = ['rookie'];
    if (!locker.owned.titles.includes(profile.title)) {
      locker.owned.titles.push(profile.title);
    }
    changed = true;
  }

  // Hydrate equipped victory effect if valid
  const effectKey = profile.victory_effect === 'pixel_explosion' ? 'starfall' : profile.victory_effect;
  if (effectKey && effectKey !== locker.equipped?.effect) {
    if (!locker.equipped) locker.equipped = {};
    locker.equipped.effect = effectKey;
    if (!locker.owned.effects) locker.owned.effects = ['classic'];
    if (!locker.owned.effects.includes(effectKey)) {
      locker.owned.effects.push(effectKey);
    }
    changed = true;
  }

  if (changed) {
    saveLockerState(locker);
    emitScopeChange();
  }

  return locker;
}

/**
 * Synchronize server-authoritative cosmetic ownership into local storage.
 * Fetches user_locker_items from Supabase and merges into user-scoped locker.owned.
 */
export async function syncServerLockerOwnership(user, profile = null) {
  if (!user || !user.id || !isSupabaseConfigured || !supabase) return;
  if (isCurrentSessionBarrierActive() || isMigrationBarrierActive(user.id)) return;

  try {
    // If profile is provided, hydrate equipped cosmetics first
    if (profile) {
      hydrateLockerFromProfile(profile);
    }

    const { data, error } = await supabase.rpc('get_user_owned_locker_items');
    if (error) {
      console.warn('[Locker] Error fetching cloud locker items:', error.message);
      return;
    }

    if (Array.isArray(data) && data.length > 0) {
      const locker = loadLockerState();
      let changed = false;

      data.forEach((item) => {
        const cat = item.category;
        const key = item.item_key;
        if (cat && key) {
          if (!locker.owned[cat]) locker.owned[cat] = [];
          if (!locker.owned[cat].includes(key)) {
            locker.owned[cat].push(key);
            changed = true;
          }
        }
      });

      if (changed) {
        saveLockerState(locker);
        emitScopeChange();
      }
    }
  } catch (err) {
    console.warn('[Locker] Failed to sync server locker ownership:', err);
  }
}

/**
 * Purchase a cosmetic item
 * Authenticated mode: Fully server-authoritative via purchase_locker_item RPC.
 * Guest mode: Uses local storage economy via deductRushPoints().
 */
export async function purchaseItem(category, itemKey, { user = null, isGuest = true } = {}) {
  let item = null;
  if (category === 'frames') item = FRAMES_INVENTORY.find((f) => f.key === itemKey);
  else if (category === 'titles') item = TITLES_INVENTORY.find((t) => t.key === itemKey);
  else if (category === 'effects') item = EFFECTS_INVENTORY.find((e) => e.key === itemKey);

  if (!item) {
    return { success: false, error: 'ITEM_NOT_FOUND' };
  }

  // Starter / Free items are always owned at 0 cost
  if (item.price === 0) {
    return { success: true, alreadyOwned: true, balance: getCurrentRushPoints(), item };
  }

  const hasServerSession = Boolean(user && user.id && isSupabaseConfigured && supabase);

  // 1. Migration Barrier Check
  if (isCurrentSessionBarrierActive() || (user && isMigrationBarrierActive(user.id))) {
    console.warn('[Locker] PURCHASE_BLOCKED: Migration barrier active. Preserved Rush Points cannot be spent.');
    return {
      success: false,
      error: 'MIGRATION_BARRIER_ACTIVE',
      balance: getCurrentRushPoints(),
      item,
    };
  }

  // 2. Server-Authoritative Purchase Flow (Anonymous & Permanent Accounts)
  if (hasServerSession) {
    try {
      const { data, error } = await supabase.rpc('purchase_locker_item', {
        p_category: category,
        p_item_key: itemKey,
      });

      if (error) {
        console.warn('[Locker] Server purchase RPC error:', error.message);
        return {
          success: false,
          error: 'TRANSACTION_FAILED',
          details: error.message,
          item,
        };
      }

      const record = Array.isArray(data) ? data[0] : data;
      if (!record) {
        return { success: false, error: 'EMPTY_RESPONSE', item };
      }

      const cloudBalance = Number(record.balance ?? 0);
      const serverPrice = Number(record.price ?? item.price);

      // Case A: Insufficient Funds
      if (!record.success && !record.already_owned) {
        return {
          success: false,
          error: 'NOT_ENOUGH_POINTS',
          required: serverPrice,
          available: cloudBalance,
          item,
        };
      }

      // Case B: Already Owned on Server
      if (record.already_owned) {
        const locker = loadLockerState();
        if (!locker.owned[category]) locker.owned[category] = [];
        if (!locker.owned[category].includes(itemKey)) {
          locker.owned[category].push(itemKey);
          saveLockerState(locker);
        }
        const dailyProg = loadDailyProgress();
        dailyProg.rushPoints = cloudBalance;
        saveDailyProgress(dailyProg);
        const storage = getStorage();
        if (storage) {
          storage.setItem(getScopedKey('points'), String(cloudBalance));
        }
        emitScopeChange();

        return {
          success: true,
          alreadyOwned: true,
          balance: cloudBalance,
          item,
        };
      }

      // Case C: Successful Purchase on Server
      if (record.success) {
        const locker = loadLockerState();
        if (!locker.owned[category]) locker.owned[category] = [];
        if (!locker.owned[category].includes(itemKey)) {
          locker.owned[category].push(itemKey);
          saveLockerState(locker);
        }
        const dailyProg = loadDailyProgress();
        dailyProg.rushPoints = cloudBalance;
        saveDailyProgress(dailyProg);
        const storage = getStorage();
        if (storage) {
          storage.setItem(getScopedKey('points'), String(cloudBalance));
        }
        emitScopeChange();

        return {
          success: true,
          alreadyOwned: false,
          balance: cloudBalance,
          item,
        };
      }

      return { success: false, error: 'UNKNOWN_STATE', item };
    } catch (err) {
      console.warn('[Locker] Network error during locker purchase:', err);
      return { success: false, error: 'NETWORK_ERROR', item };
    }
  }

  // 3. Guest User Flow -> LocalStorage Economy
  const locker = loadLockerState();
  if (locker.owned[category]?.includes(itemKey)) {
    return { success: true, alreadyOwned: true, balance: getCurrentRushPoints(), item };
  }

  // Deduct points locally
  const deducted = deductRushPoints(item.price);
  if (!deducted) {
    return { success: false, error: 'TRANSACTION_FAILED' };
  }

  // Add to owned inventory
  if (!locker.owned[category]) locker.owned[category] = [];
  locker.owned[category].push(itemKey);
  saveLockerState(locker);

  return {
    success: true,
    alreadyOwned: false,
    balance: getCurrentRushPoints(),
    item,
  };
}

/**
 * Equip a cosmetic item
 */
export function equipItem(category, itemKey) {
  const locker = loadLockerState();

  // Singular category key ('frame', 'title', 'effect')
  const singularKey = category.endsWith('s') ? category.slice(0, -1) : category;
  const pluralKey = category.endsWith('s') ? category : `${category}s`;

  // Verify ownership or free
  const isOwned = locker.owned[pluralKey]?.includes(itemKey) || itemKey === 'classic' || itemKey === 'rookie';
  if (!isOwned) {
    return { success: false, error: 'NOT_OWNED' };
  }

  locker.equipped[singularKey] = itemKey;
  saveLockerState(locker);

  return {
    success: true,
    equipped: locker.equipped,
  };
}

// ── 4. BADGE EVALUATION HOOK ─────────────────────────────────────────────────

/**
 * Evaluate unlocked badges based on player statistics
 */
export function evaluateBadges(scores = {}, streak = 0) {
  const unlocked = [];

  const aimScore = scores.aim || 0;
  const dodgeScore = scores.dodge || 0;
  const stackScore = scores.stack || 0;
  const stackHeight = scores.stackHeight || 0;
  const numRushScore = scores['number-rush'] || 0;
  const memScore = scores.memory || 0;
  const mazeScore = scores['color-maze'] || 0;

  const totalPlays = (aimScore > 0 ? 1 : 0) + (dodgeScore > 0 ? 1 : 0) + (stackScore > 0 ? 1 : 0) + (numRushScore > 0 ? 1 : 0) + (memScore > 0 ? 1 : 0) + (mazeScore > 0 ? 1 : 0);
  const maxScore = Math.max(aimScore, dodgeScore, stackScore, numRushScore, memScore, mazeScore);

  // 1. First Play
  if (totalPlays > 0) unlocked.push('first_play');

  // 2. One More (Maintain a 3+ day daily streak)
  if (streak >= 3) unlocked.push('one_more');

  // 3. High Score (12.5k+ in any game)
  if (maxScore >= 12500) unlocked.push('high_score');

  // 4. Sharpshooter (20k+ in AIM)
  if (aimScore >= 20000) unlocked.push('sharpshooter');

  // 5. Survivor (20k+ in DODGE)
  if (dodgeScore >= 20000) unlocked.push('survivor');

  // 6. Builder (Height 25+ or 10k+ in STACK)
  if (stackHeight >= 25 || stackScore >= 10000) unlocked.push('builder');

  // 7. Memory Master (12.5k+ in MEMORY)
  if (memScore >= 12500) unlocked.push('memory_master');

  // 8. Colorist (4k+ in COLOR MAZE)
  if (mazeScore >= 4000) unlocked.push('colorist');

  return unlocked;
}
