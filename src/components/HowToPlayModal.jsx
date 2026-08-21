import React, { useEffect } from 'react';
import { Play, X, ArrowRight, Target, Zap, Flame, Clock, Trophy, Gamepad2, Sparkles, Compass } from 'lucide-react';
import './HowToPlayModal.css';

export function HowToPlayModal({
  gameId = 'aim',
  gameName = 'AIM',
  title = '🎯 AIM',
  subtitle = 'How fast can you react?',
  overview,
  controls,
  skillsTested,
  proTip,
  rules = [
    {
      icon: <Target size={20} className="rule-icon icon-cyan" />,
      label: '1. HIT THE TARGET',
      desc: 'Click the target as quickly as you can.',
    },
    {
      icon: <Zap size={20} className="rule-icon icon-yellow" />,
      label: '2. BE FAST',
      desc: 'Every successful hit gives you points. Targets become smaller and harder to hit as you progress.',
    },
    {
      icon: <Flame size={20} className="rule-icon icon-pink" />,
      label: '3. BUILD YOUR COMBO',
      desc: 'Keep hitting targets without missing to increase your combo and score.',
    },
    {
      icon: <Clock size={20} className="rule-icon icon-violet" />,
      label: '4. WATCH THE CLOCK',
      desc: 'Your run ends when the timer runs out.',
    },
    {
      icon: <Trophy size={20} className="rule-icon icon-gold" />,
      label: '5. BEAT YOUR BEST',
      desc: 'Your goal is to get the highest score possible.',
    },
  ],
  flowSteps = ['TARGET APPEARS', 'CLICK IT', '+ SCORE', 'NEXT TARGET'],
  buttonText = 'GOT IT — PLAY',
  onStart,
  onClose,
}) {
  // Lock body & root scroll when modal is active
  useEffect(() => {
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, []);

  // Handle Escape key to close modal safely
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const cleanGameName = (gameName || title || 'Game').replace(/^[^\w\s]+/, '').trim();

  return (
    <div className="howtoplay-overlay" onClick={(e) => e.stopPropagation()}>
      <div className="howtoplay-modal glass-panel animate-pop">
        {/* Close button */}
        <button className="howtoplay-close-btn" onClick={onClose} aria-label="Close instructions">
          <X size={20} />
        </button>

        {/* Semantic Breadcrumbs for Crawlers and Users */}
        <nav className="howtoplay-breadcrumbs font-mono" aria-label="Breadcrumb">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onClose();
            }}
          >
            Home
          </a>
          <span className="crumb-sep">/</span>
          <a
            href="/#games-section"
            onClick={(e) => {
              e.preventDefault();
              onClose();
            }}
          >
            Games
          </a>
          <span className="crumb-sep">/</span>
          <span className="crumb-current">{cleanGameName}</span>
        </nav>

        {/* Modal Header with Primary H1 */}
        <div className="howtoplay-header">
          <h1 className="howtoplay-title font-heading">{title}</h1>
          <p className="howtoplay-subtitle">"{subtitle}"</p>
        </div>

        {/* Semantic Overview & Controls Summary */}
        {(overview || controls || skillsTested) && (
          <div className="howtoplay-overview-box">
            {overview && <p className="overview-text">{overview}</p>}
            <div className="overview-meta-row font-mono">
              {controls && (
                <div className="overview-meta-item">
                  <Gamepad2 size={13} className="meta-icon icon-cyan" />
                  <span><strong>Controls:</strong> {controls}</span>
                </div>
              )}
              {skillsTested && (
                <div className="overview-meta-item">
                  <Compass size={13} className="meta-icon icon-gold" />
                  <span><strong>Skills:</strong> {skillsTested}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Rules Grid */}
        <div className="howtoplay-rules">
          {rules.map((rule, idx) => (
            <div key={idx} className="rule-card">
              <div className="rule-card-header">
                {rule.icon}
                <span className="rule-label">{rule.label}</span>
              </div>
              <p className="rule-desc">{rule.desc}</p>
            </div>
          ))}
        </div>

        {/* Pro Tip Pill */}
        {proTip && (
          <div className="howtoplay-protip-card">
            <Sparkles size={14} className="protip-icon icon-pink" />
            <p className="protip-text"><strong>PRO TIP:</strong> {proTip}</p>
          </div>
        )}

        {/* Visual Flow Diagram */}
        <div className="howtoplay-flow">
          <span className="flow-title font-mono">GAMEPLAY LOOP</span>
          <div className="flow-steps">
            {flowSteps.map((step, idx) => (
              <React.Fragment key={idx}>
                <div className="flow-chip font-mono">{step}</div>
                {idx < flowSteps.length - 1 && (
                  <ArrowRight size={14} className="flow-arrow" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Primary Action Button */}
        <div className="howtoplay-footer">
          <button className="btn-primary start-now-btn" onClick={onStart}>
            <Play size={22} fill="currentColor" />
            <span>{buttonText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
