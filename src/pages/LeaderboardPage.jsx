import React, { useState, useEffect, useCallback } from 'react';
import {
  Trophy,
  Globe,
  Play,
  Flame,
  Medal,
  Sparkles,
  Shield,
  Star,
  Clock,
  RotateCcw,
  User,
  LogIn,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';
import { PLATFORM_CONTENT } from '../config/platformContent.js';
import { LEADERBOARD_GAMES, TIME_PERIODS, getGameLocalStats } from '../services/leaderboardService';
import { loadLockerState, FRAMES_INVENTORY, TITLES_INVENTORY } from '../services/lockerService';
import { fetchLeaderboard, fetchUserGameRank } from '../services/scoreService';
import { useAuth } from '../context/AuthContext';
import './LeaderboardPage.css';

export function LeaderboardPage({ scores = {}, onPlayGame, onGoHome, onNavigateToLogin }) {
  const { user, profile, isGuest } = useAuth();
  const [selectedGameId, setSelectedGameId] = useState('aim');
  const [activePeriod, setActivePeriod] = useState('ALL_TIME');
  const [selectedMazeLevel, setSelectedMazeLevel] = useState('ALL');
  const [periodNotice, setPeriodNotice] = useState(null);

  // Real Global Leaderboard State from Supabase
  const [leaderboardEntries, setLeaderboardEntries] = useState([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [userGlobalRank, setUserGlobalRank] = useState(null);

  const selectedGame =
    LEADERBOARD_GAMES.find((g) => g.id === selectedGameId) || LEADERBOARD_GAMES[0];

  const localStats = getGameLocalStats(selectedGameId, scores);
  const bestScore = localStats.bestScore || 0;
  const hasLocalRecord = bestScore > 0;

  // Retrieve equipped Locker profile identity
  const lockerState = loadLockerState();
  const equippedFrame =
    FRAMES_INVENTORY.find((f) => f.key === (profile?.avatar_frame || lockerState.equipped?.frame)) || FRAMES_INVENTORY[0];
  const equippedTitle =
    TITLES_INVENTORY.find((t) => t.key === (profile?.title || lockerState.equipped?.title)) || TITLES_INVENTORY[0];

  // Fetch real global leaderboard data on game switch or auth change
  const loadGlobalData = useCallback(async () => {
    setLoadingLeaderboard(true);
    setFetchError(null);

    try {
      const [lbRes, rankRes] = await Promise.all([
        fetchLeaderboard(selectedGameId, 50),
        user?.id ? fetchUserGameRank(selectedGameId, user.id) : Promise.resolve({ rank: null, bestScore: null, totalPlayers: 0 }),
      ]);

      if (lbRes.error && lbRes.source === 'RPC_ERROR') {
        setFetchError(lbRes.error);
        setLeaderboardEntries([]);
      } else {
        setLeaderboardEntries(lbRes.entries || []);
      }
      setUserGlobalRank(rankRes);
    } catch (err) {
      console.warn('Leaderboard fetch error:', err);
      setFetchError(err.message || 'Unable to connect to global leaderboard.');
      setLeaderboardEntries([]);
    } finally {
      setLoadingLeaderboard(false);
    }
  }, [selectedGameId, user?.id]);

  useEffect(() => {
    loadGlobalData();
  }, [loadGlobalData]);

  const handlePeriodSelect = (period) => {
    if (!period.isAvailable) {
      setPeriodNotice(
        `${period.label} competitive cycles unlock in Season 1. All-Time rankings remain active.`
      );
      return;
    }

    setActivePeriod(period.id);
    setPeriodNotice(null);
  };

  // Level data for Color Maze
  const mazeProgress = localStats.mazeProgress;
  const mazeLevelData =
    selectedGameId === 'color-maze' && selectedMazeLevel !== 'ALL' && mazeProgress
      ? {
          score: mazeProgress.bestScores?.[selectedMazeLevel] || 0,
          time: mazeProgress.bestTimes?.[selectedMazeLevel] || 0,
          moves: mazeProgress.bestMoves?.[selectedMazeLevel] || 0,
          stars: mazeProgress.stars?.[selectedMazeLevel] || 0,
        }
      : null;

  // Check if current authenticated user appears in the fetched Top 50
  const isUserInTop50 = Boolean(user && leaderboardEntries.some((e) => e.userId === user.id));

  return (
    <div className="leaderboard-page-container">
      {/* ── 1. COMPACT HERO SECTION ─────────────────────────────────── */}
      <div className="leaderboard-page-hero">
        <div className="leaderboard-hero-badge font-mono">
          <Trophy size={14} className="icon-gold" />
          <span>GLOBAL COMPETITIVE ARCADE</span>
        </div>
        <h1 className="leaderboard-hero-title font-heading">🏆 GLOBAL LEADERBOARDS</h1>
        <p className="leaderboard-hero-subtitle">
          Worldwide all-time rankings. Track global personal bests across all six arcade games.
        </p>
      </div>

      {/* ── 2. PROMINENT GAME SELECTOR BAR ──────────────────────────── */}
      <div className="game-selector-wrapper">
        <div className="game-selector-bar font-mono" role="tablist" aria-label="Game selector">
          {LEADERBOARD_GAMES.map((game) => {
            const isSelected = selectedGameId === game.id;
            return (
              <button
                key={game.id}
                role="tab"
                aria-selected={isSelected}
                aria-label={`Select ${game.name} Leaderboard`}
                className={`game-selector-btn ${isSelected ? 'active' : ''}`}
                onClick={() => {
                  setSelectedGameId(game.id);
                  setSelectedMazeLevel('ALL');
                  setPeriodNotice(null);
                }}
                style={{
                  '--accent-glow': game.accentColor,
                }}
              >
                <span className="game-selector-icon">{game.icon}</span>
                <span className="game-selector-name">{game.name}</span>
                {isSelected && <div className="game-selector-indicator" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 3. SELECTED GAME SPOTLIGHT BANNER ──────────────────────── */}
      <div
        className="game-spotlight-card glass-panel"
        style={{
          '--spotlight-accent': selectedGame.accentColor,
        }}
      >
        <div className="game-spotlight-left">
          <div className="spotlight-icon-box" style={{ borderColor: selectedGame.accentColor }}>
            <span className="spotlight-icon">{selectedGame.icon}</span>
          </div>

          <div className="spotlight-info">
            <div className="spotlight-badge-row font-mono">
              <span className="spotlight-badge" style={{ color: selectedGame.accentColor }}>
                {selectedGame.badge}
              </span>
            </div>
            <h2 className="spotlight-title font-heading">{selectedGame.name}</h2>
            <p className="spotlight-desc">{selectedGame.tagline}</p>
          </div>
        </div>

        <div className="game-spotlight-right">
          <div className="spotlight-score-pill font-mono">
            <span className="pill-label">YOUR BEST</span>
            <span className="pill-value">
              {hasLocalRecord ? bestScore.toLocaleString() : '—'}
            </span>
          </div>

          <button
            className="btn-primary btn-play-spotlight font-mono"
            onClick={() => onPlayGame(selectedGame.id)}
            title={`Play ${selectedGame.name} now`}
          >
            <Play size={16} fill="currentColor" />
            <span>PLAY {selectedGame.name}</span>
          </button>
        </div>
      </div>

      {/* ── 4. TIME PERIOD FILTERS ROW ──────────────────────────────── */}
      <div className="time-filter-row font-mono">
        <div className="time-filter-tabs" role="tablist" aria-label="Leaderboard timeframe">
          {TIME_PERIODS.map((period) => {
            const isActive = activePeriod === period.id;
            return (
              <button
                key={period.id}
                role="tab"
                aria-selected={isActive}
                aria-disabled={!period.isAvailable ? 'true' : undefined}
                className={`time-filter-btn ${isActive ? 'active' : ''} ${!period.isAvailable ? 'has-badge is-unavailable' : ''}`}
                onClick={() => handlePeriodSelect(period)}
              >
                <span>{period.label}</span>
                {period.badge && <span className="time-period-badge font-mono">{period.badge}</span>}
              </button>
            );
          })}
        </div>

        {/* Optional Color Maze Level Dropdown Filter for Personal Stats */}
        {selectedGameId === 'color-maze' && (
          <div className="maze-level-filter-box font-mono">
            <span className="filter-label">LEVEL (LOCAL PB):</span>
            <select
              className="maze-level-select font-mono"
              value={selectedMazeLevel}
              onChange={(e) => setSelectedMazeLevel(e.target.value)}
              aria-label="Filter by Color Maze Level"
            >
              <option value="ALL">ALL LEVELS (OVERALL)</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((lvl) => (
                <option key={lvl} value={String(lvl)}>
                  LEVEL {lvl}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Honest Time-Window Notification Callout */}
      {periodNotice && (
        <div className="period-notice-banner font-mono animate-pop">
          <Clock size={14} className="icon-gold" />
          <span>{periodNotice}</span>
        </div>
      )}

      {/* ── 5. MAIN LEADERBOARD & STATS 2-COLUMN GRID ───────────────── */}
      <div className="leaderboard-main-grid">
        {/* Left Column: Real Global Leaderboard */}
        <div className="leaderboard-table-card glass-panel">
          <div className="table-card-header">
            <div className="table-header-title-row">
              <Globe size={18} className="icon-cyan" />
              <h3 className="table-title font-heading">
                {selectedGame.name} GLOBAL TOP 50
              </h3>
            </div>

            {/* Accurate status pill */}
            {loadingLeaderboard ? (
              <span className="period-pill syncing font-mono">
                <RotateCcw size={11} className="spin-fast" />
                <span>SYNCING...</span>
              </span>
            ) : fetchError ? (
              <span className="period-pill error font-mono">
                <Shield size={11} />
                <span>OFFLINE</span>
              </span>
            ) : (
              <span className="period-pill font-mono">
                <Globe size={11} />
                <span>ALL TIME</span>
              </span>
            )}
          </div>

          {/* Table Header Schema */}
          <div className="leaderboard-table-head font-mono">
            <div className="col-rank">RANK</div>
            <div className="col-player">PLAYER</div>
            <div className="col-score">BEST SCORE</div>
          </div>

          {/* Table Content */}
          {loadingLeaderboard ? (
            <div className="leaderboard-loading-state font-mono">
              <div className="loading-spinner" />
              <span>FETCHING GLOBAL SCOREBOARD...</span>
            </div>
          ) : fetchError ? (
            <div className="leaderboard-error-state font-mono">
              <div className="empty-state-icon-aura">
                <Shield size={40} className="icon-pink" />
              </div>
              <h4 className="empty-state-title font-heading">UNABLE TO LOAD SCORES</h4>
              <p className="empty-state-desc">
                Could not connect to the global leaderboard network. Please verify your connection and retry.
              </p>
              <button
                className="btn-secondary btn-retry-leaderboard font-mono"
                onClick={loadGlobalData}
              >
                <RotateCcw size={14} />
                <span>RETRY CONNECTION</span>
              </button>
            </div>
          ) : leaderboardEntries.length > 0 ? (
            <div className="leaderboard-rows-list">
              {leaderboardEntries.map((entry) => {
                const isCurrentUser = Boolean(user && entry.userId === user.id);
                const frameObj =
                  FRAMES_INVENTORY.find(
                    (f) => f.key === entry.avatarFrame || f.id === entry.avatarFrame || f.cssClass === entry.avatarFrame
                  ) || FRAMES_INVENTORY[0];
                const titleObj =
                  TITLES_INVENTORY.find(
                    (t) => t.key === entry.title || t.id === entry.title
                  ) || TITLES_INVENTORY[0];
                const frameClass = frameObj.cssClass || 'classic';
                const rankBadgeClass =
                  entry.rank === 1
                    ? 'rank-gold'
                    : entry.rank === 2
                    ? 'rank-silver'
                    : entry.rank === 3
                    ? 'rank-bronze'
                    : 'rank-default';

                return (
                  <div
                    key={entry.userId || `${entry.rank}-${entry.score}`}
                    className={`leaderboard-row font-mono ${isCurrentUser ? 'row-is-user' : ''}`}
                  >
                    <div className={`row-rank ${rankBadgeClass}`}>
                      {entry.rank === 1 ? '🥇 #1' : entry.rank === 2 ? '🥈 #2' : entry.rank === 3 ? '🥉 #3' : `#${entry.rank}`}
                    </div>

                    <div className="row-player">
                      <div className={`row-avatar-mini ${frameClass}`}>
                        <User size={14} />
                      </div>
                      <div className="row-player-info">
                        <div className="row-username-line">
                          <span className="row-username" title={entry.username}>{entry.username}</span>
                          {isCurrentUser && <span className="user-self-tag">YOU</span>}
                        </div>
                        <span className="row-player-title" style={{ color: titleObj.accentColor || '#64748b' }}>
                          {titleObj.name}
                        </span>
                      </div>
                    </div>

                    <div className="row-score highlight-cyan">
                      <span className="score-num">{entry.score.toLocaleString()}</span>
                      <span className="score-unit">PTS</span>
                    </div>
                  </div>
                );
              })}

              {/* Pinned "YOUR GLOBAL POSITION" row when player is ranked outside visible Top 50 */}
              {user && !isUserInTop50 && userGlobalRank?.rank && (
                <div className="leaderboard-user-outside-container">
                  <div className="leaderboard-separator-bar font-mono">
                    <span className="sep-dots">• • •</span>
                    <span className="sep-label">YOUR GLOBAL STANDING</span>
                    <span className="sep-dots">• • •</span>
                  </div>
                  <div className="leaderboard-row font-mono row-is-user row-user-outside-top50">
                    <div className="row-rank rank-default">
                      #{userGlobalRank.rank}
                    </div>
                    <div className="row-player">
                      <div className={`row-avatar-mini ${equippedFrame.cssClass || 'classic'}`}>
                        <User size={14} />
                      </div>
                      <div className="row-player-info">
                        <div className="row-username-line">
                          <span className="row-username" title={profile?.username || 'You'}>{profile?.username || 'You'}</span>
                          <span className="user-self-tag">YOU</span>
                        </div>
                        <span className="row-player-title" style={{ color: equippedTitle.accentColor || '#64748b' }}>
                          {equippedTitle.name}
                        </span>
                      </div>
                    </div>
                    <div className="row-score highlight-cyan">
                      <span className="score-num">{(userGlobalRank.bestScore || bestScore).toLocaleString()}</span>
                      <span className="score-unit">PTS</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="leaderboard-empty-state">
              <div className="empty-state-icon-aura">
                <Trophy size={42} className="icon-gold" />
              </div>
              <h4 className="empty-state-title font-heading">
                BE THE FIRST ON THE LEADERBOARD
              </h4>
              <p className="empty-state-desc">
                No global runs submitted for {selectedGame.name} yet. Play a game now to claim the #1 spot!
              </p>

              <button
                className="btn-primary btn-empty-play font-mono"
                onClick={() => onPlayGame(selectedGame.id)}
              >
                <Play size={14} fill="currentColor" />
                <span>PLAY {selectedGame.name}</span>
              </button>
            </div>
          )}

          {/* Table Card Footer */}
          <div className="table-card-footer font-mono">
            <span className="footer-label">
              {isGuest
                ? 'GUEST MODE: SIGN IN TO SUBMIT COMPETITIVE RUNS'
                : userGlobalRank?.rank
                ? `YOUR GLOBAL RANK: #${userGlobalRank.rank} OF ${userGlobalRank.totalPlayers} PLAYERS`
                : 'YOUR GLOBAL RANK: UNRANKED (PLAY TO ENTER)'}
            </span>
          </div>
        </div>

        {/* Right Column: Personal Record & Rank Card */}
        <div className="leaderboard-sidebar">
          {/* Selected Game Personal Record Card with Locker Identity */}
          <div className="personal-record-box glass-panel">
            <div className="box-header-row">
              <div className="box-title-group">
                <Medal size={18} className="icon-gold" />
                <h3 className="box-title font-heading">YOUR RECORD</h3>
              </div>
              <span className="game-tag font-mono">{selectedGame.icon} {selectedGame.name}</span>
            </div>

            {/* Compact Locker Profile Identity Strip */}
            <div className="personal-identity-strip font-mono">
              <div className={`personal-avatar-mini ${equippedFrame.cssClass}`}>
                <User size={18} className="avatar-mini-icon" />
              </div>
              <div className="personal-identity-info">
                <span className="personal-player-name">
                  {profile?.username || (isGuest ? 'GUEST PLAYER' : 'PLAYER')}
                </span>
                <span className="personal-title-badge">{equippedTitle.name}</span>
              </div>
            </div>

            {/* Score Display */}
            {hasLocalRecord ? (
              <div className="record-details-active">
                <div className="pb-badge font-mono">
                  <Star size={12} fill="#ffb703" />
                  <span>PERSONAL BEST</span>
                </div>

                <div className="record-score-number font-mono">
                  {(selectedGameId === 'color-maze' && selectedMazeLevel !== 'ALL' && mazeLevelData
                    ? mazeLevelData.score
                    : bestScore
                  ).toLocaleString()}
                </div>

                {/* Extra game-specific breakdown metrics */}
                {selectedGameId === 'color-maze' && selectedMazeLevel !== 'ALL' && mazeLevelData ? (
                  <div className="maze-level-stats-grid font-mono">
                    <div className="stat-pill">
                      <span className="lbl">TIME</span>
                      <span className="val">{mazeLevelData.time > 0 ? `${mazeLevelData.time.toFixed(2)}s` : '—'}</span>
                    </div>
                    <div className="stat-pill">
                      <span className="lbl">MOVES</span>
                      <span className="val">{mazeLevelData.moves > 0 ? mazeLevelData.moves : '—'}</span>
                    </div>
                    <div className="stat-pill">
                      <span className="lbl">STARS</span>
                      <span className="val">{mazeLevelData.stars > 0 ? '⭐'.repeat(mazeLevelData.stars) : '—'}</span>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="record-details-empty font-mono">
                <p>No runs recorded yet for this game.</p>
              </div>
            )}

            {/* Global Standing Status */}
            <div className="global-standing-pill font-mono">
              {isGuest ? (
                <div className="guest-prompt-block">
                  <p className="prompt-txt">Sign in to save runs to the worldwide leaderboard.</p>
                  {onNavigateToLogin && (
                    <button className="btn-secondary btn-sidebar-signin" onClick={onNavigateToLogin}>
                      <LogIn size={14} />
                      <span>SIGN IN</span>
                    </button>
                  )}
                </div>
              ) : userGlobalRank?.rank ? (
                <div className="standing-rank-row">
                  <span className="standing-lbl">CURRENT RANK:</span>
                  <span className="standing-val highlight-cyan">#{userGlobalRank.rank}</span>
                </div>
              ) : (
                <div className="standing-rank-row">
                  <span className="standing-lbl">CURRENT RANK:</span>
                  <span className="standing-val">UNRANKED</span>
                </div>
              )}
            </div>

            <button
              className="btn-primary btn-play-sidebar font-mono"
              onClick={() => onPlayGame(selectedGame.id)}
            >
              <Play size={14} fill="currentColor" />
              <span>PLAY {selectedGame.name}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 4. LEADERBOARD RULES & VERIFICATION GUIDE ─────────────────── */}
      <div className="lb-guide-section glass-panel">
        <div className="section-title-row font-mono">
          <span className="section-icon">🛡️</span>
          <h2 className="section-title font-heading">RANKINGS &amp; SCORE VERIFICATION</h2>
        </div>

        <p className="lb-guide-intro font-body">
          {PLATFORM_CONTENT.leaderboard.introduction}
        </p>

        <div className="lb-rules-grid">
          {PLATFORM_CONTENT.leaderboard.rankingRules.map((rule, idx) => (
            <div key={idx} className="lb-rule-card">
              <span className="rule-step-tag font-mono">RULE 0{idx + 1}</span>
              <h3 className="rule-title font-heading">{rule.title}</h3>
              <p className="rule-desc">{rule.description}</p>
            </div>
          ))}
        </div>

        <div className="lb-guide-links font-mono">
          <a href="/daily" className="lb-link-btn btn-daily">
            <span>EARN STREAK POINTS IN DAILY</span>
            <ArrowRight size={14} />
          </a>
          <a href="/locker" className="lb-link-btn btn-locker">
            <span>UNLOCK COSMETICS IN LOCKER</span>
            <ArrowRight size={14} />
          </a>
        </div>
      </div>

      {/* ── 5. LEADERBOARD FAQ ───────────────────────────────────────── */}
      <div className="lb-faq-section glass-panel">
        <div className="section-title-row font-mono">
          <span className="section-icon">❓</span>
          <h2 className="section-title font-heading">LEADERBOARD FAQ</h2>
        </div>
        <p className="lb-faq-subtitle font-body">
          Answers to common questions regarding world records, score submission, and guest vs authenticated rankings.
        </p>

        <dl className="lb-faq-list">
          {PLATFORM_CONTENT.leaderboard.faq.map((item, idx) => (
            <div key={idx} className="lb-faq-item">
              <dt className="lb-faq-question font-heading">
                <HelpCircle size={18} className="text-cyan" aria-hidden="true" />
                <span>{item.q}</span>
              </dt>
              <dd className="lb-faq-answer">{item.a}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
