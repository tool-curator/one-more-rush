import React from 'react';
import { Play, Trophy, Sparkles, ArrowRight, ShieldCheck, Zap, Monitor, Smartphone, HelpCircle } from 'lucide-react';
import { GAME_CONTENT, getGameContent } from '../config/gameContent.js';
import './GameLandingPage.css';

export function GameLandingPage({
  gameId = 'aim',
  bestScore = 0,
  isDailyChallenge = false,
  onStart,
  onNavigateToGame,
  onNavClick,
}) {
  const content = getGameContent(gameId) || GAME_CONTENT.aim;

  return (
    <div className="game-landing-container">
      {/* Semantic Breadcrumbs */}
      <nav className="game-breadcrumbs font-mono" aria-label="Breadcrumb">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            if (onNavClick) onNavClick('home');
          }}
        >
          Home
        </a>
        <span className="crumb-separator" aria-hidden="true">/</span>
        <a
          href="/#games-section"
          onClick={(e) => {
            e.preventDefault();
            if (onNavClick) onNavClick('home');
          }}
        >
          Games
        </a>
        <span className="crumb-separator" aria-hidden="true">/</span>
        <span className="crumb-active" aria-current="page">{content.name}</span>
      </nav>

      {/* Hero Header Area: Title & Short Introduction */}
      <header className="game-hero-header">
        <div className="game-badge-row">
          <span className="game-badge-pill genre-pill">{content.genre}</span>
          <span className="game-badge-pill tech-pill">
            <Zap size={13} className="pill-icon text-cyan" /> 60 FPS CANVAS
          </span>
          <span className="game-badge-pill security-pill">
            <ShieldCheck size={13} className="pill-icon text-emerald" /> SERVER VERIFIED
          </span>
        </div>

        <h1 className="game-landing-h1 font-heading">{content.h1}</h1>
        <p className="game-landing-intro">{content.introduction}</p>
      </header>

      {/* Primary Game Play Hero Arena [ GAME ] */}
      <div className={`game-play-hero-card glass-panel theme-${content.id}`}>
        <div className="hero-card-glow" aria-hidden="true" />

        <div className="hero-card-header">
          <div className="hero-icon-container">
            <span className="hero-game-icon" role="img" aria-label={content.name}>{content.icon}</span>
          </div>

          <div className="hero-title-group">
            <div className="hero-title-row">
              <h2 className="hero-game-name font-heading">{content.name}</h2>
              {isDailyChallenge && (
                <span className="hero-daily-badge font-mono">
                  <Sparkles size={12} /> DAILY CHALLENGE
                </span>
              )}
            </div>
            <p className="hero-game-tagline font-mono">{content.tagline}</p>
          </div>

          {bestScore > 0 && (
            <div className="hero-best-score font-mono">
              <span className="best-score-label">PERSONAL BEST</span>
              <div className="best-score-value-row">
                <Trophy size={16} className="trophy-gold" />
                <span className="best-score-number">{bestScore.toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>

        {/* Action Controls: Immediate Launch Button */}
        <div className="hero-action-row">
          <button
            type="button"
            className="btn-hero-launch font-heading"
            onClick={onStart}
            aria-label={`Play ${content.name} Now`}
            id="launch-game-button"
          >
            <Play size={22} fill="currentColor" className="launch-icon" />
            <span>PLAY {content.name} NOW</span>
          </button>

          <a href="#game-documentation" className="btn-hero-guide font-mono">
            <span>Read Strategy &amp; Rules ↓</span>
          </a>
        </div>

        {/* Quick Game Specs Bar */}
        <div className="hero-specs-bar font-mono">
          <div className="spec-col">
            <span className="spec-label">PRIMARY INPUT</span>
            <span className="spec-val">{content.controls[0]?.input || 'Mouse / Touch'}</span>
          </div>
          <div className="spec-col">
            <span className="spec-label">CATEGORY</span>
            <span className="spec-val">Skill &amp; Reflex Arcade</span>
          </div>
          <div className="spec-col">
            <span className="spec-label">COMPATIBILITY</span>
            <span className="spec-val">Desktop, Mobile &amp; Tablet</span>
          </div>
        </div>
      </div>

      {/* Rich Semantic Game Documentation */}
      <article className="game-guide-article" id="game-documentation">
        {/* Section: Objective & Rules */}
        <section className="guide-section guide-objective">
          <div className="section-header">
            <h2 className="guide-section-title font-heading">Game Objective &amp; Rules</h2>
          </div>
          <div className="guide-content-box glass-panel">
            <p className="guide-paragraph">{content.objective}</p>
          </div>
        </section>

        {/* Section: Controls & Input Methods */}
        <section className="guide-section guide-controls">
          <div className="section-header">
            <h2 className="guide-section-title font-heading">Controls &amp; Input Methods</h2>
            <p className="section-subtitle">Optimized for both high-precision desktop gaming and responsive mobile touch displays.</p>
          </div>
          <div className="table-responsive glass-panel">
            <table className="controls-table font-mono" aria-label={`${content.name} Controls and Input Methods`}>
              <thead>
                <tr>
                  <th scope="col" style={{ width: '25%' }}>Device</th>
                  <th scope="col" style={{ width: '35%' }}>Input Method</th>
                  <th scope="col" style={{ width: '40%' }}>Action &amp; Description</th>
                </tr>
              </thead>
              <tbody>
                {content.controls.map((ctrl, idx) => (
                  <tr key={idx}>
                    <td>
                      <div className="device-label">
                        {ctrl.device.toLowerCase().includes('desktop') ? (
                          <Monitor size={15} className="device-icon text-cyan" />
                        ) : (
                          <Smartphone size={15} className="device-icon text-pink" />
                        )}
                        <span>{ctrl.device}</span>
                      </div>
                    </td>
                    <td>
                      <code className="input-code">{ctrl.input}</code>
                    </td>
                    <td className="desc-cell">{ctrl.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section: Core Mechanics & Progressive Difficulty */}
        <section className="guide-section guide-mechanics">
          <div className="section-header">
            <h2 className="guide-section-title font-heading">Core Mechanics &amp; Difficulty Progression</h2>
            <p className="section-subtitle">Real engine mechanics confirmed by the game source code.</p>
          </div>
          <div className="mechanics-grid">
            {content.mechanics.map((mech, idx) => (
              <div key={idx} className="mechanic-card glass-panel">
                <div className="mechanic-card-header">
                  <span className="mechanic-step font-mono">0{idx + 1}</span>
                  <h3 className="mechanic-title font-heading">{mech.title}</h3>
                </div>
                <p className="mechanic-desc">{mech.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Section: Scoring System & Multipliers */}
        <section className="guide-section guide-scoring">
          <div className="section-header">
            <h2 className="guide-section-title font-heading">Scoring System &amp; Multipliers</h2>
            <p className="section-subtitle">{content.scoring.overview}</p>
          </div>
          <div className="guide-content-box glass-panel">
            <ul className="scoring-rules-list">
              {content.scoring.rules.map((rule, idx) => {
                const [lead, ...rest] = rule.split(':');
                return (
                  <li key={idx} className="scoring-rule-item">
                    <span className="rule-bullet" aria-hidden="true">▸</span>
                    <div>
                      {rest.length > 0 ? (
                        <>
                          <strong className="rule-lead font-heading">{lead}:</strong>
                          <span className="rule-body">{rest.join(':')}</span>
                        </>
                      ) : (
                        <span className="rule-body">{rule}</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* Section: Pro Tips & Strategies */}
        <section className="guide-section guide-strategies">
          <div className="section-header">
            <h2 className="guide-section-title font-heading">Pro Tips &amp; Proven Strategies</h2>
            <p className="section-subtitle">Tactical advice to push your session score into top global leaderboard ranks.</p>
          </div>
          <div className="strategies-grid">
            {content.strategies.map((strat, idx) => (
              <div key={idx} className="strategy-card glass-panel">
                <h3 className="strategy-title font-heading">
                  <span className="strategy-icon" aria-hidden="true">💡</span>
                  {strat.title}
                </h3>
                <p className="strategy-text">{strat.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Section: Mobile Play & Touch Support */}
        <section className="guide-section guide-mobile">
          <div className="section-header">
            <h2 className="guide-section-title font-heading">Mobile Play &amp; Touch Ergonomics</h2>
          </div>
          <div className="guide-content-box glass-panel">
            <p className="guide-paragraph">{content.mobile}</p>
          </div>
        </section>

        {/* Section: Leaderboard & Achievement Badges */}
        <section className="guide-section guide-leaderboard">
          <div className="section-header">
            <h2 className="guide-section-title font-heading">Global Leaderboards &amp; Rush Locker Badges</h2>
          </div>
          <div className="guide-content-box glass-panel">
            <p className="guide-paragraph">{content.leaderboard}</p>
          </div>
        </section>

        {/* Section: Frequently Asked Questions */}
        <section className="guide-section guide-faq">
          <div className="section-header">
            <h2 className="guide-section-title font-heading">Frequently Asked Questions</h2>
            <p className="section-subtitle">Common questions about gameplay mechanics, scoring, and controls.</p>
          </div>
          <dl className="faq-list">
            {content.faq.map((item, idx) => (
              <div key={idx} className="faq-item glass-panel">
                <dt className="faq-question font-heading">
                  <HelpCircle size={18} className="faq-icon text-cyan" aria-hidden="true" />
                  <span>{item.q}</span>
                </dt>
                <dd className="faq-answer">{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Section: Related Arcade Games */}
        <section className="guide-section guide-related">
          <div className="section-header">
            <h2 className="guide-section-title font-heading">Related Free Arcade Games</h2>
            <p className="section-subtitle">Challenge your reflexes with more original web games on One More Rush.</p>
          </div>
          <div className="related-games-grid">
            {content.relatedGames.map((relId) => {
              const relGame = getGameContent(relId);
              if (!relGame) return null;
              return (
                <a
                  key={relId}
                  href={`/games/${relId}`}
                  className="related-game-card glass-panel"
                  onClick={(e) => {
                    e.preventDefault();
                    if (onNavigateToGame) onNavigateToGame(relId);
                  }}
                  aria-label={`Play ${relGame.name} — ${relGame.tagline}`}
                >
                  <span className="related-game-icon" role="img" aria-label={relGame.name}>
                    {relGame.icon}
                  </span>
                  <span className="related-game-name font-heading">{relGame.name}</span>
                  <span className="related-game-tagline font-mono">{relGame.tagline}</span>
                  <span className="related-game-cta font-mono">
                    PLAY GAME <ArrowRight size={14} />
                  </span>
                </a>
              );
            })}
          </div>
        </section>
      </article>
    </div>
  );
}
