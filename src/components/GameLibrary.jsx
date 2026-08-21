import React from 'react';
import { Play, Trophy, Sparkles, Flame } from 'lucide-react';
import { GAMES } from '../games/gameRegistry';
import './GameLibrary.css';

export function GameLibrary({
  onPlayGame,
  onHoverGame,
  bestScore,
  dodgeBestScore,
  stackBestScore,
  numberRushBestScore,
  memoryBestScore,
  colorMazeBestScore,
}) {
  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${y}px`);
  };

  return (
    <section className="library-section" id="games-section">
      <div className="library-frame-wrapper">
        {/* Outer Perimeter Traveling Energy Glow Bar */}
        <svg className="perimeter-energy-svg" aria-hidden="true">
          <defs>
            <linearGradient id="energyGlowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00f2fe" stopOpacity="0.95" />
              <stop offset="50%" stopColor="#ff3562" stopOpacity="1" />
              <stop offset="100%" stopColor="#ffb703" stopOpacity="0.9" />
            </linearGradient>
            <filter id="energyGlowBloom" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <rect
            className="perimeter-bg-border"
            x="1.5"
            y="1.5"
            width="calc(100% - 3px)"
            height="calc(100% - 3px)"
            rx="24"
            ry="24"
            fill="none"
          />
          <rect
            className="perimeter-energy-bar"
            pathLength="100"
            x="1.5"
            y="1.5"
            width="calc(100% - 3px)"
            height="calc(100% - 3px)"
            rx="24"
            ry="24"
            fill="none"
            stroke="url(#energyGlowGrad)"
            filter="url(#energyGlowBloom)"
          />
        </svg>

        <div className="library-header">
          <div className="library-badge">
            <Sparkles size={13} className="sparkle-icon" />
            <span>ARCADE LINEUP</span>
          </div>
          <h2 className="library-title">CHOOSE YOUR GAME</h2>
          <p className="library-subtitle">Six games. One goal: beat your best.</p>
        </div>

        <div className="library-grid">
          {GAMES.map((game) => {
            const isPlayable = game.active !== false;
            const isFeatured = game.id === 'dodge' || game.featured;

            const gameBestScore =
              game.id === 'aim'
                ? bestScore
                : game.id === 'dodge'
                ? dodgeBestScore
                : game.id === 'stack'
                ? stackBestScore
                : game.id === 'number-rush'
                ? numberRushBestScore
                : game.id === 'memory'
                ? memoryBestScore
                : game.id === 'color-maze'
                ? colorMazeBestScore
                : 0;

            return (
              <a
                key={game.id}
                href={`/games/${game.id}`}
                className={`game-card glass-panel card-game-${game.id} ${isFeatured ? 'featured-game-card' : ''}`}
                onMouseMove={handleMouseMove}
                onMouseEnter={() => {
                  if (onHoverGame) onHoverGame(game.id);
                }}
                onClick={(e) => {
                  e.preventDefault();
                  if (isPlayable) onPlayGame(game.id);
                }}
                aria-label={`Play ${game.name} — ${game.tagline}`}
                title={`Play ${game.name}`}
              >
                {/* Internal Cursor Spotlight Overlay */}
                <div className="card-spotlight" aria-hidden="true" />
                <div className="card-ambient-glow" aria-hidden="true" />

                {/* Card Header with Icon & Status/Featured Badge */}
                <div className="card-top">
                  <div className={`card-icon-container icon-box-${game.id}`}>
                    <span className="card-icon">{game.icon}</span>
                  </div>
                  {isFeatured ? (
                    <span className="status-pill featured-pill">
                      <Flame size={12} className="featured-flame" /> FEATURED
                    </span>
                  ) : (
                    <span className="status-pill active-pill">ARCADE</span>
                  )}
                </div>

                {/* Card Title & Description */}
                <div className="card-body">
                  <h3 className="card-title">{game.name}</h3>
                  <p className="card-tagline">{game.tagline}</p>
                </div>

                {/* Card Footer: Best Score & Play Button */}
                <div className="card-footer">
                  <div className="card-best font-mono">
                    <span className="best-lbl">BEST</span>
                    <div className="best-val-row">
                      <Trophy size={14} className="trophy-gold" />
                      <span className="best-number">
                        {gameBestScore ? gameBestScore.toLocaleString() : '0'}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`btn-play-card ${isFeatured ? 'btn-featured-play' : ''}`}
                    aria-hidden="true"
                  >
                    <Play size={15} fill="currentColor" />
                    <span>PLAY {game.name}</span>
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
