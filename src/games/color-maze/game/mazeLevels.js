// Handcrafted Benchmark Levels & Procedural Engine Integration for Color Maze
// 0 = Wall (solid obstacle), 1 = Floor (unpainted path)
import { validateAllLevels } from './mazeValidator.js';
import { generateProceduralLevel } from './mazeGenerator.js';

export const COLOR_MAZE_THEMES = [
  {
    name: 'Cyber Cyan',
    ballColor: '#00f2fe',
    ballGlow: 'rgba(0, 242, 254, 0.75)',
    paintedColor: '#0090a8',
    paintedGlow: 'rgba(0, 242, 254, 0.25)',
    wallColor: '#141a29',
    wallTop: '#1e283d',
    wallBorder: 'rgba(0, 242, 254, 0.35)',
    floorColor: '#060810',
    floorGrid: 'rgba(255, 255, 255, 0.04)',
  },
  {
    name: 'Neon Coral',
    ballColor: '#ff3562',
    ballGlow: 'rgba(255, 53, 98, 0.75)',
    paintedColor: '#a81838',
    paintedGlow: 'rgba(255, 53, 98, 0.25)',
    wallColor: '#20131b',
    wallTop: '#331a28',
    wallBorder: 'rgba(255, 53, 98, 0.35)',
    floorColor: '#0c060a',
    floorGrid: 'rgba(255, 255, 255, 0.04)',
  },
  {
    name: 'Electric Violet',
    ballColor: '#c77dff',
    ballGlow: 'rgba(199, 125, 255, 0.75)',
    paintedColor: '#7a28b8',
    paintedGlow: 'rgba(199, 125, 255, 0.25)',
    wallColor: '#181126',
    wallTop: '#26193d',
    wallBorder: 'rgba(199, 125, 255, 0.35)',
    floorColor: '#090510',
    floorGrid: 'rgba(255, 255, 255, 0.04)',
  },
  {
    name: 'Solar Amber',
    ballColor: '#ffb703',
    ballGlow: 'rgba(255, 183, 3, 0.75)',
    paintedColor: '#a87400',
    paintedGlow: 'rgba(255, 183, 3, 0.25)',
    wallColor: '#1f1a10',
    wallTop: '#332a17',
    wallBorder: 'rgba(255, 183, 3, 0.35)',
    floorColor: '#0c0a05',
    floorGrid: 'rgba(255, 255, 255, 0.04)',
  },
  {
    name: 'Emerald Matrix',
    ballColor: '#00e676',
    ballGlow: 'rgba(0, 230, 118, 0.75)',
    paintedColor: '#008537',
    paintedGlow: 'rgba(0, 230, 118, 0.25)',
    wallColor: '#101d16',
    wallTop: '#183024',
    wallBorder: 'rgba(0, 230, 118, 0.35)',
    floorColor: '#050c08',
    floorGrid: 'rgba(255, 255, 255, 0.04)',
  },
];

// 10 Handcrafted Benchmark Levels with progressive difficulty
export const BENCHMARK_LEVELS = [
  // Level 1: 5x5 - Tutorial (7 moves)
  {
    id: 1,
    name: 'Level 1',
    width: 5,
    height: 5,
    startPos: { x: 0, y: 0 },
    themeIndex: 0,
    minimumMoves: 7,
    solutionMoves: ['RIGHT', 'DOWN', 'RIGHT', 'LEFT', 'DOWN', 'RIGHT', 'UP'],
    grid: [
      [1, 1, 1, 0, 1],
      [0, 0, 1, 0, 1],
      [1, 1, 1, 1, 1],
      [1, 0, 0, 0, 1],
      [1, 1, 1, 1, 1],
    ],
  },

  // Level 2: 5x5 - Easy Puzzle (7 moves)
  {
    id: 2,
    name: 'Level 2',
    width: 5,
    height: 5,
    startPos: { x: 0, y: 0 },
    themeIndex: 1,
    minimumMoves: 7,
    solutionMoves: ['DOWN', 'RIGHT', 'DOWN', 'LEFT', 'RIGHT', 'UP', 'LEFT'],
    grid: [
      [1, 1, 1, 1, 1],
      [1, 0, 0, 0, 1],
      [1, 1, 1, 0, 1],
      [0, 0, 1, 0, 1],
      [1, 1, 1, 1, 1],
    ],
  },

  // Level 3: 6x6 - Medium (13 moves)
  {
    id: 3,
    name: 'Level 3',
    width: 6,
    height: 6,
    startPos: { x: 0, y: 0 },
    themeIndex: 2,
    minimumMoves: 13,
    solutionMoves: ['DOWN', 'RIGHT', 'DOWN', 'UP', 'LEFT', 'DOWN', 'LEFT', 'UP', 'LEFT', 'UP', 'RIGHT', 'DOWN', 'LEFT'],
    grid: [
      [1, 1, 0, 0, 1, 1],
      [1, 1, 1, 1, 1, 1],
      [1, 1, 0, 1, 1, 1],
      [1, 1, 1, 1, 1, 1],
      [0, 1, 0, 1, 1, 1],
      [1, 1, 0, 1, 1, 1],
    ],
  },

  // Level 4: 7x7 - Hard (17 moves)
  {
    id: 4,
    name: 'Level 4',
    width: 7,
    height: 7,
    startPos: { x: 0, y: 0 },
    themeIndex: 3,
    minimumMoves: 17,
    solutionMoves: ['DOWN', 'RIGHT', 'DOWN', 'LEFT', 'DOWN', 'RIGHT', 'UP', 'RIGHT', 'DOWN', 'LEFT', 'UP', 'RIGHT', 'UP', 'DOWN', 'LEFT', 'UP', 'RIGHT'],
    grid: [
      [1, 0, 1, 1, 1, 1, 0],
      [1, 1, 1, 1, 1, 1, 1],
      [0, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 0],
      [1, 1, 1, 0, 0, 1, 1],
      [1, 1, 1, 1, 1, 1, 1],
      [0, 1, 1, 0, 1, 1, 0],
    ],
  },

  // Level 5: 7x7 - Medium+ (20 moves)
  {
    id: 5,
    name: 'Level 5',
    width: 7,
    height: 7,
    startPos: { x: 0, y: 0 },
    themeIndex: 4,
    minimumMoves: 20,
    solutionMoves: ['DOWN', 'RIGHT', 'DOWN', 'RIGHT', 'LEFT', 'UP', 'RIGHT', 'UP', 'LEFT', 'DOWN', 'RIGHT', 'UP', 'LEFT', 'UP', 'DOWN', 'RIGHT', 'DOWN', 'LEFT', 'UP', 'LEFT'],
    grid: [
      [1, 0, 1, 0, 1, 1, 1],
      [1, 1, 1, 1, 1, 0, 1],
      [1, 0, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1],
      [1, 1, 0, 1, 1, 1, 1],
      [0, 1, 1, 0, 1, 1, 0],
    ],
  },

  // Level 6: 8x8 - Medium+ (23 moves)
  {
    id: 6,
    name: 'Level 6',
    width: 8,
    height: 8,
    startPos: { x: 0, y: 0 },
    themeIndex: 0,
    minimumMoves: 23,
    solutionMoves: ['RIGHT', 'LEFT', 'DOWN', 'RIGHT', 'UP', 'DOWN', 'LEFT', 'UP', 'DOWN', 'RIGHT', 'UP', 'LEFT', 'UP', 'DOWN', 'RIGHT', 'UP', 'RIGHT', 'DOWN', 'UP', 'LEFT', 'DOWN', 'LEFT', 'DOWN'],
    grid: [
      [1, 1, 1, 1, 1, 0, 1, 1],
      [1, 0, 1, 1, 0, 1, 1, 1],
      [1, 1, 1, 1, 0, 1, 1, 1],
      [1, 1, 1, 1, 0, 1, 1, 0],
      [0, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 0, 1],
      [1, 0, 1, 1, 1, 1, 1, 1],
    ],
  },

  // Level 7: 8x8 - Hard (26 moves)
  {
    id: 7,
    name: 'Level 7',
    width: 8,
    height: 8,
    startPos: { x: 0, y: 0 },
    themeIndex: 1,
    minimumMoves: 26,
    solutionMoves: ['RIGHT', 'LEFT', 'DOWN', 'RIGHT', 'DOWN', 'UP', 'LEFT', 'DOWN', 'LEFT', 'DOWN', 'UP', 'RIGHT', 'DOWN', 'UP', 'LEFT', 'DOWN', 'RIGHT', 'UP', 'RIGHT', 'DOWN', 'LEFT', 'DOWN', 'UP', 'RIGHT', 'DOWN', 'LEFT'],
    grid: [
      [1, 1, 0, 1, 1, 1, 1, 1],
      [1, 0, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 0, 0, 1],
      [0, 0, 1, 1, 1, 1, 1, 0],
      [1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 1, 1, 1, 1, 0, 1],
      [1, 0, 1, 0, 1, 0, 1, 1],
    ],
  },

  // Level 8: 8x8 - Hard (28 moves)
  {
    id: 8,
    name: 'Level 8',
    width: 8,
    height: 8,
    startPos: { x: 0, y: 0 },
    themeIndex: 2,
    minimumMoves: 28,
    solutionMoves: ['RIGHT', 'DOWN', 'RIGHT', 'LEFT', 'DOWN', 'LEFT', 'UP', 'RIGHT', 'LEFT', 'UP', 'DOWN', 'LEFT', 'UP', 'RIGHT', 'DOWN', 'LEFT', 'RIGHT', 'UP', 'LEFT', 'DOWN', 'LEFT', 'DOWN', 'RIGHT'],
    grid: [
      [1, 1, 1, 1, 1, 1, 1, 0],
      [0, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 0, 1, 1, 1, 1],
      [1, 1, 1, 0, 0, 0, 1, 0],
      [1, 0, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 0, 1, 1, 1],
      [1, 1, 0, 1, 1, 1, 0, 0],
    ],
  },

  // Level 9: 8x8 - Very Hard (31 moves)
  {
    id: 9,
    name: 'Level 9',
    width: 8,
    height: 8,
    startPos: { x: 0, y: 0 },
    themeIndex: 3,
    minimumMoves: 31,
    solutionMoves: ['RIGHT', 'LEFT', 'DOWN', 'RIGHT', 'DOWN', 'LEFT', 'RIGHT', 'UP', 'RIGHT', 'UP', 'LEFT', 'DOWN', 'RIGHT', 'UP', 'DOWN', 'LEFT', 'UP', 'RIGHT', 'UP', 'LEFT', 'DOWN', 'RIGHT', 'DOWN', 'RIGHT', 'DOWN', 'UP', 'LEFT', 'DOWN', 'RIGHT', 'UP', 'RIGHT'],
    grid: [
      [1, 1, 0, 1, 1, 1, 1, 1],
      [1, 0, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 0, 1, 0],
      [1, 1, 1, 1, 0, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 0],
      [1, 1, 1, 0, 1, 1, 1, 1],
      [0, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 0, 1, 1, 0, 1],
    ],
  },

  // Level 10: 8x8 - Challenge (30 moves)
  {
    id: 10,
    name: 'Level 10',
    width: 8,
    height: 8,
    startPos: { x: 0, y: 0 },
    themeIndex: 4,
    minimumMoves: 30,
    solutionMoves: ['RIGHT', 'LEFT', 'DOWN', 'RIGHT', 'DOWN', 'RIGHT', 'DOWN', 'RIGHT', 'UP', 'RIGHT', 'LEFT', 'DOWN', 'LEFT', 'UP', 'RIGHT', 'UP', 'RIGHT', 'DOWN', 'LEFT', 'RIGHT', 'UP', 'LEFT', 'DOWN', 'LEFT', 'RIGHT', 'DOWN', 'UP', 'LEFT', 'UP', 'DOWN'],
    grid: [
      [1, 1, 1, 1, 1, 0, 1, 1],
      [1, 1, 0, 1, 1, 1, 1, 1],
      [0, 1, 1, 1, 1, 0, 1, 0],
      [1, 0, 0, 1, 1, 1, 1, 1],
      [1, 0, 1, 1, 1, 1, 1, 0],
      [1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 1, 1, 1, 1, 0, 1],
    ],
  },
];

// Level Cache for procedural levels so navigation/retry is instant
const proceduralLevelCache = new Map();

// Get level by index (0-indexed: 0-9 = Benchmark, 10+ = Procedural)
export function getLevel(levelIndex) {
  const levelNumber = levelIndex + 1;

  if (levelIndex >= 0 && levelIndex < BENCHMARK_LEVELS.length) {
    return BENCHMARK_LEVELS[levelIndex];
  }

  if (proceduralLevelCache.has(levelNumber)) {
    return proceduralLevelCache.get(levelNumber);
  }

  const generated = generateProceduralLevel(levelNumber);
  proceduralLevelCache.set(levelNumber, generated);
  return generated;
}

// Checkpoint Level Validator for Procedural Generation Test Suite
export function validateProceduralCheckpoints(checkpoints = [11, 15, 20, 30, 40, 50, 75, 100, 150, 200, 300, 500, 750, 1000]) {
  const results = [];
  for (const lvlNum of checkpoints) {
    const level = getLevel(lvlNum - 1);
    const m = level.metrics || {};
    results.push({
      level: lvlNum,
      grid: `${level.width}x${level.height}`,
      seed: level.seed,
      solvable: (level.solutionDepth || level.minimumMoves || 0) > 0,
      solutionDepth: level.solutionDepth || level.minimumMoves || 0,
      minimumMoves: level.minimumMoves || level.solutionDepth || 0,
      difficultyScore: level.difficultyScore,
      deadEnds: m.deadEnds ?? 0,
      decisionPoints: m.decisionPoints ?? 0,
      backtrackingRatio: m.backtrackingRatio ?? 0,
      attempts: level.generationAttempts ?? 1,
    });
  }
  return results;
}

// Development level validation logger
export function logValidationReport() {
  if (process.env.NODE_ENV !== 'production' || typeof window !== 'undefined') {
    const report = validateAllLevels(BENCHMARK_LEVELS);
    console.group('🎨 COLOR MAZE BENCHMARK LEVELS VALIDATION (1-10)');
    report.forEach((r) => {
      if (r.solvable) {
        console.log(`Level ${r.levelId} (${r.width}x${r.height}): ✓ Solvable (Minimum moves: ${r.minimumMoves}, Difficulty: ${r.difficultyScore})`);
      } else {
        console.error(`Level ${r.levelId} (${r.width}x${r.height}): ❌ UNSOLVABLE LEVEL`);
      }
    });
    console.groupEnd();
  }
}

