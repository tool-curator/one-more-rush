import React, { useState } from 'react';
import { Flame, ChevronDown, ChevronUp, Target, Gem, Sparkles } from 'lucide-react';
import './DailyChallengeOverlay.css';

export function DailyChallengeOverlay({ challenge }) {
  const [collapsed, setCollapsed] = useState(false);

  if (!challenge) return null;

  const isQuickWin = challenge.tier === 'QUICK_WIN';

  return (
    <div className={`daily-hud-overlay ${isQuickWin ? 'hud-quick-win' : 'hud-extreme'} ${collapsed ? 'hud-collapsed' : ''}`}>
      <div className="daily-hud-header" onClick={() => setCollapsed(!collapsed)}>
        <div className="hud-title-wrap">
          {isQuickWin ? (
            <Sparkles size={14} className="hud-icon-quick" />
          ) : (
            <Flame size={14} className="hud-icon-extreme" />
          )}
          <span className="hud-tier-label font-mono">
            {isQuickWin ? 'QUICK WIN:' : 'EXTREME:'}
          </span>
          <span className="hud-challenge-title">{challenge.title}</span>
        </div>

        <button
          className="hud-toggle-btn"
          aria-label={collapsed ? 'Expand Daily Challenge' : 'Collapse Daily Challenge'}
        >
          {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </button>
      </div>

      {!collapsed && (
        <div className="daily-hud-body">
          <div className="hud-objectives-grid">
            {challenge.objectives.map((obj) => (
              <div key={obj.id} className="hud-objective-row font-mono">
                <Target size={12} className={isQuickWin ? 'hud-target-quick' : 'hud-target-extreme'} />
                <span className="hud-obj-text">{obj.label}</span>
              </div>
            ))}
          </div>

          <div className="hud-reward-row font-mono">
            <Gem size={12} className={isQuickWin ? 'hud-gem-quick' : 'hud-gem-extreme'} />
            <span>REWARD: +{challenge.rewardPoints} RP</span>
          </div>
        </div>
      )}
    </div>
  );
}
