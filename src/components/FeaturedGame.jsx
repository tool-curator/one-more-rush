import React from 'react';
import { Play, Trophy, Sparkles } from 'lucide-react';
import './FeaturedGame.css';

export function FeaturedGame({ game, bestScore, onPlay }) {
  if (!game) return null;

  return (
    <section className="featured-section">
      <div className="section-label">
        <Sparkles size={14} className="sparkle-icon" />
        <span>FEATURED GAME</span>
      </div>

      <div className="featured-card glass-panel">
        <div className="featured-header">
          <div className="game-icon-bubble">{game.icon}</div>
          <div className="featured-title-group">
            <h2 className="featured-game-title">{game.name}</h2>
            <p className="featured-game-tagline">{game.tagline}</p>
          </div>
        </div>

        <div className="featured-body">
          <div className="best-score-card">
            <div className="best-score-header">
              <Trophy size={16} className="trophy-gold" />
              <span className="best-score-label">BEST SCORE</span>
            </div>
            <span className="best-score-value font-mono">
              {bestScore ? bestScore.toLocaleString() : '0'}
            </span>
          </div>

          <button className="btn-primary featured-play-btn" onClick={onPlay}>
            <Play size={20} fill="currentColor" />
            <span>PLAY AIM</span>
          </button>
        </div>
      </div>
    </section>
  );
}
