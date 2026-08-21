import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StackEngine } from './game/stackEngine';
import './StackGame.css';

export function StackGame({ bestScore = 0, onGameOver, audioFx }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  // React HUD Display State (Throttled at ~15 FPS)
  const [score, setScore] = useState(0);
  const [currentBest, setCurrentBest] = useState(bestScore);
  const [height, setHeight] = useState(0);
  const [combo, setCombo] = useState(1);
  const [flowMode, setFlowMode] = useState(false);
  const [toastText, setToastText] = useState(null);
  const [activeEvent, setActiveEvent] = useState(null);

  // Keep prop refs stable inside rAF loop
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

  // Engine instance & loop refs
  const engineRef = useRef(null);
  const animFrameRef = useRef(null);
  const lastTimeRef = useRef(0);
  const lastHudUpdateRef = useRef(0);
  const gameOverHandledRef = useRef(false);
  const gameOverTimerRef = useRef(null);
  const lastDropTimeRef = useRef(0);
  const containerSizeRef = useRef({ width: 1440, height: 900 });

  // HUD State value tracking refs to avoid redundant React state triggers
  const lastHudStateRef = useRef({
    score: -1,
    height: -1,
    combo: -1,
    flowMode: false,
    toastText: null,
    activeEvent: null,
  });

  // Passive container size tracking (avoids layout thrashing during rAF loop)
  useEffect(() => {
    const updateSize = () => {
      const container = containerRef.current;
      if (container) {
        containerSizeRef.current = {
          width: container.clientWidth || window.innerWidth || 1440,
          height: container.clientHeight || window.innerHeight || 900,
        };
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Initialize Canvas & Engine
  useEffect(() => {
    gameOverHandledRef.current = false;
    lastDropTimeRef.current = 0;
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const initWidth = container.clientWidth || window.innerWidth || 1440;
    const initHeight = container.clientHeight || window.innerHeight || 900;
    containerSizeRef.current = { width: initWidth, height: initHeight };

    const engine = new StackEngine(initWidth, initHeight);
    engineRef.current = engine;

    const ctx = canvas.getContext('2d');
    lastTimeRef.current = performance.now();

    const loop = () => {
      if (gameOverHandledRef.current) return;

      const now = performance.now();
      const dt = Math.max(0, Math.min(0.05, (now - lastTimeRef.current) / 1000));
      lastTimeRef.current = now;

      // 1. Unthrottled 60 FPS Game Engine Update & Canvas Render
      engine.update(dt);

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cSize = containerSizeRef.current;
      const pWidth = cSize.width;
      const pHeight = cSize.height;

      const targetW = Math.floor(pWidth * dpr);
      const targetH = Math.floor(pHeight * dpr);

      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
        canvas.style.width = `${pWidth}px`;
        canvas.style.height = `${pHeight}px`;
      }

      engine.render(ctx, pWidth, pHeight, dpr);

      // 2. Throttled React HUD State Sync (~15 FPS / change-guarded)
      if (now - lastHudUpdateRef.current >= 66) {
        lastHudUpdateRef.current = now;

        const currentToast = engine.toastTimer > 0 ? engine.toastMessage : null;
        const currentEv = engine.eventBannerTimer > 0 ? engine.activeEvent : null;
        const prev = lastHudStateRef.current;

        if (prev.score !== engine.score) {
          setScore(engine.score);
          prev.score = engine.score;
        }
        if (prev.height !== engine.height) {
          setHeight(engine.height);
          prev.height = engine.height;
        }
        if (prev.combo !== engine.combo) {
          setCombo(engine.combo);
          prev.combo = engine.combo;
        }
        if (prev.flowMode !== engine.flowMode) {
          setFlowMode(engine.flowMode);
          prev.flowMode = engine.flowMode;
        }
        if (prev.toastText !== currentToast) {
          setToastText(currentToast);
          prev.toastText = currentToast;
        }
        if (prev.activeEvent !== currentEv) {
          setActiveEvent(currentEv);
          prev.activeEvent = currentEv;
        }
        if (engine.score > bestScoreRef.current) {
          setCurrentBest(engine.score);
        }
      }

      if (!engine.gameOver && !gameOverHandledRef.current) {
        animFrameRef.current = requestAnimationFrame(loop);
      }
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      if (gameOverTimerRef.current) {
        clearTimeout(gameOverTimerRef.current);
        gameOverTimerRef.current = null;
      }
    };
  }, []);

  // Drop Action Handler (Debounced and guarded against game-over triggers)
  const handleDrop = useCallback(() => {
    const engine = engineRef.current;
    if (!engine || engine.gameOver || gameOverHandledRef.current) return;

    const now = performance.now();
    if (now - lastDropTimeRef.current < 50) return; // Prevent double-trigger from pointerdown + click
    lastDropTimeRef.current = now;

    const audio = audioFxRef.current;

    const result = engine.dropBlock({
      onHit: (c) => {
        if (audio && audio.playHit) audio.playHit(c);
      },
      onPerfect: (streak) => {
        if (audio && audio.playPerfect) audio.playPerfect(streak);
      },
      onFlowMode: () => {
        if (audio && audio.playFlowMode) audio.playFlowMode();
      },
      onGameOver: () => {
        if (gameOverHandledRef.current) return;
        gameOverHandledRef.current = true;

        // Synchronously cancel rAF loop
        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current);
          animFrameRef.current = null;
        }

        const finalScore = engine.score;
        const isNewBest = finalScore > bestScoreRef.current;
        const metrics = {
          bestCombo: engine.maxCombo,
          height: engine.height,
          perfects: engine.perfects,
        };

        // Modal is the authoritative owner of game-over audio (0 duplicate lethal sounds)
        if (gameOverTimerRef.current) clearTimeout(gameOverTimerRef.current);
        gameOverTimerRef.current = setTimeout(() => {
          if (onGameOverRef.current) {
            onGameOverRef.current(finalScore, isNewBest, metrics);
          }
        }, 400);
      },
    });

    if (
      result &&
      !result.gameOver &&
      !engine.gameOver &&
      !gameOverHandledRef.current &&
      engine.activeEvent &&
      engine.eventBannerTimer > 2.2 &&
      audio &&
      audio.playSpecialEvent
    ) {
      audio.playSpecialEvent();
    }
  }, []);

  // Pointer/Touch drop handler
  const handlePointerDown = (e) => {
    if (e.target.closest('.stack-hud') || e.target.closest('.sound-toggle') || e.target.closest('button')) {
      return;
    }
    handleDrop();
  };

  // Spacebar Keydown Handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' || e.key === ' ' || e.keyCode === 32) {
        e.preventDefault();
        handleDrop();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDrop]);

  return (
    <div
      ref={containerRef}
      className="stack-game-container"
      onPointerDown={handlePointerDown}
    >
      {/* HTML5 Canvas Viewport */}
      <canvas ref={canvasRef} className="stack-canvas" />

      {/* Top HUD */}
      <div className="stack-hud font-heading" onClick={(e) => e.stopPropagation()}>
        <div className="hud-stat">
          <span className="hud-label">SCORE</span>
          <span className="hud-value highlight">{score.toLocaleString()}</span>
        </div>

        <div className="hud-stat">
          <span className="hud-label">BEST</span>
          <span className="hud-value">{currentBest.toLocaleString()}</span>
        </div>

        <div className="hud-stat">
          <span className="hud-label">HEIGHT</span>
          <span className="hud-value">{height}</span>
        </div>

        <div className="hud-stat">
          <span className="hud-label">COMBO</span>
          <span className="hud-value combo-highlight">🔥 x{combo}</span>
        </div>
      </div>

      {/* Dedicated Notification Stack (Vertical Flow, Zero Overlap) */}
      <div className="stack-notification-stack">
        {activeEvent && (
          <div className="special-event-banner animate-pop">
            <span className="banner-title">{activeEvent.title}</span>
            <span className="banner-desc">{activeEvent.desc}</span>
          </div>
        )}

        {flowMode && (
          <div className="flow-mode-pill animate-pop">
            <span>🔥 FLOW MODE | 2X SCORE</span>
          </div>
        )}

        {toastText && (
          <div className="stack-toast font-heading animate-pop">
            <span>{toastText}</span>
          </div>
        )}
      </div>

      {/* Tap hint footer */}
      <div className="stack-tap-hint">
        TAP / CLICK / SPACE TO DROP BLOCK
      </div>
    </div>
  );
}
