import React, { useEffect, useRef } from 'react';
import { Flame, Trophy, RotateCcw, Home, Gem, CheckCircle2, XCircle, Sparkles, ArrowRight } from 'lucide-react';
import { VictoryEffectOverlay } from './VictoryEffectOverlay';
import { getNextMilestoneInfo } from '../services/dailyChallengeService';
import './DailyChallengeResultModal.css';

export function DailyChallengeResultModal({
  challenge,
  result,
  score,
  canContinueToExtreme = false,
  onContinueToExtreme,
  onPlayAgain,
  onGoHome,
}) {
  const modalRef = useRef(null);
  const primaryBtnRef = useRef(null);
  const prevFocusedRef = useRef(null);
  const actionTriggeredRef = useRef(false);

  const handleSafeAction = (actionFn) => {
    if (actionTriggeredRef.current) return;
    actionTriggeredRef.current = true;
    actionFn?.();
  };

  const isSuccess = Boolean(result?.isCompleted);
  const isQuickWin = challenge?.tier === 'QUICK_WIN';
  const showExtremeChain = Boolean(
    isSuccess &&
    isQuickWin &&
    canContinueToExtreme &&
    typeof onContinueToExtreme === 'function'
  );

  useEffect(() => {
    prevFocusedRef.current = document.activeElement;
    primaryBtnRef.current?.focus();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (onGoHome) handleSafeAction(onGoHome);
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
  }, [onGoHome]);

  if (!challenge || !result) return null;

  return (
    <div
      className="daily-result-overlay animate-fade"
      role="dialog"
      aria-modal="true"
      aria-labelledby="daily-result-title-id"
    >
      {/* Equipped Cosmetic Victory Effect on Challenge Success */}
      {isSuccess && <VictoryEffectOverlay triggerKey={result?.rewardEarned || 1} />}

      <div
        ref={modalRef}
        className={`daily-result-card glass-panel ${
          isSuccess
            ? isQuickWin ? 'result-quick-glow' : 'result-extreme-glow'
            : 'result-fail-glow'
        } animate-scale`}
      >
        {/* Top Result Banner */}
        <div className="result-header">
          {isSuccess ? (
            <div className={`result-badge font-mono ${isQuickWin ? 'badge-quick-success' : 'badge-extreme-success'}`}>
              <Sparkles size={14} className="sparkle-spin" />
              <span>{isQuickWin ? '🟢 QUICK WIN COMPLETE!' : '🔴 EXTREME RUSH COMPLETE!'}</span>
            </div>
          ) : (
            <div className="result-badge badge-fail font-mono">
              <XCircle size={14} />
              <span>{isQuickWin ? 'QUICK WIN FAILED' : 'EXTREME RUSH FAILED'}</span>
            </div>
          )}

          <h2 id="daily-result-title-id" className="result-challenge-title font-heading">
            {challenge.title}
          </h2>
          <span className="result-game-sub font-mono">
            {challenge.gameIcon} {challenge.gameName} • {challenge.difficulty}
          </span>
        </div>

        {/* Objectives Breakdown List */}
        <div className="result-objectives-box">
          <span className="breakdown-label font-mono">OBJECTIVES BREAKDOWN:</span>
          <div className="breakdown-list">
            {result.objectivesStatus?.map((obj) => (
              <div key={obj.id} className="breakdown-row font-mono">
                <div className="breakdown-left">
                  {obj.met ? (
                    <CheckCircle2 size={16} className="icon-success" />
                  ) : (
                    <XCircle size={16} className="icon-failure" />
                  )}
                  <span className={`breakdown-text ${obj.met ? 'obj-met' : 'obj-unmet'}`}>
                    {obj.label}
                  </span>
                </div>

                <span className="breakdown-val">
                  {obj.current !== undefined ? (
                    typeof obj.current === 'number' && !Number.isInteger(obj.current)
                      ? obj.current.toFixed(1)
                      : obj.current
                  ) : '—'}
                  {obj.unit ? ` ${obj.unit}` : ''}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Reward & Streak Details */}
        <div className="result-rewards-section">
          {isSuccess ? (
            <>
              {result.isFirstCompletionToday ? (
                <div className={`reward-receipt-card font-mono animate-pop ${isQuickWin ? 'receipt-quick' : 'receipt-extreme'}`}>
                  <div className="receipt-title-row">
                    <Sparkles size={14} />
                    <span>DAILY REWARD RECEIPT</span>
                  </div>
                  <div className="receipt-items-list">
                    <div className="receipt-row">
                      <span className="receipt-label">TIER REWARD ({challenge.tier === 'QUICK_WIN' ? 'QUICK WIN' : 'EXTREME'})</span>
                      <span className="receipt-val">+{result.rewardEarned || 0} RP</span>
                    </div>
                    {result.streakBonus > 0 && (
                      <div className="receipt-row receipt-bonus-row">
                        <span className="receipt-label">🔥 STREAK MILESTONE BONUS</span>
                        <span className="receipt-val bonus-val">+{result.streakBonus} RP</span>
                      </div>
                    )}
                    <div className="receipt-divider" />
                    <div className="receipt-row receipt-total-row">
                      <span className="receipt-total-label">TOTAL EARNED</span>
                      <span className="receipt-total-val">
                        +{(result.rewardEarned || 0) + (result.streakBonus || 0)} RP
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="reward-claimed-box font-mono">
                  <span>✓ REWARD ALREADY CLAIMED TODAY</span>
                </div>
              )}

              <div className="result-stats-bar font-mono">
                <div className="stat-pill-item streak-stat-pill">
                  <Flame size={15} className="icon-flame" />
                  <span>STREAK: <strong>{Math.max(1, Number(result.currentStreak ?? result.streak ?? 1))} {(result.currentStreak ?? result.streak) === 1 ? 'DAY' : 'DAYS'}</strong></span>
                </div>
                <div className="stat-pill-item">
                  <Trophy size={14} className="trophy-gold" />
                  <span>TIER BEST: <strong>{result.bestScore?.toLocaleString() || score?.toLocaleString()}</strong></span>
                </div>
              </div>

              {/* Next Milestone & Return Tomorrow Card */}
              {(() => {
                const currentStreak = Math.max(1, Number(result.currentStreak ?? result.streak ?? 1));
                const nextTargetDay = currentStreak + 1;
                const milestone = getNextMilestoneInfo(currentStreak);
                return (
                  <div className="result-retention-card font-mono glass-panel">
                    <div className="retention-target-header">
                      <Flame size={14} className="icon-flame" />
                      <span className="retention-target-title">TOMORROW'S TARGET: <strong>DAY {nextTargetDay} STREAK</strong></span>
                    </div>
                    <div className="retention-milestone-sub">
                      {!milestone.isMaxTier ? (
                        <span>
                          {milestone.daysRemaining} {milestone.daysRemaining === 1 ? 'day' : 'days'} to <strong>+{milestone.bonusPoints} RP</strong> Milestone Bonus ({milestone.label})
                        </span>
                      ) : (
                        <span>All streak milestones complete! Return tomorrow to keep your record alive.</span>
                      )}
                    </div>
                    <div className="retention-callout-cue">
                      <span>⚡ Come back tomorrow after 00:00 UTC to continue your streak!</span>
                    </div>
                  </div>
                );
              })()}
            </>
          ) : (
            <div className="fail-encouragement-box font-mono">
              <p className="fail-encouragement-text">
                Don't give up! Retrying has no penalty — push your skills and claim today's reward!
              </p>
              <div className="stat-pill-item">
                <Trophy size={14} className="trophy-gold" />
                <span>THIS RUN SCORE: <strong>{score?.toLocaleString() || 0}</strong></span>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="result-actions-row">
          <button
            type="button"
            className="btn-secondary result-btn"
            onClick={() => handleSafeAction(onGoHome)}
            aria-label="Back to Home"
          >
            <Home size={16} />
            <span>HOME</span>
          </button>

          <button
            ref={!showExtremeChain ? primaryBtnRef : undefined}
            type="button"
            className={`result-btn ${isSuccess && !showExtremeChain ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => handleSafeAction(onPlayAgain)}
            aria-label={isSuccess ? "Play Challenge Again" : "Retry Challenge"}
          >
            <RotateCcw size={16} />
            <span>{isSuccess ? 'PLAY AGAIN' : 'RETRY'}</span>
          </button>

          {showExtremeChain && (
            <button
              ref={primaryBtnRef}
              type="button"
              className="btn-primary result-btn btn-extreme-chain font-mono"
              onClick={() => handleSafeAction(onContinueToExtreme)}
              aria-label="Continue to Extreme Rush Challenge"
            >
              <Flame size={16} className="icon-ruby" />
              <span>GO EXTREME!</span>
              <ArrowRight size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
