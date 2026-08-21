// Color Maze Sliding Puzzle Solvability & Structural Difficulty Validator
// Uses heuristic state-space search over (cellIndex, paintedBitmask) states
// Calculates structural metrics: solutionDepth, decisionComplexity, branching, deadEnds, and backtracking

const DIRS = [
  { dx: 0, dy: -1, name: 'UP' },
  { dx: 0, dy: 1, name: 'DOWN' },
  { dx: -1, dy: 0, name: 'LEFT' },
  { dx: 1, dy: 0, name: 'RIGHT' },
];

/**
 * Fast Min-Heap priority queue for state search
 */
class MinHeap {
  constructor() {
    this.heap = [];
  }

  push(node) {
    this.heap.push(node);
    this._bubbleUp(this.heap.length - 1);
  }

  pop() {
    if (this.heap.length === 0) return null;
    const top = this.heap[0];
    const bottom = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = bottom;
      this._bubbleDown(0);
    }
    return top;
  }

  get size() {
    return this.heap.length;
  }

  _bubbleUp(idx) {
    while (idx > 0) {
      const parent = (idx - 1) >> 1;
      if (this.heap[idx].priority < this.heap[parent].priority) {
        const tmp = this.heap[idx];
        this.heap[idx] = this.heap[parent];
        this.heap[parent] = tmp;
        idx = parent;
      } else break;
    }
  }

  _bubbleDown(idx) {
    const len = this.heap.length;
    while (true) {
      const left = (idx << 1) + 1;
      const right = left + 1;
      let smallest = idx;
      if (left < len && this.heap[left].priority < this.heap[smallest].priority) {
        smallest = left;
      }
      if (right < len && this.heap[right].priority < this.heap[smallest].priority) {
        smallest = right;
      }
      if (smallest !== idx) {
        const tmp = this.heap[idx];
        this.heap[idx] = this.heap[smallest];
        this.heap[smallest] = tmp;
        idx = smallest;
      } else break;
    }
  }
}

/**
 * Count set bits in BigInt
 */
function countBits(n) {
  let count = 0;
  while (n > 0n) {
    n &= (n - 1n);
    count++;
  }
  return count;
}

/**
 * Validates level solvability and calculates comprehensive structural metrics.
 * @param {Object} level - Level definition { width, height, grid, startPos }
 * @param {number} maxStates - Maximum search states to explore before aborting
 * @returns {Object} Validation & metrics report
 */
export function validateLevel(level, maxStates = 40000) {
  const { width, height, grid, startPos } = level;

  // 1. Map floor cells
  const floorMap = new Map();
  const floorList = [];
  let floorIndex = 0;

  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      if (grid[r][c] !== 0) {
        floorMap.set(`${c},${r}`, floorIndex);
        floorList.push({ x: c, y: r });
        floorIndex++;
      }
    }
  }

  const totalFloorCount = floorIndex;
  if (totalFloorCount === 0) {
    return {
      solvable: false,
      solutionDepth: 0,
      minimumMoves: 0,
      solutionMoves: [],
      difficultyScore: 0,
      metrics: null,
      reason: 'No floor cells',
    };
  }

  const startKey = `${startPos.x},${startPos.y}`;
  if (!floorMap.has(startKey)) {
    return {
      solvable: false,
      solutionDepth: 0,
      minimumMoves: 0,
      solutionMoves: [],
      difficultyScore: 0,
      metrics: null,
      reason: 'Start pos is not on floor',
    };
  }

  const startBit = floorMap.get(startKey);
  const targetMask = (1n << BigInt(totalFloorCount)) - 1n;
  const startMask = 1n << BigInt(startBit);

  // 2. Precompute sliding destinations & path bitmasks for every cell & direction
  const slideLookup = new Array(totalFloorCount);

  for (let i = 0; i < totalFloorCount; i++) {
    const from = floorList[i];
    slideLookup[i] = [null, null, null, null];

    for (let d = 0; d < 4; d++) {
      const dir = DIRS[d];
      let currX = from.x;
      let currY = from.y;
      let pathMask = 0n;

      while (true) {
        const nextX = currX + dir.dx;
        const nextY = currY + dir.dy;

        if (nextX < 0 || nextX >= width || nextY < 0 || nextY >= height) break;
        if (grid[nextY][nextX] === 0) break;

        currX = nextX;
        currY = nextY;
        const bit = floorMap.get(`${currX},${currY}`);
        pathMask |= (1n << BigInt(bit));
      }

      if (currX !== from.x || currY !== from.y) {
        slideLookup[i][d] = {
          destCellIndex: floorMap.get(`${currX},${currY}`),
          pathMask,
          dirName: dir.name,
        };
      }
    }
  }

  // 3. Count dead-end tiles (floor cells with <= 1 open neighbor)
  let deadEnds = 0;
  for (let i = 0; i < totalFloorCount; i++) {
    const cell = floorList[i];
    let openNeighbors = 0;
    for (let d = 0; d < 4; d++) {
      const nx = cell.x + DIRS[d].dx;
      const ny = cell.y + DIRS[d].dy;
      if (nx >= 0 && nx < width && ny >= 0 && ny < height && grid[ny][nx] !== 0) {
        openNeighbors++;
      }
    }
    if (openNeighbors <= 1) {
      deadEnds++;
    }
  }

  // 4. Heuristic Search over (cellIndex, mask)
  const openSet = new MinHeap();
  const bestMoves = new Map();

  openSet.push({
    cellIndex: startBit,
    mask: startMask,
    moves: 0,
    history: [],
    priority: (totalFloorCount - 1) * 1.3,
  });
  bestMoves.set(`${startBit}:${startMask}`, 0);

  let explored = 0;
  let solutionNode = null;

  while (openSet.size > 0 && explored < maxStates) {
    explored++;
    const curr = openSet.pop();

    if (curr.mask === targetMask) {
      solutionNode = curr;
      break;
    }

    const available = slideLookup[curr.cellIndex];
    for (let d = 0; d < 4; d++) {
      const move = available[d];
      if (!move) continue;

      const nextMask = curr.mask | move.pathMask;
      const nextMoves = curr.moves + 1;
      const stateKey = `${move.destCellIndex}:${nextMask}`;

      const prevBest = bestMoves.get(stateKey);
      if (prevBest === undefined || nextMoves < prevBest) {
        bestMoves.set(stateKey, nextMoves);
        const paintedCount = countBits(nextMask);
        const unpainted = totalFloorCount - paintedCount;
        const priority = nextMoves + unpainted * 1.35;

        openSet.push({
          cellIndex: move.destCellIndex,
          mask: nextMask,
          moves: nextMoves,
          history: [...curr.history, move.dirName],
          priority,
        });
      }
    }
  }

  if (!solutionNode) {
    return {
      solvable: false,
      solutionDepth: 0,
      minimumMoves: 0,
      solutionMoves: [],
      difficultyScore: 0,
      metrics: {
        deadEnds,
        totalFloorCount,
        totalStatesExplored: explored,
      },
    };
  }

  const solutionMoves = solutionNode.history;
  const solutionDepth = solutionMoves.length;

  // 5. Measure Decision Points, Branching & Backtracking along optimal solution
  let decisionPoints = 0;
  let totalBranchingSum = 0;
  let backtrackingMoves = 0;

  let simCell = startBit;
  let simMask = startMask;

  for (let m = 0; m < solutionMoves.length; m++) {
    const moveName = solutionMoves[m];
    const dIdx = DIRS.findIndex((d) => d.name === moveName);
    const validMoves = slideLookup[simCell].filter(Boolean);
    totalBranchingSum += validMoves.length;

    if (validMoves.length >= 2) {
      decisionPoints++;
    }

    const nextMove = slideLookup[simCell][dIdx];
    if (nextMove) {
      const nextMask = simMask | nextMove.pathMask;
      if (nextMask === simMask) {
        backtrackingMoves++;
      }
      simMask = nextMask;
      simCell = nextMove.destCellIndex;
    }
  }

  const avgBranching = solutionDepth > 0 ? totalBranchingSum / solutionDepth : 1;
  const backtrackingRatio = solutionDepth > 0 ? backtrackingMoves / solutionDepth : 0;
  const decisionComplexityRatio = solutionDepth > 0 ? decisionPoints / solutionDepth : 0;
  const floorRatio = totalFloorCount / (width * height);

  // 6. Calculate Internal Difficulty Score (0-100 scale)
  // Weights: 40% solutionDepth, 20% decision complexity, 15% backtracking, 10% dead ends, 10% branching, 5% grid complexity
  const normalizedDepth = Math.min(1.0, solutionDepth / 70);
  const normalizedDecisions = Math.min(1.0, decisionPoints / 25);
  const normalizedBacktracking = Math.min(1.0, backtrackingRatio * 2.5);
  const normalizedDeadEnds = Math.min(1.0, deadEnds / 6);
  const normalizedBranching = Math.min(1.0, Math.max(0, avgBranching - 1) / 2.0);
  const normalizedGrid = Math.min(1.0, (width * height) / 144);

  const rawScore =
    normalizedDepth * 0.40 +
    normalizedDecisions * 0.20 +
    normalizedBacktracking * 0.15 +
    normalizedDeadEnds * 0.10 +
    normalizedBranching * 0.10 +
    normalizedGrid * 0.05;

  const difficultyScore = Math.max(1, Math.min(100, Math.round(rawScore * 100)));

  return {
    solvable: true,
    solutionDepth,
    minimumMoves: solutionDepth, // Backwards compatible alias
    solutionMoves,
    difficultyScore,
    metrics: {
      solutionDepth,
      decisionPoints,
      decisionComplexityRatio: parseFloat(decisionComplexityRatio.toFixed(2)),
      avgBranching: parseFloat(avgBranching.toFixed(2)),
      deadEnds,
      backtrackingMoves,
      backtrackingRatio: parseFloat(backtrackingRatio.toFixed(2)),
      floorRatio: parseFloat(floorRatio.toFixed(2)),
      totalFloorCount,
      totalStatesExplored: explored,
    },
  };
}

export function validateAllLevels(levels) {
  return levels.map((lvl, idx) => {
    const res = validateLevel(lvl, 60000);
    return {
      levelId: lvl.id || idx + 1,
      name: lvl.name || `Level ${idx + 1}`,
      width: lvl.width,
      height: lvl.height,
      ...res,
    };
  });
}
