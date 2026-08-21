import React, { useState, useEffect, useRef } from 'react';
import { User, Check, AlertCircle, Sparkles, ArrowRight, Lock } from 'lucide-react';
import {
  validateUsername,
  updateProfile,
  isUsernameAvailable,
  isPlaceholderUsername,
  hasUsedUsernameChange,
  markUsernameChangeUsed,
} from '../services/authService.js';
import { useAuth } from '../context/AuthContext.jsx';
import './UsernameSetupModal.css';

export function UsernameSetupModal({ isOpen, onComplete, onSkip }) {
  const { user, profile, updateProfileState } = useAuth();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const modalRef = useRef(null);
  const inputRef = useRef(null);
  const prevFocusedRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !user) return;

    prevFocusedRef.current = document.activeElement;
    inputRef.current?.focus();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        // If an onSkip callback is provided, allow dismissal via Escape.
        // If mandatory (no onSkip), Escape is intentionally disabled.
        if (onSkip) {
          e.preventDefault();
          onSkip();
        }
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusables = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      prevFocusedRef.current?.focus?.();
    };
  }, [isOpen, user, onSkip]);

  if (!isOpen || !user) return null;

  const isInitialSetup = isPlaceholderUsername(profile?.username, user.id);
  const changeAlreadyUsed = !isInitialSetup && hasUsedUsernameChange(user.id, profile);

  const handleChange = (e) => {
    const val = e.target.value.replace(/\s+/g, ''); // strip spaces automatically
    setUsername(val);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (changeAlreadyUsed) {
      setError('Your one-time username change has already been used.');
      return;
    }
    setError(null);

    const validation = validateUsername(username);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    setLoading(true);

    try {
      // Check availability first
      const { available, error: availErr } = await isUsernameAvailable(validation.sanitized, user.id);
      if (availErr) {
        setError(availErr);
        setLoading(false);
        return;
      }
      if (!available) {
        setError('This username is already taken. Please choose another.');
        setLoading(false);
        return;
      }

      // Update database profile
      const { profile: updated, error: updateErr } = await updateProfile(user.id, {
        username: validation.sanitized,
        display_name: validation.sanitized,
      });

      if (updateErr) {
        setError(updateErr);
        setLoading(false);
        return;
      }

      // If this was an update to an existing custom username, record one-time change usage
      if (!isInitialSetup) {
        markUsernameChangeUsed(user.id);
      }

      updateProfileState(updated);
      setSuccess(true);
      setTimeout(() => {
        if (onComplete) onComplete(updated);
      }, 700);
    } catch (err) {
      setError(err.message || 'Failed to update username.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="username-modal-backdrop animate-fade"
      role="dialog"
      aria-modal="true"
      aria-labelledby="username-modal-title-id"
    >
      <div ref={modalRef} className="username-modal-card glass-panel animate-pop">
        <div className="username-modal-header">
          <div className="modal-icon-badge">
            {changeAlreadyUsed ? <Lock size={24} className="icon-pink" /> : <Sparkles size={24} className="icon-cyan" />}
          </div>
          <h2 id="username-modal-title-id" className="modal-title font-heading">
            {changeAlreadyUsed ? 'USERNAME LOCKED' : isInitialSetup ? 'CLAIM YOUR HANDLE' : 'EDIT USERNAME'}
          </h2>
          <p className="modal-subtitle">
            {changeAlreadyUsed
              ? 'Your one-time username change has already been used. Usernames can no longer be modified.'
              : isInitialSetup
              ? 'Choose a unique username for your player profile and global leaderboard identity.'
              : 'You can change your handle one time. After this update, your username becomes permanent.'}
          </p>
        </div>

        {changeAlreadyUsed ? (
          <div className="username-used-locked-box font-mono animate-pop">
            <div className="auth-alert alert-error font-mono">
              <Lock size={16} />
              <span>USERNAME CHANGE USED: Your username can no longer be changed.</span>
            </div>
            <div className="modal-actions" style={{ marginTop: '16px' }}>
              <button
                type="button"
                className="btn-secondary btn-full font-mono"
                onClick={onSkip || onComplete}
              >
                CLOSE
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="username-modal-form">
            <div className="input-group">
              <label htmlFor="username-input" className="input-label font-mono">
                <span>USERNAME</span>
                <span className="char-counter">{username.length}/20</span>
              </label>
              <div className="input-wrapper">
                <User size={18} className="input-icon" />
                <input
                  id="username-input"
                  type="text"
                  className="modal-input font-mono"
                  placeholder="e.g. RushMaster_99"
                  value={username}
                  onChange={handleChange}
                  maxLength={20}
                  autoFocus
                  disabled={loading || success}
                  autoComplete="off"
                  spellCheck="false"
                />
              </div>
              <span className="input-hint font-mono">
                3–20 characters • Letters, numbers, and underscores only
              </span>
            </div>

            {error && (
              <div className="auth-alert alert-error font-mono animate-pop">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="auth-alert alert-success font-mono animate-pop">
                <Check size={16} />
                <span>Username claimed! Setting up your profile...</span>
              </div>
            )}

            <div className="modal-actions">
              {onSkip && (
                <button
                  type="button"
                  className="btn-secondary btn-skip font-mono"
                  onClick={onSkip}
                  disabled={loading || success}
                >
                  CANCEL
                </button>
              )}
              <button
                type="submit"
                className="btn-primary btn-submit-username font-mono"
                disabled={loading || success || username.trim().length < 3}
              >
                {loading ? (
                  <span>SAVING...</span>
                ) : success ? (
                  <>
                    <Check size={16} /> <span>SAVED!</span>
                  </>
                ) : (
                  <>
                    <span>{isInitialSetup ? 'CONFIRM USERNAME' : 'UPDATE USERNAME (1x)'}</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

