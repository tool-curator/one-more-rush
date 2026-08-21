import React from 'react';
import { Play, Flame, ArrowRight } from 'lucide-react';
import { BRAND } from '../config/brand';
import './HeroSection.css';

export function HeroSection({ onPlayNow, onDailyChallenge }) {
  return (
    <section className="hero-section" id="hero-section">
      {/* 3-Layer Background: Grid Surface, Ambient Breathing Glows, Traveling Light Streaks */}
      <div className="hero-grid-perspective" aria-hidden="true">
        <div className="hero-grid-pattern" />
        
        {/* Soft Traveling Grid Streaks */}
        <div className="grid-streak streak-h1" />
        <div className="grid-streak streak-h2" />
        <div className="grid-streak streak-v1" />
        <div className="grid-streak streak-v2" />

        {/* Ambient Grid Pulse Energy Nodes */}
        <div className="grid-pulse pulse-1" />
        <div className="grid-pulse pulse-2" />
      </div>

      {/* Layered Breathing Radial Glows */}
      <div className="hero-radial-glow-primary" aria-hidden="true" />
      <div className="hero-radial-glow-secondary" aria-hidden="true" />

      {/* Hero Content with Staggered Entrance */}
      <div className="hero-content">
        {/* Brand Name */}
        <span className="hero-brand-name hero-animate-1">{BRAND.name}</span>

        {/* Main Visual Statement */}
        <h1 className="hero-title hero-animate-2">
          ONE MORE <span className="hero-title-accent">TRY.</span>
        </h1>

        {/* Supporting Subtitle */}
        <p className="hero-subtitle hero-animate-3">
          Quick games. High scores. Zero commitment.
        </p>

        {/* Dual Call to Action Buttons */}
        <div className="hero-cta-group hero-animate-4">
          <button
            className="btn-primary hero-play-btn"
            onClick={onPlayNow}
            aria-label="Play Featured Game Now"
          >
            <Play size={20} fill="currentColor" />
            <span>PLAY NOW</span>
          </button>

          <button
            className="btn-secondary hero-daily-btn"
            onClick={onDailyChallenge}
            aria-label="Jump to Daily Challenge"
          >
            <Flame size={18} className="hero-flame-icon" />
            <span>DAILY CHALLENGE</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}
