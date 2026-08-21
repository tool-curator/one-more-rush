// Color Maze Pure State Engine
import { getLevel, COLOR_MAZE_THEMES } from './mazeLevels.js';

export class MazeEngine {
  constructor(levelIndex = 0, callbacks = {}) {
    this.callbacks = callbacks;
    this.initLevel(levelIndex);
  }

  initLevel(levelIndex) {
    this.levelIndex = levelIndex;
    this.levelData = getLevel(levelIndex);
    this.theme = COLOR_MAZE_THEMES[this.levelData.themeIndex % COLOR_MAZE_THEMES.length];
    
    this.width = this.levelData.width;
    this.height = this.levelData.height;

    // Create mutable grid: 0 = wall, 1 = unpainted floor, 2 = painted floor
    this.grid = this.levelData.grid.map((row) => [...row]);

    // Count total reachable floor cells
    this.totalFloorCount = 0;
    for (let r = 0; r < this.height; r++) {
      for (let c = 0; c < this.width; c++) {
        if (this.grid[r][c] !== 0) {
          this.totalFloorCount++;
        }
      }
    }

    // Ball state
    const startX = this.levelData.startPos.x;
    const startY = this.levelData.startPos.y;
    this.gridX = startX;
    this.gridY = startY;
    this.px = startX;
    this.py = startY;

    // Mark starting tile as painted
    this.grid[startY][startX] = 2;
    this.paintedCount = 1;

    // Movement state
    this.isRolling = false;
    this.dirX = 0;
    this.dirY = 0;
    this.destX = startX;
    this.destY = startY;
    this.slideStartX = startX;
    this.slideStartY = startY;
    this.slideProgress = 0; // 0 to 1
    this.slideTotalDistance = 0;
    this.rollSpeed = 16.0; // grid cells per second
    this.queuedMove = null; // Lightweight 1-slot buffer for responsive rapid swipes

    // Visual impact / feedback state
    this.lastImpactTime = 0;
    this.lastImpactDir = { x: 0, y: 0 };

    // Stats & Timer
    this.moves = 0;
    this.startTime = null;
    this.elapsedTime = 0;
    this.hasStarted = false;
    this.isCompleted = false;

    // Tile paint timestamps for visual pop animations { key: timestamp }
    this.paintTimestamps = new Map();
    this.paintTimestamps.set(`${startX},${startY}`, performance.now());

    // Particles/splashes for subtle juice
    this.splashes = [];
  }

  reset() {
    this.initLevel(this.levelIndex);
  }

  // Calculate furthest reachable floor cell in direction (dx, dy)
  findDestination(dx, dy) {
    let currX = this.gridX;
    let currY = this.gridY;

    while (true) {
      const nextX = currX + dx;
      const nextY = currY + dy;

      // Check grid boundaries
      if (nextX < 0 || nextX >= this.width || nextY < 0 || nextY >= this.height) {
        break;
      }

      // Check wall collision
      if (this.grid[nextY][nextX] === 0) {
        break;
      }

      currX = nextX;
      currY = nextY;
    }

    return { destX: currX, destY: currY };
  }

  // Handle directional swipe/arrow input (dx: -1/0/1, dy: -1/0/1)
  tryMove(dx, dy) {
    if (this.isCompleted) {
      return false;
    }

    if (dx === 0 && dy === 0) return false;

    // Buffer exactly 1 responsive input while rolling (queue window < 240ms)
    if (this.isRolling) {
      this.queuedMove = { dx, dy, time: performance.now() };
      return true;
    }

    const { destX, destY } = this.findDestination(dx, dy);

    // Ball is already against wall in this direction — cannot move
    if (destX === this.gridX && destY === this.gridY) {
      return false;
    }

    // Valid move
    if (!this.hasStarted) {
      this.hasStarted = true;
      this.startTime = performance.now();
    }

    this.moves++;
    this.isRolling = true;
    this.dirX = dx;
    this.dirY = dy;
    this.slideStartX = this.gridX;
    this.slideStartY = this.gridY;
    this.destX = destX;
    this.destY = destY;
    this.slideTotalDistance = Math.abs(destX - this.slideStartX) + Math.abs(destY - this.slideStartY);
    this.slideProgress = 0;

    if (this.callbacks.onSlideStart) {
      this.callbacks.onSlideStart(this.moves);
    }

    return true;
  }

  // Update loop called via requestAnimationFrame
  update(deltaTimeMs) {
    const now = performance.now();

    // Update timer if active
    if (this.hasStarted && !this.isCompleted) {
      this.elapsedTime = (now - this.startTime) / 1000;
    }

    // Clean up expired splashes
    this.splashes = this.splashes.filter((s) => now - s.startTime < s.duration);

    if (!this.isRolling) {
      return;
    }

    // Delta time in seconds
    const dt = Math.min(deltaTimeMs / 1000, 0.1);
    const distanceStep = this.rollSpeed * dt;
    const progressStep = distanceStep / this.slideTotalDistance;

    this.slideProgress += progressStep;

    if (this.slideProgress >= 1.0) {
      // Arrived at destination
      this.slideProgress = 1.0;
      this.px = this.destX;
      this.py = this.destY;
      this.gridX = this.destX;
      this.gridY = this.destY;
      this.isRolling = false;

      // Trigger impact feedback
      this.lastImpactTime = now;
      this.lastImpactDir = { x: this.dirX, y: this.dirY };

      // Ensure all traversed tiles to destination are painted
      this.paintLine(this.slideStartX, this.slideStartY, this.destX, this.destY);

      if (this.callbacks.onSlideStop) {
        this.callbacks.onSlideStop();
      }

      // Check level completion
      if (this.paintedCount >= this.totalFloorCount && !this.isCompleted) {
        this.isCompleted = true;
        this.queuedMove = null;
        if (this.callbacks.onLevelComplete) {
          this.callbacks.onLevelComplete({
            level: this.levelIndex + 1,
            time: this.elapsedTime,
            moves: this.moves,
            coverage: 100,
          });
        }
        return;
      }

      // Check for recent queued input (< 240ms)
      if (this.queuedMove) {
        const q = this.queuedMove;
        this.queuedMove = null;
        if (now - q.time < 240) {
          this.tryMove(q.dx, q.dy);
        }
      }
    } else {
      // Interpolate position
      this.px = this.slideStartX + this.dirX * (this.slideTotalDistance * this.slideProgress);
      this.py = this.slideStartY + this.dirY * (this.slideTotalDistance * this.slideProgress);

      // Paint tile under current position
      const currFloorX = Math.floor(this.px + (this.dirX > 0 ? 0.3 : this.dirX < 0 ? -0.3 : 0) + 0.5);
      const currFloorY = Math.floor(this.py + (this.dirY > 0 ? 0.3 : this.dirY < 0 ? -0.3 : 0) + 0.5);

      if (
        currFloorX >= 0 &&
        currFloorX < this.width &&
        currFloorY >= 0 &&
        currFloorY < this.height &&
        this.grid[currFloorY][currFloorX] === 1
      ) {
        this.grid[currFloorY][currFloorX] = 2;
        this.paintedCount++;
        this.paintTimestamps.set(`${currFloorX},${currFloorY}`, now);
        this.createSplash(currFloorX, currFloorY);

        if (this.callbacks.onTilePainted) {
          this.callbacks.onTilePainted(this.getCoveragePercent());
        }
      }
    }
  }

  paintLine(x1, y1, x2, y2) {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    const now = performance.now();

    for (let r = minY; r <= maxY; r++) {
      for (let c = minX; c <= maxX; c++) {
        if (this.grid[r][c] === 1) {
          this.grid[r][c] = 2;
          this.paintedCount++;
          this.paintTimestamps.set(`${c},${r}`, now);
          this.createSplash(c, r);
        }
      }
    }
  }

  createSplash(cx, cy) {
    this.splashes.push({
      x: cx + 0.5,
      y: cy + 0.5,
      startTime: performance.now(),
      duration: 350,
    });
  }

  getCoveragePercent() {
    if (this.totalFloorCount === 0) return 100;
    return Math.floor((this.paintedCount / this.totalFloorCount) * 100);
  }

  getStats() {
    return {
      level: this.levelIndex + 1,
      coverage: this.getCoveragePercent(),
      paintedCount: this.paintedCount,
      totalFloorCount: this.totalFloorCount,
      moves: this.moves,
      time: this.elapsedTime.toFixed(2),
      isCompleted: this.isCompleted,
    };
  }
}
