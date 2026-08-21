import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Trophy, Clock, ArrowRight, RotateCcw, Home, Sparkles, Star, CheckCircle2 } from 'lucide-react';
import { VictoryEffectOverlay } from '../../components/VictoryEffectOverlay';
import { MazeEngine } from './game/mazeEngine.js';
import { getLevel, logValidationReport } from './game/mazeLevels.js';
import { loadProgress, saveProgress, recordLevelCompletion } from './game/mazeStorage.js';
import './ColorMazeGame.css';

export function ColorMazeGame({ bestScore, onGameOver, onHome, audioFx }) {
  const [progress, setProgress] = useState(() => loadProgress());
  const [levelIndex, setLevelIndex] = useState(() => {
    const p = loadProgress();
    return Math.max(0, (p.currentLevel || 1) - 1);
  });
  const [hudStats, setHudStats] = useState({
    level: 1,
    coverage: 0,
    paintedCount: 1,
    totalFloorCount: 1,
    moves: 0,
    time: '0.00',
  });
  const [levelCompleteData, setLevelCompleteData] = useState(null);
  const [animatedScore, setAnimatedScore] = useState(0);

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const engineRef = useRef(null);
  const animFrameRef = useRef(null);
  const lastTimeRef = useRef(performance.now());
  const touchStartRef = useRef(null);
  const lastImpactRef = useRef({ x: -1, y: -1, time: 0 });

  const bgCanvasRef = useRef(null);
  const renderedLevelIndexRef = useRef(null);
  const containerSizeRef = useRef({ width: 400, height: 400 });
  const hudThrottleRef = useRef(0);
  const swipeTriggeredRef = useRef(false);

  // Prop Refs to ensure stable callbacks without recreation
  const onGameOverRef = useRef(onGameOver);
  onGameOverRef.current = onGameOver;

  const audioFxRef = useRef(audioFx);
  audioFxRef.current = audioFx;

  // Run development validation report on startup
  useEffect(() => {
    logValidationReport();
  }, []);

  // Score Count-Up Animation
  useEffect(() => {
    if (!levelCompleteData || !levelCompleteData.score) return;
    const startTime = performance.now();
    const duration = 650;
    const target = levelCompleteData.score;
    let frameId;

    const tick = (now) => {
      const elapsed = now - startTime;
      const progressRatio = Math.min(1, elapsed / duration);
      // Ease out cubic
      const easeOut = 1 - Math.pow(1 - progressRatio, 3);
      setAnimatedScore(Math.round(target * easeOut));
      if (progressRatio < 1) {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [levelCompleteData]);

  // Prerender static maze walls and recessed floor grid onto an offscreen canvas
  const prerenderStaticBackground = useCallback((engine, boardSize, dpr) => {
    if (!engine) return null;
    let bg = bgCanvasRef.current;
    const targetW = Math.floor(boardSize * dpr);
    const targetH = Math.floor(boardSize * dpr);

    if (!bg) {
      bg = document.createElement('canvas');
      bgCanvasRef.current = bg;
    }

    if (bg.width !== targetW || bg.height !== targetH) {
      bg.width = targetW;
      bg.height = targetH;
    }

    const bctx = bg.getContext('2d');
    if (!bctx) return null;

    bctx.clearRect(0, 0, targetW, targetH);
    bctx.save();
    bctx.scale(dpr, dpr);

    const cellSize = boardSize / engine.width;
    const theme = engine.theme;

    // Prerender all static walls and open floor cells
    for (let r = 0; r < engine.height; r++) {
      for (let c = 0; c < engine.width; c++) {
        const cellType = engine.grid[r][c];
        const cellX = c * cellSize;
        const cellY = r * cellSize;
        const cornerRadius = Math.max(4, Math.floor(cellSize * 0.16));
        const blockPad = Math.max(1.5, Math.floor(cellSize * 0.04));

        if (cellType === 0) {
          // Solid Physical Wall Block
          // Step 1a: Drop Shadow
          bctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          fillRoundedRect(
            bctx,
            cellX + blockPad + 2,
            cellY + blockPad + 3,
            cellSize - blockPad * 2,
            cellSize - blockPad * 2,
            cornerRadius
          );

          // Step 1b: Wall Body
          bctx.fillStyle = theme.wallColor;
          fillRoundedRect(
            bctx,
            cellX + blockPad,
            cellY + blockPad,
            cellSize - blockPad * 2,
            cellSize - blockPad * 2,
            cornerRadius
          );

          // Step 1c: Wall Top Face
          bctx.fillStyle = theme.wallTop;
          fillRoundedRect(
            bctx,
            cellX + blockPad + 1,
            cellY + blockPad + 1,
            cellSize - blockPad * 2 - 2,
            (cellSize - blockPad * 2) * 0.65,
            cornerRadius * 0.8
          );

          // Step 1d: Wall Border
          bctx.strokeStyle = theme.wallBorder;
          bctx.lineWidth = 1.5;
          strokeRoundedRect(
            bctx,
            cellX + blockPad,
            cellY + blockPad,
            cellSize - blockPad * 2,
            cellSize - blockPad * 2,
            cornerRadius
          );

          // Step 1e: Top edge specular highlight
          bctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
          bctx.lineWidth = 1;
          bctx.beginPath();
          bctx.moveTo(cellX + blockPad + 4, cellY + blockPad + 2);
          bctx.lineTo(cellX + cellSize - blockPad - 4, cellY + blockPad + 2);
          bctx.stroke();
        } else {
          // Open Floor Corridor
          bctx.fillStyle = theme.floorColor;
          bctx.fillRect(cellX, cellY, cellSize, cellSize);

          bctx.strokeStyle = theme.floorGrid;
          bctx.lineWidth = 1;
          bctx.strokeRect(cellX + 0.5, cellY + 0.5, cellSize - 1, cellSize - 1);
        }
      }
    }

    bctx.restore();
    return bg;
  }, []);

  // Initialize or reset level
  const startLevel = useCallback((targetLevelIdx) => {
    setLevelCompleteData(null);
    setAnimatedScore(0);
    touchStartRef.current = null;
    swipeTriggeredRef.current = false;
    lastImpactRef.current = { x: -1, y: -1, time: 0 };
    bgCanvasRef.current = null;
    renderedLevelIndexRef.current = null;

    const callbacks = {
      onTilePainted: (coveragePercent) => {
        if (audioFxRef.current?.playHit) {
          audioFxRef.current.playHit(Math.min(20, Math.floor(coveragePercent / 5) + 1));
        }
      },
      onSlideStart: () => {},
      onSlideStop: () => {
        // Impact tracking on adjacent wall cell
        const eng = engineRef.current;
        if (eng) {
          const impactWallX = eng.destX + eng.dirX;
          const impactWallY = eng.destY + eng.dirY;
          lastImpactRef.current = {
            x: impactWallX,
            y: impactWallY,
            time: performance.now(),
          };
        }
      },
      onLevelComplete: (stats) => {
        // Calculate score, stars, and persist player progression
        const levelData = engineRef.current?.levelData || getLevel(targetLevelIdx);
        const result = recordLevelCompletion(stats.level, stats.time, stats.moves, levelData);
        setProgress(result.progress);
        const completionTriggerKey = `${stats.level}_${result.score}_${Date.now()}`;
        setLevelCompleteData({ ...stats, ...result, completionTriggerKey });

        if (audioFxRef.current?.playHighScore) {
          audioFxRef.current.playHighScore();
        }

        if (onGameOverRef.current) {
          const finalScore = result.score || 0;
          // Correctly detect isNewBestScore
          const isNewBest = Boolean(result.isNewBestScore ?? result.isNewBest);
          onGameOverRef.current(finalScore, isNewBest, {
            score: finalScore,
            coverage: 100,
            moves: stats.moves,
            time: parseFloat(stats.time) || 0,
            stars: result.stars || 1,
            level: stats.level,
          });
        }
      },
    };

    engineRef.current = new MazeEngine(targetLevelIdx, callbacks);
    setLevelIndex(targetLevelIdx);
  }, []);

  // Start initial level on mount
  useEffect(() => {
    startLevel(levelIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update container size cache on resize (avoids layout thrashing during rAF)
  useEffect(() => {
    const updateSize = () => {
      const container = containerRef.current;
      if (container) {
        containerSizeRef.current = {
          width: container.clientWidth || 400,
          height: container.clientHeight || 400,
        };
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Main rendering & physics animation loop
  useEffect(() => {
    let active = true;

    const render = () => {
      if (!active) return;

      const now = performance.now();
      const deltaTime = now - lastTimeRef.current;
      lastTimeRef.current = now;

      const engine = engineRef.current;
      const canvas = canvasRef.current;

      if (engine && canvas) {
        // Update engine physics
        engine.update(deltaTime);

        // Update React HUD state (throttled to ~15 FPS to avoid React render spikes)
        if (now - hudThrottleRef.current >= 66) {
          hudThrottleRef.current = now;
          const stats = engine.getStats();
          setHudStats((prev) => {
            if (
              prev.coverage !== stats.coverage ||
              prev.moves !== stats.moves ||
              prev.time !== stats.time
            ) {
              return stats;
            }
            return prev;
          });
        }

        // Draw Game Board on Canvas
        const ctx = canvas.getContext('2d');
        const cSize = containerSizeRef.current;

        if (ctx && cSize) {
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          const padding = 20;
          const availableWidth = Math.max(100, cSize.width - padding * 2);
          const availableHeight = Math.max(100, cSize.height - padding * 2);
          const boardSize = Math.floor(Math.min(availableWidth, availableHeight));

          const targetCanvasWidth = Math.floor(boardSize * dpr);
          const targetCanvasHeight = Math.floor(boardSize * dpr);

          if (canvas.width !== targetCanvasWidth || canvas.height !== targetCanvasHeight) {
            canvas.width = targetCanvasWidth;
            canvas.height = targetCanvasHeight;
            canvas.style.width = `${boardSize}px`;
            canvas.style.height = `${boardSize}px`;
          }

          // Ensure background canvas is populated and matches active engine level
          let bgCanvas = bgCanvasRef.current;
          if (
            !bgCanvas ||
            bgCanvas.width !== targetCanvasWidth ||
            bgCanvas.height !== targetCanvasHeight ||
            renderedLevelIndexRef.current !== engine.levelIndex
          ) {
            bgCanvas = prerenderStaticBackground(engine, boardSize, dpr);
            bgCanvasRef.current = bgCanvas;
            renderedLevelIndexRef.current = engine.levelIndex;
          }

          const cellSize = boardSize / engine.width;
          const theme = engine.theme;

          // 1. Draw Prerendered Static Walls and Base Floor in a single ultra-fast blit
          ctx.clearRect(0, 0, targetCanvasWidth, targetCanvasHeight);
          if (bgCanvas) {
            ctx.drawImage(bgCanvas, 0, 0);
          }

          ctx.save();
          ctx.scale(dpr, dpr);

          const cornerRadius = Math.max(4, Math.floor(cellSize * 0.16));

          // 2. Draw Dynamic Painted Floor Tiles
          for (let r = 0; r < engine.height; r++) {
            for (let c = 0; c < engine.width; c++) {
              if (engine.grid[r][c] === 2) {
                const cellX = c * cellSize;
                const cellY = r * cellSize;
                const paintKey = `${c},${r}`;
                const paintTime = engine.paintTimestamps.get(paintKey) || 0;
                const timeSincePaint = now - paintTime;
                let scale = 1.0;

                // Pop animation on initial paint
                if (timeSincePaint < 180) {
                  const t = timeSincePaint / 180;
                  scale = 0.85 + 0.22 * Math.sin(t * Math.PI);
                }

                const pSize = (cellSize - 3) * Math.min(1.05, scale);
                const pOffset = (cellSize - pSize) / 2;

                ctx.fillStyle = theme.paintedColor;
                fillRoundedRect(ctx, cellX + pOffset, cellY + pOffset, pSize, pSize, cornerRadius);

                // Subtle glossy sheen
                ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
                fillRoundedRect(
                  ctx,
                  cellX + pOffset + 2,
                  cellY + pOffset + 2,
                  pSize - 4,
                  pSize * 0.35,
                  cornerRadius * 0.7
                );
              }
            }
          }

          // 2b. Draw Active Wall Impact Glow if active (< 220ms)
          const impact = lastImpactRef.current;
          if (impact.x >= 0 && impact.y >= 0 && now - impact.time < 220) {
            const ix = impact.x * cellSize;
            const iy = impact.y * cellSize;
            const blockPad = Math.max(1.5, Math.floor(cellSize * 0.04));
            ctx.save();
            ctx.strokeStyle = theme.ballColor;
            ctx.lineWidth = 2.5;
            ctx.shadowColor = theme.ballGlow;
            ctx.shadowBlur = 10;
            strokeRoundedRect(
              ctx,
              ix + blockPad,
              iy + blockPad,
              cellSize - blockPad * 2,
              cellSize - blockPad * 2,
              cornerRadius
            );
            ctx.restore();
          }

          // 3. Draw Splashes / Ripples
          engine.splashes.forEach((splash) => {
            const age = (now - splash.startTime) / splash.duration;
            if (age >= 0 && age <= 1) {
              const radius = cellSize * (0.25 + 0.5 * age);
              ctx.save();
              ctx.strokeStyle = theme.ballColor;
              ctx.globalAlpha = Math.max(0, 1 - age) * 0.5;
              ctx.lineWidth = 2 * (1 - age);
              ctx.beginPath();
              ctx.arc(splash.x * cellSize, splash.y * cellSize, radius, 0, Math.PI * 2);
              ctx.stroke();
              ctx.restore();
            }
          });

          // 4. Draw Player Ball
          const ballCenterX = (engine.px + 0.5) * cellSize;
          const ballCenterY = (engine.py + 0.5) * cellSize;
          const baseRadius = cellSize * 0.35;

          let scaleX = 1.0;
          let scaleY = 1.0;

          if (engine.isRolling) {
            if (engine.dirX !== 0) {
              scaleX = 1.15;
              scaleY = 0.88;
            } else if (engine.dirY !== 0) {
              scaleX = 0.88;
              scaleY = 1.15;
            }
          } else {
            const timeSinceImpact = now - engine.lastImpactTime;
            if (timeSinceImpact < 160) {
              const t = timeSinceImpact / 160;
              const pulse = Math.sin(t * Math.PI) * 0.16;
              if (engine.lastImpactDir.x !== 0) {
                scaleX = 1.0 - pulse;
                scaleY = 1.0 + pulse;
              } else if (engine.lastImpactDir.y !== 0) {
                scaleX = 1.0 + pulse;
                scaleY = 1.0 - pulse;
              }
            }
          }

          ctx.save();
          ctx.translate(ballCenterX, ballCenterY);
          ctx.scale(scaleX, scaleY);

          // Ball Base Shadow
          ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
          ctx.beginPath();
          ctx.arc(0, baseRadius * 0.28, baseRadius * 0.88, 0, Math.PI * 2);
          ctx.fill();

          // Ball Body Gradient
          const sphereGrad = ctx.createRadialGradient(
            -baseRadius * 0.32,
            -baseRadius * 0.35,
            baseRadius * 0.05,
            0,
            0,
            baseRadius
          );
          sphereGrad.addColorStop(0, '#ffffff');
          sphereGrad.addColorStop(0.3, theme.ballColor);
          sphereGrad.addColorStop(0.85, theme.paintedColor);
          sphereGrad.addColorStop(1, '#05060a');

          ctx.fillStyle = sphereGrad;
          ctx.beginPath();
          ctx.arc(0, 0, baseRadius, 0, Math.PI * 2);
          ctx.fill();

          // Specular Highlight
          ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
          ctx.beginPath();
          ctx.arc(-baseRadius * 0.34, -baseRadius * 0.34, baseRadius * 0.22, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
          ctx.restore();
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    lastTimeRef.current = performance.now();
    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      active = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [prerenderStaticBackground]);

  // Keyboard Input Controller (Arrow keys & WASD)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore keyboard moves when completion modal is open
      if (levelCompleteData) return;

      const engine = engineRef.current;
      if (!engine || engine.isCompleted) return;

      let dx = 0;
      let dy = 0;

      switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
          dy = -1;
          break;
        case 'ArrowDown':
        case 'KeyS':
          dy = 1;
          break;
        case 'ArrowLeft':
        case 'KeyA':
          dx = -1;
          break;
        case 'ArrowRight':
        case 'KeyD':
          dx = 1;
          break;
        default:
          return;
      }

      e.preventDefault();
      engine.tryMove(dx, dy);
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [levelCompleteData]);

  // Mobile Touch Swipe Controller with Immediate Direction Detection & Anti-Scroll Protection
  const handleTouchStart = (e) => {
    if (levelCompleteData) return;
    if (e.touches && e.touches.length > 0) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: performance.now(),
      };
      swipeTriggeredRef.current = false;
    }
  };

  const handleTouchMove = (e) => {
    if (levelCompleteData) return;
    if (!touchStartRef.current || !e.touches || e.touches.length === 0) return;

    if (e.cancelable) {
      e.preventDefault();
    }

    const start = touchStartRef.current;
    const curX = e.touches[0].clientX;
    const curY = e.touches[0].clientY;

    const deltaX = curX - start.x;
    const deltaY = curY - start.y;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    const minSwipeDistance = 16; // Responsive threshold for instant swipe response

    if (absX >= minSwipeDistance || absY >= minSwipeDistance) {
      const engine = engineRef.current;
      if (engine && !engine.isCompleted) {
        if (absX > absY) {
          engine.tryMove(deltaX > 0 ? 1 : -1, 0);
        } else {
          engine.tryMove(0, deltaY > 0 ? 1 : -1);
        }
      }
      // Re-anchor to current point so chained swipes work immediately while dragging
      touchStartRef.current = {
        x: curX,
        y: curY,
        time: performance.now(),
      };
      swipeTriggeredRef.current = true;
    }
  };

  const handleTouchEnd = (e) => {
    if (levelCompleteData) return;
    if (!touchStartRef.current || !e.changedTouches || e.changedTouches.length === 0) return;

    if (!swipeTriggeredRef.current) {
      const start = touchStartRef.current;
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;

      const deltaX = endX - start.x;
      const deltaY = endY - start.y;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      const minSwipeDistance = 14;

      if (absX >= minSwipeDistance || absY >= minSwipeDistance) {
        const engine = engineRef.current;
        if (engine && !engine.isCompleted) {
          if (absX > absY) {
            engine.tryMove(deltaX > 0 ? 1 : -1, 0);
          } else {
            engine.tryMove(0, deltaY > 0 ? 1 : -1);
          }
        }
      }
    }

    touchStartRef.current = null;
    swipeTriggeredRef.current = false;
  };

  // Next Level Handler (Seamless infinite progression)
  const handleNextLevel = () => {
    const nextIdx = levelIndex + 1;
    saveProgress({ ...loadProgress(), currentLevel: nextIdx + 1 });
    startLevel(nextIdx);
  };

  // Instant In-Game Retry Level Handler (Always restarts identical level cleanly)
  const handleRetryLevel = () => {
    if (engineRef.current) {
      engineRef.current.reset();
      setLevelCompleteData(null);
      touchStartRef.current = null;
      swipeTriggeredRef.current = false;
    }
  };

  const handleGoHome = () => {
    if (onHome) {
      onHome();
    }
  };

  return (
    <div
      className="colormaze-game-container"
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Minimal Arcade HUD with Active Retry Button */}
      <div className="colormaze-hud glass-panel">
        <div className="hud-metric">
          <span className="hud-lbl font-mono">LEVEL</span>
          <span className="hud-val font-mono">{hudStats.level}</span>
        </div>

        <div className="hud-metric">
          <span className="hud-lbl font-mono">COVERAGE</span>
          <span className="hud-val font-mono highlight-coverage">
            {hudStats.coverage}%
          </span>
          <span className="hud-sub-label font-mono">
            {hudStats.paintedCount}/{hudStats.totalFloorCount}
          </span>
        </div>

        <div className="hud-metric">
          <span className="hud-lbl font-mono">MOVES</span>
          <span className="hud-val font-mono">{hudStats.moves}</span>
        </div>

        <div className="hud-metric">
          <span className="hud-lbl font-mono">TIME</span>
          <span className="hud-val font-mono">{hudStats.time}s</span>
        </div>

        <button
          className="colormaze-hud-retry-btn"
          onClick={handleRetryLevel}
          title="Restart current maze"
          aria-label="Restart current maze"
        >
          <RotateCcw size={14} />
          <span className="font-mono">RETRY</span>
        </button>
      </div>

      {/* Main Interactive Maze Canvas Playfield */}
      <div className="colormaze-playfield">
        <canvas ref={canvasRef} className="colormaze-canvas" />
      </div>

      {/* Level Complete Overlay Modal */}
      {levelCompleteData && (() => {
        const nextLevelObj = getLevel(levelIndex + 1);
        const hasNextLevel = Boolean(nextLevelObj);

        return (
          <div className="colormaze-modal-overlay">
            {/* Equipped Cosmetic Victory Effect */}
            <VictoryEffectOverlay triggerKey={levelCompleteData.completionTriggerKey || levelCompleteData.level} />

            <div className="colormaze-modal-card glass-panel animate-pop">
              <div className="colormaze-badge-success font-mono">
                <Sparkles size={14} />
                <span>
                  {hasNextLevel
                    ? `LEVEL ${levelCompleteData.level} COMPLETED`
                    : '🎨 ALL CURRENT LEVELS COMPLETE'}
                </span>
              </div>

              <h2 className="colormaze-modal-title">🎨 100% COVERAGE</h2>

              {/* Star Rating Display */}
              <div className="colormaze-stars-row">
                {[1, 2, 3].map((starNum) => {
                  const isEarned = starNum <= (levelCompleteData.stars || 1);
                  return (
                    <div
                      key={starNum}
                      className={`colormaze-star-item ${isEarned ? 'earned' : 'empty'}`}
                      style={{ animationDelay: `${starNum * 0.15}s` }}
                    >
                      <Star
                        size={28}
                        fill={isEarned ? '#ffb703' : 'rgba(255, 255, 255, 0.08)'}
                        stroke={isEarned ? '#ffb703' : 'rgba(255, 255, 255, 0.2)'}
                        strokeWidth={1.5}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Score Banner with Animated Counter */}
              <div className="colormaze-score-banner">
                <span className="colormaze-score-label font-mono">SCORE</span>
                <div className="colormaze-score-val font-mono">
                  {animatedScore.toLocaleString()}
                </div>
                <div className="colormaze-best-score-row font-mono">
                  <span>BEST: {(levelCompleteData.bestScore || levelCompleteData.score).toLocaleString()}</span>
                  {(levelCompleteData.isNewBestScore || levelCompleteData.isNewBest) && (
                    <span className="new-best-badge font-mono animate-pop">NEW BEST!</span>
                  )}
                </div>
              </div>

              {/* Time & Moves Stats Grid */}
              <div className="colormaze-stats-grid">
                <div className="colormaze-stat-box">
                  <span className="stat-label font-mono">TIME</span>
                  <span className="stat-val font-mono">{levelCompleteData.time.toFixed(2)}s</span>
                </div>
                <div className="colormaze-stat-box">
                  <span className="stat-label font-mono">MOVES</span>
                  <span className="stat-val font-mono">{levelCompleteData.moves}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="colormaze-actions">
                {hasNextLevel ? (
                  <button className="btn-primary colormaze-btn" onClick={handleNextLevel}>
                    <span>NEXT LEVEL ({levelIndex + 2})</span>
                    <ArrowRight size={18} />
                  </button>
                ) : (
                  <button className="btn-primary colormaze-btn" onClick={handleRetryLevel}>
                    <span>PLAY AGAIN</span>
                    <RotateCcw size={18} />
                  </button>
                )}

                <button className="btn-secondary colormaze-btn-sub" onClick={handleRetryLevel}>
                  <RotateCcw size={16} />
                  <span>RETRY</span>
                </button>

                <button className="btn-secondary colormaze-btn-sub" onClick={handleGoHome}>
                  <Home size={16} />
                  <span>HOME</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// Canvas Utility Functions for Smooth Rounded Rectangles
function fillRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fill();
}

function strokeRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.stroke();
}
