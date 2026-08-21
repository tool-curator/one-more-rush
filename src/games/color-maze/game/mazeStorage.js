// Color Maze Player Progression Persistence System
// Versioned, stable, resilient localStorage management with legacy migration & score/star records

import { getScopedKey } from '../../../services/storageScopeService.js';

export const COLOR_MAZE_STORAGE_KEY = 'oneMore.colorMaze.progress';
export const LEGACY_STORAGE_KEY = 'onemore_colormaze_unlocked_level';
export const CURRENT_STORAGE_VERSION = 2;

/**
 * Returns a fresh default progression profile.
 */
export function getDefaultProgress() {
  return {
    version: CURRENT_STORAGE_VERSION,
    currentLevel: 1,
    highestUnlockedLevel: 1,
    completedLevels: [],
    bestTimes: {},
    bestMoves: {},
    bestScores: {},
    stars: {},
  };
}

/**
 * Validates and sanitizes a progress object, migrating from version 1 if needed.
 */
function sanitizeProgress(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const currentLevel = Math.max(1, Math.floor(Number(raw.currentLevel) || 1));
  const highestUnlockedLevel = Math.max(
    currentLevel,
    Math.floor(Number(raw.highestUnlockedLevel) || 1)
  );

  const completedLevels = Array.isArray(raw.completedLevels)
    ? Array.from(new Set(raw.completedLevels.map(Number).filter((n) => Number.isInteger(n) && n > 0)))
    : [];

  const bestTimes = {};
  if (raw.bestTimes && typeof raw.bestTimes === 'object') {
    for (const [k, v] of Object.entries(raw.bestTimes)) {
      const numVal = Number(v);
      if (!isNaN(numVal) && numVal > 0) {
        bestTimes[k] = parseFloat(numVal.toFixed(2));
      }
    }
  }

  const bestMoves = {};
  if (raw.bestMoves && typeof raw.bestMoves === 'object') {
    for (const [k, v] of Object.entries(raw.bestMoves)) {
      const numVal = Number(v);
      if (Number.isInteger(numVal) && numVal > 0) {
        bestMoves[k] = numVal;
      }
    }
  }

  const bestScores = {};
  if (raw.bestScores && typeof raw.bestScores === 'object') {
    for (const [k, v] of Object.entries(raw.bestScores)) {
      const numVal = Number(v);
      if (Number.isInteger(numVal) && numVal > 0) {
        bestScores[k] = numVal;
      }
    }
  }

  const stars = {};
  if (raw.stars && typeof raw.stars === 'object') {
    for (const [k, v] of Object.entries(raw.stars)) {
      const numVal = Number(v);
      if (Number.isInteger(numVal) && numVal >= 1 && numVal <= 3) {
        stars[k] = numVal;
      }
    }
  }

  return {
    version: CURRENT_STORAGE_VERSION,
    currentLevel,
    highestUnlockedLevel,
    completedLevels,
    bestTimes,
    bestMoves,
    bestScores,
    stars,
  };
}

/**
 * Loads player progression safely from localStorage using the active scoped namespace.
 */
export function loadProgress() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return getDefaultProgress();
  }

  try {
    const raw = window.localStorage.getItem(getScopedKey('colorMaze.progress'));
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      const sanitized = sanitizeProgress(parsed);
      if (sanitized) return sanitized;
    }
  } catch (error) {
    console.warn('[ColorMazeStorage] Error reading progress, using fallback:', error);
  }

  const defaultProf = getDefaultProgress();
  saveProgress(defaultProf);
  return defaultProf;
}

/**
 * Saves progression immediately to localStorage.
 */
export function saveProgress(progress) {
  if (typeof window === 'undefined' || !window.localStorage) return;

  try {
    const sanitized = sanitizeProgress(progress);
    if (sanitized) {
      window.localStorage.setItem(getScopedKey('colorMaze.progress'), JSON.stringify(sanitized));
    }
  } catch (error) {
    console.warn('[ColorMazeStorage] Error saving progress:', error);
  }
}

/**
 * Calculates level performance score and star rating deterministically.
 */
export function calculateLevelScore(levelData, actualTime, actualMoves) {
  const width = levelData?.width || 6;
  const optimalMoves = levelData?.solutionDepth || levelData?.minimumMoves || Math.floor(width * 2.2);
  const difficultyScore = levelData?.difficultyScore || 50;

  // Target time based on optimal moves and grid width
  const targetTime = Math.max(7, Math.round(optimalMoves * 0.95 + width * 0.7));

  // Determine Stars:
  // 3 stars: efficient moves and time near target
  // 2 stars: good moves and time
  // 1 star: successfully completed
  let stars = 1;
  const isMove3Star = actualMoves <= Math.ceil(optimalMoves * 1.35) + 1;
  const isTime3Star = actualTime <= targetTime * 1.45;

  const isMove2Star = actualMoves <= Math.ceil(optimalMoves * 1.85) + 4;
  const isTime2Star = actualTime <= targetTime * 2.25;

  if (isMove3Star && isTime3Star) {
    stars = 3;
  } else if (isMove2Star && isTime2Star) {
    stars = 2;
  } else if (isMove3Star || isTime3Star) {
    stars = 2;
  } else {
    stars = 1;
  }

  const BASE_SCORE = 1000;
  const timeBonus = Math.max(0, Math.round((targetTime * 1.8 - actualTime) * 35));
  const moveBonus = Math.max(0, Math.round((optimalMoves * 2.2 - actualMoves) * 45));
  const starBonus = stars === 3 ? 600 : stars === 2 ? 300 : 100;

  const difficultyMultiplier = 1 + (difficultyScore * 0.004);
  const finalScore = Math.max(100, Math.round((BASE_SCORE + timeBonus + moveBonus + starBonus) * difficultyMultiplier));

  return {
    score: finalScore,
    stars,
    targetTime,
    optimalMoves,
    timeBonus,
    moveBonus,
    starBonus,
  };
}

/**
 * Updates progression upon level completion and records best scores, times, moves, and stars.
 * Best time: lower is better.
 * Best moves: lower is better.
 * Best score: HIGHER is better.
 * Stars: HIGHER is better.
 */
export function recordLevelCompletion(levelNum, timeSeconds, movesCount, levelData = null) {
  const current = loadProgress();
  const levelKey = String(levelNum);

  // Update completed levels
  if (!current.completedLevels.includes(levelNum)) {
    current.completedLevels.push(levelNum);
  }

  // Update highest unlocked level
  if (levelNum + 1 > current.highestUnlockedLevel) {
    current.highestUnlockedLevel = levelNum + 1;
  }

  // Update current level pointer
  current.currentLevel = levelNum + 1;

  // Best time (lower is better)
  const formattedTime = parseFloat(Number(timeSeconds).toFixed(2));
  let isNewBestTime = false;
  if (formattedTime > 0) {
    if (!current.bestTimes[levelKey] || formattedTime < current.bestTimes[levelKey]) {
      current.bestTimes[levelKey] = formattedTime;
      isNewBestTime = true;
    }
  }

  // Best moves (lower is better)
  const parsedMoves = Math.floor(Number(movesCount));
  let isNewBestMoves = false;
  if (parsedMoves > 0) {
    if (!current.bestMoves[levelKey] || parsedMoves < current.bestMoves[levelKey]) {
      current.bestMoves[levelKey] = parsedMoves;
      isNewBestMoves = true;
    }
  }

  // Calculate score and stars
  const scoreResult = calculateLevelScore(levelData, formattedTime, parsedMoves);
  const score = scoreResult.score;
  const stars = scoreResult.stars;

  // Best score (HIGHER is better)
  let isNewBestScore = false;
  const previousBestScore = current.bestScores[levelKey] || 0;
  if (score > previousBestScore) {
    current.bestScores[levelKey] = score;
    isNewBestScore = true;
  }

  // Best stars (HIGHER is better)
  if (!current.stars[levelKey] || stars > current.stars[levelKey]) {
    current.stars[levelKey] = stars;
  }

  saveProgress(current);

  return {
    progress: current,
    score,
    stars,
    bestScore: current.bestScores[levelKey] || score,
    isNewBestScore,
    isNewBest: isNewBestScore,
    isNewBestTime,
    isNewBestMoves,
    scoreBreakdown: scoreResult,
  };
}

/**
 * Returns the player's all-time highest score across all completed Color Maze levels.
 */
export function getColorMazeOverallBestScore() {
  const current = loadProgress();
  const scores = Object.values(current.bestScores || {});
  if (scores.length === 0) return 0;
  const max = Math.max(...scores);
  return Number.isFinite(max) && max > 0 ? max : 0;
}

