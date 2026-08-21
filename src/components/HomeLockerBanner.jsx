import React from 'react';
import { Gem, Sparkles, ArrowRight, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { FRAMES_INVENTORY, TITLES_INVENTORY } from '../services/lockerService.js';
import './HomeLockerBanner.css';

export function HomeLockerBanner({ rushPoints = 0, onOpenLocker, locker }) {
  const { profile } = useAuth();
  const equippedFrame =
    FRAMES_INVENTORY.find((f) => f.key === (profile?.avatar_frame || locker?.equipped?.frame)) || FRAMES_INVENTORY[0];
  const equippedTitle =
    TITLES_INVENTORY.find((t) => t.key === (profile?.title || locker?.equipped?.title)) || TITLES_INVENTORY[0];

  return (
    <section className="home-locker-section" id="locker-section">
      <div className="home-locker-card glass-panel">
        <div className="locker-card-left">
          <div className="locker-mini-badge font-mono">
            <Sparkles size={13} className="icon-gold" />
            <span>COSMETICS ARMORY</span>
          </div>
          <h3 className="locker-banner-title font-heading">RUSH LOCKER</h3>
          <p className="locker-banner-desc">
            Personalize your arcade identity. Unlock exclusive profile frames, titles, and victory effects.
          </p>
        </div>

        <div className="locker-card-right font-mono">
          {/* Equipped Profile Frame Mini Showcase */}
          <div
            className="locker-equipped-preview-pill"
            onClick={onOpenLocker}
            title={`Equipped Frame: ${equippedFrame.name}`}
          >
            <div className={`avatar-frame-wrapper mini-frame ${equippedFrame.cssClass}`}>
              <div className="avatar-circle">
                <User size={18} className="avatar-icon" />
              </div>
            </div>
            <div className="equipped-preview-text">
              <span className="equipped-preview-lbl">ACTIVE FRAME</span>
              <span className="equipped-preview-name">{equippedFrame.name}</span>
            </div>
          </div>

          <div className="locker-balance-box">
            <Gem size={18} className="icon-gem-cyan" />
            <div className="balance-text-wrap">
              <span className="balance-label">YOUR BALANCE:</span>
              <span className="balance-val">{rushPoints.toLocaleString()} RP</span>
            </div>
          </div>

          <button
            className="btn-primary btn-open-locker"
            onClick={onOpenLocker}
            aria-label="Open Rush Locker"
          >
            <span>OPEN LOCKER</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}
