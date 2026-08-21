import React from 'react';
import './GameLoadingFallback.css';

export function GameLoadingFallback({ gameName = 'RUSH' }) {
  return (
    <div className="game-loading-container animate-fade" role="status" aria-live="polite">
      <div className="game-loading-card glass-panel animate-pop">
        <div className="game-loading-spinner-ring">
          <div className="spinner-core"></div>
        </div>
        <h3 className="game-loading-title font-heading">
          LOADING <span className="highlight-cyan">{gameName.toUpperCase()}</span>...
        </h3>
        <div className="game-loading-dots font-mono">
          <span className="dot dot-1">●</span>
          <span className="dot dot-2">●</span>
          <span className="dot dot-3">●</span>
        </div>
        <p className="game-loading-sub font-mono">INITIALIZING ARCADE CORE</p>
      </div>
    </div>
  );
}
