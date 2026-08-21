import React from 'react';
import { Volume2, VolumeX, Gem, Flame, User, LogIn, LogOut } from 'lucide-react';
import { BRAND } from '../config/brand';
import { useAuth } from '../context/AuthContext.jsx';
import { FRAMES_INVENTORY } from '../services/lockerService.js';
import './Header.css';

export function Header({ activeTab, onNavClick, audioFx, rushPoints = 0, streak = 0, locker }) {
  const { user, profile, isGuest } = useAuth();

  const username = profile?.username || user?.user_metadata?.username || 'Player';
  const equippedFrame =
    FRAMES_INVENTORY.find((f) => f.key === (profile?.avatar_frame || locker?.equipped?.frame)) || FRAMES_INVENTORY[0];
  const frameClass = equippedFrame.cssClass;

  return (
    <header className="platform-header">
      <div className="header-container">
        <div className="header-main-bar">
          {/* Brand Logo */}
          <a
            href="/"
            className="header-brand"
            onClick={(e) => {
              e.preventDefault();
              onNavClick('home');
            }}
            title="ONE MORE RUSH — Home"
          >
            <span className="logo-text">{BRAND.name}</span>
          </a>

          {/* Desktop Navigation Tabs */}
          <nav className="header-nav header-nav-desktop" aria-label="Main Navigation">
            {BRAND.navItems.map((item) => {
              const isActive = activeTab === item.id;
              const href = item.id === 'home' ? '/' : `/${item.id}`;
              return (
                <a
                  key={item.id}
                  href={href}
                  className={`nav-link ${isActive ? 'active' : ''} ${item.isPlaceholder ? 'placeholder' : ''}`}
                  onClick={(e) => {
                    e.preventDefault();
                    onNavClick(item.id);
                  }}
                  title={item.label}
                >
                  <span>{item.label}</span>
                  {item.isPlaceholder && <span className="soon-pill">SOON</span>}
                </a>
              );
            })}
          </nav>

          {/* Header Actions (Auth, Rush Points, Streak, Sound Toggle) */}
          <div className="header-actions">
            {streak > 0 ? (
              <div className="header-streak-pill font-mono" title={`Current Daily Streak: ${streak} days`}>
                <Flame size={14} className="header-flame-icon" />
                <span>{streak}</span>
              </div>
            ) : (
              <a
                href="/daily"
                className="header-streak-pill streak-zero font-mono"
                onClick={(e) => {
                  e.preventDefault();
                  onNavClick('daily');
                }}
                title="0 Day Streak — Play Daily Challenge to start your streak!"
              >
                <Flame size={14} className="header-flame-icon dim" />
                <span>0d</span>
              </a>
            )}

            <div className="header-rp-pill font-mono" title="Rush Points Balance">
              <Gem size={14} className="header-gem-icon" />
              <span>{rushPoints.toLocaleString()} RP</span>
            </div>

            {/* Authentication State Button */}
            {isGuest || !user ? (
              <a
                href="/login"
                className="header-auth-btn btn-guest font-mono"
                onClick={(e) => {
                  e.preventDefault();
                  onNavClick('login');
                }}
                title="Sign In to Claim Username & Save Online Records"
              >
                <LogIn size={14} />
                <span className="auth-btn-label">SIGN IN</span>
              </a>
            ) : (
              <div className="header-user-group">
                <a
                  href="/profile"
                  className={`header-user-btn font-mono ${activeTab === 'profile' ? 'active' : ''}`}
                  onClick={(e) => {
                    e.preventDefault();
                    onNavClick('profile');
                  }}
                  title={`Logged in as ${username}`}
                >
                  <div className={`header-mini-avatar ${frameClass}`}>
                    <User size={13} />
                  </div>
                  <span className="header-username-label">{username}</span>
                </a>
              </div>
            )}

            <button
              className="sound-btn"
              onClick={audioFx.toggleMute}
              title={audioFx.muted ? 'Unmute Sound' : 'Mute Sound'}
              aria-label="Toggle Sound"
            >
              {audioFx.muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Sub-bar */}
        <nav className="header-nav header-nav-mobile" aria-label="Mobile Navigation">
          {BRAND.navItems.map((item) => {
            const isActive = activeTab === item.id;
            const href = item.id === 'home' ? '/' : `/${item.id}`;
            return (
              <a
                key={item.id}
                href={href}
                className={`nav-link ${isActive ? 'active' : ''} ${item.isPlaceholder ? 'placeholder' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  onNavClick(item.id);
                }}
                title={item.label}
              >
                <span>{item.label}</span>
                {item.isPlaceholder && <span className="soon-pill">SOON</span>}
              </a>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
