import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { getEquippedVictoryEffect } from '../services/lockerService';
import './VictoryEffectOverlay.css';

/**
 * Shared Victory Effect Presentation Component
 * Renders the equipped or specified cosmetic victory effect upon game completion or preview.
 * 100% cosmetic, pointer-events: none, respects prefers-reduced-motion.
 */
export function VictoryEffectOverlay({
  effectKey = null,
  triggerKey = 0,
  isInlinePreview = false,
  onComplete = null,
}) {
  const [activeEffect, setActiveEffect] = useState(() => effectKey || getEquippedVictoryEffect());
  const [isPlaying, setIsPlaying] = useState(true);
  const containerRef = useRef(null);

  // Update active effect key when props change or locker state changes
  useEffect(() => {
    setActiveEffect(effectKey || getEquippedVictoryEffect());
    setIsPlaying(true);
  }, [effectKey, triggerKey]);

  // Handle effect execution lifecycle
  useEffect(() => {
    if (!isPlaying) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Confetti effect triggering via canvas-confetti
    if (activeEffect === 'confetti' && !prefersReducedMotion) {
      if (isInlinePreview && containerRef.current) {
        // If inline, trigger localized mini-burst
        const rect = containerRef.current.getBoundingClientRect();
        const x = (rect.left + rect.width / 2) / window.innerWidth;
        const y = (rect.top + rect.height / 2) / window.innerHeight;
        confetti({
          particleCount: 25,
          spread: 45,
          startVelocity: 18,
          origin: { x: Math.max(0.1, Math.min(0.9, x)), y: Math.max(0.1, Math.min(0.9, y)) },
          colors: ['#00f2fe', '#ff3562', '#ffd166', '#a06cd5', '#00e676'],
          disableForReducedMotion: true,
        });
      } else {
        // Full completion celebration
        confetti({
          particleCount: 55,
          spread: 75,
          origin: { y: 0.6 },
          colors: ['#00f2fe', '#ff3562', '#ffd166', '#a06cd5', '#00e676'],
          disableForReducedMotion: true,
        });
      }
    }

    // Effect duration timer
    const duration = activeEffect === 'confetti' || activeEffect === 'starfall' ? 1200 : 850;
    const timer = setTimeout(() => {
      setIsPlaying(false);
      onComplete?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [activeEffect, isPlaying, isInlinePreview, onComplete, triggerKey]);

  if (!isPlaying) return null;

  return (
    <div
      ref={containerRef}
      className={`victory-effect-root ${isInlinePreview ? 'victory-inline-preview' : 'victory-fullscreen-overlay'} effect-${activeEffect}`}
      aria-hidden="true"
    >
      {/* 1. CLASSIC: Subtle cyan/white flash + sparkle burst */}
      {activeEffect === 'classic' && (
        <div className="effect-classic-layer">
          <div className="classic-flash-radial" />
          <div className="classic-sparkles-container">
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, idx) => (
              <div
                key={idx}
                className="classic-sparkle-dot"
                style={{
                  '--angle': `${angle}deg`,
                  '--delay': `${(idx % 3) * 0.05}s`,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* 2. CONFETTI: Confetti canvas handled in useEffect, with subtle ambient glow */}
      {activeEffect === 'confetti' && (
        <div className="effect-confetti-layer">
          <div className="confetti-ambient-glow" />
        </div>
      )}

      {/* 3. NEON BURST: Expanding shockwave rings + central flare */}
      {activeEffect === 'neon_burst' && (
        <div className="effect-neon-layer">
          <div className="neon-center-flare" />
          <div className="neon-ring ring-1" />
          <div className="neon-ring ring-2" />
          <div className="neon-ring ring-3" />
        </div>
      )}

      {/* 4. STARFALL: Premium starlight cascade with falling glowing stars */}
      {(activeEffect === 'starfall' || activeEffect === 'pixel_explosion') && (
        <div className="effect-starfall-layer">
          <div className="starfall-top-glow" />
          <div className="starfall-cascade-container">
            {[
              { x: -85, delay: 0.0, speed: 0.95, size: 7, color: '#ffd166' },
              { x: -45, delay: 0.15, speed: 1.05, size: 9, color: '#ffffff' },
              { x: -10, delay: 0.08, speed: 1.1, size: 6, color: '#00f2fe' },
              { x: 25, delay: 0.25, speed: 0.9, size: 8, color: '#ffd166' },
              { x: 65, delay: 0.18, speed: 1.0, size: 7, color: '#ffffff' },
              { x: 95, delay: 0.32, speed: 0.95, size: 8, color: '#ffeaa7' },
              { x: 0, delay: 0.4, speed: 1.0, size: 10, color: '#ffffff' },
            ].map((star, idx) => (
              <div
                key={idx}
                className="starfall-streak"
                style={{
                  '--start-x': `${star.x}px`,
                  '--delay': `${star.delay}s`,
                  '--duration': `${star.speed}s`,
                  '--star-size': `${star.size}px`,
                  '--star-color': star.color,
                }}
              >
                <div className="starfall-head" />
                <div className="starfall-tail" />
                <div className="starfall-sparkle" />
              </div>
            ))}
          </div>
          <div className="starfall-ambient-glow" />
        </div>
      )}

      {/* 5. LIGHTNING: High-voltage electric arc discharge & lightning paths */}
      {activeEffect === 'lightning' && (
        <div className="effect-lightning-layer">
          <div className="lightning-screen-flash" />
          <svg className="lightning-arcs-svg" viewBox="0 0 400 400" preserveAspectRatio="none">
            {/* Top-left to center arc */}
            <path
              className="lightning-bolt bolt-1"
              d="M 50 50 L 120 110 L 105 135 L 170 180 L 195 200"
            />
            {/* Top-right to center arc */}
            <path
              className="lightning-bolt bolt-2"
              d="M 350 50 L 290 120 L 305 140 L 230 185 L 205 200"
            />
            {/* Bottom-left to center arc */}
            <path
              className="lightning-bolt bolt-3"
              d="M 60 340 L 130 280 L 115 260 L 180 220 L 195 200"
            />
            {/* Bottom-right to center arc */}
            <path
              className="lightning-bolt bolt-4"
              d="M 340 340 L 270 280 L 285 260 L 220 220 L 205 200"
            />
          </svg>
        </div>
      )}

      {/* 6. GLITCH: Reality-bending cyber scan wave & RGB chromatic aberration */}
      {activeEffect === 'glitch' && (
        <div className="effect-glitch-layer">
          <div className="glitch-slice slice-top" />
          <div className="glitch-slice slice-mid" />
          <div className="glitch-slice slice-bot" />
          <div className="glitch-scanlines" />
          <div className="glitch-chromatic-cyan" />
          <div className="glitch-chromatic-pink" />
        </div>
      )}
    </div>
  );
}
