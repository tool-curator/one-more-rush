import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Trophy, Zap, Clock, Flame, Sparkles } from 'lucide-react';
import './AimGame.css';

export function AimGame({ bestScore = 0, onGameOver, audioFx }) {
  // UI Display States
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [highScore, setHighScore] = useState(bestScore);
  const [displayTimerText, setDisplayTimerText] = useState('2.0s');
  const [floatingTexts, setFloatingTexts] = useState([]);
  const [particles, setParticles] = useState([]);
  const [ripples, setRipples] = useState([]);
  const [missMarker, setMissMarker] = useState(null);

  // Active Target payload for rendering position and size
  const [target, setTarget] = useState({
    x: 50,
    y: 50,
    size: 88,
    duration: 2000,
    id: 1,
  });

  // DOM Refs for 60FPS Direct Hardware-Accelerated Animations
  const timerBarFillRef = useRef(null);
  const targetRingRef = useRef(null);
  const playfieldRef = useRef(null);

  // Prop Refs to prevent parent re-renders from recreating callbacks or restarting game loop
  const bestScoreRef = useRef(bestScore);
  bestScoreRef.current = bestScore;

  const onGameOverRef = useRef(onGameOver);
  onGameOverRef.current = onGameOver;

  const audioFxRef = useRef(audioFx);
  audioFxRef.current = audioFx;

  // Engine Refs (Source of Truth for Game Loop)
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const highScoreRef = useRef(bestScore);
  const targetRef = useRef({
    x: 50,
    y: 50,
    size: 88,
    duration: 2000,
    id: 1,
  });
  const targetStartTimeRef = useRef(performance.now());
  const lastTextUpdateRef = useRef(0);

  const totalHitsRef = useRef(0);
  const maxComboRef = useRef(0);
  const totalClicksRef = useRef(0);
  const reactionTimesRef = useRef([]);
  const recentPositionsRef = useRef([]);

  const animFrameRef = useRef(null);
  const gameActiveRef = useRef(true);
  const gameOverHandledRef = useRef(false);
  const effectsCleanupTimerRef = useRef(null);

  // Check if current device is touch-based
  const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  // Progressive Difficulty calculation & Anti-Repetition Spawning
  const calculateNextTarget = useCallback((hits) => {
    // 1. Controlled progressive target size scaling
    // Starts at 88px, scales smoothly down to 36px (desktop) or 44px (touch/mobile)
    const minSize = isTouchDevice ? 44 : 36;
    const size = Math.max(minSize, Math.round(88 - Math.pow(Math.min(hits, 40) / 40, 0.8) * (88 - minSize)));

    // 2. Progressive target duration / time pressure
    // Starts at 2000ms (2.0s), ramps down to 600ms floor at 50+ hits
    const duration = Math.max(600, Math.round(2000 - Math.pow(Math.min(hits, 50) / 50, 0.75) * 1400));

    // 3. Anti-repetition & quality spawn positioning
    const minX = 14;
    const maxX = 86;
    const minY = 14;
    const maxY = 86;

    let bestX = 50;
    let bestY = 50;
    let maxDistanceScore = -1;

    // Evaluate up to 10 candidate positions to ensure high spatial separation from recent targets
    const recent = recentPositionsRef.current;
    const lastPos = recent.length > 0 ? recent[recent.length - 1] : null;
    const prevPos = recent.length > 1 ? recent[recent.length - 2] : null;

    for (let i = 0; i < 10; i++) {
      const candX = Math.floor(Math.random() * (maxX - minX + 1)) + minX;
      const candY = Math.floor(Math.random() * (maxY - minY + 1)) + minY;

      let distScore = 1000;
      if (lastPos) {
        const d1 = Math.hypot(candX - lastPos.x, candY - lastPos.y);
        distScore = Math.min(distScore, d1);
      }
      if (prevPos) {
        const d2 = Math.hypot(candX - prevPos.x, candY - prevPos.y) * 1.2;
        distScore = Math.min(distScore, d2);
      }

      // If candidate is sufficiently separated (> 24% screen distance), accept immediately
      if (distScore >= 24) {
        bestX = candX;
        bestY = candY;
        break;
      }

      if (distScore > maxDistanceScore) {
        maxDistanceScore = distScore;
        bestX = candX;
        bestY = candY;
      }
    }

    // Keep history of last 3 positions
    recentPositionsRef.current = [...recent.slice(-2), { x: bestX, y: bestY }];

    return {
      x: bestX,
      y: bestY,
      size,
      duration,
      id: Date.now() + Math.random(),
    };
  }, [isTouchDevice]);

  // Handle Game Over cleanly & instantly without lag
  const triggerGameOver = useCallback((cause = 'TIMEOUT') => {
    if (!gameActiveRef.current || gameOverHandledRef.current) return;
    gameActiveRef.current = false;
    gameOverHandledRef.current = true;

    // Synchronously stop RAF loop immediately
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    // Synchronously cancel pending cleanup timer
    if (effectsCleanupTimerRef.current) {
      clearTimeout(effectsCleanupTimerRef.current);
      effectsCleanupTimerRef.current = null;
    }
    setFloatingTexts([]);
    setParticles([]);
    setRipples([]);

    const finalScore = scoreRef.current;
    const isNewBest = finalScore > bestScoreRef.current;
    const hits = totalHitsRef.current;
    const clicks = totalClicksRef.current || hits || 1;
    const accuracy = Math.round((hits / clicks) * 100);

    const avgReaction = reactionTimesRef.current.length > 0
      ? Math.round(reactionTimesRef.current.reduce((a, b) => a + b, 0) / reactionTimesRef.current.length)
      : null;

    if (onGameOverRef.current) {
      onGameOverRef.current(finalScore, isNewBest, {
        score: finalScore,
        hits,
        correctCount: hits,
        targetsHit: hits,
        combo: maxComboRef.current,
        maxCombo: maxComboRef.current,
        accuracy,
        avgReaction,
        cause,
      });
    }
  }, []);

  // Main 60FPS Timer Decay & Rendering Loop (Runs once per game session on mount)
  useEffect(() => {
    gameActiveRef.current = true;
    gameOverHandledRef.current = false;
    scoreRef.current = 0;
    comboRef.current = 0;
    totalHitsRef.current = 0;
    maxComboRef.current = 0;
    totalClicksRef.current = 0;
    reactionTimesRef.current = [];
    recentPositionsRef.current = [{ x: 50, y: 50 }];
    highScoreRef.current = bestScoreRef.current;

    const initialTarget = {
      x: 50,
      y: 50,
      size: 88,
      duration: 2000,
      id: 1,
    };
    targetRef.current = initialTarget;
    targetStartTimeRef.current = performance.now();

    setTarget(initialTarget);
    setScore(0);
    setCombo(0);
    setHighScore(bestScoreRef.current);
    setDisplayTimerText('2.0s');
    setFloatingTexts([]);
    setParticles([]);
    setRipples([]);
    setMissMarker(null);
    if (effectsCleanupTimerRef.current) {
      clearTimeout(effectsCleanupTimerRef.current);
      effectsCleanupTimerRef.current = null;
    }

    const updateLoop = () => {
      if (!gameActiveRef.current) return;

      const currentTarget = targetRef.current;
      if (!currentTarget) return;

      const now = performance.now();
      const elapsed = now - targetStartTimeRef.current;
      const remainingProgress = Math.max(0, 1 - elapsed / currentTarget.duration);

      // Direct DOM updates for 60FPS timer animation
      if (timerBarFillRef.current) {
        timerBarFillRef.current.style.transform = `scaleX(${remainingProgress})`;
        if (remainingProgress < 0.25) {
          timerBarFillRef.current.classList.add('critical');
          timerBarFillRef.current.classList.remove('warning');
        } else if (remainingProgress < 0.5) {
          timerBarFillRef.current.classList.add('warning');
          timerBarFillRef.current.classList.remove('critical');
        } else {
          timerBarFillRef.current.classList.remove('warning', 'critical');
        }
      }
      if (targetRingRef.current) {
        targetRingRef.current.style.strokeDashoffset = (283 * (1 - remainingProgress)).toFixed(1);
      }

      // Throttled UI text update (~12 updates/sec)
      if (now - lastTextUpdateRef.current > 75) {
        lastTextUpdateRef.current = now;
        const secondsLeft = Math.max(0, (currentTarget.duration - elapsed) / 1000).toFixed(1);
        setDisplayTimerText(`${secondsLeft}s`);
      }

      // Expiration check
      if (remainingProgress <= 0) {
        triggerGameOver('TIMEOUT');
        return;
      }

      if (gameActiveRef.current) {
        animFrameRef.current = requestAnimationFrame(updateLoop);
      }
    };

    animFrameRef.current = requestAnimationFrame(updateLoop);

    return () => {
      gameActiveRef.current = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      if (effectsCleanupTimerRef.current) {
        clearTimeout(effectsCleanupTimerRef.current);
        effectsCleanupTimerRef.current = null;
      }
    };
  }, [triggerGameOver]);

  // Handle Target Hit
  const handleTargetClick = (e) => {
    e.stopPropagation(); // Prevent propagation to container miss click
    if (!gameActiveRef.current) return;

    const now = performance.now();
    const currentTarget = targetRef.current;
    const reactionTime = Math.round(now - targetStartTimeRef.current);
    reactionTimesRef.current.push(reactionTime);

    totalClicksRef.current += 1;
    totalHitsRef.current += 1;

    // Speed bonus: reward sub-400ms twitch reactions
    const speedBonus = Math.max(0, Math.floor((currentTarget.duration - reactionTime) / 12));

    const newCombo = comboRef.current + 1;
    comboRef.current = newCombo;
    maxComboRef.current = Math.max(maxComboRef.current || 0, newCombo);

    const hitScore = (100 + speedBonus) * newCombo;
    const newScore = scoreRef.current + hitScore;
    scoreRef.current = newScore;

    setScore(newScore);
    setCombo(newCombo);

    if (newScore > highScoreRef.current) {
      highScoreRef.current = newScore;
      setHighScore(newScore);
    }

    // Play hit sound with combo pitch
    if (audioFxRef.current?.playHit) {
      audioFxRef.current.playHit(newCombo);
    }

    // Spawn next target with progressive ramp
    const nextTarget = calculateNextTarget(totalHitsRef.current);
    targetRef.current = nextTarget;
    targetStartTimeRef.current = performance.now();
    setTarget(nextTarget);

    // Reset DOM Animation states instantly for full timer bar & target ring
    if (timerBarFillRef.current) {
      timerBarFillRef.current.style.transform = 'scaleX(1)';
      timerBarFillRef.current.classList.remove('warning', 'critical');
    }
    if (targetRingRef.current) {
      targetRingRef.current.style.strokeDashoffset = '0';
    }
    setDisplayTimerText(`${(nextTarget.duration / 1000).toFixed(1)}s`);

    // Create visual hit floating score text
    const newFloatText = {
      id: Date.now() + Math.random(),
      text: `+${hitScore}${newCombo > 1 ? ` (${newCombo}x)` : ''}`,
      x: currentTarget.x,
      y: currentTarget.y,
      isFast: reactionTime < 400,
    };
    setFloatingTexts((prev) => [...prev.slice(-5), newFloatText]);

    // Create expanding shockwave ripple
    const newRipple = {
      id: Date.now() + Math.random(),
      x: currentTarget.x,
      y: currentTarget.y,
      size: currentTarget.size * 1.6,
    };
    setRipples((prev) => [...prev.slice(-3), newRipple]);

    // Create dynamic hit particle burst with color variations
    const particleColors = ['#00f2fe', '#ff3562', '#ffb703', '#ffffff'];
    const newBurst = Array.from({ length: 10 }).map((_, i) => {
      const angle = (i * Math.PI * 2) / 10 + (Math.random() * 0.4 - 0.2);
      const speed = 50 + Math.random() * 65;
      return {
        id: Date.now() + Math.random() + i,
        x: currentTarget.x,
        y: currentTarget.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: particleColors[i % particleColors.length],
        size: Math.random() > 0.5 ? 6 : 4,
      };
    });
    setParticles((prev) => [...prev.slice(-20), ...newBurst]);

    // Single debounced cleanup timer: batch-clears all transient effects 550ms after the last hit
    if (effectsCleanupTimerRef.current) {
      clearTimeout(effectsCleanupTimerRef.current);
    }
    effectsCleanupTimerRef.current = setTimeout(() => {
      if (!gameActiveRef.current) return;
      setFloatingTexts([]);
      setParticles([]);
      setRipples([]);
      effectsCleanupTimerRef.current = null;
    }, 550);
  };

  // Handle Container Miss Click
  const handleContainerClick = (e) => {
    if (!gameActiveRef.current) return;
    totalClicksRef.current += 1;

    // Show instant visual miss indicator at pointer position
    if (playfieldRef.current) {
      const rect = playfieldRef.current.getBoundingClientRect();
      const missX = ((e.clientX - rect.left) / rect.width) * 100;
      const missY = ((e.clientY - rect.top) / rect.height) * 100;
      setMissMarker({ x: missX, y: missY });
    }

    triggerGameOver('MISCLICK');
  };

  // Momentum Tier
  const momentumTier =
    combo >= 30
      ? { label: 'OVERDRIVE', class: 'momentum-overdrive', icon: <Flame size={13} /> }
      : combo >= 15
      ? { label: 'HYPER', class: 'momentum-hyper', icon: <Zap size={13} /> }
      : combo >= 5
      ? { label: 'SURGE', class: 'momentum-surge', icon: <Sparkles size={13} /> }
      : null;

  // Personal Best Zone Status
  const isApproachingBest = bestScore > 0 && score >= bestScore * 0.85 && score < bestScore;
  const isBeatingBest = bestScore > 0 && score >= bestScore;

  return (
    <div className="aim-game-container" onPointerDown={handleContainerClick}>
      {/* Top HUD */}
      <div className="aim-hud glass-panel">
        <div className="hud-metric">
          <span className="hud-label">SCORE</span>
          <span className="hud-value font-mono highlight-score">{score.toLocaleString()}</span>
        </div>

        {/* COMBO Metric with Vertical Row Structure to Guarantee Zero Overlap */}
        <div className="hud-metric combo-metric">
          <span className="hud-label">COMBO</span>
          <span className="hud-value font-mono highlight-combo">
            <Zap size={16} className="combo-zap-icon" />
            {combo}x
          </span>
          <div className="hud-momentum-slot">
            {momentumTier && (
              <span className={`momentum-pill font-mono ${momentumTier.class} animate-pop`}>
                {momentumTier.icon}
                {momentumTier.label}
              </span>
            )}
          </div>
        </div>

        <div className="hud-metric">
          <span className="hud-label">BEST</span>
          <span className="hud-value font-mono">
            <Trophy size={15} style={{ display: 'inline', color: '#ffb703', marginRight: 4 }} />
            {highScore.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Target Lifespan Decay Progress Bar */}
      <div className="aim-timer-bar-wrapper">
        <div className="aim-timer-bar-header">
          <div className="timer-bar-label font-mono">
            <Clock size={13} className="timer-clock-icon" />
            <span>TARGET LIFESPAN</span>
            {isBeatingBest ? (
              <span className="record-pulse-badge font-mono animate-pop">👑 NEW RECORD ZONE</span>
            ) : isApproachingBest ? (
              <span className="near-best-badge font-mono animate-pop">⚡ HIGH SCORE ZONE</span>
            ) : null}
          </div>
          <span className="timer-bar-value font-mono">{displayTimerText}</span>
        </div>
        <div className="aim-timer-bar-container">
          <div className="aim-timer-ticks">
            <span /><span /><span /><span /><span />
            <span /><span /><span /><span />
          </div>
          <div ref={timerBarFillRef} className="aim-timer-bar-fill">
            <div className="aim-timer-bar-shimmer" />
            <div className="aim-timer-bar-glow-tip" />
          </div>
        </div>
      </div>

      {/* Playfield Area */}
      <div className="aim-playfield" ref={playfieldRef}>
        {/* Active Target with subtle entrance telegraph */}
        <div
          className="aim-target-wrapper animate-target-telegraph"
          style={{
            left: `${target.x}%`,
            top: `${target.y}%`,
            width: `${target.size}px`,
            height: `${target.size}px`,
          }}
          onPointerDown={handleTargetClick}
          key={target.id}
          role="button"
          aria-label="Target"
          tabIndex={0}
        >
          {/* Target SVG Reticle */}
          <svg className="target-svg" viewBox="0 0 100 100">
            {/* Outer Ring */}
            <circle cx="50" cy="50" r="45" className="target-outer-ring" />
            
            {/* Time-decay Progress Ring */}
            <circle
              ref={targetRingRef}
              cx="50"
              cy="50"
              r="45"
              className="target-progress-ring"
              style={{
                strokeDasharray: 283,
                strokeDashoffset: 0,
              }}
            />

            {/* Middle Precision Ring */}
            <circle cx="50" cy="50" r="28" className="target-middle-ring" />

            {/* Inner Cyber Reticle Crosshairs */}
            <line x1="50" y1="26" x2="50" y2="38" className="target-reticle-line" />
            <line x1="50" y1="62" x2="50" y2="74" className="target-reticle-line" />
            <line x1="26" y1="50" x2="38" y2="50" className="target-reticle-line" />
            <line x1="62" y1="50" x2="74" y2="50" className="target-reticle-line" />

            {/* High-Contrast Core */}
            <circle cx="50" cy="50" r="10" className="target-core" />
          </svg>
        </div>

        {/* Expanding Shockwave Ripples on Hit */}
        {ripples.map((r) => (
          <div
            key={r.id}
            className="aim-hit-ripple"
            style={{
              left: `${r.x}%`,
              top: `${r.y}%`,
              width: `${r.size}px`,
              height: `${r.size}px`,
            }}
          />
        ))}

        {/* Floating hit score indicators */}
        {floatingTexts.map((item) => (
          <div
            key={item.id}
            className={`aim-float-text font-mono ${item.isFast ? 'float-fast' : ''}`}
            style={{ left: `${item.x}%`, top: `${item.y}%` }}
          >
            {item.text}
          </div>
        ))}

        {/* Miss Marker Indicator */}
        {missMarker && (
          <div
            className="aim-miss-marker font-mono animate-pop"
            style={{ left: `${missMarker.x}%`, top: `${missMarker.y}%` }}
          >
            ✕ MISS
          </div>
        )}

        {/* Dynamic GPU-Accelerated Hit Particles */}
        {particles.map((p) => (
          <div
            key={p.id}
            className="aim-particle"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              background: p.color,
              boxShadow: `0 0 8px ${p.color}`,
              '--vx': `${p.vx}px`,
              '--vy': `${p.vy}px`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
