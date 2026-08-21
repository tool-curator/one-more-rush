import { validateProceduralCheckpoints, BENCHMARK_LEVELS } from './src/games/color-maze/game/mazeLevels.js';
import { validateAllLevels } from './src/games/color-maze/game/mazeValidator.js';

console.log('====================================================');
console.log('COLOR MAZE: BENCHMARK LEVELS 1-10 VALIDATION REPORT');
console.log('====================================================');
const benchReport = validateAllLevels(BENCHMARK_LEVELS);
console.table(benchReport.map(b => ({
  level: b.levelId,
  grid: `${b.width}x${b.height}`,
  solvable: b.solvable,
  moves: b.minimumMoves,
  difficultyScore: b.difficultyScore,
  deadEnds: b.metrics?.deadEnds ?? 0,
  decisionPoints: b.metrics?.decisionPoints ?? 0,
})));

console.log('\n====================================================');
console.log('COLOR MAZE: PROCEDURAL CHECKPOINTS VALIDATION REPORT');
console.log('====================================================');
const checkpoints = [11, 15, 20, 30, 40, 50, 75, 100, 150, 200, 300, 500, 750, 1000];
const results = validateProceduralCheckpoints(checkpoints);
console.table(results);
