import React, { useState } from 'react';
import { User, Shield, Gem, Sparkles, Tag, Zap, LogOut, Edit3, ArrowRight, Check, AlertCircle, Calendar, Gamepad2, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { FRAMES_INVENTORY, TITLES_INVENTORY, EFFECTS_INVENTORY } from '../services/lockerService.js';
import { isPlaceholderUsername, hasUsedUsernameChange } from '../services/authService.js';
import { UsernameSetupModal } from '../components/UsernameSetupModal.jsx';
import './ProfilePage.css';

export function ProfilePage({
  locker,
  rushPoints = 0,
  onNavigateToLocker,
  onNavigateToDaily,
  onNavigateToLogin,
  onNavigateToSignup,
  onNavigateToHome,
}) {
  const { user, profile, isGuest, signOut } = useAuth();
  const [showEditModal, setShowEditModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Resolved equipped cosmetic items from existing profile or Locker state
  const equippedFrame =
    FRAMES_INVENTORY.find((f) => f.key === (profile?.avatar_frame || locker?.equipped?.frame)) || FRAMES_INVENTORY[0];
  const equippedTitle =
    TITLES_INVENTORY.find((t) => t.key === (profile?.title || locker?.equipped?.title)) || TITLES_INVENTORY[0];
  const equippedEffect =
    EFFECTS_INVENTORY.find((e) => e.key === (profile?.victory_effect || locker?.equipped?.effect)) || EFFECTS_INVENTORY[0];

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await signOut();
      if (onNavigateToHome) onNavigateToHome();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setLoggingOut(false);
    }
  };

  // 1. Guest Player Profile View
  if (isGuest || !user) {
    return (
      <div className="profile-page-container">
        <div className="profile-card glass-panel animate-pop">
          <div className="guest-profile-hero">
            <div className="guest-avatar-wrapper">
              <User size={48} />
            </div>
            <span className="guest-badge font-mono">GUEST ARCADE PROFILE</span>
            <h1 className="profile-hero-title font-heading">LOCAL GUEST PLAYER</h1>
            <p className="profile-hero-desc">
              Your scores, daily streak, and unlocked cosmetics are saved locally in your browser storage.
            </p>
          </div>

          <div className="profile-stats-grid font-mono">
            <div className="stat-box">
              <span className="stat-lbl">RUSH POINTS</span>
              <span className="stat-val highlight-gold">
                <Gem size={16} /> {rushPoints.toLocaleString()} RP
              </span>
            </div>
            <div className="stat-box">
              <span className="stat-lbl">DAILY STREAK</span>
              <span className="stat-val highlight-pink">
                <Zap size={16} /> {locker?.streak || 0} DAYS
              </span>
            </div>
            <div className="stat-box">
              <span className="stat-lbl">COSMETICS OWNED</span>
              <span className="stat-val highlight-cyan">
                <Sparkles size={16} />{' '}
                {(locker?.owned?.frames?.length || 1) +
                  (locker?.owned?.titles?.length || 1) +
                  (locker?.owned?.effects?.length || 1)}
              </span>
            </div>
          </div>

          <div className="upgrade-prompt-card glass-panel">
            <div className="upgrade-icon">
              <Shield size={28} className="icon-cyan" />
            </div>
            <div className="upgrade-copy">
              <h3 className="upgrade-title font-heading">SAVE YOUR PROGRESS TO THE CLOUD</h3>
              <p className="upgrade-desc">
                Sign in to secure your unique username, protect your records, and unlock future global leaderboard eligibility.
              </p>
            </div>
            <div className="upgrade-actions font-mono">
              <button className="btn-primary" onClick={onNavigateToSignup}>
                CREATE ACCOUNT
              </button>
              <button className="btn-secondary" onClick={onNavigateToLogin}>
                SIGN IN
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Authenticated Player View
  const username = profile?.username || user?.user_metadata?.username || 'Player';
  const displayName = profile?.display_name || user?.user_metadata?.display_name || username;
  const isInitial = isPlaceholderUsername(username, user?.id);
  const isChangeUsed = !isInitial && hasUsedUsernameChange(user?.id, profile);
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : 'Recent';

  return (
    <div className="profile-page-container">
      <div className="profile-card glass-panel animate-pop">
        {/* Profile Header Header */}
        <div className="profile-card-header">
          {/* Avatar with Equipped Frame */}
          <div className={`avatar-frame-wrapper ${equippedFrame.cssClass}`}>
            <div className="avatar-circle">
              <User size={42} className="avatar-icon" />
            </div>
          </div>

          <div className="profile-identity-col">
            <div className="profile-badge-row">
              <span className="account-status-pill font-mono">
                <Shield size={12} className="icon-cyan" /> VERIFIED PLAYER
              </span>
            </div>

            <div className="profile-name-row">
              <h1 className="profile-player-username font-heading">{username}</h1>
              {!isChangeUsed ? (
                <button
                  className="btn-edit-handle"
                  onClick={() => setShowEditModal(true)}
                  title={isInitial ? 'Set Username' : 'Edit Username (1 change allowed)'}
                  aria-label="Edit Username"
                >
                  <Edit3 size={15} />
                </button>
              ) : (
                <span className="username-locked-pill font-mono" title="Username change limit reached">
                  <Lock size={11} /> LOCKED
                </span>
              )}
            </div>

            {isChangeUsed && (
              <div className="username-change-used-notice font-mono">
                <span className="notice-badge">USERNAME CHANGE USED</span>
                <span className="notice-text">Your username can no longer be changed.</span>
              </div>
            )}

            <span
              className="profile-equipped-title-tag font-mono"
              style={{ color: equippedTitle.accentColor }}
            >
              {equippedTitle.name}
            </span>

            <div className="profile-meta-row font-mono">
              <span className="profile-email-meta">{user.email}</span>
              <span className="meta-separator">•</span>
              <span className="profile-date-meta">
                <Calendar size={12} /> Joined {memberSince}
              </span>
            </div>
          </div>

          <button
            className="btn-secondary btn-logout font-mono"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            <LogOut size={15} />
            <span>{loggingOut ? 'LOGGING OUT...' : 'LOG OUT'}</span>
          </button>
        </div>

        {/* Player Cosmetics & Identity Summary */}
        <div className="profile-sections-grid">
          <div className="profile-section-card glass-panel">
            <div className="section-card-title font-mono">
              <Sparkles size={14} className="icon-cyan" />
              <span>EQUIPPED COSMETICS</span>
            </div>

            <div className="cosmetics-list font-mono">
              <div className="cosmetic-item">
                <span className="cosmetic-lbl">FRAME:</span>
                <span className="cosmetic-val">{equippedFrame.name}</span>
              </div>
              <div className="cosmetic-item">
                <span className="cosmetic-lbl">TITLE:</span>
                <span className="cosmetic-val" style={{ color: equippedTitle.accentColor }}>
                  {equippedTitle.name}
                </span>
              </div>
              <div className="cosmetic-item">
                <span className="cosmetic-lbl">VICTORY EFFECT:</span>
                <span className="cosmetic-val">{equippedEffect.name}</span>
              </div>
            </div>

            <button
              className="btn-secondary btn-full font-mono"
              onClick={onNavigateToLocker}
            >
              <span>MANAGE LOCKER</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="profile-section-card glass-panel">
            <div className="section-card-title font-mono">
              <Gem size={14} className="icon-gold" />
              <span>RUSH REWARDS</span>
            </div>

            <div className="rewards-summary font-mono">
              <div className="rewards-balance-box">
                <span className="balance-lbl">AVAILABLE POINTS</span>
                <span className="balance-num highlight-cyan">
                  <Gem size={18} /> {rushPoints.toLocaleString()} RP
                </span>
              </div>
              <p className="rewards-hint">
                Earn Rush Points by completing daily challenges and setting new personal records across all 6 arcade games.
              </p>
            </div>

            <button
              className="btn-secondary btn-full font-mono"
              onClick={onNavigateToDaily}
            >
              <span>DAILY MISSIONS</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Edit Username Modal */}
      <UsernameSetupModal
        isOpen={showEditModal}
        onComplete={() => setShowEditModal(false)}
        onSkip={() => setShowEditModal(false)}
      />
    </div>
  );
}
