import React from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import './GameErrorBoundary.css';

export class GameErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      manualRetryAttempts: 0,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[GameErrorBoundary] Game chunk failed to render or load:', error, errorInfo);
  }

  handleRetry = () => {
    const nextAttempts = this.state.manualRetryAttempts + 1;
    // If user has manually retried 3+ times without success,
    // a new deployment likely removed the old chunk hash from CDN -> fallback to full reload
    if (nextAttempts >= 3) {
      window.location.reload();
      return;
    }

    this.setState({ hasError: false, error: null, manualRetryAttempts: nextAttempts });
    if (this.props.onRetry) {
      this.props.onRetry(nextAttempts);
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="game-error-container animate-fade" role="alert">
          <div className="game-error-card glass-panel animate-pop">
            <div className="game-error-icon-badge">
              <AlertTriangle size={32} className="icon-pink" />
            </div>
            <h2 className="game-error-title font-heading">GAME LOAD FAILED</h2>
            <p className="game-error-desc">
              We couldn't load this game. This may be caused by a temporary connection drop or interrupted chunk download.
            </p>
            <div className="game-error-actions font-mono">
              <button className="btn-primary btn-game-error" onClick={this.handleRetry}>
                <RotateCcw size={16} />
                <span>TRY AGAIN</span>
              </button>
              <button
                className="btn-secondary btn-game-error"
                onClick={this.props.onGoHome || (() => { window.location.href = '/'; })}
              >
                <Home size={16} />
                <span>BACK TO ARCADE</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
