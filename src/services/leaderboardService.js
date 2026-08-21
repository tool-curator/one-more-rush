/**
 * ONE MORE RUSH — Leaderboard Service
 * Frontend contract and local statistics aggregator for game-specific scoreboards.
 * Prepares data contracts for future backend API integration.
 */

import { loadProgress, getColorMazeOverallBestScore } from '../games/color-maze/game/mazeStorage.js';

export const LEADERBOARD_GAMES = [
  {
    id: 'aim',
    name: 'AIM',
    icon: '🎯',
    tagline: 'Test your reaction speed and target precision.',
    badge: 'REACTION SPEED',
    accentColor: '#00f2fe',
  },
  {
    id: 'dodge',
    name: 'DODGE',
    icon: '🛡️',
    tagline: 'Survive. Collect gems. Risk everything in high-speed waves.',
    badge: 'SURVIVAL REFLEX',
    accentColor: '#ff3562',
  },
  {
    id: 'stack',
    name: 'STACK',
    icon: '🧱',
    tagline: 'Timing & balance. Stack blocks to reach record heights.',
    badge: 'TIMING & BALANCE',
    accentColor: '#00e676',
  },
  {
    id: 'number-rush',
    name: 'NUMBER RUSH',
    icon: '🔢',
    tagline: 'Rapid mental arithmetic and lightning decision speed.',
    badge: 'MENTAL AGILITY',
    accentColor: '#ffd166',
  },
  {
    id: 'memory',
    name: 'MEMORY',
    icon: '🧠',
    tagline: 'Sequence recall and pattern reproduction under pressure.',
    badge: 'PATTERN MEMORY',
    accentColor: '#b388ff',
  },
  {
    id: 'color-maze',
    name: 'COLOR MAZE',
    icon: '🎨',
    tagline: 'Paint every corridor. Solve mazes in optimal moves and record time.',
    badge: 'PATH PUZZLE',
    accentColor: '#00f2fe',
  },
];

export const TIME_PERIODS = [
  { id: 'ALL_TIME', label: 'ALL TIME', isAvailable: true },
  { id: 'THIS_WEEK', label: 'THIS WEEK', isAvailable: false, badge: 'SOON' },
  { id: 'TODAY', label: 'TODAY', isAvailable: false, badge: 'SOON' },
];

/**
 * Future API Leaderboard Data Contract definition
 * @typedef {Object} LeaderboardEntry
 * @property {number} rank - Position rank (1, 2, 3...)
 * @property {string} userId - Player unique ID
 * @property {string} username - Display username
 * @property {string} [avatar] - Avatar image URL or symbol
 * @property {string} [frame] - Equipped cosmetic profile frame
 * @property {string} [title] - Equipped player title
 * @property {number} score - Recorded high score
 * @property {Object} [metrics] - Extra game-specific metrics
 * @property {string} createdAt - ISO Timestamp
 */

/**
 * Future Backend Leaderboard Query Hook/Function
 * Returns clean frontend structure without fake data.
 */
export function fetchLeaderboard(gameId, period = 'ALL_TIME') {
  // Frontend only: Return honest empty state with future schema ready
  return {
    gameId,
    period,
    isLive: false,
    entries: [],
    totalEntries: 0,
    userRank: null,
    message: 'Global scoreboard coming soon.',
  };
}

import { getScopedKey } from './storageScopeService.js';

/**
 * Retrieve local personal record and stats for a specific game
 */
export function getGameLocalStats(gameId, scores = {}) {
  const currentBest = scores[gameId] || 0;

  if (gameId === 'stack') {
    let stackHeight = 0;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        stackHeight = parseInt(window.localStorage.getItem(getScopedKey('onemore_best_stack_height')) || '0', 10) || 0;
      }
    } catch (_) {}
    return {
      bestScore: currentBest,
      extraStats: [
        { label: 'BEST HEIGHT', value: stackHeight > 0 ? `${stackHeight} BLOCKS` : '—' },
      ],
    };
  }

  if (gameId === 'color-maze') {
    try {
      const progress = loadProgress();
      const overallBest = getColorMazeOverallBestScore();
      const completedCount = progress.completedLevels?.length || 0;
      const highestUnlocked = progress.highestUnlockedLevel || 1;

      return {
        bestScore: overallBest,
        extraStats: [
          { label: 'COMPLETED LEVELS', value: completedCount > 0 ? `${completedCount} LEVELS` : '—' },
          { label: 'HIGHEST UNLOCKED', value: `LEVEL ${highestUnlocked}` },
        ],
        mazeProgress: progress,
      };
    } catch (_) {
      return {
        bestScore: currentBest,
        extraStats: [],
      };
    }
  }

  // Generic games
  return {
    bestScore: currentBest,
    extraStats: [],
  };
}
