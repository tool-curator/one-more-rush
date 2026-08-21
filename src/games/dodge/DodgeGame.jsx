import React, { useState, useEffect, useRef } from 'react';
import { Shield, Zap, Clock, Flame, Magnet, Trophy, Heart, AlertTriangle } from 'lucide-react';
import { Player } from './game/player';
import { Enemy, getSafeSpawnPos } from './game/enemies';
import { Collectible, getCollectibleTierForLevel } from './game/collectibles';
import { WaveDirector } from './game/waves';
import './DodgeGame.css';

// Constant Logical Game World Dimensions (Zoom & Viewport Independent)
const LOGICAL_WIDTH = 1200;
const LOGICAL_HEIGHT = 800;

export function DodgeGame({ bestScore, onGameOver, audioFx }) {
  // HUD UI State (for rendering React overlay elements)
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(1);
  const [bestCombo, setBestCombo] = useState(1);
  const [comboProgress, setComboProgress] = useState(100);
  const [highScore, setHighScore] = useState(bestScore);
  const [health, setHealth] = useState(3);

  const [dangerLevel, setDangerLevel] = useState(1);
  const [waveToast, setWaveToast] = useState('DANGER 1 — WARMUP');
  const [activeEvent, setActiveEvent] = useState(null);
  const [frenzyActive, setFrenzyActive] = useState(false);

  const [activePowerups, setActivePowerups] = useState({
    shield: false,
    speed: 0,
    slow: 0,
    double: 0,
    magnet: 0,
  });

  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Stable Props & Callback Refs (Prevents game loop restarts on prop changes)
  const onGameOverRef = useRef(onGameOver);
  useEffect(() => {
    onGameOverRef.current = onGameOver;
  }, [onGameOver]);

  const audioFxRef = useRef(audioFx);
  useEffect(() => {
    audioFxRef.current = audioFx;
  }, [audioFx]);

  const bestScoreRef = useRef(bestScore);
  useEffect(() => {
    bestScoreRef.current = bestScore;
  }, [bestScore]);

  // Live Gameplay Value Refs
  const scoreRef = useRef(0);
  const comboRef = useRef(1);
  const bestComboRef = useRef(1);
  const highScoreRef = useRef(bestScore);
  const dangerLevelRef = useRef(1);
  const screenShakeTimerRef = useRef(0);
  const uiThrottleTimerRef = useRef(0);

  // Entities & Directors Refs
  const playerRef = useRef(null);
  const enemiesRef = useRef([]);
  const collectiblesRef = useRef([]);
  const waveDirectorRef = useRef(null);

  // Floating text / particles
  const floatingTextsRef = useRef([]);

  // Stats & Timers Refs
  const nearMissesRef = useRef(0);
  const powerupsUsedRef = useRef(0);
  const comboDecayTimerRef = useRef(3.5);
  const maxComboTimerRef = useRef(3.5);
  const frenzyTimerRef = useRef(0);
  const powerupSpawnTimerRef = useRef(14.0);

  // Controls input Refs
  const inputDirRef = useRef({ x: 0, y: 0 });
  const keysPressedRef = useRef({});
  const touchStartRef = useRef(null);

  // Loop Execution Refs
  const gameActiveRef = useRef(true);
  const gameOverHandledRef = useRef(false);
  const animFrameRef = useRef(null);
  const lastTimeRef = useRef(performance.now());
  const containerSizeRef = useRef({ width: 1200, height: 800 });

  // Helper to safely append floating text with a fixed maximum cap (prevents unbounded memory growth)
  const addFloatingText = (ft) => {
    floatingTextsRef.current.push(ft);
    if (floatingTextsRef.current.length > 10) {
      floatingTextsRef.current = floatingTextsRef.current.slice(-10);
    }
  };

  // Helper to spawn collectibles based on danger level
  const createScoreCollectible = (bounds, player, dangerLvl) => {
    const tierValue = getCollectibleTierForLevel(dangerLvl);
    const minSafeDist = tierValue >= 500 ? 90 : 130;
    const pos = getSafeSpawnPos(bounds, player, minSafeDist);
    return new Collectible('SCORE', pos.x, pos.y, { value: tierValue });
  };

  // Safe clamping of entities into logical bounds
  const clampEntitiesToBounds = (bounds) => {
    const player = playerRef.current;
    if (player) {
      player.x = Math.max(bounds.left + player.radius, Math.min(bounds.right - player.radius, player.x));
      player.y = Math.max(bounds.top + player.radius, Math.min(bounds.bottom - player.radius, player.y));
    }
    enemiesRef.current.forEach((enemy) => {
      enemy.x = Math.max(bounds.left + enemy.radius, Math.min(bounds.right - enemy.radius, enemy.x));
      enemy.y = Math.max(bounds.top + enemy.radius, Math.min(bounds.bottom - enemy.radius, enemy.y));
    });
    collectiblesRef.current.forEach((c) => {
      c.x = Math.max(bounds.left + c.radius, Math.min(bounds.right - c.radius, c.x));
      c.y = Math.max(bounds.top + c.radius, Math.min(bounds.bottom - c.radius, c.y));
    });
  };

  // Initialize Game World (Runs ONCE per game session with fixed 1200x800 logical space)
  const initGameWorld = () => {
    gameOverHandledRef.current = false;
    const cSize = containerSizeRef.current;
    const w = cSize?.width || 1200;
    const h = cSize?.height || 800;

    const player = new Player(w / 2, h / 2);
    playerRef.current = player;

    const waveDirector = new WaveDirector(w, h);
    waveDirector.reset();
    waveDirectorRef.current = waveDirector;

    // Reset gameplay value refs
    scoreRef.current = 0;
    comboRef.current = 1;
    bestComboRef.current = 1;
    highScoreRef.current = Math.max(bestScoreRef.current, highScoreRef.current);
    dangerLevelRef.current = 1;
    nearMissesRef.current = 0;
    powerupsUsedRef.current = 0;
    comboDecayTimerRef.current = 3.5;
    maxComboTimerRef.current = 3.5;
    frenzyTimerRef.current = 0;
    powerupSpawnTimerRef.current = 14.0;
    screenShakeTimerRef.current = 0;
    floatingTextsRef.current = [];

    const enemies = [];
    enemiesRef.current = enemies;
    waveDirector.populateWaveEnemies(player, enemies);

    const collectibles = [];
    const bounds = waveDirector.getBounds();
    for (let i = 0; i < 3; i++) {
      collectibles.push(createScoreCollectible(bounds, player, 1));
    }
    collectiblesRef.current = collectibles;

    // Sync React HUD Overlay States
    setHealth(3);
    setScore(0);
    setCombo(1);
    setBestCombo(1);
    setHighScore(highScoreRef.current);
    setComboProgress(100);
    setDangerLevel(1);
    setFrenzyActive(false);
  };

  // Cache exact canvas viewport dimensions on resize (guarantees 1:1 aspect ratio, zero horizontal/vertical stretching)
  useEffect(() => {
    const updateSize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (canvas && canvas.clientWidth > 0 && canvas.clientHeight > 0) {
        containerSizeRef.current = {
          width: canvas.clientWidth,
          height: canvas.clientHeight,
        };
      } else if (container) {
        const w = container.clientWidth || 1200;
        const h = Math.max(300, (container.clientHeight || 800) - 110);
        containerSizeRef.current = { width: w, height: h };
      }
    };
    updateSize();
    const rafId = requestAnimationFrame(updateSize);
    window.addEventListener('resize', updateSize);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  // Keyboard input listeners (Registered once)
  useEffect(() => {
    const handleKeyDown = (e) => {
      keysPressedRef.current[e.code] = true;
    };
    const handleKeyUp = (e) => {
      keysPressedRef.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Main Canvas Game Loop + Fixed Coordinate System Full-Bleed Display Matrix
  useEffect(() => {
    gameActiveRef.current = true;
    lastTimeRef.current = performance.now();

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Initialize single game world session in fixed 1200x800 logical bounds
    initGameWorld();

    const gameLoop = () => {
      if (!gameActiveRef.current) return;

      const now = performance.now();
      const dt = Math.max(0, Math.min(0.05, (now - lastTimeRef.current) / 1000));
      lastTimeRef.current = now;

      const player = playerRef.current;
      const waveDirector = waveDirectorRef.current;
      const enemies = enemiesRef.current;
      const collectibles = collectiblesRef.current;

      if (!player || !waveDirector) return;

      const ctx = canvas.getContext('2d');
      const cSize = containerSizeRef.current;
      const displayW = cSize?.width || 1200;
      const displayH = cSize?.height || 800;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const targetW = Math.floor(displayW * dpr);
      const targetH = Math.floor(displayH * dpr);

      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
        canvas.style.width = displayW + 'px';
        canvas.style.height = displayH + 'px';
      }

      // Keep WaveDirector arena dimensions synced to current visible canvas size
      waveDirector.arenaWidth = displayW;
      waveDirector.arenaHeight = displayH;

      // 1. Movement Input
      const keys = keysPressedRef.current;
      let kx = 0, ky = 0;
      if (keys['KeyA'] || keys['ArrowLeft']) kx -= 1;
      if (keys['KeyD'] || keys['ArrowRight']) kx += 1;
      if (keys['KeyW'] || keys['ArrowUp']) ky -= 1;
      if (keys['KeyS'] || keys['ArrowDown']) ky += 1;

      if (kx !== 0 && ky !== 0) {
        kx *= 0.7071;
        ky *= 0.7071;
      }

      let inputX = kx !== 0 ? kx : inputDirRef.current.x;
      let inputY = ky !== 0 ? ky : inputDirRef.current.y;

      const bounds = waveDirector.getBounds();

      // 2. Update Wave Director & HUD States
      waveDirector.update(dt, player, enemies, collectibles, createScoreCollectible);
      dangerLevelRef.current = waveDirector.dangerLevel;

      // Throttled UI State updates (~15-20 FPS for React HUD elements)
      uiThrottleTimerRef.current += dt;
      if (uiThrottleTimerRef.current >= 0.05) {
        uiThrottleTimerRef.current = 0;
        setDangerLevel(waveDirector.dangerLevel);
        setWaveToast(waveDirector.toastText);
        setActiveEvent(waveDirector.activeEvent);

        setActivePowerups({
          shield: player.shieldActive,
          speed: Math.max(0, player.speedTimer),
          slow: Math.max(0, player.slowTimer),
          double: Math.max(0, player.doubleTimer),
          magnet: Math.max(0, player.magnetTimer),
        });
      }

      // 3. Frenzy Mode & Combo Decay Timers
      if (frenzyTimerRef.current > 0) {
        frenzyTimerRef.current = Math.max(0, frenzyTimerRef.current - dt);
        player.frenzyTimer = frenzyTimerRef.current;
        if (frenzyTimerRef.current <= 0) {
          setFrenzyActive(false);
        }
      }

      if (screenShakeTimerRef.current > 0) {
        screenShakeTimerRef.current = Math.max(0, screenShakeTimerRef.current - dt);
      }

      // Combo Decay calculation
      comboDecayTimerRef.current -= dt;
      if (comboDecayTimerRef.current <= 0) {
        if (comboRef.current > 1) {
          comboRef.current -= 1;
          setCombo(comboRef.current);
          comboDecayTimerRef.current = 2.2;
          maxComboTimerRef.current = 2.2;
        }
      }
      const progressPercent = Math.max(
        0,
        Math.min(100, (comboDecayTimerRef.current / maxComboTimerRef.current) * 100)
      );
      setComboProgress(progressPercent);

      // 4. Update Hazards & Projectiles (With automatic dead entity collection)
      const isSlowed = player.slowTimer > 0;
      for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        if (enemy.isDead) {
          enemies.splice(i, 1);
          continue;
        }

        if (enemy._nearMissCooldown > 0) {
          enemy._nearMissCooldown = Math.max(0, enemy._nearMissCooldown - dt);
        }

        enemy.update(dt, player, bounds, isSlowed);

        if (enemy.isDead) {
          enemies.splice(i, 1);
          continue;
        }

        if (enemy.shouldShoot(dt)) {
          const dx = player.x - enemy.x;
          const dy = player.y - enemy.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 0) {
            const pSpeed = 150 + waveDirector.dangerLevel * 5;
            enemies.push(
              new Enemy('PROJECTILE', enemy.x, enemy.y, {
                vx: (dx / dist) * pSpeed,
                vy: (dy / dist) * pSpeed,
              })
            );
          }
        }
      }

      // 5. Update Player Physics
      player.update(dt, { x: inputX, y: inputY }, bounds);
      setHealth(player.health);

      // 6. Near-Miss Detector
      const isPlayerMoving = Math.hypot(player.vx, player.vy) > 40;
      if (isPlayerMoving && player.invulnTimer <= 0) {
        for (let i = 0; i < enemies.length; i++) {
          const enemy = enemies[i];
          if (enemy.isDead || enemy._nearMissCooldown > 0) continue;

          const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
          const contactDist = player.radius + enemy.radius;

          if (dist > contactDist + 2 && dist < contactDist + 32) {
            enemy._nearMissCooldown = 1.4;
            nearMissesRef.current += 1;

            const isExtreme = dist < contactDist + 14;
            const points = (isExtreme ? 100 : 50) * comboRef.current;

            scoreRef.current += points;
            setScore(scoreRef.current);

            if (scoreRef.current > highScoreRef.current) {
              highScoreRef.current = scoreRef.current;
              setHighScore(highScoreRef.current);
            }

            audioFxRef.current?.playHit?.(comboRef.current + 2);

            addFloatingText({
              id: Date.now() + Math.random(),
              text: isExtreme ? `⚡ EXTREME NEAR MISS! +${points}` : `⚡ NEAR MISS +${points}`,
              x: player.x,
              y: player.y - 25,
              life: 0.7,
              color: '#00f2fe',
            });
            break;
          }
        }
      }

      // 7. Powerup Spawner Timer
      powerupSpawnTimerRef.current -= dt;
      if (powerupSpawnTimerRef.current <= 0) {
        powerupSpawnTimerRef.current = 14.0 + Math.random() * 8.0;
        const types = ['SHIELD', 'SPEED', 'SLOW', 'DOUBLE', 'MAGNET'];
        const subType = types[Math.floor(Math.random() * types.length)];
        const pos = getSafeSpawnPos(bounds, player, 130);
        collectibles.push(new Collectible('POWERUP', pos.x, pos.y, { subType }));
      }

      // 8. Collectibles Handling & Pickup
      collectibles.forEach((c) => c.update(dt, player));

      for (let i = collectibles.length - 1; i >= 0; i--) {
        const c = collectibles[i];
        const dist = Math.hypot(c.x - player.x, c.y - player.y);
        if (dist < player.radius + c.radius) {
          if (c.type === 'SCORE') {
            const doubleMult = player.doubleTimer > 0 || waveDirector.activeEvent?.id === 'DOUBLE_SCORE' ? 2 : 1;
            const frenzyMult = frenzyTimerRef.current > 0 ? 2 : 1;
            const baseVal = c.value || 100;
            const points = baseVal * comboRef.current * doubleMult * frenzyMult;

            scoreRef.current += points;
            setScore(scoreRef.current);

            if (scoreRef.current > highScoreRef.current) {
              highScoreRef.current = scoreRef.current;
              setHighScore(highScoreRef.current);
            }

            comboRef.current += 1;
            if (comboRef.current > bestComboRef.current) {
              bestComboRef.current = comboRef.current;
              setBestCombo(bestComboRef.current);
            }
            setCombo(comboRef.current);

            // Activate FRENZY Mode at combo x10 or multiples
            if (comboRef.current === 10 || (comboRef.current > 10 && comboRef.current % 10 === 0)) {
              frenzyTimerRef.current = 5.0;
              setFrenzyActive(true);
              audioFxRef.current?.playHighScore?.();

              addFloatingText({
                id: Date.now() + Math.random(),
                text: '🔥 FRENZY MODE ACTIVATED! (2X SCORE)',
                x: player.x,
                y: player.y - 40,
                life: 1.2,
                color: '#ffb703',
              });

              for (let k = 0; k < 3; k++) {
                collectibles.push(createScoreCollectible(bounds, player, waveDirector.dangerLevel));
              }
            }

            comboDecayTimerRef.current = 3.5;
            maxComboTimerRef.current = 3.5;

            audioFxRef.current?.playHit?.(comboRef.current);

            addFloatingText({
              id: Date.now() + Math.random(),
              text: `+${points}${doubleMult > 1 || frenzyMult > 1 ? ' (2x!)' : ''}`,
              x: c.x,
              y: c.y,
              life: 0.6,
              color: c.getTierColor(),
            });

            collectibles[i] = createScoreCollectible(bounds, player, waveDirector.dangerLevel);
          } else if (c.type === 'POWERUP') {
            audioFxRef.current?.playHighScore?.();
            powerupsUsedRef.current += 1;

            const sub = c.subType;
            if (sub === 'SHIELD') player.shieldActive = true;
            else if (sub === 'SPEED') player.speedTimer = 6.0;
            else if (sub === 'SLOW') player.slowTimer = 6.0;
            else if (sub === 'DOUBLE') player.doubleTimer = 6.0;
            else if (sub === 'MAGNET') player.magnetTimer = 6.0;

            addFloatingText({
              id: Date.now() + Math.random(),
              text: `${c.getPowerupSymbol()} ${sub}!`,
              x: c.x,
              y: c.y,
              life: 0.8,
              color: c.getPowerupColor(),
            });

            collectibles.splice(i, 1);
          }
        }
      }

      // 9. Player Hazard Collision & Damage Feedback
      if (player.invulnTimer <= 0) {
        for (let i = 0; i < enemies.length; i++) {
          const enemy = enemies[i];
          if (enemy.isDead) continue;

          const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
          if (dist < player.radius + enemy.radius) {
            const hitResult = player.takeDamage();
            if (hitResult) {
              screenShakeTimerRef.current = 0.22;
              comboRef.current = 1;
              setCombo(1);
              comboDecayTimerRef.current = 0;

              // Only play hit/miss sound on NON-LETHAL damage; GameOverModal owns the lethal death sound
              if (player.health > 0) {
                audioFxRef.current?.playMiss?.();
              }

              addFloatingText({
                id: Date.now() + Math.random(),
                text: hitResult === 'SHIELD_BREAK' ? '🛡️ SHIELD BROKEN!' : '💔 HIT! COMBO LOST',
                x: player.x,
                y: player.y - 20,
                life: 0.8,
                color: '#ff3562',
              });

              if (enemy.type === 'PROJECTILE') {
                enemies.splice(i, 1);
              }

              // Check Game Over (Guaranteed single invocation)
              if (player.health <= 0) {
                if (!gameOverHandledRef.current) {
                  gameOverHandledRef.current = true;
                  gameActiveRef.current = false;
                  if (animFrameRef.current) {
                    cancelAnimationFrame(animFrameRef.current);
                    animFrameRef.current = null;
                  }

                  const finalScore = scoreRef.current;
                  const isNewBest = finalScore > bestScoreRef.current;

                  onGameOverRef.current(finalScore, isNewBest, {
                    survivalTime: waveDirector.survivalTime.toFixed(1) + 's',
                    dangerLevel: waveDirector.dangerLevel,
                    bestCombo: bestComboRef.current,
                    nearMisses: nearMissesRef.current,
                    powerupsUsed: powerupsUsedRef.current,
                  });
                }
                return;
              }
              break;
            }
          }
        }
      }

      // 10. Update Floating Text Animations
      floatingTextsRef.current.forEach((ft) => {
        ft.life -= dt;
        ft.y -= dt * 32;
      });
      floatingTextsRef.current = floatingTextsRef.current.filter((ft) => ft.life > 0);

      // 11. RENDER FULL-BLEED EDGE-TO-EDGE CANVAS SCENE
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, displayW * dpr, displayH * dpr);

      // Edge-to-Edge Grid Pattern across full screen
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
      ctx.lineWidth = 1 * dpr;
      const gridSize = 40 * dpr;
      for (let gx = 0; gx < displayW * dpr; gx += gridSize) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, displayH * dpr);
        ctx.stroke();
      }
      for (let gy = 0; gy < displayH * dpr; gy += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(displayW * dpr, gy);
        ctx.stroke();
      }

      // Set High-DPI Transform Matrix for Full Viewport Arena
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Screen Shake translation offset
      if (screenShakeTimerRef.current > 0) {
        const shakeX = (Math.random() - 0.5) * 8;
        const shakeY = (Math.random() - 0.5) * 8;
        ctx.translate(shakeX, shakeY);
      }

      // Arena Boundary Lines (Rendered only when shrinking/danger alert active)
      const isShrinkingAlert = waveDirector.shrinkWarningTimer > 0;
      if (isShrinkingAlert || waveDirector.inset > 0) {
        ctx.strokeStyle = isShrinkingAlert ? '#ff3562' : '#ff7043';
        ctx.lineWidth = isShrinkingAlert ? 4 : 2;
        if (isShrinkingAlert) {
          ctx.shadowColor = '#ff3562';
          ctx.shadowBlur = 20;
        }
        ctx.strokeRect(bounds.left, bounds.top, bounds.right - bounds.left, bounds.bottom - bounds.top);
      }

      // Draw Collectibles, Hazards, Player
      collectibles.forEach((c) => c.draw(ctx));
      enemies.forEach((enemy) => enemy.draw(ctx));
      player.draw(ctx);

      // Floating Text Popups
      ctx.font = 'bold 15px "Space Grotesk", sans-serif';
      ctx.textAlign = 'center';
      floatingTextsRef.current.forEach((ft) => {
        ctx.globalAlpha = Math.max(0, ft.life / 0.8);
        ctx.fillStyle = ft.color || '#00f2fe';
        ctx.fillText(ft.text, ft.x, ft.y);
      });

      // 12. BLACKOUT DANGER EVENT: LIMITED RADIAL VISIBILITY MASK OVER GAMEPLAY
      if (waveDirector.activeEvent?.id === 'BLACKOUT') {
        const minDim = Math.min(displayW, displayH);
        // Responsive visibility radius: scales smoothly from mobile (115px) to wide desktop (155px)
        const maskRadius = Math.max(115, Math.min(155, minDim * 0.28));

        // Create smooth multi-stop radial darkness mask centered directly on the player
        const blackoutGrad = ctx.createRadialGradient(
          player.x,
          player.y,
          player.radius * 0.6,
          player.x,
          player.y,
          maskRadius
        );
        blackoutGrad.addColorStop(0, 'rgba(4, 4, 8, 0)');
        blackoutGrad.addColorStop(0.35, 'rgba(4, 4, 8, 0.35)');
        blackoutGrad.addColorStop(0.75, 'rgba(4, 4, 8, 0.88)');
        blackoutGrad.addColorStop(1, 'rgba(4, 4, 8, 0.98)');

        // Draw darkness overlay over the entire arena/gameplay canvas
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = blackoutGrad;
        ctx.fillRect(-20, -20, displayW + 40, displayH + 40);

        // Soft player orientation beacon/aura so player is always distinct at center
        const playerTorch = ctx.createRadialGradient(
          player.x,
          player.y,
          0,
          player.x,
          player.y,
          player.radius * 2.8
        );
        playerTorch.addColorStop(0, 'rgba(0, 242, 254, 0.35)');
        playerTorch.addColorStop(0.6, 'rgba(0, 242, 254, 0.12)');
        playerTorch.addColorStop(1, 'rgba(0, 242, 254, 0)');
        ctx.fillStyle = playerTorch;
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.radius * 2.8, 0, Math.PI * 2);
        ctx.fill();

        // Subtle electric pulse ring around player's immediate perimeter
        ctx.strokeStyle = 'rgba(0, 242, 254, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.radius + 4, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      gameActiveRef.current = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []); // Empty dependency array: Game loop starts ONCE per mounted session




  // Mobile Touch / Swipe Controller (Floating Dynamic Virtual Anchor)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onTouchStart = (e) => {
      if (e.touches && e.touches.length > 0) {
        const touch = e.touches[0];
        touchStartRef.current = { x: touch.clientX, y: touch.clientY };
      }
    };

    const onTouchMove = (e) => {
      if (!touchStartRef.current || !e.touches || e.touches.length === 0) return;
      if (e.cancelable) {
        e.preventDefault(); // Prevent accidental iOS/Android browser scrolling or gesture navigation
      }

      const touch = e.touches[0];
      const curX = touch.clientX;
      const curY = touch.clientY;
      const startX = touchStartRef.current.x;
      const startY = touchStartRef.current.y;

      const dx = curX - startX;
      const dy = curY - startY;
      const dist = Math.hypot(dx, dy);

      const maxRadius = 36;
      const deadzone = 3;

      if (dist > deadzone) {
        inputDirRef.current = {
          x: Math.min(1, Math.max(-1, dx / maxRadius)),
          y: Math.min(1, Math.max(-1, dy / maxRadius)),
        };

        // Floating dynamic anchor: Drag joystick center along when exceeding max radius
        // This ensures instantaneous reversal of direction upon any swipe reversal!
        if (dist > maxRadius) {
          const angle = Math.atan2(dy, dx);
          touchStartRef.current = {
            x: curX - Math.cos(angle) * maxRadius,
            y: curY - Math.sin(angle) * maxRadius,
          };
        }
      } else {
        inputDirRef.current = { x: 0, y: 0 };
      }
    };

    const onTouchEnd = () => {
      touchStartRef.current = null;
      inputDirRef.current = { x: 0, y: 0 };
    };

    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd, { passive: true });
    container.addEventListener('touchcancel', onTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
      container.removeEventListener('touchcancel', onTouchEnd);
    };
  }, []);

  return (
    <div
      className="dodge-container"
      ref={containerRef}
    >
      {/* Top Game HUD */}
      <div className="dodge-hud glass-panel">
        <div className="hud-metric">
          <span className="hud-lbl">SCORE</span>
          <span className="hud-val font-mono highlight-score">{score.toLocaleString()}</span>
        </div>

        <div className="hud-metric">
          <span className="hud-lbl">BEST</span>
          <span className="hud-val font-mono">
            <Trophy size={14} style={{ display: 'inline', color: '#ffb703', marginRight: 4 }} />
            {highScore.toLocaleString()}
          </span>
        </div>

        {/* Danger Level Pill */}
        <div className="hud-metric danger-metric">
          <span className="hud-lbl">LEVEL</span>
          <span className="hud-val font-mono danger-badge">
            <AlertTriangle size={13} style={{ display: 'inline', color: '#ff3562', marginRight: 3 }} />
            DANGER {dangerLevel}
          </span>
        </div>

        {/* Combo & Combo Decay Progress Bar */}
        <div className="hud-metric combo-metric">
          <span className="hud-lbl">COMBO</span>
          <span className="hud-val font-mono highlight-combo">
            <Zap size={14} style={{ display: 'inline', color: '#00f2fe' }} />
            {combo}x
          </span>
          <div className="combo-decay-bar-bg">
            <div
              className="combo-decay-bar-fill"
              style={{ width: `${comboProgress}%` }}
            />
          </div>
        </div>

        <div className="hud-metric health-metric">
          <span className="hud-lbl">HEALTH</span>
          <div className="hearts-row">
            {Array.from({ length: 3 }).map((_, i) => (
              <Heart
                key={i}
                size={18}
                className={`heart-icon ${i < health ? 'active' : 'lost'}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Dedicated Announcement & Status Stack (Vertical Flow, Zero Overlap) */}
      <div className="dodge-announcement-stack">
        {/* Wave / Danger Announcement Toast */}
        <div className="dodge-toast-slot">
          {activeEvent ? (
            <div className="danger-event-banner animate-pop font-heading">
              <span>{activeEvent.name}</span>
            </div>
          ) : waveDirectorRef.current?.toastTimer > 0 ? (
            <div className="wave-announce-toast animate-pop font-heading">
              <span>{waveToast}</span>
            </div>
          ) : null}
        </div>

        {/* Active Powerups & Frenzy Pill Row */}
        <div className="powerup-hud-row">
          {frenzyActive && (
            <div className="powerup-pill frenzy-pill font-mono animate-pop">
              <Flame size={14} /> <span>🔥 FRENZY x2</span>
            </div>
          )}
          {activePowerups.shield && (
            <div className="powerup-pill shield-pill">
              <Shield size={13} /> <span>SHIELD ACTIVE</span>
            </div>
          )}
          {activePowerups.speed > 0 && (
            <div className="powerup-pill speed-pill font-mono">
              <Zap size={13} /> <span>SPEED {activePowerups.speed.toFixed(1)}s</span>
            </div>
          )}
          {activePowerups.slow > 0 && (
            <div className="powerup-pill slow-pill font-mono">
              <Clock size={13} /> <span>SLOW {activePowerups.slow.toFixed(1)}s</span>
            </div>
          )}
          {activePowerups.double > 0 && (
            <div className="powerup-pill double-pill font-mono">
              <Flame size={13} /> <span>2X SCORE {activePowerups.double.toFixed(1)}s</span>
            </div>
          )}
          {activePowerups.magnet > 0 && (
            <div className="powerup-pill magnet-pill font-mono">
              <Magnet size={13} /> <span>MAGNET {activePowerups.magnet.toFixed(1)}s</span>
            </div>
          )}
        </div>
      </div>

      {/* HTML5 Canvas Render Layer */}
      <canvas ref={canvasRef} className="dodge-canvas" />

      {/* Virtual Touch Joystick Helper */}
      <div className="touch-help-overlay">
        <span>SWIPE / WASD TO MOVE</span>
      </div>
    </div>
  );
}


