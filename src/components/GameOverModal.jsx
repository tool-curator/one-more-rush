import React, { useEffect, useRef } from 'react';
import { RotateCcw, Home, Flame, Trophy, CheckCircle, Zap, Clock, AlertTriangle, Shield, Target, Globe } from 'lucide-react';
import { VictoryEffectOverlay } from './VictoryEffectOverlay';
import './GameOverModal.css';

export function GameOverModal({
  title = 'GAME OVER',
  score,
  bestScore,
  isNewHighScore,
  extraMetrics = null,
  submissionStatus = null,
  isGuest = false,
  onPlayAgain,
  onHome,
  onNavigateToAuth,
  onNavigateToLeaderboard,
  onNavigateToDaily,
  audioFx,
}) {
  const hasPlayedAudioRef = useRef(false);
  const actionTriggeredRef = useRef(false);
  const modalRef = useRef(null);
  const playAgainBtnRef = useRef(null);
  const prevFocusedRef = useRef(null);

  const handleSafeAction = (actionFn) => {
    if (actionTriggeredRef.current) return;
    actionTriggeredRef.current = true;
    actionFn?.();
  };

  useEffect(() => {
    if (hasPlayedAudioRef.current) return;
    hasPlayedAudioRef.current = true;

    if (isNewHighScore) {
      audioFx?.playHighScore?.();
    } else {
      audioFx?.playMiss?.();
    }
  }, [isNewHighScore, audioFx]);

  // Focus trap and Escape key management
  useEffect(() => {
    prevFocusedRef.current = document.activeElement;
    playAgainBtnRef.current?.focus();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (onHome) handleSafeAction(onHome);
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusables = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      prevFocusedRef.current?.focus?.();
    };
  }, [onHome]);

  // Points from best calculation
  const pointsFromBest = bestScore && score ? Math.max(0, bestScore - score) : 0;
  const heightGap = extraMetrics && extraMetrics.height !== undefined && extraMetrics.bestHeight !== undefined
    ? Math.max(0, extraMetrics.bestHeight - extraMetrics.height)
    : 0;

  const isGuestPlayer = Boolean(isGuest || submissionStatus === 'GUEST');

  return (
    <div className="gameover-overlay" role="dialog" aria-modal="true" aria-labelledby="gameover-title-id">
      {/* Equipped Cosmetic Victory Effect */}
      <VictoryEffectOverlay triggerKey={score} />

      <div ref={modalRef} className="gameover-card glass-panel animate-pop">
        {isNewHighScore ? (
          <div className="high-score-badge">
            <Flame className="badge-icon" size={20} />
            <span>NEW HIGH SCORE</span>
          </div>
        ) : extraMetrics && extraMetrics.isNewHeightRecord ? (
          <div className="high-score-badge">
            <Trophy className="badge-icon" size={20} />
            <span>NEW HEIGHT RECORD</span>
          </div>
        ) : null}

        <h2 id="gameover-title-id" className="gameover-title">{title}</h2>

        <div className="score-summary">
          <div className="score-box highlight">
            <span className="score-label">FINAL SCORE</span>
            <span className="score-value">{score ? score.toLocaleString() : '0'}</span>
          </div>
          <div className="score-box">
            <span className="score-label">BEST SCORE</span>
            <span className="score-value font-mono">
              <Trophy size={18} style={{ display: 'inline', marginRight: 6, color: '#ffb703' }} />
              {bestScore ? bestScore.toLocaleString() : '0'}
            </span>
          </div>
        </div>

        {/* Global Leaderboard Competitive Submission Badge / Guest Conversion CTA */}
        {submissionStatus === 'NEW_BEST' ? (
          <div className="global-submission-pill pill-gold font-mono animate-pop">
            <Globe size={13} />
            <span>NEW GLOBAL BEST • LEADERBOARD UPDATED</span>
          </div>
        ) : submissionStatus === 'SUBMITTED' ? (
          <div className="global-submission-pill pill-cyan font-mono animate-pop">
            <Globe size={13} />
            <span>GLOBAL SCORE SUBMITTED</span>
          </div>
        ) : submissionStatus === 'NOT_PERSONAL_BEST' ? (
          <div className="global-submission-pill pill-local font-mono animate-pop">
            <Globe size={13} />
            <span>LOCAL SCORE • BEAT YOUR BEST TO UPDATE THE LEADERBOARD</span>
          </div>
        ) : isGuestPlayer ? (
          <button
            type="button"
            className="global-submission-pill pill-guest font-mono btn-guest-submission"
            onClick={() => handleSafeAction(onNavigateToAuth)}
            aria-label="Sign in to save your score and compete on global leaderboards"
            title="Sign in to compete globally"
          >
            <Globe size={13} className="globe-icon" />
            <span>LOCAL SCORE • SIGN IN TO COMPETE GLOBALLY →</span>
          </button>
        ) : submissionStatus === 'ERROR' ? (
          <div className="global-submission-pill pill-muted font-mono">
            <Globe size={13} />
            <span>SAVED LOCALLY • CLOUD SYNC UNAVAILABLE</span>
          </div>
        ) : null}

        {/* Proximity to personal best callout */}
        {!isNewHighScore && !extraMetrics?.isNewHeightRecord && heightGap > 0 && heightGap <= 8 ? (
          <div className="proximity-best-tag font-mono">
            <span>🔥 {heightGap} {heightGap === 1 ? 'BLOCK' : 'BLOCKS'} FROM YOUR BEST</span>
          </div>
        ) : !isNewHighScore && pointsFromBest > 0 && pointsFromBest <= bestScore * 0.4 ? (
          <div className="proximity-best-tag font-mono">
            <span>🔥 {pointsFromBest.toLocaleString()} POINTS FROM YOUR BEST</span>
          </div>
        ) : null}

        {extraMetrics && extraMetrics.round !== undefined && (
          <div className="proximity-best-tag font-mono">
            <span>🎯 YOU REACHED ROUND {extraMetrics.round}</span>
          </div>
        )}

        {extraMetrics && (
          <div className="extra-metrics-grid">
            {extraMetrics.round !== undefined && (
              <div className="extra-metric-pill">
                <Target size={14} className="metric-icon cyan" />
                <span>ROUND: <strong>{extraMetrics.round}</strong></span>
              </div>
            )}
            {extraMetrics.length !== undefined && (
              <div className="extra-metric-pill">
                <Trophy size={14} className="metric-icon cyan" />
                <span>LENGTH: <strong>{extraMetrics.length}</strong></span>
              </div>
            )}
            {extraMetrics.foodCount !== undefined && (
              <div className="extra-metric-pill">
                <CheckCircle size={14} className="metric-icon cyan" />
                <span>FOOD: <strong>{extraMetrics.foodCount}</strong></span>
              </div>
            )}
            {extraMetrics.maxCombo !== undefined && (
              <div className="extra-metric-pill">
                <Flame size={14} className="metric-icon pink" />
                <span>MAX COMBO: <strong>x{extraMetrics.maxCombo}</strong></span>
              </div>
            )}
            {extraMetrics.longestSequence !== undefined && (
              <div className="extra-metric-pill">
                <Trophy size={14} className="metric-icon cyan" />
                <span>LONGEST SEQUENCE: <strong>{extraMetrics.longestSequence}</strong></span>
              </div>
            )}
            {extraMetrics.correctCount !== undefined && (
              <div className="extra-metric-pill">
                <CheckCircle size={14} className="metric-icon cyan" />
                <span>CORRECT: <strong>{extraMetrics.correctCount}</strong></span>
              </div>
            )}
            {extraMetrics.accuracy !== undefined && (
              <div className="extra-metric-pill">
                <Zap size={14} className="metric-icon yellow" />
                <span>ACCURACY: <strong>{extraMetrics.accuracy}%</strong></span>
              </div>
            )}
            {extraMetrics.survivalTime !== undefined && (
              <div className="extra-metric-pill">
                <Clock size={14} className="metric-icon cyan" />
                <span>SURVIVED: <strong>{extraMetrics.survivalTime}s</strong></span>
              </div>
            )}
            {extraMetrics.reactionTime !== undefined && (
              <div className="extra-metric-pill">
                <Zap size={14} className="metric-icon yellow" />
                <span>AVG REACTION: <strong>{extraMetrics.reactionTime}ms</strong></span>
              </div>
            )}
            {extraMetrics.dangerLevel !== undefined && (
              <div className="extra-metric-pill">
                <AlertTriangle size={14} className="metric-icon red" />
                <span>DANGER: <strong>LEVEL {extraMetrics.dangerLevel}</strong></span>
              </div>
            )}
            {extraMetrics.height !== undefined && (
              <div className="extra-metric-pill">
                <Trophy size={14} className="metric-icon cyan" />
                <span>HEIGHT: <strong>{extraMetrics.height}</strong></span>
              </div>
            )}
            {extraMetrics.bestCombo !== undefined && (
              <div className="extra-metric-pill">
                <Zap size={14} className="metric-icon yellow" />
                <span>MAX COMBO: <strong>x{extraMetrics.bestCombo}</strong></span>
              </div>
            )}
            {extraMetrics.perfects !== undefined && (
              <div className="extra-metric-pill">
                <Flame size={14} className="metric-icon pink" />
                <span>PERFECTS: <strong>{extraMetrics.perfects}</strong></span>
              </div>
            )}
            {extraMetrics.nearMisses !== undefined && (
              <div className="extra-metric-pill">
                <Target size={14} className="metric-icon cyan" />
                <span>NEAR MISSES: <strong>{extraMetrics.nearMisses}</strong></span>
              </div>
            )}
            {extraMetrics.powerupsUsed !== undefined && (
              <div className="extra-metric-pill">
                <Shield size={14} className="metric-icon violet" />
                <span>POWERUPS: <strong>{extraMetrics.powerupsUsed}</strong></span>
              </div>
            )}
            {extraMetrics.completedCount !== undefined && (
              <div className="extra-metric-pill">
                <CheckCircle size={14} className="metric-icon cyan" />
                <span>Completed: <strong>{extraMetrics.completedCount}</strong></span>
              </div>
            )}
          </div>
        )}

        {/* Action Hierarchy: Primary (Play Again) -> Aux (Leaderboard, Daily) -> Secondary (Home) */}
        <div className="gameover-actions">
          <button
            ref={playAgainBtnRef}
            type="button"
            className="btn-primary"
            onClick={() => handleSafeAction(onPlayAgain)}
            aria-label="Play Game Again"
          >
            <RotateCcw size={20} />
            <span>PLAY AGAIN</span>
          </button>

          <div className="gameover-aux-grid">
            {onNavigateToLeaderboard && (
              <button
                type="button"
                className="btn-secondary btn-aux-action"
                onClick={() => handleSafeAction(onNavigateToLeaderboard)}
                aria-label="View Global Leaderboard"
              >
                <Trophy size={16} className="aux-icon trophy-gold" />
                <span>LEADERBOARD</span>
              </button>
            )}

            {onNavigateToDaily && (
              <button
                type="button"
                className="btn-secondary btn-aux-action"
                onClick={() => handleSafeAction(onNavigateToDaily)}
                aria-label="View Daily Challenges"
              >
                <Flame size={16} className="aux-icon icon-pink" />
                <span>DAILY</span>
              </button>
            )}
          </div>

          <button
            type="button"
            className="btn-secondary btn-home-action"
            onClick={() => handleSafeAction(onHome)}
            aria-label="Return to Main Menu Home"
          >
            <Home size={16} />
            <span>HOME</span>
          </button>
        </div>
      </div>
    </div>
  );
}
