import React, { useState, useEffect } from 'react';
import { Flame, Clock, Trophy, Play, CheckCircle2, Circle, Gem, ArrowRight, Zap, Sparkles, RefreshCw } from 'lucide-react';
import {
  getTodayChallenges,
  loadDailyProgress,
  getTodayDateString,
  syncDailyChallengeStatusCloud,
  getNextMilestoneInfo,
} from '../services/dailyChallengeService';
import { onScopeChange } from '../services/storageScopeService';
import { useAuth } from '../context/AuthContext';
import './DailyChallenge.css';

export function DailyChallenge({ onPlayDailyChallenge, onOpenDailyPage }) {
  const { user, isGuest } = useAuth();
  const [timeLeft, setTimeLeft] = useState('');
  const [{ quickWin, extreme }, setChallenges] = useState(() => getTodayChallenges());
  const [progress, setProgress] = useState(() => loadDailyProgress());

  const dateStr = getTodayDateString();
  const todayRecord = progress.dailyAttempts?.[dateStr] || {};
  const quickAttempt = todayRecord.quickWin || {};
  const extremeAttempt = todayRecord.extreme || {};

  const isQuickCompleted = Boolean(quickAttempt.completed);
  const isExtremeCompleted = Boolean(extremeAttempt.completed);

  // Refresh challenges & progress on mount, cloud status sync, and storage scope change
  useEffect(() => {
    const refreshDailyState = () => {
      setProgress(loadDailyProgress());
      setChallenges(getTodayChallenges());
    };

    refreshDailyState();
    if (user && !isGuest) {
      syncDailyChallengeStatusCloud({ user, isGuest });
    }

    const unsubscribe = onScopeChange(refreshDailyState);
    return unsubscribe;
  }, [user, isGuest]);

  // Live countdown to authoritative UTC midnight reset
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const nextUtcMidnight = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1,
        0, 0, 0, 0
      ));
      const diff = nextUtcMidnight.getTime() - now.getTime();

      if (diff <= 0) {
        setChallenges(getTodayChallenges());
        setProgress(loadDailyProgress());
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(
        `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`
      );
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="daily-section" id="daily-section">
      {/* Section Header */}
      <div className="daily-section-header">
        <div className="daily-badge font-mono">
          <Flame size={14} className="daily-flame" />
          <span>DAILY MISSIONS</span>
        </div>
        <h2 className="daily-section-title font-heading">DAILY CHALLENGES</h2>
        <p className="daily-section-subtitle">
          Two ways to earn Rush Points today. Complete either or both to push your skills and streak.
        </p>

        <div className="daily-meta-bar font-mono">
          {progress.streak > 0 ? (
            <div className="daily-streak-pill">
              <Flame size={14} className="streak-flame" />
              <span>{progress.streak} DAY STREAK</span>
            </div>
          ) : (
            <div className="daily-streak-pill streak-zero-pill">
              <Flame size={14} className="streak-flame-dim" />
              <span>0 DAY STREAK • PLAY TODAY TO START</span>
            </div>
          )}

          <div className="daily-timer">
            <Clock size={14} className="timer-icon" />
            <span>RESETS IN {timeLeft || '24:00:00'}</span>
          </div>
        </div>
      </div>

      {/* Streak Milestone Progress Tracker */}
      {(() => {
        const currentStreak = Math.max(0, parseInt(progress?.streak, 10) || 0);
        const milestone = getNextMilestoneInfo(currentStreak);
        const isAllComplete = milestone.isMaxTier;

        return (
          <div
            className="daily-milestone-tracker glass-panel font-mono"
            role="region"
            aria-label="Streak Milestones Tracker"
          >
            <div className="milestone-header-row">
              <div className="milestone-title-col">
                <span className="milestone-badge-tag">
                  <Flame size={13} className="flame-gold" />
                  STREAK MILESTONES
                </span>
                <h3 className="milestone-heading font-heading">
                  {isAllComplete
                    ? 'ALL MAJOR MILESTONES UNLOCKED!'
                    : `${milestone.daysRemaining} ${milestone.daysRemaining === 1 ? 'DAY' : 'DAYS'} UNTIL +${milestone.bonusPoints} RP BONUS`}
                </h3>
              </div>

              <div className="milestone-current-pill">
                <span>CURRENT: <strong>{currentStreak} {currentStreak === 1 ? 'DAY' : 'DAYS'}</strong></span>
              </div>
            </div>

            {/* Visual Step Progress Bar */}
            <div
              className="milestone-progress-bar-wrapper"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={milestone.progressPercent}
              aria-label={milestone.ariaLabel}
            >
              <div
                className="milestone-progress-fill"
                style={{ width: `${milestone.progressPercent}%` }}
              />
            </div>

            {/* Milestone Step Nodes (3d, 7d, 14d) */}
            <div className="milestone-steps-grid">
              <div className={`milestone-step-node ${currentStreak >= 3 ? 'step-achieved' : currentStreak > 0 ? 'step-in-progress' : ''}`}>
                <div className="step-marker">
                  {currentStreak >= 3 ? <CheckCircle2 size={14} className="icon-achieved" /> : <Circle size={14} />}
                  <span className="step-day">DAY 3</span>
                </div>
                <span className="step-reward">+100 RP</span>
              </div>

              <div className={`milestone-step-node ${currentStreak >= 7 ? 'step-achieved' : currentStreak >= 3 ? 'step-in-progress' : ''}`}>
                <div className="step-marker">
                  {currentStreak >= 7 ? <CheckCircle2 size={14} className="icon-achieved" /> : <Circle size={14} />}
                  <span className="step-day">DAY 7</span>
                </div>
                <span className="step-reward">+300 RP</span>
              </div>

              <div className={`milestone-step-node ${currentStreak >= 14 ? 'step-achieved' : currentStreak >= 7 ? 'step-in-progress' : ''}`}>
                <div className="step-marker">
                  {currentStreak >= 14 ? <CheckCircle2 size={14} className="icon-achieved" /> : <Circle size={14} />}
                  <span className="step-day">DAY 14</span>
                </div>
                <span className="step-reward">+500 RP</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Post-Completion Return Tomorrow Banner */}
      {(isQuickCompleted || isExtremeCompleted) && (
        <div className="daily-return-tomorrow-banner glass-panel font-mono">
          <div className="return-banner-left">
            <CheckCircle2 size={20} className="icon-emerald" />
            <div>
              <h3 className="return-banner-title font-heading">
                {isQuickCompleted && isExtremeCompleted
                  ? 'BOTH CHALLENGES COMPLETED TODAY!'
                  : 'DAILY STREAK QUALIFIED FOR TODAY!'}
              </h3>
              <p className="return-banner-desc">
                🔥 Tomorrow's Target: <strong>Day {(progress.streak || 1) + 1} Streak</strong> • Return after 00:00 UTC ({timeLeft}) to keep your streak alive!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Dual Challenge Cards Grid (Quick Win + Extreme Rush) */}
      <div className="daily-dual-grid">
        {/* ── CARD 1: QUICK WIN ────────────────────────────────────────── */}
        <div className={`daily-tier-card quick-win-card glass-panel ${isQuickCompleted ? 'tier-completed' : ''}`}>
          <div className="tier-header-row">
            <div className="tier-badge-pill pill-quick-win font-mono">
              <Sparkles size={13} className="icon-emerald" />
              <span>QUICK WIN</span>
            </div>
            <span className="tier-diff-tag diff-easy font-mono">{quickWin.difficulty}</span>
          </div>

          <div className="tier-game-meta">
            <span className="game-icon-tag">{quickWin.gameIcon}</span>
            <span className="game-name-tag font-mono">{quickWin.gameName}</span>
          </div>

          <h3 className="tier-challenge-title font-heading">{quickWin.title}</h3>
          <p className="tier-challenge-desc">{quickWin.description}</p>

          <div className="tier-objectives-box">
            <span className="obj-title font-mono">OBJECTIVES:</span>
            <div className="obj-list">
              {quickWin.objectives.map((obj) => (
                <div key={obj.id} className="obj-item font-mono">
                  {isQuickCompleted ? (
                    <CheckCircle2 size={16} className="obj-icon icon-completed" />
                  ) : (
                    <Circle size={15} className="obj-icon icon-pending" />
                  )}
                  <span className={`obj-text ${isQuickCompleted ? 'text-completed' : ''}`}>
                    {obj.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="tier-footer">
            <div className="tier-reward-box font-mono">
              <Gem size={15} className="icon-gem-emerald" />
              <span>REWARD: <strong>+{quickWin.rewardPoints} RP</strong></span>
            </div>

            {quickAttempt.bestScore > 0 && (
              <div className="tier-best-tag font-mono">
                <Trophy size={13} className="trophy-gold" />
                <span>BEST: {quickAttempt.bestScore.toLocaleString()}</span>
              </div>
            )}

            {isQuickCompleted ? (
              <button
                className="btn-secondary tier-action-btn"
                onClick={() => onPlayDailyChallenge(quickWin)}
                aria-label={`Play Again: ${quickWin.title}`}
              >
                <RefreshCw size={15} />
                <span>PLAY AGAIN</span>
              </button>
            ) : (
              <button
                className="btn-primary tier-action-btn btn-quick-play"
                onClick={() => onPlayDailyChallenge(quickWin)}
                aria-label={`Play Quick Win: ${quickWin.title}`}
              >
                <Play size={16} fill="currentColor" />
                <span>PLAY QUICK WIN</span>
                <ArrowRight size={15} />
              </button>
            )}
          </div>
        </div>

        {/* ── CARD 2: EXTREME RUSH ─────────────────────────────────────── */}
        <div className={`daily-tier-card extreme-rush-card glass-panel ${isExtremeCompleted ? 'tier-completed' : ''}`}>
          <div className="tier-header-row">
            <div className="tier-badge-pill pill-extreme font-mono">
              <Flame size={13} className="icon-ruby" />
              <span>EXTREME RUSH</span>
            </div>
            <span className="tier-diff-tag diff-extreme font-mono">{extreme.difficulty}</span>
          </div>

          <div className="tier-game-meta">
            <span className="game-icon-tag">{extreme.gameIcon}</span>
            <span className="game-name-tag font-mono">{extreme.gameName}</span>
          </div>

          <h3 className="tier-challenge-title font-heading">{extreme.title}</h3>
          <p className="tier-challenge-desc">{extreme.description}</p>

          <div className="tier-objectives-box">
            <span className="obj-title font-mono">OBJECTIVES:</span>
            <div className="obj-list">
              {extreme.objectives.map((obj) => (
                <div key={obj.id} className="obj-item font-mono">
                  {isExtremeCompleted ? (
                    <CheckCircle2 size={16} className="obj-icon icon-completed" />
                  ) : (
                    <Circle size={15} className="obj-icon icon-pending" />
                  )}
                  <span className={`obj-text ${isExtremeCompleted ? 'text-completed' : ''}`}>
                    {obj.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="tier-footer">
            <div className="tier-reward-box font-mono reward-box-extreme">
              <Gem size={15} className="icon-gem-ruby" />
              <span>REWARD: <strong>+{extreme.rewardPoints} RP</strong></span>
            </div>

            {extremeAttempt.bestScore > 0 && (
              <div className="tier-best-tag font-mono">
                <Trophy size={13} className="trophy-gold" />
                <span>BEST: {extremeAttempt.bestScore.toLocaleString()}</span>
              </div>
            )}

            {isExtremeCompleted ? (
              <button
                className="btn-secondary tier-action-btn"
                onClick={() => onPlayDailyChallenge(extreme)}
                aria-label={`Play Again: ${extreme.title}`}
              >
                <RefreshCw size={15} />
                <span>PLAY AGAIN</span>
              </button>
            ) : (
              <button
                className="btn-primary tier-action-btn btn-extreme-play"
                onClick={() => onPlayDailyChallenge(extreme)}
                aria-label={`Play Extreme Rush: ${extreme.title}`}
              >
                <Play size={16} fill="currentColor" />
                <span>PLAY EXTREME</span>
                <ArrowRight size={15} />
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
