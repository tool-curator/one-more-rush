import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, LogIn, ArrowRight, ShieldCheck, Gamepad2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import './LoginPage.css';

export function LoginPage({ onNavigateToSignup, onNavigateToHome, onLoginSuccess }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);

    try {
      const res = await signIn({ email, password });
      if (res.error) {
        setError(res.error);
      } else {
        if (onLoginSuccess) {
          onLoginSuccess(res.user);
        } else if (onNavigateToHome) {
          onNavigateToHome();
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to sign in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card glass-panel animate-pop">
        {/* Brand Header */}
        <div className="auth-header">
          <div className="auth-badge font-mono">
            <ShieldCheck size={14} className="icon-cyan" />
            <span>PLAYER ACCESS</span>
          </div>
          <h1 className="auth-title font-heading">SIGN IN TO RUSH</h1>
          <p className="auth-subtitle">
            Access your player profile, global leaderboard identity, and cloud records.
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="auth-input-group">
            <label htmlFor="login-email" className="auth-label font-mono">
              EMAIL ADDRESS
            </label>
            <div className="auth-input-wrapper">
              <Mail size={18} className="auth-icon" />
              <input
                id="login-email"
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
            <div className="auth-label-row">
              <label htmlFor="login-password" className="auth-label font-mono">
                PASSWORD
              </label>
            </div>
            <div className="auth-input-wrapper">
              <Lock size={18} className="auth-icon" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className="auth-input password-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                disabled={loading}
                autoComplete="current-password"
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
              <span>SIGNING IN...</span>
            ) : (
              <>
                <LogIn size={16} />
                <span>SIGN IN</span>
              </>
            )}
          </button>
        </form>

        {/* Footer Actions & Navigation */}
        <div className="auth-footer">
          <div className="auth-switch-text font-mono">
            <span>Don't have an account?</span>{' '}
            <button
              type="button"
              className="btn-text-link"
              onClick={onNavigateToSignup}
            >
              Create Account
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
