import React, { useState, useEffect } from 'react';
import './Countdown.css';

export function Countdown({ onComplete, audioFx }) {
  const [count, setCount] = useState(3);

  useEffect(() => {
    if (count > 0) {
      audioFx.playCountdownTick();
      const timer = setTimeout(() => {
        setCount(count - 1);
      }, 700);
      return () => clearTimeout(timer);
    } else if (count === 0) {
      audioFx.playCountdownGo();
      const timer = setTimeout(() => {
        onComplete();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [count, onComplete, audioFx]);

  return (
    <div className="countdown-overlay">
      <div className="countdown-number" key={count}>
        {count > 0 ? count : 'GO!'}
      </div>
    </div>
  );
}
