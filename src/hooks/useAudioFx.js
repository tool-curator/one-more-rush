import { useRef, useState, useCallback, useMemo } from 'react';

export function useAudioFx() {
  const [muted, setMuted] = useState(false);
  const audioCtxRef = useRef(null);

  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const playHit = useCallback((combo = 1) => {
    if (muted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Pitch increases smoothly with combo up to a limit
      const baseFreq = 440;
      const freq = Math.min(1600, baseFreq * Math.pow(1.05, Math.min(combo, 25)));

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) {
      console.warn('Audio play failure:', e);
    }
  }, [muted, getAudioContext]);

  const playMiss = useCallback(() => {
    if (muted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.25);

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch (e) {
      console.warn('Audio play failure:', e);
    }
  }, [muted, getAudioContext]);

  const playCountdownTick = useCallback(() => {
    if (muted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) {
      console.warn('Audio play failure:', e);
    }
  }, [muted, getAudioContext]);

  const playCountdownGo = useCallback(() => {
    if (muted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.2); // D6

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch (e) {
      console.warn('Audio play failure:', e);
    }
  }, [muted, getAudioContext]);

  const playHighScore = useCallback(() => {
    if (muted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const notes = [523.25, 659.25, 783.99, 1046.50]; // C E G C
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);

        gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + idx * 0.08);
        osc.stop(ctx.currentTime + idx * 0.08 + 0.25);
      });
    } catch (e) {
      console.warn('Audio play failure:', e);
    }
  }, [muted, getAudioContext]);

  const playPerfect = useCallback((streak = 1) => {
    if (muted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      // Pitch scales up with streak
      const baseFreq = 523.25 * Math.pow(1.05, Math.min(streak, 10)); // C5 base
      const notes = [baseFreq, baseFreq * 1.25, baseFreq * 1.5]; // Major triad

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.04);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.2, ctx.currentTime + idx * 0.04 + 0.15);

        gain.gain.setValueAtTime(0.3, ctx.currentTime + idx * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.04 + 0.2);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + idx * 0.04);
        osc.stop(ctx.currentTime + idx * 0.04 + 0.2);
      });
    } catch (e) {
      console.warn('Audio play failure:', e);
    }
  }, [muted, getAudioContext]);

  const playFlowMode = useCallback(() => {
    if (muted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const notes = [440, 554.37, 659.25, 880, 1108.73]; // A major arpeggio rapid rise
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.05);

        gain.gain.setValueAtTime(0.25, ctx.currentTime + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.05 + 0.15);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + idx * 0.05);
        osc.stop(ctx.currentTime + idx * 0.05 + 0.15);
      });
    } catch (e) {
      console.warn('Audio play failure:', e);
    }
  }, [muted, getAudioContext]);

  const playSpecialEvent = useCallback(() => {
    if (muted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
      console.warn('Audio play failure:', e);
    }
  }, [muted, getAudioContext]);

  const playUnlock = useCallback(() => {
    if (muted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const t0 = ctx.currentTime;
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.22, t0);
      masterGain.connect(ctx.destination);

      // Warm celestial tone filter
      const celestialFilter = ctx.createBiquadFilter();
      celestialFilter.type = 'lowpass';
      celestialFilter.frequency.setValueAtTime(900, t0);
      celestialFilter.frequency.exponentialRampToValueAtTime(3600, t0 + 0.6);
      celestialFilter.frequency.exponentialRampToValueAtTime(1600, t0 + 1.6);
      celestialFilter.Q.value = 1.2;
      celestialFilter.connect(masterGain);

      // Spatial celestial delay / cathedral reverb tail
      const delayNode = ctx.createDelay(0.5);
      delayNode.delayTime.setValueAtTime(0.18, t0);
      const delayFeedback = ctx.createGain();
      delayFeedback.gain.setValueAtTime(0.26, t0);
      const delayDampFilter = ctx.createBiquadFilter();
      delayDampFilter.type = 'lowpass';
      delayDampFilter.frequency.setValueAtTime(2200, t0);

      // Delay loop routing
      celestialFilter.connect(delayNode);
      delayNode.connect(delayDampFilter);
      delayDampFilter.connect(delayFeedback);
      delayFeedback.connect(delayNode);
      delayDampFilter.connect(masterGain);

      // Subtle vibrato LFO for heavenly choir shimmer (~4.8 Hz)
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(4.8, t0);
      lfoGain.gain.setValueAtTime(2.2, t0); // ~2.2 Hz subtle vibrato depth
      lfo.connect(lfoGain);
      lfo.start(t0);
      lfo.stop(t0 + 1.8);

      // ── 1. CELESTIAL CHOIR & HARMONIC BLOOM (E Major Chord) ──
      // Notes: E3 (164.81), B3 (246.94), E4 (329.63), G#4 (415.30), B4 (493.88), E5 (659.25), G#5 (830.61)
      const choirVoices = [
        // Foundation & Root: soft warm swell
        { freq: 164.81, start: 0.00, attack: 0.25, dur: 1.40, vol: 0.16, type: 'sine', detune: 0 },
        { freq: 329.63, start: 0.05, attack: 0.28, dur: 1.55, vol: 0.22, type: 'sine', detune: -4 },
        { freq: 330.40, start: 0.05, attack: 0.28, dur: 1.55, vol: 0.18, type: 'sine', detune: +4 },
        // Warm 5th & 3rd blooming in
        { freq: 246.94, start: 0.15, attack: 0.30, dur: 1.45, vol: 0.18, type: 'sine', detune: -2 },
        { freq: 415.30, start: 0.32, attack: 0.32, dur: 1.35, vol: 0.24, type: 'sine', detune: +3 },
        { freq: 493.88, start: 0.42, attack: 0.30, dur: 1.25, vol: 0.20, type: 'sine', detune: -3 },
        // Upper radiant choir harmonics (E5, G#5, B5)
        { freq: 659.25, start: 0.52, attack: 0.28, dur: 1.15, vol: 0.22, type: 'triangle', detune: 0 },
        { freq: 830.61, start: 0.65, attack: 0.25, dur: 1.05, vol: 0.18, type: 'sine', detune: +5 },
        { freq: 987.77, start: 0.75, attack: 0.25, dur: 0.95, vol: 0.14, type: 'sine', detune: -4 },
      ];

      choirVoices.forEach((v) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = v.type;
        osc.frequency.setValueAtTime(v.freq, t0 + v.start);
        lfoGain.connect(osc.frequency); // Apply gentle choir vibrato

        const vStart = t0 + v.start;
        gain.gain.setValueAtTime(0.0001, vStart);
        gain.gain.exponentialRampToValueAtTime(v.vol, vStart + v.attack);
        gain.gain.exponentialRampToValueAtTime(0.0001, vStart + v.dur);

        osc.connect(gain);
        gain.connect(celestialFilter);
        osc.start(vStart);
        osc.stop(vStart + v.dur + 0.05);
      });

      // ── 2. CRYSTALLINE ANGELIC STARLIGHT SHIMMER (Soft high sparkles ✨) ──
      const shimmerNotes = [
        { freq: 1318.51, start: 0.55, dur: 0.70, vol: 0.15 }, // E6
        { freq: 1661.22, start: 0.68, dur: 0.65, vol: 0.14 }, // G#6
        { freq: 1975.53, start: 0.80, dur: 0.60, vol: 0.12 }, // B6
        { freq: 2637.02, start: 0.92, dur: 0.55, vol: 0.09 }, // E7 ethereal glisten
      ];

      shimmerNotes.forEach((s) => {
        const oscS = ctx.createOscillator();
        const gainS = ctx.createGain();
        oscS.type = 'sine';
        oscS.frequency.setValueAtTime(s.freq, t0 + s.start);

        const sStart = t0 + s.start;
        gainS.gain.setValueAtTime(0.0001, sStart);
        gainS.gain.exponentialRampToValueAtTime(s.vol, sStart + 0.025);
        gainS.gain.exponentialRampToValueAtTime(0.0001, sStart + s.dur);

        oscS.connect(gainS);
        gainS.connect(celestialFilter);
        oscS.start(sStart);
        oscS.stop(sStart + s.dur + 0.05);
      });

      // ── 3. CLEAN AUDIO GRAPH DISCONNECT AFTER REVERB TAIL ──
      setTimeout(() => {
        try {
          masterGain.disconnect();
          celestialFilter.disconnect();
          delayNode.disconnect();
          delayDampFilter.disconnect();
          delayFeedback.disconnect();
          lfoGain.disconnect();
        } catch (_) {}
      }, 1900);
    } catch (e) {
      console.warn('Audio unlock play failure:', e);
    }
  }, [muted, getAudioContext]);

  const playEquip = useCallback(() => {
    if (muted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const t0 = ctx.currentTime;
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.14, t0);
      masterGain.connect(ctx.destination);

      // Subtle dual crystalline confirmation chime (~220ms)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      const gain2 = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1046.5, t0); // C6
      gain1.gain.setValueAtTime(0.001, t0);
      gain1.gain.exponentialRampToValueAtTime(0.22, t0 + 0.02);
      gain1.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
      osc1.connect(gain1);
      gain1.connect(masterGain);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1318.51, t0 + 0.04); // E6
      gain2.gain.setValueAtTime(0.001, t0 + 0.04);
      gain2.gain.exponentialRampToValueAtTime(0.24, t0 + 0.06);
      gain2.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.24);
      osc2.connect(gain2);
      gain2.connect(masterGain);

      osc1.start(t0);
      osc1.stop(t0 + 0.2);
      osc2.start(t0 + 0.04);
      osc2.stop(t0 + 0.26);

      setTimeout(() => {
        try {
          masterGain.disconnect();
        } catch (_) {}
      }, 350);
    } catch (e) {
      console.warn('Audio equip play failure:', e);
    }
  }, [muted, getAudioContext]);

  const toggleMute = useCallback(() => setMuted((prev) => !prev), []);

  return useMemo(() => ({
    muted,
    toggleMute,
    playHit,
    playMiss,
    playCountdownTick,
    playCountdownGo,
    playHighScore,
    playPerfect,
    playFlowMode,
    playSpecialEvent,
    playUnlock,
    playEquip,
  }), [
    muted,
    toggleMute,
    playHit,
    playMiss,
    playCountdownTick,
    playCountdownGo,
    playHighScore,
    playPerfect,
    playFlowMode,
    playSpecialEvent,
    playUnlock,
    playEquip,
  ]);
}

