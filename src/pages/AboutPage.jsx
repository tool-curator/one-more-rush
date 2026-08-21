import React from 'react';
import {
  Sparkles,
  Gamepad2,
  Trophy,
  Flame,
  Gem,
  Shield,
  Layers,
  Zap,
  Globe,
  Play,
  ArrowRight,
} from 'lucide-react';
import { GAMES } from '../games/gameRegistry';
import './InfoPages.css';

export function AboutPage({ onPlayGame, onNavigateToDaily }) {
  return (
    <div className="info-page-container">
      {/* ── Page Hero ─────────────────────────────────────────────────── */}
      <div className="info-page-hero">
        <div className="info-hero-badge font-mono">
          <Sparkles size={14} className="icon-cyan" />
          <span>ABOUT ONE MORE RUSH</span>
        </div>
        <h1 className="info-hero-title font-heading">SIX GAMES. ONE MORE TRY.</h1>
        <p className="info-hero-subtitle">
          ONE MORE RUSH is a browser arcade built around short, skill-based games designed to be easy to start and difficult to master.
        </p>
      </div>

      {/* ── Main Content Card ─────────────────────────────────────────── */}
      <div className="info-content-card glass-panel">
        {/* Section 1: The Idea */}
        <section>
          <h2 className="font-heading">
            <Zap size={20} className="icon-cyan" /> THE IDEA
          </h2>
          <p>
            The goal of ONE MORE RUSH is simple: <strong>Play. Improve. Beat your score. Take one more shot.</strong>
          </p>
          <p>
            In an era of cluttered, slow-loading web experiences, ONE MORE RUSH focuses strictly on what makes arcade games unforgettable:
          </p>
          <ul>
            <li><strong>Quick Games:</strong> Instant launch, zero waiting, and rapid gameplay cycles.</li>
            <li><strong>Skill & Focus:</strong> Transparent mechanics where your reaction speed, timing, and strategy determine your score.</li>
            <li><strong>Replayability:</strong> High-score chasing mechanics engineered for the satisfaction of "just one more try."</li>
            <li><strong>Daily Objectives:</strong> Handcrafted Daily Challenges that test mastery under unique constraints.</li>
            <li><strong>Friendly Competition:</strong> Game-specific scoreboards tracking your personal bests and records.</li>
          </ul>
        </section>

        {/* Section 2: The Games */}
        <section>
          <h2 className="font-heading">
            <Gamepad2 size={20} className="icon-cyan" /> THE SIX GAMES
          </h2>
          <p>
            Each game in the library targets a distinct arcade reflex:
          </p>

          <div className="about-games-grid font-mono">
            {GAMES.map((game) => (
              <div key={game.id} className="about-game-card">
                <div className="about-game-head">
                  <span className="about-game-icon">{game.icon}</span>
                  <span className="about-game-name font-heading">{game.name}</span>
                </div>
                <p className="about-game-desc">{game.tagline}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Section 3: Play Your Way */}
        <section>
          <h2 className="font-heading">
            <Flame size={20} className="icon-cyan" /> PLAY YOUR WAY
          </h2>
          <p>
            All six arcade games are unlocked and playable anytime at your own pace. For players seeking structured daily targets, ONE MORE RUSH features dual Daily Challenges:
          </p>
          <ul>
            <li><strong>🟢 Quick Win:</strong> A balanced daily objective designed for a satisfying, accessible daily streak milestone.</li>
            <li><strong>🔴 Extreme Rush:</strong> An intense, high-difficulty challenge engineered for players wanting to push their limits.</li>
          </ul>
        </section>

        {/* Section 4: Rush Points & Fairness */}
        <section>
          <h2 className="font-heading">
            <Gem size={20} className="icon-cyan" /> RUSH POINTS & COSMETICS
          </h2>
          <p>
            <strong>Rush Points (RP)</strong> are an in-site progression currency earned purely through gameplay, milestone scores, and completing Daily Challenges.
          </p>
          <div className="info-callout-box gold">
            <span className="info-callout-title font-mono">100% COSMETIC — ZERO GAMEPLAY ADVANTAGE</span>
            <p className="info-callout-desc">
              Rush Points do not provide gameplay advantages, do not boost multipliers, do not alter scoring formulas, and do not make games easier. Every player competes on equal footing.
            </p>
          </div>
        </section>

        {/* Section 5: Rush Locker */}
        <section>
          <h2 className="font-heading">
            <Shield size={20} className="icon-cyan" /> THE RUSH LOCKER
          </h2>
          <p>
            Spend earned Rush Points in the Locker to personalize your arcade identity:
          </p>
          <ul>
            <li><strong>Profile Frames:</strong> Distinct glowing borders around your player profile (Classic, Neon, Cyber, Inferno, Void).</li>
            <li><strong>Player Titles:</strong> Showcase your achievement style (Rookie, One More, Speed Demon, Reflex Master, High Score Hunter).</li>
            <li><strong>Victory Effects:</strong> Celebratory visual effects that trigger upon setting records (Classic, Confetti, Neon Burst, Starfall, Lightning, Glitch).</li>
          </ul>
        </section>

        {/* Section 6: Built for the Browser */}
        <section>
          <h2 className="font-heading">
            <Globe size={20} className="icon-cyan" /> BUILT FOR THE BROWSER
          </h2>
          <p>
            ONE MORE RUSH is built with modern web technologies for instant responsiveness. It requires zero installs, zero external plugins, and zero accounts to start playing immediately.
          </p>
        </section>

        {/* Section 7: Bottom CTA Banner */}
        <div className="info-cta-banner">
          <div>
            <h3 className="info-cta-title font-heading">READY TO PLAY?</h3>
            <p className="info-cta-sub">Pick a game, chase your high score, and take one more try.</p>
          </div>
          <div className="info-cta-btns font-mono">
            <button
              className="btn-primary"
              onClick={() => onPlayGame && onPlayGame('dodge')}
            >
              <Play size={14} fill="currentColor" />
              <span>PLAY NOW</span>
            </button>
            <button
              className="btn-secondary"
              onClick={onNavigateToDaily}
            >
              <Flame size={14} />
              <span>DAILY CHALLENGE</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
