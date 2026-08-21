import React, { useState } from 'react';
import { Trophy, Medal, Sparkles, Globe, Play, Flame, Shield, Clock } from 'lucide-react';
import { GAMES } from '../games/gameRegistry';
import './LeaderboardSection.css';

export function LeaderboardSection({ onPlayGame, scores = {}, onNavigateToLeaderboard }) {
  const [activeTab, setActiveTab] = useState('ALL TIME');
  const [tabNotice, setTabNotice] = useState(null);

  const rankTier = (score) => {
    if (!score || score <= 0) return { label: 'UNRANKED', cls: 'rank-none' };
    if (score >= 10000) return { label: 'MASTER', cls: 'rank-master' };
    if (score >= 5000) return { label: 'EXPERT', cls: 'rank-expert' };
    if (score >= 2000) return { label: 'PRO', cls: 'rank-pro' };
    return { label: 'NOVICE', cls: 'rank-novice' };
  };

  const handleTabClick = (tab) => {
    if (!tab.isAvailable) {
      setTabNotice(`${tab.label} records unlock in Season 1. All-Time arcade records remain active.`);
      return;
    }
    setActiveTab(tab.id);
    setTabNotice(null);
  };

  return (
    <section className="leaderboard-section" id="leaderboard-section">
      <div className="leaderboard-header">
        <div className="leaderboard-badge">
          <Trophy size={14} className="trophy-gold" />
          <span>RANKINGS & RECORDS</span>
        </div>
        <h2 className="leaderboard-title">LEADERBOARDS</h2>
        <p className="leaderboard-subtitle">
          Track your high scores, personal bests, and arcade milestones.
        </p>

        {/* Tab Filters */}
        <div className="leaderboard-tabs font-mono" role="tablist" aria-label="Leaderboard timeframe">
          {[
            { id: 'ALL TIME', label: 'ALL TIME', isAvailable: true, badge: null },
            { id: 'WEEK', label: 'WEEK', isAvailable: false, badge: 'SOON' },
            { id: 'TODAY', label: 'TODAY', isAvailable: false, badge: 'SOON' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                aria-disabled={!tab.isAvailable ? 'true' : undefined}
                className={`leaderboard-tab ${isActive ? 'active' : ''} ${!tab.isAvailable ? 'has-badge is-unavailable' : ''}`}
                onClick={() => handleTabClick(tab)}
              >
                <span>{tab.label}</span>
                {tab.badge && <span className="tab-soon-badge">{tab.badge}</span>}
              </button>
            );
          })}
        </div>

        {tabNotice && (
          <div className="section-tab-notice font-mono animate-pop">
            <Clock size={12} className="icon-gold" />
            <span>{tabNotice}</span>
          </div>
        )}
      </div>

      <div className="leaderboard-content-grid">
        {/* Your Personal Best Records Card */}
        <div className="personal-records-card glass-panel">
          <div className="card-header-inner">
            <div className="records-title-row">
              <Medal size={18} className="medal-icon icon-cyan" />
              <h3 className="records-title font-heading">YOUR ARCADE RECORDS</h3>
            </div>
            <span className="sync-badge font-mono">LOCAL PROFILE</span>
          </div>

          <div className="records-list">
            {GAMES.map((game) => {
              const best = scores[game.id] || 0;
              const tier = rankTier(best);

              return (
                <div key={game.id} className="record-row font-mono">
                  <div className="record-game-info">
                    <span className="record-game-icon">{game.icon}</span>
                    <span className="record-game-name font-heading">{game.name}</span>
                  </div>

                  <div className="record-stats">
                    <span className={`rank-badge ${tier.cls}`}>{tier.label}</span>
                    <div className="record-score-box">
                      <span className="record-score-val">
                        {best > 0 ? best.toLocaleString() : '—'}
                      </span>
                    </div>
                  </div>

                  <button
                    className="record-play-link"
                    onClick={() => onPlayGame(game.id)}
                    aria-label={`Play ${game.name}`}
                  >
                    <Play size={13} fill="currentColor" />
                    <span>PLAY</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Global Season 1 Coming Soon Card */}
        <div className="global-leaderboard-card glass-panel">
          <div className="global-badge font-mono">
            <Globe size={13} />
            <span>GLOBAL NETWORK</span>
          </div>

          <h3 className="global-card-title font-heading">SEASON 1 — COMING SOON</h3>
          <p className="global-card-desc">
            Global competitive seasons, weekly competitions, and verified leaderboard runs are on the way.
          </p>

          <div className="global-perks-list">
            <div className="perk-item font-mono">
              <Sparkles size={14} className="icon-gold" />
              <span>Global Top 100 Leaderboards</span>
            </div>
            <div className="perk-item font-mono">
              <Flame size={14} className="icon-pink" />
              <span>Weekly High Score Competitions</span>
            </div>
            <div className="perk-item font-mono">
              <Shield size={14} className="icon-cyan" />
              <span>Verified Anti-Cheat Runs</span>
            </div>
          </div>

          <div className="global-cta-box font-mono">
            <button
              className="btn-primary btn-view-leaderboards"
              onClick={onNavigateToLeaderboard}
            >
              <Trophy size={14} />
              <span>VIEW YOUR RANKINGS →</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
