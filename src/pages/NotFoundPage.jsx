import React from 'react';
import { Home, Play, AlertTriangle } from 'lucide-react';
import './InfoPages.css';

export function NotFoundPage({ onGoHome, onPlayGame }) {
  return (
    <div className="info-page-container">
      <div className="info-content-card glass-panel notfound-card">
        <div className="notfound-glitch-code font-mono">404</div>
        <h1 className="notfound-tagline font-heading">WRONG TURN.</h1>
        <p className="notfound-desc">
          Looks like you wandered outside the arcade. The route you are looking for does not exist.
        </p>

        <div className="notfound-actions font-mono">
          <button
            className="btn-primary"
            onClick={onGoHome}
          >
            <Home size={15} />
            <span>BACK HOME</span>
          </button>

          <button
            className="btn-secondary"
            onClick={() => onPlayGame && onPlayGame('dodge')}
          >
            <Play size={15} fill="currentColor" />
            <span>PLAY A GAME</span>
          </button>
        </div>
      </div>
    </div>
  );
}
