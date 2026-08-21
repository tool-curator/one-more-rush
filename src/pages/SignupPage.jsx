import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, UserPlus, ArrowRight, Sparkles, Gamepad2, AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import './LoginPage.css';

export function SignupPage({ onNavigateToLogin, onNavigateToHome, onNavigateToLocker, onSignupSuccess }) {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [migrationCapBlocked, setMigrationCapBlocked] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setMigrationCapBlocked(null);

    if (!email.trim()) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);

    try {
      const res = await signUp({
        email,
        password,
      });

      if (res.error === 'EXCEEDS_MIGRATION_CAP') {
        setMigrationCapBlocked({
          candidatePoints: res.candidatePoints || 50001,
          maxAllowed: res.maxAllowed || 50000,
        });
      } else if (res.error) {
        setError(res.error);
      } else if (res.needsEmailConfirmation) {
        setNeedsVerification(true);
      } else if (res.user) {
        if (onSignupSuccess) {
          onSignupSuccess(res.user);
        } else if (onNavigateToHome) {
          onNavigateToHome();
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to create account.');
    } finally {
      setLoading(false);
    }
  };

  // Check Migration Cap Warning Screen
  if (migrationCapBlocked) {
    return (
      <div className="auth-page-container">
        <div className="auth-card glass-panel animate-pop text-center">
          <div className="auth-header">
            <div className="modal-icon-badge" style={{ background: 'rgba(255, 183, 3, 0.15)', borderColor: 'rgba(255, 183, 3, 0.4)' }}>
              <AlertTriangle size={24} style={{ color: '#ffb703' }} />
            </div>
            <h1 className="auth-title font-heading" style={{ fontSize: '1.4rem' }}>RUSH POINTS MIGRATION LIMIT</h1>
            <p className="auth-subtitle" style={{ fontSize: '0.9rem', marginTop: '6px' }}>
              Your guest account currently has <strong style={{ color: '#ffd166' }}>{migrationCapBlocked.candidatePoints.toLocaleString()} RP</strong>.
            </p>
          </div>

          <div
            className="auth-alert font-mono text-left"
            style={{
              background: 'rgba(255, 183, 3, 0.08)',
              border: '1px solid rgba(255, 183, 3, 0.25)',
              borderRadius: '8px',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              fontSize: '0.82rem',
              color: '#f8fafc',
              lineHeight: 1.5,
              marginBottom: '20px',
            }}
          >
            <div>
              <span style={{ color: '#ffd166', fontWeight: 'bold' }}>⚠️ Migration Policy:</span> For security and economy integrity, guest accounts can migrate a maximum of <strong style={{ color: '#ffd166' }}>50,000 RP</strong> when creating a registered player account.
            </div>
            <div style={{ color: '#94a3b8' }}>
              Please spend or reduce your Rush Points to <strong>50,000 RP or below</strong> in the Rush Locker before continuing.
            </div>
            <div style={{ color: '#00e676', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
              <span>Your current guest progress and Rush Points will NOT be deleted.</span>
            </div>
          </div>

          <div className="auth-footer" style={{ borderTop: 'none', paddingTop: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              type="button"
              className="btn-primary btn-auth-submit font-mono"
              onClick={onNavigateToLocker || onNavigateToHome}
            >
              <Sparkles size={16} />
              <span>GO TO LOCKER & SPEND RP</span>
            </button>
            <button
              type="button"
              className="btn-guest-link font-mono"
              onClick={() => setMigrationCapBlocked(null)}
              style={{ color: '#94a3b8', fontSize: '0.82rem' }}
            >
              <span>Back to Sign Up Form</span>
            </button>
            <button
              type="button"
              className="btn-guest-link font-mono"
              onClick={onNavigateToHome}
            >
              <Gamepad2 size={15} />
              <span>Continue as Guest</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Check Email Verification Screen
  if (needsVerification) {
    return (
      <div className="auth-page-container">
        <div className="auth-card glass-panel animate-pop text-center">
          <div className="auth-header">
            <div className="modal-icon-badge">
              <Mail size={24} className="icon-cyan" />
            </div>
            <h1 className="auth-title font-heading">VERIFY YOUR EMAIL</h1>
            <p className="auth-subtitle">
              We've sent a verification link to <strong style={{ color: '#00f2fe' }}>{email}</strong>.
            </p>
          </div>

          <div className="auth-alert alert-success font-mono">
            <CheckCircle2 size={16} />
            <span>Check your inbox and click the link to activate your account.</span>
          </div>

          <div className="auth-footer" style={{ borderTop: 'none', paddingTop: 0 }}>
            <button
              type="button"
              className="btn-primary btn-auth-submit font-mono"
              onClick={onNavigateToLogin}
            >
              <span>PROCEED TO SIGN IN</span>
              <ArrowRight size={16} />
            </button>
            <button
              type="button"
              className="btn-guest-link font-mono"
              onClick={onNavigateToHome}
            >
              <Gamepad2 size={15} />
              <span>Continue as Guest</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page-container">
      <div className="auth-card glass-panel animate-pop">
        {/* Brand Header */}
        <div className="auth-header">
          <div className="auth-badge font-mono">
            <Sparkles size={14} className="icon-cyan" />
            <span>NEW PLAYER</span>
          </div>
          <h1 className="auth-title font-heading">JOIN THE RUSH</h1>
          <p className="auth-subtitle">
            Create a free player account to claim your unique username and save global records.
          </p>
        </div>

        {/* Signup Form */}
        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="auth-input-group">
            <label htmlFor="signup-email" className="auth-label font-mono">
              EMAIL ADDRESS
            </label>
            <div className="auth-input-wrapper">
              <Mail size={18} className="auth-icon" />
              <input
                id="signup-email"
                type="email"
                className="auth-input"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                disabled={loading}
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="auth-input-group">
            <label htmlFor="signup-password" className="auth-label font-mono">
              PASSWORD
            </label>
            <div className="auth-input-wrapper">
              <Lock size={18} className="auth-icon" />
              <input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                className="auth-input password-input"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                disabled={loading}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className="btn-toggle-eye"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex="-1"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="auth-input-group">
            <label htmlFor="signup-confirm-password" className="auth-label font-mono">
              CONFIRM PASSWORD
            </label>
            <div className="auth-input-wrapper">
              <Lock size={18} className="auth-icon" />
              <input
                id="signup-confirm-password"
                type={showPassword ? 'text' : 'password'}
                className="auth-input password-input"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError(null);
                }}
                disabled={loading}
                autoComplete="new-password"
                required
              />
            </div>
          </div>

          {error && (
            <div className="auth-alert alert-error font-mono animate-pop" role="alert">
              <AlertCircle size={16} className="alert-icon" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="btn-primary btn-auth-submit font-mono"
            disabled={loading}
          >
            {loading ? (
              <span>CREATING ACCOUNT...</span>
            ) : (
              <>
                <UserPlus size={16} />
                <span>CREATE ACCOUNT</span>
              </>
            )}
          </button>
        </form>

        {/* Footer Actions */}
        <div className="auth-footer">
          <div className="auth-switch-text font-mono">
            <span>Already have an account?</span>{' '}
            <button
              type="button"
              className="btn-text-link"
              onClick={onNavigateToLogin}
            >
              Sign In
            </button>
          </div>

          <div className="guest-fallback-row">
            <button
              type="button"
              className="btn-guest-link font-mono"
              onClick={onNavigateToHome}
            >
              <Gamepad2 size={15} />
              <span>Continue as Guest</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
