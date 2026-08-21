import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Trophy, Zap, Clock, Heart, Flame, ShieldAlert, CheckCircle2, XCircle } from 'lucide-react';
import { generateQuestion } from './game/questionGenerator';
import './NumberRushGame.css';

export function NumberRushGame({ bestScore, onGameOver, audioFx }) {
  // Game States
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(bestScore);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [health, setHealth] = useState(3);
  const [round, setRound] = useState(1);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);

  // Active Question State
  const [question, setQuestion] = useState(null);
  const [selectedChoiceIndex, setSelectedChoiceIndex] = useState(null);
  const [feedback, setFeedback] = useState(null); // { type: 'correct'|'wrong'|'timeout', text: string, scoreGained?: number }
  const [comboMilestoneText, setComboMilestoneText] = useState(null);

  // Visual Effects
  const [floatingTexts, setFloatingTexts] = useState([]);
  const [particles, setParticles] = useState([]);

  // Refs for stable 60fps direct-DOM timing (zero React re-render overhead for timer bar)
  const animFrameRef = useRef(null);
  const gameActiveRef = useRef(true);
  const gameOverHandledRef = useRef(false);
  const isTransitioningRef = useRef(false);
  const questionStartRef = useRef(0);
  const questionDurationRef = useRef(3000);
  const timeLeftRef = useRef(1.0);
  const activeTimeoutsRef = useRef(new Set());
  
  const gameContainerRef = useRef(null);
  const buttonRefs = useRef([]);
  const timerBarRef = useRef(null);
  const timerTextRef = useRef(null);

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

  // Calculate question duration based on phase, round, and active mode
  // Gives extra humanly-possible calculation time for arithmetic, rules, and patterns
  const getQuestionDuration = useCallback((r, isRush, isOver, qPhase) => {
    let baseTimeMs = 3200; // Find Number default

    if (qPhase === 2) {
      baseTimeMs = 4500; // Extra calculation time for arithmetic!
    } else if (qPhase === 3) {
      baseTimeMs = 4200; // Extra time for rule-checking!
    } else if (qPhase === 4) {
      baseTimeMs = 4800; // Extra time to spot sequence patterns!
    } else if (qPhase === 5) {
      baseTimeMs = 4600; // Extra time for comparison/advanced mixed!
    }

    // Gradual round speed discount (-45ms per round), capped at -1200ms
    const speedDiscountMs = Math.min(1200, Math.max(0, (r - 1) * 45));
    let duration = baseTimeMs - speedDiscountMs;

    if (isOver) duration = Math.floor(duration * 0.88);
    else if (isRush) duration = Math.floor(duration * 0.92);

    // Guarantee humanly possible decision time (minimum 2.2s)
    return Math.max(2200, duration);
  }, []);

  // Determine Active Special Modes
  const isRushMode = (round >= 10 && round <= 14) || (round >= 20 && round <= 24);
  const isOverdrive = round >= 25;

  // Initialize Game Session
  useEffect(() => {
    gameActiveRef.current = true;
    gameOverHandledRef.current = false;
    isTransitioningRef.current = false;
    clearAllTimeouts();

    const initialQuestion = generateQuestion(1);
    setQuestion(initialQuestion);

    const duration = getQuestionDuration(1, false, false, initialQuestion.phase);
    questionDurationRef.current = duration;
    questionStartRef.current = performance.now();
    timeLeftRef.current = 1.0;

    return () => {
      gameActiveRef.current = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      clearAllTimeouts();
    };
  }, [getQuestionDuration, clearAllTimeouts]);

  // Handle Game Over execution (guaranteed strictly single execution)
  const triggerGameOver = useCallback((finalScore, finalRound, finalMaxCombo, finalCorrect, finalTotal) => {
    if (gameOverHandledRef.current || !gameActiveRef.current) return;
    gameOverHandledRef.current = true;
    gameActiveRef.current = false;

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    clearAllTimeouts();

    const isNewBest = finalScore > bestScore;
    const accuracy = finalTotal > 0 ? Math.round((finalCorrect / finalTotal) * 100) : 0;

    onGameOver(finalScore, isNewBest, {
      round: finalRound,
      maxCombo: finalMaxCombo,
      correctCount: finalCorrect,
      accuracy,
      totalAttempts: finalTotal,
    });
  }, [bestScore, onGameOver, clearAllTimeouts]);

  // Handle Question Timeout
  const handleTimeout = useCallback(() => {
    if (isTransitioningRef.current || !gameActiveRef.current || gameOverHandledRef.current) return;
    isTransitioningRef.current = true;

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    const newHealth = health - 1;
    const newTotalAttempts = totalAttempts + 1;

    // Suppress duplicate lethal miss sound if modal owns game-over sound
    if (newHealth > 0) {
      audioFx.playMiss();
    }

    setHealth(newHealth);
    setCombo(0);
    setTotalAttempts(newTotalAttempts);

    setFeedback({
      type: 'timeout',
      text: 'TIME!',
    });

    safeSetTimeout(() => {
      if (newHealth <= 0) {
        triggerGameOver(score, round, maxCombo, correctCount, newTotalAttempts);
      } else {
        advanceQuestion(round + 1, newHealth, score, 0, maxCombo, correctCount, newTotalAttempts);
      }
    }, 220);
  }, [health, totalAttempts, audioFx, safeSetTimeout, triggerGameOver, score, round, maxCombo, correctCount]);

  // 60FPS Direct-DOM Animation Loop for Question Timer Bar (Zero React Re-render Lag)
  useEffect(() => {
    if (!question || !gameActiveRef.current || isTransitioningRef.current || gameOverHandledRef.current) return;

    const updateTimer = () => {
      if (!gameActiveRef.current || isTransitioningRef.current || gameOverHandledRef.current) return;

      const elapsed = Math.max(0, performance.now() - questionStartRef.current);
      const remainingProgress = Math.max(0, Math.min(1, 1 - elapsed / questionDurationRef.current));
      timeLeftRef.current = remainingProgress;

      // Update Timer Bar via Direct DOM Ref transform (100% smooth 60fps/120fps)
      if (timerBarRef.current) {
        timerBarRef.current.style.transform = `scaleX(${remainingProgress})`;

        if (remainingProgress < 0.25) {
          timerBarRef.current.className = 'nr-timer-bar-fill bar-critical';
        } else if (remainingProgress < 0.5) {
          timerBarRef.current.className = 'nr-timer-bar-fill bar-warning';
        } else {
          timerBarRef.current.className = 'nr-timer-bar-fill';
        }
      }

      if (timerTextRef.current) {
        timerTextRef.current.textContent = `${((remainingProgress * questionDurationRef.current) / 1000).toFixed(1)}s`;
      }

      if (remainingProgress <= 0) {
        handleTimeout();
        return;
      }

      animFrameRef.current = requestAnimationFrame(updateTimer);
    };

    animFrameRef.current = requestAnimationFrame(updateTimer);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [question, round, handleTimeout]);

  // Advance to next question
  const advanceQuestion = (nextRound, currentHealth, currentScore, currentCombo, currentMaxCombo, currentCorrect, currentTotal) => {
    if (!gameActiveRef.current || gameOverHandledRef.current) return;

    const nextIsRush = (nextRound >= 10 && nextRound <= 14) || (nextRound >= 20 && nextRound <= 24);
    const nextIsOver = nextRound >= 25;

    // Trigger Rush/Overdrive audio cues on activation
    if (nextIsRush && round < 10) audioFx.playFlowMode();
    if (nextIsOver && round < 25) audioFx.playFlowMode();

    const nextQ = generateQuestion(nextRound);
    const duration = getQuestionDuration(nextRound, nextIsRush, nextIsOver, nextQ.phase);

    setRound(nextRound);
    setQuestion(nextQ);
    setSelectedChoiceIndex(null);
    setFeedback(null);

    questionDurationRef.current = duration;
    questionStartRef.current = performance.now();
    timeLeftRef.current = 1.0;

    // Reset direct DOM timer bar styles immediately
    if (timerBarRef.current) {
      timerBarRef.current.style.transform = 'scaleX(1)';
      timerBarRef.current.className = 'nr-timer-bar-fill';
    }
    if (timerTextRef.current) {
      timerTextRef.current.textContent = `${(duration / 1000).toFixed(1)}s`;
    }

    isTransitioningRef.current = false;
  };

  // Spawn visual hit particles & floating text
  const spawnHitEffects = (choiceIndex, scoreGained, currentCombo) => {
    const btnEl = buttonRefs.current[choiceIndex];
    const containerRect = gameContainerRef.current?.getBoundingClientRect();

    let relX = 50;
    let relY = 70;

    if (btnEl && containerRect) {
      const btnRect = btnEl.getBoundingClientRect();
      relX = ((btnRect.left + btnRect.width / 2 - containerRect.left) / containerRect.width) * 100;
      relY = ((btnRect.top + btnRect.height / 2 - containerRect.top) / containerRect.height) * 100;
    }

    // Floating text item (capped at 6 items)
    const newFloatText = {
      id: performance.now() + Math.random(),
      text: `+${scoreGained}${currentCombo > 1 ? ` 🔥${currentCombo}x` : ''}`,
      x: relX,
      y: relY,
    };
    setFloatingTexts((prev) => [...prev.slice(-5), newFloatText]);

    // Spawn 8 lightweight particles (capped at 16 items)
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
    setParticles((prev) => [...prev.slice(-8), ...newBurst]);
  };

  // Handle Answer Selection (Click / Tap / Keyboard)
  const handleSelectChoice = useCallback((choiceIndex) => {
    if (isTransitioningRef.current || !gameActiveRef.current || gameOverHandledRef.current || !question) return;
    isTransitioningRef.current = true;

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    setSelectedChoiceIndex(choiceIndex);
    const isCorrect = choiceIndex === question.correctIndex;
    const newTotalAttempts = totalAttempts + 1;

    if (isCorrect) {
      // Calculate Score using stable ref progress
      const speedBonus = Math.floor(timeLeftRef.current * 150);
      const diffBonus = round * 10;
      const newCombo = combo + 1;
      const newMaxCombo = Math.max(maxCombo, newCombo);
      const newCorrectCount = correctCount + 1;

      const comboMultiplier = 1 + Math.min(newCombo, 20) * 0.1; // up to 3x multiplier
      const modeMultiplier = isOverdrive ? 2.0 : isRushMode ? 1.5 : 1.0;

      const baseEarned = 100 + speedBonus + diffBonus;
      const gainedScore = Math.floor(baseEarned * comboMultiplier * modeMultiplier);
      const newScore = score + gainedScore;

      setScore(newScore);
      if (newScore > highScore) setHighScore(newScore);
      setCombo(newCombo);
      setMaxCombo(newMaxCombo);
      setCorrectCount(newCorrectCount);
      setTotalAttempts(newTotalAttempts);

      // Play Sound
      audioFx.playHit(newCombo);

      // Combo Milestone Cues (e.g. 5x, 10x, 15x, 20x)
      if (newCombo % 5 === 0) {
        audioFx.playSpecialEvent();
        setComboMilestoneText(`🔥 ${newCombo}x COMBO!`);
        safeSetTimeout(() => setComboMilestoneText(null), 1000);
      }

      setFeedback({
        type: 'correct',
        text: '✓ CORRECT',
        scoreGained: gainedScore,
      });

      spawnHitEffects(choiceIndex, gainedScore, newCombo);

      safeSetTimeout(() => {
        advanceQuestion(round + 1, health, newScore, newCombo, newMaxCombo, newCorrectCount, newTotalAttempts);
      }, 200);
    } else {
      // Wrong Answer
      const newHealth = health - 1;
      setHealth(newHealth);
      setCombo(0);
      setTotalAttempts(newTotalAttempts);

      // Suppress duplicate lethal miss sound if modal owns game-over sound
      if (newHealth > 0) {
        audioFx.playMiss();
      }

      setFeedback({
        type: 'wrong',
        text: '✕ WRONG',
      });

      safeSetTimeout(() => {
        if (newHealth <= 0) {
          triggerGameOver(score, round, maxCombo, correctCount, newTotalAttempts);
        } else {
          advanceQuestion(round + 1, newHealth, score, 0, maxCombo, correctCount, newTotalAttempts);
        }
      }, 220);
    }
  }, [question, totalAttempts, combo, maxCombo, correctCount, isOverdrive, isRushMode, round, score, highScore, audioFx, safeSetTimeout, health, triggerGameOver]);

  // Keyboard Shortcuts (1, 2, 3, 4)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.repeat || isTransitioningRef.current || !gameActiveRef.current) return;

      if (e.key === '1' || e.code === 'Numpad1') {
        handleSelectChoice(0);
      } else if (e.key === '2' || e.code === 'Numpad2') {
        handleSelectChoice(1);
      } else if (e.key === '3' || e.code === 'Numpad3') {
        handleSelectChoice(2);
      } else if (e.key === '4' || e.code === 'Numpad4') {
        handleSelectChoice(3);
      }
      // Note: Spacebar intentionally ignored per requirements
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [question, handleSelectChoice]);

  // Clean old floaters & particles
  useEffect(() => {
    if (floatingTexts.length === 0) return;
    const timer = setTimeout(() => {
      setFloatingTexts((prev) => (prev.length > 0 ? prev.slice(1) : []));
    }, 600);
    return () => clearTimeout(timer);
  }, [floatingTexts]);

  if (!question) return null;

  return (
    <div
      className={`number-rush-container ${isRushMode ? 'mode-rush' : ''} ${isOverdrive ? 'mode-overdrive' : ''}`}
      ref={gameContainerRef}
    >
      {/* Top HUD */}
      <div className="nr-hud glass-panel">
        <div className="nr-hud-metric">
          <span className="nr-hud-label">SCORE</span>
          <span className="nr-hud-value font-mono highlight-score">{score.toLocaleString()}</span>
        </div>

        <div className="nr-hud-metric">
          <span className="nr-hud-label">BEST</span>
          <span className="nr-hud-value font-mono">
            <Trophy size={14} style={{ color: '#ffb703', marginRight: 4 }} />
            {highScore.toLocaleString()}
          </span>
        </div>

        <div className="nr-hud-metric">
          <span className="nr-hud-label">ROUND</span>
          <span className="nr-hud-value font-mono">{round}</span>
        </div>

        <div className="nr-hud-metric combo-metric">
          <span className="nr-hud-label">COMBO</span>
          <span className="nr-hud-value font-mono highlight-combo">
            {combo > 0 ? `🔥${combo}x` : '0x'}
          </span>
        </div>

        <div className="nr-hud-metric hearts-metric">
          <span className="nr-hud-label">HEALTH</span>
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

      {/* Special Mode Banner */}
      {isOverdrive ? (
        <div className="mode-banner overdrive-banner animate-pulse">
          <Flame size={16} />
          <span>OVERDRIVE — 2.0X SCORE MULTIPLIER</span>
          <Flame size={16} />
        </div>
      ) : isRushMode ? (
        <div className="mode-banner rush-banner animate-pulse">
          <Zap size={16} />
          <span>⚡ RUSH MODE — 1.5X SCORE MULTIPLIER</span>
          <Zap size={16} />
        </div>
      ) : null}

      {/* Combo Milestone Overlay Callout */}
      {comboMilestoneText && (
        <div className="combo-milestone-pop font-mono animate-pop">
          {comboMilestoneText}
        </div>
      )}

      {/* Question Timer Lifespan Bar */}
      <div className="nr-timer-wrapper">
        <div className="nr-timer-header">
          <div className="nr-timer-label font-mono">
            <Clock size={13} className="nr-clock-icon" />
            <span>TIME REMAINING</span>
          </div>
          <span ref={timerTextRef} className="nr-timer-time font-mono">
            {(questionDurationRef.current / 1000).toFixed(1)}s
          </span>
        </div>
        <div className="nr-timer-bar-container">
          <div
            ref={timerBarRef}
            className="nr-timer-bar-fill"
          >
            <div className="nr-timer-shimmer" />
          </div>
        </div>
      </div>

      {/* Main Arcade Question Display */}
      <div className="nr-playfield">
        <div className="nr-question-card glass-panel animate-scale-in" key={`${round}-${question.title}`}>
          <span className="nr-question-category font-mono">{question.title}</span>
          <h1 className="nr-question-prompt">{question.prompt}</h1>

          {/* Feedback Flash Badge */}
          {feedback && (
            <div className={`nr-feedback-badge ${feedback.type} animate-pop`}>
              {feedback.type === 'correct' && <CheckCircle2 size={18} />}
              {feedback.type === 'wrong' && <XCircle size={18} />}
              {feedback.type === 'timeout' && <ShieldAlert size={18} />}
              <span>{feedback.text}</span>
            </div>
          )}
        </div>

        {/* 2x2 Answer Grid */}
        <div className="nr-answers-grid">
          {question.choices.map((choice, index) => {
            const isSelected = selectedChoiceIndex === index;
            const isCorrectAnswer = index === question.correctIndex;
            let statusClass = '';

            if (feedback) {
              if (isSelected) {
                statusClass = isCorrectAnswer ? 'correct-btn' : 'wrong-btn';
              } else if (isCorrectAnswer && feedback.type === 'wrong') {
                statusClass = 'reveal-correct';
              }
            }

            return (
              <button
                key={index}
                ref={(el) => (buttonRefs.current[index] = el)}
                className={`nr-answer-btn glass-panel ${statusClass}`}
                onClick={() => handleSelectChoice(index)}
                disabled={feedback !== null}
              >
                <span className="key-badge font-mono">{index + 1}</span>
                <span className="answer-text font-mono">{choice}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Floating Score Floaters */}
      {floatingTexts.map((item) => (
        <div
          key={item.id}
          className="nr-float-text font-mono"
          style={{ left: `${item.x}%`, top: `${item.y}%` }}
        >
          {item.text}
        </div>
      ))}

      {/* Particle Effects */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="nr-particle"
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
