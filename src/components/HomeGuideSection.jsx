import React from 'react';
import { ArrowRight, Zap, Trophy, Flame, HelpCircle, ShieldCheck, Sparkles, Gem, Layers } from 'lucide-react';
import { PLATFORM_CONTENT } from '../config/platformContent.js';
import './HomeGuideSection.css';

export function HomeGuideSection({ onPlayGame, onNavClick }) {
  const content = PLATFORM_CONTENT.home;

  return (
    <section className="home-guide-section" id="arcade-guide">
      <div className="home-guide-wrapper">
        {/* Section 1: Platform Overview & Architecture */}
        <div className="guide-block-header">
          <div className="guide-badge-pill font-mono">
            <Sparkles size={13} className="text-cyan" />
            <span>ORIGINAL BROWSER ARCADE</span>
          </div>
          <h2 className="guide-main-heading font-heading">WHY ONE MORE RUSH?</h2>
          <p className="guide-main-subtitle">{content.introduction}</p>
        </div>

        <div className="pillars-grid">
          {content.pillars.map((pillar, idx) => (
            <div key={idx} className="pillar-card glass-panel">
              <div className="pillar-icon-box">
                {idx === 0 ? <Zap size={22} className="text-cyan" /> : idx === 1 ? <ShieldCheck size={22} className="text-emerald" /> : <Flame size={22} className="text-pink" />}
              </div>
              <h3 className="pillar-title font-heading">{pillar.title}</h3>
              <p className="pillar-desc">{pillar.description}</p>
            </div>
          ))}
        </div>

        {/* Section 2: The Six Arcade Disciplines */}
        <div className="disciplines-container">
          <div className="disciplines-header">
            <h2 className="guide-sub-heading font-heading">SIX DEDICATED SKILL DISCIPLINES</h2>
            <p className="guide-sub-text">
              Each game on One More Rush is built on an independent canvas engine testing a specific cognitive skill.
            </p>
          </div>

          <div className="disciplines-grid">
            {content.disciplines.map((item) => (
              <div key={item.id} className="discipline-card glass-panel">
                <div className="discipline-top">
                  <span className="discipline-icon" role="img" aria-label={item.name}>{item.icon}</span>
                  <div className="discipline-meta">
                    <h3 className="discipline-name font-heading">{item.name}</h3>
                    <span className="discipline-cat font-mono">{item.category}</span>
                  </div>
                </div>
                <p className="discipline-desc">{item.summary}</p>
                <div className="discipline-footer">
                  <a
                    href={`/games/${item.id}`}
                    className="discipline-link font-mono"
                    onClick={(e) => {
                      e.preventDefault();
                      if (onPlayGame) onPlayGame(item.id);
                    }}
                  >
                    <span>PLAY {item.name}</span>
                    <ArrowRight size={14} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Progression & Virtual Economy Transparency */}
        <div className="progression-banner glass-panel">
          <div className="progression-content">
            <span className="progression-tag font-mono">
              <Gem size={14} className="text-gold" /> PROGRESSION &amp; REWARDS
            </span>
            <h2 className="progression-title font-heading">VIRTUAL RUSH POINTS &amp; THE RUSH LOCKER</h2>
            <p className="progression-text">{content.progressionOverview}</p>
            <div className="progression-links font-mono">
              <a
                href="/daily"
                className="progression-btn btn-daily-link"
                onClick={(e) => {
                  e.preventDefault();
                  if (onNavClick) onNavClick('daily');
                }}
              >
                <span>EXPLORE DAILY CHALLENGES</span>
                <ArrowRight size={14} />
              </a>
              <a
                href="/locker"
                className="progression-btn btn-locker-link"
                onClick={(e) => {
                  e.preventDefault();
                  if (onNavClick) onNavClick('locker');
                }}
              >
                <span>OPEN RUSH LOCKER</span>
                <ArrowRight size={14} />
              </a>
              <a
                href="/leaderboard"
                className="progression-btn btn-leaderboard-link"
                onClick={(e) => {
                  e.preventDefault();
                  if (onNavClick) onNavClick('leaderboard');
                }}
              >
                <span>GLOBAL LEADERBOARDS</span>
                <ArrowRight size={14} />
              </a>
            </div>
          </div>
        </div>

        {/* Section 4: Frequently Asked Questions */}
        <div className="home-faq-container">
          <div className="faq-header">
            <h2 className="guide-sub-heading font-heading">FREQUENTLY ASKED QUESTIONS</h2>
            <p className="guide-sub-text">Everything you need to know about playing on One More Rush.</p>
          </div>

          <dl className="home-faq-list">
            {content.faq.map((item, idx) => (
              <div key={idx} className="home-faq-item glass-panel">
                <dt className="home-faq-question font-heading">
                  <HelpCircle size={18} className="text-cyan" aria-hidden="true" />
                  <span>{item.q}</span>
                </dt>
                <dd className="home-faq-answer">{item.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
