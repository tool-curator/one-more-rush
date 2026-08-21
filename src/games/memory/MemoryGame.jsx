import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Trophy, Zap, Heart, Flame, ShieldAlert, CheckCircle2, XCircle, Eye, RefreshCw, Sparkles, Camera, AlertTriangle, Send } from 'lucide-react';
import { generateMemoryRound } from './game/sequenceGenerator';
import './MemoryGame.css';

export function MemoryGame({ bestScore, onGameOver, audioFx }) {
  // Game Stats
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(bestScore);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [health, setHealth] = useState(3);
  const [round, setRound] = useState(1);
  const [correctInputs, setCorrectInputs] = useState(0);
  const [totalInputs, setTotalInputs] = useState(0);
  const [completedSequences, setCompletedSequences] = useState(0);
  const [longestSequence, setLongestSequence] = useState(0);

  // Active Round & Challenge State
  const [roundData, setRoundData] = useState(null);
  // 'ANNOUNCING' | 'PLAYING_SEQUENCE' | 'WAITING_FOR_INPUT' | 'PLAYING_SNAPSHOT' | 'WAITING_SNAPSHOT_INPUT' | 'PLAYING_GLITCH' | 'WAITING_GLITCH_INPUT' | 'ROUND_END'
  const [gameStatePhase, setGameStatePhase] = useState('ANNOUNCING');

  // Sequence Playback Highlight State
  const [activeHighlightIndex, setActiveHighlightIndex] = useState(null);
  const [userInputs, setUserInputs] = useState([]);
  
  // Snapshot Selection State
  const [snapshotSelections, setSnapshotSelections] = useState([]);

  // Glitch Display State ('INITIAL' | 'FLASH' | 'MODIFIED' | 'CHOICES')
  const [glitchStage, setGlitchStage] = useState('INITIAL');
  const [selectedGlitchOption, setSelectedGlitchOption] = useState(null);

  // Feedback & Overlay Callouts
  const [feedback, setFeedback] = useState(null); // { type: 'correct'|'wrong', text: string }
  const [comboMilestoneText, setComboMilestoneText] = useState(null);

  // Visual Effects
  const [floatingTexts, setFloatingTexts] = useState([]);
  const [particles, setParticles] = useState([]);

  // Timer & Loop Refs
  const gameActiveRef = useRef(true);
  const gameOverHandledRef = useRef(false);
  const isTransitioningRef = useRef(false);
  const activeTimeoutsRef = useRef(new Set());
  const gameContainerRef = useRef(null);
  const tileRefs = useRef([]);

  // Focus Mode active when combo >= 5
  const isFocusMode = combo >= 5;

  // Safe timeout helper that tracks active timer IDs and cleans up automatically
  const safeSetTimeout = useCallback((callback, delay) => {
    const id = setTimeout(() => {
      activeTimeoutsRef.current.delete(id);
      if (gameActiveRef.current && !gameOverHandledRef.current) {
        callback();
      }
    }, delay);
    activeTimeoutsRef.current.add(id);
    return id;
  }, []);

  const clearAllTimeouts = useCallback(() => {
    activeTimeoutsRef.current.forEach((id) => clearTimeout(id));
    activeTimeoutsRef.current.clear();
  }, []);

  // Handle Game Over (guaranteed strictly single execution)
  const triggerGameOver = useCallback((finalScore, finalRound, finalMaxCombo, finalLongest, finalCompleted, finalCorrect, finalTotal) => {
    if (gameOverHandledRef.current || !gameActiveRef.current) return;
    gameOverHandledRef.current = true;
    gameActiveRef.current = false;
    clearAllTimeouts();

    const isNewBest = finalScore > bestScore;
    const accuracy = finalTotal > 0 ? Math.round((finalCorrect / finalTotal) * 100) : 0;

    onGameOver(finalScore, isNewBest, {
      round: finalRound,
      maxCombo: finalMaxCombo,
      longestSequence: finalLongest,
      completedSequences: finalCompleted,
      accuracy,
      correctCount: finalCorrect,
      totalAttempts: finalTotal,
    });
  }, [bestScore, clearAllTimeouts, onGameOver]);

  // Play Sequence Tile Highlights Step by Step for Classic & Rush Modes
  const playSequenceSteps = useCallback((data) => {
    setGameStatePhase('PLAYING_SEQUENCE');

    const steps = data.sequence;
    let accumulatedTime = 300; // Small initial delay

    steps.forEach((tileIndex, i) => {
      // Highlight Tile On
      safeSetTimeout(() => {
        if (!gameActiveRef.current || gameOverHandledRef.current) return;
        setActiveHighlightIndex(tileIndex);
        audioFx.playHit(i + 1);
      }, accumulatedTime);

      accumulatedTime += data.displaySpeedMs;

      // Highlight Tile Off
      safeSetTimeout(() => {
        if (!gameActiveRef.current || gameOverHandledRef.current) return;
        setActiveHighlightIndex(null);
      }, accumulatedTime);

      accumulatedTime += data.gapSpeedMs;
    });

    // Sequence Playback Complete -> Transition to Input Phase
    safeSetTimeout(() => {
      if (!gameActiveRef.current || gameOverHandledRef.current) return;
      setGameStatePhase('WAITING_FOR_INPUT');
    }, accumulatedTime + 100);
  }, [audioFx, safeSetTimeout]);

  // Play Snapshot Mode Sequence
  const playSnapshotSteps = useCallback((data) => {
    setGameStatePhase('PLAYING_SNAPSHOT');
    setActiveHighlightIndex(null);

    safeSetTimeout(() => {
      if (!gameActiveRef.current || gameOverHandledRef.current) return;
      setGameStatePhase('WAITING_SNAPSHOT_INPUT');
    }, data.snapshotViewTimeMs);
  }, [safeSetTimeout]);

  // Play Glitch Mode Sequence
  const playGlitchSteps = useCallback((data) => {
    setGameStatePhase('PLAYING_GLITCH');
    setGlitchStage('INITIAL');

    // 1. Initial State (1200ms)
    safeSetTimeout(() => {
      if (!gameActiveRef.current || gameOverHandledRef.current) return;
      setGlitchStage('FLASH');
      audioFx.playSpecialEvent();

      // 2. Glitch Flash (300ms)
      safeSetTimeout(() => {
        if (!gameActiveRef.current || gameOverHandledRef.current) return;
        setGlitchStage('MODIFIED');

        // 3. Modified State (1200ms)
        safeSetTimeout(() => {
          if (!gameActiveRef.current || gameOverHandledRef.current) return;
          setGlitchStage('CHOICES');
          setGameStatePhase('WAITING_GLITCH_INPUT');
        }, 1200);
      }, 300);
    }, 1200);
  }, [audioFx, safeSetTimeout]);

  // Start & Route Round Challenge Type
  const startRoundSequence = useCallback((data) => {
    if (!gameActiveRef.current || gameOverHandledRef.current) return;
    clearAllTimeouts();

    setUserInputs([]);
    setSnapshotSelections([]);
    setSelectedGlitchOption(null);
    setFeedback(null);
    setActiveHighlightIndex(null);

    // Step 1: Announce special challenge mode if present
    if (data.challengeType) {
      setGameStatePhase('ANNOUNCING');
      audioFx.playSpecialEvent();

      safeSetTimeout(() => {
        if (!gameActiveRef.current || gameOverHandledRef.current) return;
        if (data.challengeType === 'SNAPSHOT') {
          playSnapshotSteps(data);
        } else if (data.challengeType === 'GLITCH') {
          playGlitchSteps(data);
        } else {
          playSequenceSteps(data);
        }
      }, 1100);
    } else {
      playSequenceSteps(data);
    }
  }, [clearAllTimeouts, audioFx, safeSetTimeout, playSnapshotSteps, playGlitchSteps, playSequenceSteps]);

  // Initialize Game Session
  useEffect(() => {
    gameActiveRef.current = true;
    gameOverHandledRef.current = false;
    isTransitioningRef.current = false;
    clearAllTimeouts();

    const firstRound = generateMemoryRound(1);
    setRoundData(firstRound);
    startRoundSequence(firstRound);

    return () => {
      gameActiveRef.current = false;
      clearAllTimeouts();
    };
  }, [clearAllTimeouts, startRoundSequence]);

  // Advance to next round
  const advanceToNextRound = (nextRound, currentHealth, currentScore, currentCombo, currentMaxCombo, currentLongest, currentCompleted, currentCorrect, currentTotal) => {
    if (!gameActiveRef.current || gameOverHandledRef.current) return;

    const nextData = generateMemoryRound(nextRound);
    setRound(nextRound);
    setRoundData(nextData);

    isTransitioningRef.current = false;
    startRoundSequence(nextData);
  };

  // Spawn visual hit particles & floating score text
  const spawnHitEffects = (tileIndex, scoreGained, currentCombo) => {
    const tileEl = tileRefs.current[tileIndex];
    const containerRect = gameContainerRef.current?.getBoundingClientRect();

    let relX = 50;
    let relY = 50;

    if (tileEl && containerRect) {
      const tileRect = tileEl.getBoundingClientRect();
      relX = ((tileRect.left + tileRect.width / 2 - containerRect.left) / containerRect.width) * 100;
      relY = ((tileRect.top + tileRect.height / 2 - containerRect.top) / containerRect.height) * 100;
    }

    // Floating text (capped at 8 items)
    const newFloatText = {
      id: performance.now() + Math.random(),
      text: `+${scoreGained}${currentCombo > 1 ? ` 🔥${currentCombo}x` : ''}`,
      x: relX,
      y: relY,
    };
    setFloatingTexts((prev) => [...prev.slice(-7), newFloatText]);

    // Particles (capped at 24 items)
    const newBurst = Array.from({ length: 8 }).map((_, i) => {
      const angle = (i * Math.PI * 2) / 8;
      const speed = 40 + Math.random() * 50;
      return {
        id: performance.now() + Math.random() + i,
        x: relX,
        y: relY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
      };
    });
    setParticles((prev) => [...prev.slice(-16), ...newBurst]);
  };

  // Helper for Round Success
  const handleRoundSuccess = (gainedScore, currentCombo) => {
    isTransitioningRef.current = true;
    setGameStatePhase('ROUND_END');

    const newScore = score + gainedScore;
    const newCombo = currentCombo;
    const newMaxCombo = Math.max(maxCombo, newCombo);
    const newCompleted = completedSequences + 1;
    const newLongest = Math.max(longestSequence, roundData.sequenceLength || roundData.snapshotActivePositions.length);

    setScore(newScore);
    if (newScore > highScore) setHighScore(newScore);
    setCombo(newCombo);
    setMaxCombo(newMaxCombo);
    setCompletedSequences(newCompleted);
    setLongestSequence(newLongest);

    audioFx.playPerfect(newCombo);

    if (newCombo % 5 === 0) {
      audioFx.playSpecialEvent();
      setComboMilestoneText(`🔥 MEMORY STREAK x${newCombo}!`);
      safeSetTimeout(() => setComboMilestoneText(null), 1000);
    }

    safeSetTimeout(() => {
      advanceToNextRound(round + 1, health, newScore, newCombo, newMaxCombo, newLongest, newCompleted, correctInputs, totalInputs);
    }, 320);
  };

  // Helper for Round Failure
  const handleRoundFailure = (failText) => {
    isTransitioningRef.current = true;
    setGameStatePhase('ROUND_END');

    const newHealth = health - 1;
    setHealth(newHealth);
    setCombo(0);

    // Suppress duplicate lethal miss sound if modal owns game-over sound
    if (newHealth > 0) {
      audioFx.playMiss();
    }

    setFeedback({
      type: 'wrong',
      text: failText,
    });

    safeSetTimeout(() => {
      if (newHealth <= 0) {
        triggerGameOver(score, round, maxCombo, longestSequence, completedSequences, correctInputs, totalInputs);
      } else {
        advanceToNextRound(round + 1, newHealth, score, 0, maxCombo, longestSequence, completedSequences, correctInputs, totalInputs);
      }
    }, 350);
  };

  // 1. CLASSIC / RUSH TILE CLICK
  const handleTileClick = (tileIndex) => {
    if (gameStatePhase !== 'WAITING_FOR_INPUT' || isTransitioningRef.current || !gameActiveRef.current || gameOverHandledRef.current || !roundData) return;

    const stepIndex = userInputs.length;
    const targetTileIndex = roundData.targetSequence[stepIndex];
    const isCorrect = tileIndex === targetTileIndex;

    const newTotalInputs = totalInputs + 1;
    setTotalInputs(newTotalInputs);

    if (isCorrect) {
      audioFx.playHit(stepIndex + 1);
      const newCorrectInputs = correctInputs + 1;
      setCorrectInputs(newCorrectInputs);

      const nextInputs = [...userInputs, tileIndex];
      setUserInputs(nextInputs);

      setActiveHighlightIndex(tileIndex);
      safeSetTimeout(() => setActiveHighlightIndex(null), 120);

      if (nextInputs.length === roundData.targetSequence.length) {
        const newCombo = combo + 1;
        const baseScore = 100 + roundData.sequenceLength * 50 + round * 15;
        const comboMultiplier = 1 + Math.min(newCombo, 20) * 0.1;
        const modeMultiplier = isFocusMode || roundData.challengeType === 'MEMORY_RUSH' ? 2.0 : 1.0;
        const challengeMultiplier = roundData.challengeType ? 1.5 : 1.0;

        const gainedScore = Math.floor(baseScore * comboMultiplier * modeMultiplier * challengeMultiplier);
        setFeedback({
          type: 'correct',
          text: roundData.challengeType === 'MEMORY_RUSH' ? '🔥 RUSH CLEARED!' : '✓ PERFECT MEMORY',
        });

        spawnHitEffects(tileIndex, gainedScore, newCombo);
        handleRoundSuccess(gainedScore, newCombo);
      }
    } else {
      handleRoundFailure('✕ WRONG SEQUENCE');
    }
  };

  // 2. SNAPSHOT TILE SELECTION TOGGLE & SUBMIT
  const handleSnapshotTileToggle = (tileIndex) => {
    if (gameStatePhase !== 'WAITING_SNAPSHOT_INPUT' || isTransitioningRef.current || !gameActiveRef.current || gameOverHandledRef.current) return;

    audioFx.playHit(snapshotSelections.length + 1);

    setSnapshotSelections((prev) => {
      if (prev.includes(tileIndex)) {
        return prev.filter((id) => id !== tileIndex);
      } else {
        return [...prev, tileIndex];
      }
    });
  };

  const handleSnapshotSubmit = () => {
    if (gameStatePhase !== 'WAITING_SNAPSHOT_INPUT' || isTransitioningRef.current || !gameActiveRef.current || gameOverHandledRef.current || !roundData) return;

    const targetPos = roundData.snapshotActivePositions;
    const isMatch =
      snapshotSelections.length === targetPos.length &&
      snapshotSelections.every((pos) => targetPos.includes(pos));

    const newTotalInputs = totalInputs + 1;
    setTotalInputs(newTotalInputs);

    if (isMatch) {
      const newCorrect = correctInputs + 1;
      setCorrectInputs(newCorrect);

      const newCombo = combo + 1;
      const baseScore = 150 + targetPos.length * 60 + round * 15;
      const gainedScore = Math.floor(baseScore * (1 + Math.min(newCombo, 20) * 0.1) * (isFocusMode ? 2.0 : 1.0));

      setFeedback({
        type: 'correct',
        text: '📸 PERFECT SNAPSHOT',
      });

      if (snapshotSelections[0] !== undefined) {
        spawnHitEffects(snapshotSelections[0], gainedScore, newCombo);
      }
      handleRoundSuccess(gainedScore, newCombo);
    } else {
      handleRoundFailure('✕ SNAPSHOT FAILED');
    }
  };

  // 3. GLITCH OPTION SELECTION
  const handleGlitchOptionClick = (optionIndex) => {
    if (gameStatePhase !== 'WAITING_GLITCH_INPUT' || isTransitioningRef.current || !gameActiveRef.current || gameOverHandledRef.current || !roundData) return;

    setSelectedGlitchOption(optionIndex);
    const isCorrect = optionIndex === roundData.glitchCorrectIndex;

    const newTotal = totalInputs + 1;
    setTotalInputs(newTotal);

    if (isCorrect) {
      const newCorrect = correctInputs + 1;
      setCorrectInputs(newCorrect);

      const newCombo = combo + 1;
      const baseScore = 180 + round * 20;
      const gainedScore = Math.floor(baseScore * (1 + Math.min(newCombo, 20) * 0.1) * (isFocusMode ? 2.0 : 1.0));

      audioFx.playHit(newCombo);
      setFeedback({
        type: 'correct',
        text: '⚡ GLITCH CAUGHT',
      });

      spawnHitEffects(0, gainedScore, newCombo);
      handleRoundSuccess(gainedScore, newCombo);
    } else {
      handleRoundFailure('✕ GLITCH MISSED');
    }
  };

  // Bounded floatingTexts cleanup via centralized safeSetTimeout
  useEffect(() => {
    if (floatingTexts.length === 0) return;
    const id = safeSetTimeout(() => {
      setFloatingTexts((prev) => (prev.length > 0 ? prev.slice(1) : []));
    }, 600);
    return () => {
      activeTimeoutsRef.current.delete(id);
      clearTimeout(id);
    };
  }, [floatingTexts, safeSetTimeout]);

  // Bounded particles cleanup via centralized safeSetTimeout (~500ms CSS animation)
  useEffect(() => {
    if (particles.length === 0) return;
    const id = safeSetTimeout(() => {
      setParticles((prev) => (prev.length > 0 ? prev.slice(8) : []));
    }, 500);
    return () => {
      activeTimeoutsRef.current.delete(id);
      clearTimeout(id);
    };
  }, [particles, safeSetTimeout]);

  if (!roundData) return null;

  return (
    <div className="memory-game-container" ref={gameContainerRef}>
      {/* Top HUD */}
      <div className="mem-hud glass-panel">
        <div className="mem-hud-metric">
          <span className="mem-hud-label">SCORE</span>
          <span className="mem-hud-value font-mono highlight-score">{score.toLocaleString()}</span>
        </div>

        <div className="mem-hud-metric">
          <span className="mem-hud-label">BEST</span>
          <span className="mem-hud-value font-mono">
            <Trophy size={14} style={{ color: '#ffb703', marginRight: 4 }} />
            {highScore.toLocaleString()}
          </span>
        </div>

        <div className="mem-hud-metric">
          <span className="mem-hud-label">ROUND</span>
          <span className="mem-hud-value font-mono">{round}</span>
        </div>

        <div className="mem-hud-metric combo-metric">
          <span className="mem-hud-label">COMBO</span>
          <span className="mem-hud-value font-mono highlight-combo">
            {combo > 0 ? `🔥${combo}x` : '0x'}
          </span>
        </div>

        <div className="mem-hud-metric hearts-metric">
          <span className="mem-hud-label">HEALTH</span>
          <div className="hearts-row">
            {Array.from({ length: 3 }).map((_, i) => (
              <Heart
                key={i}
                size={18}
                className={`heart-icon ${i < health ? 'active-heart' : 'lost-heart'}`}
                fill={i < health ? '#ff3562' : 'none'}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Special Challenge / Focus Mode Banner */}
      {isFocusMode ? (
        <div className="mode-banner focus-banner animate-pulse">
          <Flame size={16} />
          <span>🔥 FOCUS MODE — 2X SCORE MULTIPLIER</span>
          <Flame size={16} />
        </div>
      ) : roundData.challengeType === 'SNAPSHOT' ? (
        <div className="mode-banner snapshot-banner animate-pulse">
          <Camera size={16} />
          <span>📸 SNAPSHOT MODE — MEMORIZE ACTIVE POSITIONS</span>
          <Camera size={16} />
        </div>
      ) : roundData.challengeType === 'GLITCH' ? (
        <div className="mode-banner glitch-banner animate-pulse">
          <AlertTriangle size={16} />
          <span>⚠️ GLITCH MODE — DETECT THE CHANGE!</span>
          <AlertTriangle size={16} />
        </div>
      ) : roundData.challengeType === 'MEMORY_RUSH' ? (
        <div className="mode-banner rush-banner animate-pulse">
          <Zap size={16} />
          <span>🔥 MEMORY RUSH — REMEMBER FAST (2X SCORE)!</span>
          <Zap size={16} />
        </div>
      ) : roundData.challengeType === 'REVERSE' ? (
        <div className="mode-banner reverse-banner animate-pulse">
          <RefreshCw size={16} />
          <span>🔄 REVERSE MODE: RECREATE IN REVERSE ORDER!</span>
          <RefreshCw size={16} />
        </div>
      ) : roundData.challengeType === 'BLINK' ? (
        <div className="mode-banner blink-banner animate-pulse">
          <Zap size={16} />
          <span>⚡ BLINK MODE: WATCH ULTRA-FAST PLAYBACK!</span>
          <Zap size={16} />
        </div>
      ) : roundData.challengeType === 'DISTRACTOR' ? (
        <div className="mode-banner distractor-banner animate-pulse">
          <Eye size={16} />
          <span>👁️ DISTRACTOR MODE: FOCUS ONLY ON ACTIVE FLASHES!</span>
          <Eye size={16} />
        </div>
      ) : null}

      {/* Combo Milestone Overlay Callout */}
      {comboMilestoneText && (
        <div className="combo-milestone-pop font-mono animate-pop">
          {comboMilestoneText}
        </div>
      )}

      {/* Game State Indicator Bar */}
      <div className="mem-state-bar">
        {gameStatePhase === 'ANNOUNCING' ? (
          <div className="state-badge announcing-badge animate-pop">
            <Sparkles size={16} />
            <span>GET READY FOR CHALLENGE</span>
          </div>
        ) : gameStatePhase === 'PLAYING_SEQUENCE' || gameStatePhase === 'PLAYING_SNAPSHOT' || gameStatePhase === 'PLAYING_GLITCH' ? (
          <div className="state-badge memorize-badge animate-pulse">
            <Eye size={16} />
            <span>MEMORIZE</span>
          </div>
        ) : gameStatePhase === 'WAITING_SNAPSHOT_INPUT' ? (
          <div className="state-badge snapshot-badge animate-pop">
            <Camera size={16} />
            <span>SELECT ACTIVE POSITIONS ({snapshotSelections.length} SELECTED)</span>
          </div>
        ) : gameStatePhase === 'WAITING_GLITCH_INPUT' ? (
          <div className="state-badge glitch-badge animate-pop">
            <AlertTriangle size={16} />
            <span>WHAT CHANGED?</span>
          </div>
        ) : (
          <div className="state-badge repeat-badge animate-pop">
            <Zap size={16} />
            <span>REPEAT ({userInputs.length} / {roundData.sequenceLength})</span>
          </div>
        )}
      </div>

      {/* User Input Progress Indicator for Sequence Modes */}
      {(gameStatePhase === 'WAITING_FOR_INPUT' || gameStatePhase === 'PLAYING_SEQUENCE') && (
        <div className="user-sequence-tracker font-mono">
          <span className="tracker-label">YOUR SEQUENCE:</span>
          <div className="tracker-chips">
            {Array.from({ length: roundData.sequenceLength }).map((_, idx) => {
              const enteredTileId = userInputs[idx];
              const hasEntered = enteredTileId !== undefined;
              const tileInfo = hasEntered ? roundData.tiles[enteredTileId] : null;

              return (
                <div key={idx} className={`tracker-chip ${hasEntered ? 'filled' : 'empty'}`}>
                  {hasEntered && tileInfo ? (
                    tileInfo.emoji ? tileInfo.emoji : tileInfo.symbol ? tileInfo.symbol : `●`
                  ) : (
                    '_'
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Playfield Area */}
      <div className="mem-playfield">
        {/* GLITCH MODE CHOICES VIEW */}
        {gameStatePhase === 'WAITING_GLITCH_INPUT' ? (
          <div className="glitch-choices-container animate-scale-in">
            <h2 className="glitch-prompt-title">WHAT CHANGED?</h2>
            <div className="glitch-options-grid">
              {roundData.glitchOptions.map((optionText, idx) => {
                const isSelected = selectedGlitchOption === idx;
                const isCorrect = idx === roundData.glitchCorrectIndex;
                let statusClass = '';
                if (feedback) {
                  if (isSelected) statusClass = isCorrect ? 'correct-choice' : 'wrong-choice';
                  else if (isCorrect) statusClass = 'reveal-correct-choice';
                }

                return (
                  <button
                    key={idx}
                    className={`glitch-option-card glass-panel ${statusClass}`}
                    onClick={() => handleGlitchOptionClick(idx)}
                    disabled={feedback !== null}
                  >
                    <span className="glitch-option-letter font-mono">{String.fromCharCode(65 + idx)}</span>
                    <span className="glitch-option-text">{optionText}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* STANDARD / SNAPSHOT / GLITCH BOARD VIEW */
          <>
            <div
              className={`mem-board-grid grid-${roundData.gridSize}x${roundData.gridSize} ${
                glitchStage === 'FLASH' ? 'glitch-flash-active' : ''
              }`}
            >
              {(roundData.challengeType === 'GLITCH'
                ? glitchStage === 'INITIAL'
                  ? roundData.glitchInitialTiles
                  : roundData.glitchModifiedTiles
                : roundData.tiles
              ).map((tile, idx) => {
                // Determine Tile Highlight Status
                let isHighlighted = activeHighlightIndex === idx;
                let isSnapshotSelected = snapshotSelections.includes(idx);

                if (gameStatePhase === 'PLAYING_SNAPSHOT') {
                  isHighlighted = roundData.snapshotActivePositions.includes(idx);
                }

                const isPhaseColor = roundData.phase === 1;
                const isPhasePosition = roundData.phase === 2;
                const isPhaseSymbol = roundData.phase === 3;

                return (
                  <button
                    key={tile.id || idx}
                    ref={(el) => (tileRefs.current[idx] = el)}
                    className={`mem-tile glass-panel ${isHighlighted ? 'tile-active' : ''} ${
                      isSnapshotSelected ? 'snapshot-selected' : ''
                    } ${tile.hidden ? 'tile-hidden' : ''}`}
                    style={{
                      '--tile-color': tile.color || '#00f2fe',
                      borderColor: isHighlighted || isSnapshotSelected ? tile.color : undefined,
                    }}
                    onClick={() => {
                      if (gameStatePhase === 'WAITING_SNAPSHOT_INPUT') {
                        handleSnapshotTileToggle(idx);
                      } else {
                        handleTileClick(idx);
                      }
                    }}
                    disabled={
                      gameStatePhase !== 'WAITING_FOR_INPUT' && gameStatePhase !== 'WAITING_SNAPSHOT_INPUT'
                    }
                  >
                    <div className="tile-content">
                      {isPhaseColor ? (
                        <span className="tile-emoji">{tile.emoji}</span>
                      ) : isPhaseSymbol || roundData.phase === 4 ? (
                        <span className="tile-symbol font-mono" style={{ color: tile.color }}>
                          {tile.symbol}
                        </span>
                      ) : (
                        <div className="tile-dot" style={{ backgroundColor: tile.color }} />
                      )}
                      {isSnapshotSelected && <span className="snapshot-check-badge">✓</span>}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* SNAPSHOT SUBMIT BUTTON */}
            {gameStatePhase === 'WAITING_SNAPSHOT_INPUT' && (
              <button
                className="btn-primary snapshot-submit-btn animate-pop"
                onClick={handleSnapshotSubmit}
                disabled={feedback !== null}
              >
                <Send size={18} fill="currentColor" />
                <span>SUBMIT SNAPSHOT</span>
              </button>
            )}
          </>
        )}

        {/* Feedback Flash Badge */}
        {feedback && (
          <div className={`mem-feedback-badge ${feedback.type} animate-pop`}>
            {feedback.type === 'correct' && <CheckCircle2 size={18} />}
            {feedback.type === 'wrong' && <XCircle size={18} />}
            <span>{feedback.text}</span>
          </div>
        )}
      </div>

      {/* Floating Hit Scores */}
      {floatingTexts.map((item) => (
        <div
          key={item.id}
          className="mem-float-text font-mono"
          style={{ left: `${item.x}%`, top: `${item.y}%` }}
        >
          {item.text}
        </div>
      ))}

      {/* Particle Burst */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="mem-particle"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            '--vx': `${p.vx}px`,
            '--vy': `${p.vy}px`,
          }}
        />
      ))}
    </div>
  );
}
