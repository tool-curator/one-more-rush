import React, { useEffect } from 'react';
import { Trophy, X, Sparkles } from 'lucide-react';
import './AchievementUnlockToast.css';

export function AchievementUnlockToast({ badges = [], onDismiss }) {
  if (!badges || badges.length === 0) return null;

  return (
    <div className="achievement-toast-container" role="status" aria-live="polite">
      {badges.map((badge) => (
        <AchievementToastItem key={badge.key || badge.id} badge={badge} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function AchievementToastItem({ badge, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(badge.key || badge.id);
    }, 4500);

    return () => clearTimeout(timer);
  }, [badge, onDismiss]);

  const rarityClass = (badge.rarity || 'common').toLowerCase();

  return (
    <div className={`achievement-toast-card glass-panel rarity-${rarityClass} animate-achievement-pop`}>
      <div className="achievement-toast-glow-ring" />
      
      <div className="achievement-toast-header">
        <div className="achievement-trophy-pill font-mono">
          <Trophy size={12} className="trophy-icon" />
          <span>ACHIEVEMENT UNLOCKED</span>
        </div>
        <button
          type="button"
          className="achievement-toast-close"
          onClick={() => onDismiss(badge.key || badge.id)}
          aria-label="Dismiss achievement notification"
        >
          <X size={14} />
        </button>
      </div>

      <div className="achievement-toast-body">
        <div className="achievement-icon-wrapper">
          <span className="achievement-emoji-icon">{badge.icon || '🏆'}</span>
          <div className="achievement-sparkle-flair">
            <Sparkles size={14} />
          </div>
        </div>

        <div className="achievement-details">
          <h4 className="achievement-badge-name font-heading">{badge.name}</h4>
          <p className="achievement-unlock-cond font-mono">{badge.unlockCondition || badge.description}</p>
        </div>
      </div>
    </div>
  );
}
