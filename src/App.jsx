import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { GameLibrary } from './components/GameLibrary';
import { DailyChallenge } from './components/DailyChallenge';
import { UsernameSetupModal } from './components/UsernameSetupModal';
import { useAuth } from './context/AuthContext';
import { loadLockerState, hydrateLockerFromProfile, evaluateBadges, getBadgeByKey } from './services/lockerService';
import { HomeLockerBanner } from './components/HomeLockerBanner';
import { DailyChallengeOverlay } from './components/DailyChallengeOverlay';
import { DailyChallengeResultModal } from './components/DailyChallengeResultModal';
import { LeaderboardSection } from './components/LeaderboardSection';
import { AchievementUnlockToast } from './components/AchievementUnlockToast';
import { Footer } from './components/Footer';
import { HowToPlayModal } from './components/HowToPlayModal';
import { Countdown } from './components/Countdown';
import { GameOverModal } from './components/GameOverModal';
import { GameLoadingFallback } from './components/GameLoadingFallback';
import { GameErrorBoundary } from './components/GameErrorBoundary';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useAudioFx } from './hooks/useAudioFx';
import { getGameById, getGameOrDefault, getFeaturedGame } from './games/gameRegistry';
import { getColorMazeOverallBestScore } from './games/color-maze/game/mazeStorage';
import { getTodayChallenges, getDailyChallenge, loadDailyProgress, recordDailyAttempt, startDailyChallengeAttemptCloud, claimDailyChallengeRewardCloud, syncDailyChallengeStatusCloud, getTodayDateString } from './services/dailyChallengeService';
import { updatePageSEO } from './services/seoService';
import { submitGameScore } from './services/scoreService';
import { claimDailyVisitReward } from './services/dailyRewardService';
import { migrateLegacyRushPointsCloud } from './services/legacyMigrationService';
import { onScopeChange, getScopedKey } from './services/storageScopeService';
import { getLazyComponentWithRetry } from './utils/lazyWithRetry';
import { BRAND } from './config/brand';
import { Zap, Target, Flame, Shield, Trophy, Activity, Clock, Sparkles } from 'lucide-react';
import './App.css';

// --- LAZY-LOADED SECONDARY PAGES ---
const DailyPage = lazy(() => import('./pages/DailyPage').then((m) => ({ default: m.DailyPage })));
const LockerPage = lazy(() => import('./pages/LockerPage').then((m) => ({ default: m.LockerPage })));
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage').then((m) => ({ default: m.LeaderboardPage })));
const AboutPage = lazy(() => import('./pages/AboutPage').then((m) => ({ default: m.AboutPage })));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage').then((m) => ({ default: m.PrivacyPage })));
const TermsPage = lazy(() => import('./pages/TermsPage').then((m) => ({ default: m.TermsPage })));
const SupportPage = lazy(() => import('./pages/SupportPage').then((m) => ({ default: m.SupportPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const SignupPage = lazy(() => import('./pages/SignupPage').then((m) => ({ default: m.SignupPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));

// Dynamic chunk prefetcher for instant-feel gameplay start
const prefetchGameChunk = (gameId) => {
  switch (gameId) {
    case 'aim':
      import('./games/aim/AimGame');
      break;
    case 'dodge':
      import('./games/dodge/DodgeGame');
      break;
    case 'stack':
      import('./games/stack/StackGame');
      break;
    case 'number-rush':
      import('./games/number-rush/NumberRushGame');
      break;
    case 'memory':
      import('./games/memory/MemoryGame');
      break;
    case 'color-maze':
      import('./games/color-maze/ColorMazeGame');
      break;
    default:
      break;
  }
};

const DODGE_RULES = [
  {
    icon: <Activity size={20} className="rule-icon icon-cyan" />,
    label: '1. MOVE',
    desc: 'Use WASD, arrow keys or touch controls to move smoothly.',
  },
  {
    icon: <Flame size={20} className="rule-icon icon-pink" />,
    label: '2. DODGE',
    desc: 'Avoid red hazards. Taking damage breaks combo and loses health.',
  },
  {
    icon: <Target size={20} className="rule-icon icon-yellow" />,
    label: '3. COLLECT',
    desc: 'Collect yellow gems to score points and build your multiplier.',
  },
  {
    icon: <Zap size={20} className="rule-icon icon-cyan" />,
    label: '4. BUILD COMBO',
    desc: 'Collect gems without taking damage to reach high score multipliers.',
  },
  {
    icon: <Shield size={20} className="rule-icon icon-violet" />,
    label: '5. USE POWERUPS',
    desc: 'Grab Shields, Speed Boosts, Slow Motion, 2X Score, and Magnets.',
  },
  {
    icon: <Trophy size={20} className="rule-icon icon-gold" />,
    label: '6. SURVIVE',
    desc: 'Survive higher waves with arena shrinking to beat your best score.',
  },
];

const DODGE_FLOW = ['MOVE & DODGE', 'COLLECT GEMS', '+ SCORE & POWERUPS', 'SURVIVE WAVES'];

const STACK_RULES = [
  {
    icon: <Clock size={20} className="rule-icon icon-cyan" />,
    label: '1. TIME YOUR DROP',
    desc: 'Click, tap, or press Space when the block is aligned.',
  },
  {
    icon: <Target size={20} className="rule-icon icon-yellow" />,
    label: '2. STACK PERFECTLY',
    desc: 'More overlap = better score. Land dead center for PERFECT bonus!',
  },
  {
    icon: <Flame size={20} className="rule-icon icon-pink" />,
    label: "3. DON'T WASTE SPACE",
    desc: 'Poor placements cut away edges and make the next block smaller.',
  },
  {
    icon: <Zap size={20} className="rule-icon icon-violet" />,
    label: '4. BUILD COMBO',
    desc: 'Consecutive accurate drops boost your multiplier and trigger FLOW MODE.',
  },
  {
    icon: <Trophy size={20} className="rule-icon icon-gold" />,
    label: '5. REACH THE TOP',
    desc: 'Keep stacking higher and higher until your block gets cut down to zero.',
  },
];

const STACK_FLOW = ['TIME YOUR DROP', 'STACK PERFECTLY', 'BUILD COMBO', 'REACH THE TOP'];

const NUMBER_RUSH_RULES = [
  {
    icon: <Target size={20} className="rule-icon icon-cyan" />,
    label: '1. SOLVE THE CHALLENGE',
    desc: 'Read the prompt and compute or spot the pattern fast.',
  },
  {
    icon: <Zap size={20} className="rule-icon icon-yellow" />,
    label: '2. PICK THE CORRECT ANSWER',
    desc: 'Tap the right choice or use 1-4 keys before time expires.',
  },
  {
    icon: <Flame size={20} className="rule-icon icon-pink" />,
    label: '3. BUILD YOUR COMBO',
    desc: 'Streak correct answers to boost your score multiplier.',
  },
  {
    icon: <Clock size={20} className="rule-icon icon-violet" />,
    label: '4. SPEED INCREASES',
    desc: 'Decision time tightens as rounds advance. Watch out for RUSH MODE!',
  },
  {
    icon: <Trophy size={20} className="rule-icon icon-gold" />,
    label: "5. THREE MISTAKES & YOU'RE OUT",
    desc: 'Misses and timeouts cost hearts. Survive as many rounds as you can.',
  },
];

const NUMBER_RUSH_FLOW = ['SOLVE CHALLENGE', 'PICK ANSWER', '+ SCORE & COMBO', 'SPEED INCREASES'];

const MEMORY_RULES = [
  {
    icon: <Target size={20} className="rule-icon icon-cyan" />,
    label: '1. WATCH CAREFULLY',
    desc: 'Observe the sequence as tiles highlight one by one.',
  },
  {
    icon: <Zap size={20} className="rule-icon icon-yellow" />,
    label: '2. REMEMBER THE PATTERN',
    desc: 'Note colors, positions, or symbols in exact order.',
  },
  {
    icon: <Flame size={20} className="rule-icon icon-pink" />,
    label: '3. RECREATE IN ORDER',
    desc: 'Tap tiles in the correct order. Watch for REVERSE & BLINK challenges!',
  },
  {
    icon: <Clock size={20} className="rule-icon icon-violet" />,
    label: '4. SPEED & LENGTH INCREASE',
    desc: 'Sequences grow longer and playback speeds up each round.',
  },
  {
    icon: <Trophy size={20} className="rule-icon icon-gold" />,
    label: "5. THREE MISTAKES & YOU'RE OUT",
    desc: 'Wrong inputs lose hearts. Survive as many rounds as you can.',
  },
];

const MEMORY_FLOW = ['SHOW SEQUENCE', 'MEMORIZE', 'REPRODUCE', '+ SCORE & COMBO'];

const COLOR_MAZE_RULES = [
  {
    icon: <Target size={20} className="rule-icon icon-cyan" />,
    label: '1. SWIPE OR PRESS A DIRECTION',
    desc: 'Use Arrow keys, WASD, or swipe gestures to roll.',
  },
  {
    icon: <Flame size={20} className="rule-icon icon-pink" />,
    label: '2. SLIDE TO THE WALL',
    desc: 'The ball rolls continuously until it hits a wall or obstacle.',
  },
  {
    icon: <Zap size={20} className="rule-icon icon-yellow" />,
    label: '3. PAINT EVERY TILE',
    desc: 'Every floor corridor traversed by the ball fills with vibrant color.',
  },
  {
    icon: <Clock size={20} className="rule-icon icon-violet" />,
    label: '4. 100% COVERAGE',
    desc: 'Paint all reachable tiles in the maze to complete the level.',
  },
  {
    icon: <Trophy size={20} className="rule-icon icon-gold" />,
    label: '5. BEAT THE CLOCK',
    desc: 'Solve the maze in fewer moves and record time.',
  },
];

const COLOR_MAZE_FLOW = ['CHOOSE DIRECTION', 'ROLL TO WALL', 'PAINT CORRIDOR', '100% COVERAGE'];

export default function App() {
  // Current mode: 'HOME' | 'DAILY_PAGE' | 'LOCKER_PAGE' | 'LEADERBOARD_PAGE' | 'HOWTOPLAY' | 'COUNTDOWN' | 'PLAYING' | 'GAMEOVER' | 'DAILY_RESULT'
  const [gameState, setGameState] = useState('HOME');
  const [activeTab, setActiveTab] = useState('home');
  const [currentGameId, setCurrentGameId] = useState('aim');
  const [gameRetryGen, setGameRetryGen] = useState(0);

  // Dynamic retryable lazy game components (forces a fresh dynamic import on retry)
  const AimGame = getLazyComponentWithRetry('aim', () => import('./games/aim/AimGame').then((m) => ({ default: m.AimGame })), gameRetryGen);
  const DodgeGame = getLazyComponentWithRetry('dodge', () => import('./games/dodge/DodgeGame').then((m) => ({ default: m.DodgeGame })), gameRetryGen);
  const StackGame = getLazyComponentWithRetry('stack', () => import('./games/stack/StackGame').then((m) => ({ default: m.StackGame })), gameRetryGen);
  const NumberRushGame = getLazyComponentWithRetry('number-rush', () => import('./games/number-rush/NumberRushGame').then((m) => ({ default: m.NumberRushGame })), gameRetryGen);
  const MemoryGame = getLazyComponentWithRetry('memory', () => import('./games/memory/MemoryGame').then((m) => ({ default: m.MemoryGame })), gameRetryGen);
  const ColorMazeGame = getLazyComponentWithRetry('color-maze', () => import('./games/color-maze/ColorMazeGame').then((m) => ({ default: m.ColorMazeGame })), gameRetryGen);

  // Daily Challenge V2/V3 State
  const [dailyProgress, setDailyProgress] = useState(() => loadDailyProgress());
  const [isDailyChallengeMode, setIsDailyChallengeMode] = useState(false);
  const [activeDailyChallenge, setActiveDailyChallenge] = useState(() => getDailyChallenge());
  const [dailyResultData, setDailyResultData] = useState(null);
  const activeDailyAttemptIdRef = useRef(null);

  // Separate localStorage best scores per game
  const [aimBestScore, setAimBestScore] = useLocalStorage('onemore_best_aim', 0);
  const [dodgeBestScore, setDodgeBestScore] = useLocalStorage('onemore_best_dodge', 0);
  const [stackBestScore, setStackBestScore] = useLocalStorage('onemore_best_stack', 0);
  const [stackBestHeight, setStackBestHeight] = useLocalStorage('onemore_best_stack_height', 0);
  const [numberRushBestScore, setNumberRushBestScore] = useLocalStorage('onemore_best_number_rush', 0);
  const [memoryBestScore, setMemoryBestScore] = useLocalStorage('onemore_best_memory', 0);
  const [colorMazeBestScore, setColorMazeBestScore] = useState(() => getColorMazeOverallBestScore());

  const {
    user,
    profile,
    isGuest,
    loading: authLoading,
    needsUsernameSetup,
    isMigrationReady,
    activeSignupContext,
  } = useAuth();
  const [lockerState, setLockerState] = useState(() => loadLockerState());
  const [dismissedUsernameModal, setDismissedUsernameModal] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState(null);
  const [dailyVisitToast, setDailyVisitToast] = useState(null);
  // Monotonic tracking for completed startup sequences and in-flight operations
  const startupSequenceCompletedRef = useRef({});
  const startupSequenceInFlightRef = useRef(false);

  // Check and award daily visit reward (+10 RP) and sync cloud daily challenge status once auth session is hydrated
  // Order: 1. migrateLegacyRushPointsCloud (strictly first), 2. claimDailyVisitReward, 3. syncDailyChallengeStatusCloud
  useEffect(() => {
    if (authLoading) return;

    // Strict Invariant: Active signup conversion cannot execute startup migration before handoff binding is complete
    if (user && !isGuest && isMigrationReady === false) {
      console.info('[App] MIGRATION_WAITING_FOR_HANDOFF: Waiting for migration readiness before executing startup sequence...');
      return;
    }

    const currentIntentId = activeSignupContext?.expectedConversionIntentId || 'none';
    const userScopeKey = user?.id ? `auth_${user.id}_${currentIntentId}` : 'guest';

    if (startupSequenceCompletedRef.current[userScopeKey]) return;
    if (startupSequenceInFlightRef.current) return;

    let mounted = true;
    startupSequenceInFlightRef.current = true;

    async function runStartupSequence() {
      try {
        // 1. Server-authoritative Legacy RP Migration (must run before Daily Visit creates any cloud ledger rows)
        let migrationRes = null;
        if (user && !isGuest) {
          migrationRes = await migrateLegacyRushPointsCloud({
            user,
            isGuest,
            signupContext: activeSignupContext,
          });
        }
        if (!mounted) return;

        // Guest migration failure is a synchronization barrier. Do not hydrate authenticated Daily Challenge
        // state from the cloud because the cloud does not contain the rejected guest-local state.
        if (migrationRes && !migrationRes.success) {
          console.warn(
            '[Startup] MIGRATION_BLOCKED: Guest migration was rejected or pending. Halting cloud synchronization barrier:',
            migrationRes.error || migrationRes.outcome || migrationRes.reason
          );
          setDailyProgress(loadDailyProgress());
          return;
        }

        // 2. Daily Visit Reward (Strictly executed ONLY after successful migration confirmation)
        const res = await claimDailyVisitReward({ user, isGuest });
        if (!mounted) return;

        if (res?.awarded) {
          setDailyVisitToast({
            reward: res.reward,
            newBalance: res.balance,
          });
          setDailyProgress(loadDailyProgress());
          setTimeout(() => {
            if (mounted) setDailyVisitToast(null);
          }, 4500);
        } else if (res?.mode === 'AUTHENTICATED' && res?.balance !== undefined) {
          setDailyProgress(loadDailyProgress());
        }

        // 3. Hydrate authenticated Daily Challenge status & streak from server ledger
        if (user) {
          await syncDailyChallengeStatusCloud({ user, isGuest });
        }

        // Mark startup sequence strictly completed ONLY after successful migration and synchronization
        if (mounted) {
          startupSequenceCompletedRef.current[userScopeKey] = true;
        }
      } finally {
        startupSequenceInFlightRef.current = false;
      }
    }

    runStartupSequence();

    return () => {
      mounted = false;
      startupSequenceInFlightRef.current = false;
    };
  }, [authLoading, user?.id, isGuest, isMigrationReady, activeSignupContext?.expectedConversionIntentId]);

  // Reset modal dismissal if user changes or signs out
  useEffect(() => {
    setDismissedUsernameModal(false);
    setSubmissionStatus(null);
  }, [user?.id]);

  // Hydrate locker cosmetics whenever authenticated profile is resolved
  useEffect(() => {
    if (profile && !isGuest) {
      hydrateLockerFromProfile(profile);
      setLockerState(loadLockerState());
    }
  }, [profile?.avatar_frame, profile?.title, profile?.victory_effect, isGuest]);

  // Synchronize React state whenever the active storage scope changes (login / logout / account switch)
  useEffect(() => {
    const refreshScopedState = () => {
      setDailyProgress(loadDailyProgress());
      setLockerState(loadLockerState());
      setColorMazeBestScore(getColorMazeOverallBestScore());
    };

    refreshScopedState();
    const unsubscribe = onScopeChange(refreshScopedState);
    return unsubscribe;
  }, []);

  // Sync Color Maze best score, locker & daily progress whenever returning to HOME/DAILY/LOCKER/LEADERBOARD/PROFILE or mounting
  useEffect(() => {
    if (
      gameState === 'HOME' ||
      gameState === 'DAILY_PAGE' ||
      gameState === 'LOCKER_PAGE' ||
      gameState === 'LEADERBOARD_PAGE' ||
      gameState === 'PROFILE_PAGE'
    ) {
      setColorMazeBestScore(getColorMazeOverallBestScore());
      setDailyProgress(loadDailyProgress());
      setLockerState(loadLockerState());
    }
  }, [gameState]);

  const currentGame = getGameById(currentGameId);
  const featuredGame = getFeaturedGame();

  const allScores = {
    aim: aimBestScore,
    dodge: dodgeBestScore,
    stack: stackBestScore,
    stackHeight: stackBestHeight,
    'number-rush': numberRushBestScore,
    memory: memoryBestScore,
    'color-maze': colorMazeBestScore,
  };

  const currentBestScore =
    currentGameId === 'aim'
      ? aimBestScore
      : currentGameId === 'dodge'
      ? dodgeBestScore
      : currentGameId === 'stack'
      ? stackBestScore
      : currentGameId === 'number-rush'
      ? numberRushBestScore
      : currentGameId === 'memory'
      ? memoryBestScore
      : colorMazeBestScore;

  const [lastScore, setLastScore] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);
  const [extraMetrics, setExtraMetrics] = useState(null);

  const audioFx = useAudioFx();
  const [achievementToasts, setAchievementToasts] = useState([]);
  const initializedScopesRef = useRef(new Set());

  // Achievement Unlock Transition Detection & Notification (User-Scoped & Guest-Scoped)
  useEffect(() => {
    try {
      const currentUnlocked = evaluateBadges(allScores, dailyProgress.streak);
      const storageKey = getScopedKey('known_unlocked_badges');
      const stored = window.localStorage.getItem(storageKey);
      let knownKeys = stored ? JSON.parse(stored) : null;

      if (!initializedScopesRef.current.has(storageKey)) {
        initializedScopesRef.current.add(storageKey);
        if (!knownKeys) {
          // First session/seed for this active scope: store current unlocks to prevent spamming notifications on cold mount
          window.localStorage.setItem(storageKey, JSON.stringify(currentUnlocked));
          return;
        }
      }

      const knownSet = new Set(knownKeys || []);
      const newlyUnlocked = currentUnlocked.filter((key) => !knownSet.has(key));

      if (newlyUnlocked.length > 0) {
        const newBadges = newlyUnlocked
          .map((key) => getBadgeByKey(key))
          .filter(Boolean);

        if (newBadges.length > 0) {
          setAchievementToasts((prev) => [...prev, ...newBadges]);
          audioFx.playUnlock();
        }

        const updatedKnown = Array.from(new Set([...Array.from(knownSet), ...newlyUnlocked]));
        window.localStorage.setItem(storageKey, JSON.stringify(updatedKnown));
      }
    } catch (err) {
      console.warn('Achievement unlock detection error:', err);
    }
  }, [allScores, dailyProgress.streak, audioFx]);

  const handleDismissAchievementToast = (badgeKey) => {
    setAchievementToasts((prev) => prev.filter((b) => (b.key || b.id) !== badgeKey));
  };

  // Unified routing & SEO synchronization for HTML5 History & hash migration
  useEffect(() => {
    const syncRoute = () => {
      let pathname = window.location.pathname || '/';
      const hash = window.location.hash || '';

      // Smooth hash migration for legacy links (e.g. /#/about -> /about)
      if (hash.startsWith('#/')) {
        const hashSub = hash.slice(2);
        let targetPath = '/' + hashSub;
        if (targetPath.startsWith('/play/')) {
          targetPath = targetPath.replace('/play/', '/games/');
        }
        window.history.replaceState({}, '', targetPath);
        pathname = targetPath;
      } else if (hash === '#' || hash === '#/') {
        window.history.replaceState({}, '', '/');
        pathname = '/';
      }

      const cleanPath = pathname.replace(/\/+$/, '') || '/';

      if (cleanPath === '/') {
        setActiveTab('home');
        setGameState('HOME');
        updatePageSEO('/');
      } else if (cleanPath === '/daily' || cleanPath === '/daily-challenge') {
        setActiveTab('daily');
        setGameState('DAILY_PAGE');
        updatePageSEO('/daily');
      } else if (cleanPath === '/locker' || cleanPath === '/rush-locker') {
        setActiveTab('locker');
        setGameState('LOCKER_PAGE');
        updatePageSEO('/locker');
      } else if (cleanPath === '/leaderboard' || cleanPath === '/leaderboards') {
        setActiveTab('leaderboard');
        setGameState('LEADERBOARD_PAGE');
        updatePageSEO('/leaderboard');
      } else if (cleanPath === '/login' || cleanPath === '/signin') {
        setActiveTab('login');
        setGameState('LOGIN_PAGE');
        updatePageSEO('/login');
      } else if (cleanPath === '/signup' || cleanPath === '/register') {
        setActiveTab('signup');
        setGameState('SIGNUP_PAGE');
        updatePageSEO('/signup');
      } else if (cleanPath === '/profile') {
        setActiveTab('profile');
        setGameState('PROFILE_PAGE');
        updatePageSEO('/profile');
      } else if (cleanPath === '/about') {
        setActiveTab('about');
        setGameState('ABOUT_PAGE');
        updatePageSEO('/about');
      } else if (cleanPath === '/privacy') {
        setActiveTab('privacy');
        setGameState('PRIVACY_PAGE');
        updatePageSEO('/privacy');
      } else if (cleanPath === '/terms' || cleanPath === '/legal') {
        setActiveTab('terms');
        setGameState('TERMS_PAGE');
        updatePageSEO('/terms');
      } else if (cleanPath === '/support' || cleanPath === '/faq') {
        setActiveTab('support');
        setGameState('SUPPORT_PAGE');
        updatePageSEO('/support');
      } else if (cleanPath.startsWith('/games/') || cleanPath.startsWith('/play/')) {
        const gameKey = cleanPath.replace(/^\/(games|play)\//, '');
        const validGame = getGameById(gameKey);
        if (validGame) {
          setCurrentGameId(gameKey);
          setGameState('HOWTOPLAY');
          updatePageSEO(`/games/${gameKey}`);
        } else {
          setActiveTab('');
          setGameState('NOT_FOUND_PAGE');
          updatePageSEO('/404');
        }
      } else if (cleanPath === '/404') {
        setActiveTab('');
        setGameState('NOT_FOUND_PAGE');
        updatePageSEO('/404');
      } else {
        setActiveTab('');
        setGameState('NOT_FOUND_PAGE');
        updatePageSEO('/404');
      }
    };

    // Initial sync on mount
    syncRoute();

    window.addEventListener('popstate', syncRoute);
    window.addEventListener('hashchange', syncRoute);
    return () => {
      window.removeEventListener('popstate', syncRoute);
      window.removeEventListener('hashchange', syncRoute);
    };
  }, []);

  const appShellRef = React.useRef(null);

  // Desktop background cursor spotlight tracking (RAF throttled, no re-renders)
  useEffect(() => {
    if (gameState !== 'HOME' && gameState !== 'DAILY_PAGE' && gameState !== 'LOCKER_PAGE' && gameState !== 'LEADERBOARD_PAGE') return;
    const isPointerFine = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!isPointerFine || prefersReducedMotion) return;

    let rafId;
    const handleMouseMove = (e) => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        if (appShellRef.current) {
          appShellRef.current.style.setProperty('--mouse-bg-x', `${e.clientX}px`);
          appShellRef.current.style.setProperty('--mouse-bg-y', `${e.clientY}px`);
        }
        rafId = null;
      });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [gameState]);

  const navigateTo = (path) => {
    window.history.pushState({}, '', path);
    const cleanPath = path.replace(/\/+$/, '') || '/';
    if (cleanPath === '/') {
      setActiveTab('home');
      setGameState('HOME');
      updatePageSEO('/');
    } else if (cleanPath === '/daily') {
      setActiveTab('daily');
      setGameState('DAILY_PAGE');
      updatePageSEO('/daily');
    } else if (cleanPath === '/locker') {
      setActiveTab('locker');
      setGameState('LOCKER_PAGE');
      updatePageSEO('/locker');
    } else if (cleanPath === '/leaderboard') {
      setActiveTab('leaderboard');
      setGameState('LEADERBOARD_PAGE');
      updatePageSEO('/leaderboard');
    } else if (cleanPath === '/login') {
      setActiveTab('login');
      setGameState('LOGIN_PAGE');
      updatePageSEO('/login');
    } else if (cleanPath === '/signup') {
      setActiveTab('signup');
      setGameState('SIGNUP_PAGE');
      updatePageSEO('/signup');
    } else if (cleanPath === '/profile') {
      setActiveTab('profile');
      setGameState('PROFILE_PAGE');
      updatePageSEO('/profile');
    } else if (cleanPath === '/about') {
      setActiveTab('about');
      setGameState('ABOUT_PAGE');
      updatePageSEO('/about');
    } else if (cleanPath === '/privacy') {
      setActiveTab('privacy');
      setGameState('PRIVACY_PAGE');
      updatePageSEO('/privacy');
    } else if (cleanPath === '/terms') {
      setActiveTab('terms');
      setGameState('TERMS_PAGE');
      updatePageSEO('/terms');
    } else if (cleanPath === '/support') {
      setActiveTab('support');
      setGameState('SUPPORT_PAGE');
      updatePageSEO('/support');
    } else if (cleanPath.startsWith('/games/')) {
      const gId = cleanPath.replace('/games/', '');
      const validGame = getGameById(gId);
      if (validGame) {
        prefetchGameChunk(gId);
        setCurrentGameId(gId);
        setGameState('HOWTOPLAY');
        updatePageSEO(`/games/${gId}`);
      } else {
        setActiveTab('');
        setGameState('NOT_FOUND_PAGE');
        updatePageSEO('/404');
      }
    } else {
      setActiveTab('');
      setGameState('NOT_FOUND_PAGE');
      updatePageSEO('/404');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handlers
  const handleStartGame = (gameId) => {
    prefetchGameChunk(gameId);
    setCurrentGameId(gameId);
    window.history.pushState({}, '', `/games/${gameId}`);
    setGameState('HOWTOPLAY');
    updatePageSEO(`/games/${gameId}`);
  };

  const handlePlayDailyChallenge = (challengeToPlay) => {
    const targetChallenge = challengeToPlay || getDailyChallenge();
    setActiveDailyChallenge(targetChallenge);
    setIsDailyChallengeMode(true);
    setCurrentGameId(targetChallenge.gameId);
    prefetchGameChunk(targetChallenge.gameId);
    activeDailyAttemptIdRef.current = null;
    if (user && user.id) {
      startDailyChallengeAttemptCloud({ challenge: targetChallenge }).then((res) => {
        if (res?.success && res?.attemptId) {
          activeDailyAttemptIdRef.current = res.attemptId;
        }
      });
    }
    window.history.pushState({}, '', `/games/${targetChallenge.gameId}`);
    setGameState('HOWTOPLAY');
    updatePageSEO(`/games/${targetChallenge.gameId}`);
  };

  const handleConfirmStart = async () => {
    prefetchGameChunk(currentGameId);
    if (isDailyChallengeMode && activeDailyChallenge && user && user.id) {
      if (!activeDailyAttemptIdRef.current) {
        try {
          const res = await startDailyChallengeAttemptCloud({ challenge: activeDailyChallenge });
          if (res?.success && res?.attemptId) {
            activeDailyAttemptIdRef.current = res.attemptId;
          } else {
            console.warn('[DailyChallenge] Unable to start server-authoritative daily challenge attempt. Aborting countdown.');
            return;
          }
        } catch (err) {
          console.warn('[DailyChallenge] Network error starting daily challenge attempt:', err.message);
          return;
        }
      }
    }
    setGameState('COUNTDOWN');
  };

  const handleCountdownComplete = () => {
    setGameState('PLAYING');
  };

  const handleGameOver = (finalScore, newHighScore, metrics = null) => {
    setLastScore(finalScore);
    setIsNewBest(newHighScore);

    let finalMetrics = metrics ? { ...metrics } : {};
    if (currentGameId === 'stack' && metrics && metrics.height !== undefined) {
      finalMetrics.bestHeight = Math.max(metrics.height, stackBestHeight);
      if (metrics.height > stackBestHeight) {
        setStackBestHeight(metrics.height);
        finalMetrics.isNewHeightRecord = true;
      }
    }
    setExtraMetrics(finalMetrics);

    if (newHighScore) {
      if (currentGameId === 'aim') {
        setAimBestScore(finalScore);
      } else if (currentGameId === 'dodge') {
        setDodgeBestScore(finalScore);
      } else if (currentGameId === 'stack') {
        setStackBestScore(finalScore);
      } else if (currentGameId === 'number-rush') {
        setNumberRushBestScore(finalScore);
      } else if (currentGameId === 'memory') {
        setMemoryBestScore(finalScore);
      } else if (currentGameId === 'color-maze') {
        setColorMazeBestScore(getColorMazeOverallBestScore());
      }
    } else if (currentGameId === 'color-maze') {
      setColorMazeBestScore(getColorMazeOverallBestScore());
    }

    // Asynchronous Competitive Score Submission to Supabase
    if (!user || isGuest) {
      setSubmissionStatus('GUEST');
    } else {
      setSubmissionStatus(null);
      submitGameScore({
        gameId: currentGameId,
        score: finalScore,
        metadata: finalMetrics,
      })
        .then((res) => {
          if (res.submitted) {
            setSubmissionStatus(res.isNewPersonalBest ? 'NEW_BEST' : 'SUBMITTED');
          } else if (res.reason === 'NOT_PERSONAL_BEST') {
            setSubmissionStatus('NOT_PERSONAL_BEST');
          } else if (res.reason === 'GUEST_USER') {
            setSubmissionStatus('GUEST');
          } else if (res.reason === 'PLACEHOLDER_USERNAME') {
            setSubmissionStatus('GUEST');
          } else {
            setSubmissionStatus('ERROR');
          }
        })
        .catch(() => {
          setSubmissionStatus('ERROR');
        });
    }

    // Daily Challenge Completion / Evaluation Handling
    if (isDailyChallengeMode && activeDailyChallenge) {
      const hasServerEconomyIdentity = Boolean(user && user.id);
      const challengeResult = recordDailyAttempt(activeDailyChallenge, finalMetrics, finalScore, {
        isAuthenticated: hasServerEconomyIdentity,
        hasServerEconomyIdentity,
      });
      setDailyResultData(challengeResult);
      setDailyProgress(loadDailyProgress());
      setGameState('DAILY_RESULT');

      // If in server-authoritative mode, await cloud reward claim and refresh authoritative balance & modal state
      if (hasServerEconomyIdentity && challengeResult?.isFirstCompletionToday) {
        claimDailyChallengeRewardCloud({
          challenge: activeDailyChallenge,
          metrics: finalMetrics,
          finalScore,
          attemptId: activeDailyAttemptIdRef.current,
        }).then((claimRes) => {
          if (claimRes?.success && claimRes?.record) {
            const updatedProgress = loadDailyProgress();
            setDailyProgress(updatedProgress);
            setDailyResultData((prev) => (prev ? {
              ...prev,
              totalRushPoints: updatedProgress.rushPoints,
              currentStreak: updatedProgress.streak,
            } : prev));
          }
          syncDailyChallengeStatusCloud({ user, isGuest });
        });
      }
    } else if (currentGameId !== 'color-maze') {
      setGameState('GAMEOVER');
    }
  };

  const handlePlayAgain = () => {
    setGameState('COUNTDOWN');
  };

  const handleGoHome = () => {
    setIsDailyChallengeMode(false);
    setDailyResultData(null);
    setColorMazeBestScore(getColorMazeOverallBestScore());
    setDailyProgress(loadDailyProgress());
    navigateTo('/');
  };

  const handleNavClick = (tabId) => {
    setColorMazeBestScore(getColorMazeOverallBestScore());
    setDailyProgress(loadDailyProgress());

    if (tabId === 'daily') {
      navigateTo('/daily');
      return;
    }

    if (tabId === 'locker') {
      navigateTo('/locker');
      return;
    }

    if (tabId === 'leaderboard') {
      navigateTo('/leaderboard');
      return;
    }

    if (tabId === 'login') {
      navigateTo('/login');
      return;
    }

    if (tabId === 'signup') {
      navigateTo('/signup');
      return;
    }

    if (tabId === 'profile') {
      navigateTo('/profile');
      return;
    }

    if (tabId === 'about') {
      navigateTo('/about');
      return;
    }

    if (tabId === 'privacy') {
      navigateTo('/privacy');
      return;
    }

    if (tabId === 'terms') {
      navigateTo('/terms');
      return;
    }

    if (tabId === 'support') {
      navigateTo('/support');
      return;
    }

    if (window.location.pathname !== '/') {
      navigateTo('/');
    }

    setTimeout(() => {
      if (tabId === 'games') {
        const el = document.getElementById('games-section');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      } else if (tabId === 'home') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 50);
  };

  const isLobbyMode = [
    'HOME',
    'DAILY_PAGE',
    'LOCKER_PAGE',
    'LEADERBOARD_PAGE',
    'LOGIN_PAGE',
    'SIGNUP_PAGE',
    'PROFILE_PAGE',
    'ABOUT_PAGE',
    'PRIVACY_PAGE',
    'TERMS_PAGE',
    'SUPPORT_PAGE',
    'NOT_FOUND_PAGE',
    'HOWTOPLAY',
  ].includes(gameState);

  return (
    <div
      ref={appShellRef}
      className={`app-shell ${isLobbyMode ? 'lobby-mode' : 'game-mode'}`}
    >
      {/* Background radial atmosphere & dynamic cursor spotlight */}
      <div className="bg-glow" />
      {isLobbyMode && gameState !== 'HOWTOPLAY' && (
        <div className="bg-cursor-spotlight" aria-hidden="true" />
      )}

      {/* Main Lobby View */}
      {gameState === 'HOME' && (
        <>
          <Header
            activeTab={activeTab}
            onNavClick={handleNavClick}
            audioFx={audioFx}
            rushPoints={dailyProgress.rushPoints}
            streak={dailyProgress.streak}
            locker={lockerState}
          />

          <main className="lobby-content">
            <HeroSection
              onPlayNow={() => handleStartGame(featuredGame?.id || 'dodge')}
              onDailyChallenge={() => {
                const el = document.getElementById('daily-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
            />

            <GameLibrary
              onPlayGame={(gameId) => {
                setIsDailyChallengeMode(false);
                handleStartGame(gameId);
              }}
              onHoverGame={prefetchGameChunk}
              bestScore={aimBestScore}
              dodgeBestScore={dodgeBestScore}
              stackBestScore={stackBestScore}
              numberRushBestScore={numberRushBestScore}
              memoryBestScore={memoryBestScore}
              colorMazeBestScore={colorMazeBestScore}
            />

            <DailyChallenge
              onPlayDailyChallenge={handlePlayDailyChallenge}
              onOpenDailyPage={() => handleNavClick('daily')}
            />

            <HomeLockerBanner
              rushPoints={dailyProgress.rushPoints}
              locker={lockerState}
              onOpenLocker={() => handleNavClick('locker')}
            />

            <LeaderboardSection
              onPlayGame={(gameId) => {
                setIsDailyChallengeMode(false);
                handleStartGame(gameId);
              }}
              scores={allScores}
              onNavigateToLeaderboard={() => handleNavClick('leaderboard')}
            />

            <Footer
              onPlayGame={(gameId) => {
                setIsDailyChallengeMode(false);
                handleStartGame(gameId);
              }}
              onNavClick={handleNavClick}
            />
          </main>
        </>
      )}

      {/* Dedicated Daily Challenge Page */}
      {gameState === 'DAILY_PAGE' && (
        <>
          <Header
            activeTab={activeTab}
            onNavClick={handleNavClick}
            audioFx={audioFx}
            rushPoints={dailyProgress.rushPoints}
            streak={dailyProgress.streak}
            locker={lockerState}
          />

          <main className="lobby-content">
            <Suspense fallback={<div className="lobby-loading font-mono">LOADING DAILY CHALLENGE...</div>}>
              <DailyPage
                onPlayChallenge={handlePlayDailyChallenge}
                onGoHome={handleGoHome}
              />
            </Suspense>

            <Footer
              onPlayGame={(gameId) => {
                setIsDailyChallengeMode(false);
                handleStartGame(gameId);
              }}
              onNavClick={handleNavClick}
            />
          </main>
        </>
      )}

      {/* Dedicated Rush Locker Page */}
      {gameState === 'LOCKER_PAGE' && (
        <>
          <Header
            activeTab={activeTab}
            onNavClick={handleNavClick}
            audioFx={audioFx}
            rushPoints={dailyProgress.rushPoints}
            streak={dailyProgress.streak}
            locker={lockerState}
          />

          <main className="lobby-content">
            <Suspense fallback={<div className="lobby-loading font-mono">LOADING LOCKER...</div>}>
              <LockerPage
                scores={allScores}
                streak={dailyProgress.streak}
                audioFx={audioFx}
                onNavigateToDaily={() => handleNavClick('daily')}
                onRushPointsChange={() => {
                  setDailyProgress(loadDailyProgress());
                }}
              />
            </Suspense>

            <Footer
              onPlayGame={(gameId) => {
                setIsDailyChallengeMode(false);
                handleStartGame(gameId);
              }}
              onNavClick={handleNavClick}
            />
          </main>
        </>
      )}

      {/* Dedicated Leaderboards Page */}
      {gameState === 'LEADERBOARD_PAGE' && (
        <>
          <Header
            activeTab={activeTab}
            onNavClick={handleNavClick}
            audioFx={audioFx}
            rushPoints={dailyProgress.rushPoints}
            streak={dailyProgress.streak}
            locker={lockerState}
          />

          <main className="lobby-content">
            <Suspense fallback={<div className="lobby-loading font-mono">LOADING LEADERBOARDS...</div>}>
              <LeaderboardPage
                scores={allScores}
                onPlayGame={(gameId) => {
                  setIsDailyChallengeMode(false);
                  handleStartGame(gameId);
                }}
                onGoHome={handleGoHome}
                onNavigateToLogin={() => handleNavClick('login')}
              />
            </Suspense>

            <Footer
              onPlayGame={(gameId) => {
                setIsDailyChallengeMode(false);
                handleStartGame(gameId);
              }}
              onNavClick={handleNavClick}
            />
          </main>
        </>
      )}

      {/* Dedicated About Page */}
      {gameState === 'ABOUT_PAGE' && (
        <>
          <Header
            activeTab={activeTab}
            onNavClick={handleNavClick}
            audioFx={audioFx}
            rushPoints={dailyProgress.rushPoints}
            streak={dailyProgress.streak}
            locker={lockerState}
          />

          <main className="lobby-content">
            <Suspense fallback={<div className="lobby-loading font-mono">LOADING ABOUT...</div>}>
              <AboutPage
                onPlayGame={(gameId) => {
                  setIsDailyChallengeMode(false);
                  handleStartGame(gameId);
                }}
                onNavigateToDaily={() => handleNavClick('daily')}
              />
            </Suspense>

            <Footer
              onPlayGame={(gameId) => {
                setIsDailyChallengeMode(false);
                handleStartGame(gameId);
              }}
              onNavClick={handleNavClick}
            />
          </main>
        </>
      )}

      {/* Dedicated Privacy Page */}
      {gameState === 'PRIVACY_PAGE' && (
        <>
          <Header
            activeTab={activeTab}
            onNavClick={handleNavClick}
            audioFx={audioFx}
            rushPoints={dailyProgress.rushPoints}
            streak={dailyProgress.streak}
            locker={lockerState}
          />

          <main className="lobby-content">
            <Suspense fallback={<div className="lobby-loading font-mono">LOADING PRIVACY...</div>}>
              <PrivacyPage />
            </Suspense>

            <Footer
              onPlayGame={(gameId) => {
                setIsDailyChallengeMode(false);
                handleStartGame(gameId);
              }}
              onNavClick={handleNavClick}
            />
          </main>
        </>
      )}

      {/* Dedicated Terms Page */}
      {gameState === 'TERMS_PAGE' && (
        <>
          <Header
            activeTab={activeTab}
            onNavClick={handleNavClick}
            audioFx={audioFx}
            rushPoints={dailyProgress.rushPoints}
            streak={dailyProgress.streak}
            locker={lockerState}
          />

          <main className="lobby-content">
            <Suspense fallback={<div className="lobby-loading font-mono">LOADING TERMS...</div>}>
              <TermsPage />
            </Suspense>

            <Footer
              onPlayGame={(gameId) => {
                setIsDailyChallengeMode(false);
                handleStartGame(gameId);
              }}
              onNavClick={handleNavClick}
            />
          </main>
        </>
      )}

      {/* Dedicated Support & FAQ Page */}
      {gameState === 'SUPPORT_PAGE' && (
        <>
          <Header
            activeTab={activeTab}
            onNavClick={handleNavClick}
            audioFx={audioFx}
            rushPoints={dailyProgress.rushPoints}
            streak={dailyProgress.streak}
            locker={lockerState}
          />

          <main className="lobby-content">
            <Suspense fallback={<div className="lobby-loading font-mono">LOADING SUPPORT...</div>}>
              <SupportPage />
            </Suspense>

            <Footer
              onPlayGame={(gameId) => {
                setIsDailyChallengeMode(false);
                handleStartGame(gameId);
              }}
              onNavClick={handleNavClick}
            />
          </main>
        </>
      )}

      {/* Dedicated Login Page */}
      {gameState === 'LOGIN_PAGE' && (
        <>
          <Header
            activeTab={activeTab}
            onNavClick={handleNavClick}
            audioFx={audioFx}
            rushPoints={dailyProgress.rushPoints}
            streak={dailyProgress.streak}
            locker={lockerState}
          />

          <main className="lobby-content">
            <Suspense fallback={<div className="lobby-loading font-mono">LOADING LOGIN...</div>}>
              <LoginPage
                onNavigateToSignup={() => navigateTo('/signup')}
                onNavigateToHome={handleGoHome}
                onLoginSuccess={handleGoHome}
              />
            </Suspense>

            <Footer
              onPlayGame={(gameId) => {
                setIsDailyChallengeMode(false);
                handleStartGame(gameId);
              }}
              onNavClick={handleNavClick}
            />
          </main>
        </>
      )}

      {/* Dedicated Signup Page */}
      {gameState === 'SIGNUP_PAGE' && (
        <>
          <Header
            activeTab={activeTab}
            onNavClick={handleNavClick}
            audioFx={audioFx}
            rushPoints={dailyProgress.rushPoints}
            streak={dailyProgress.streak}
            locker={lockerState}
          />

          <main className="lobby-content">
            <Suspense fallback={<div className="lobby-loading font-mono">LOADING SIGNUP...</div>}>
              <SignupPage
                onNavigateToLogin={() => navigateTo('/login')}
                onNavigateToHome={handleGoHome}
                onNavigateToLocker={() => navigateTo('/locker')}
                onSignupSuccess={handleGoHome}
              />
            </Suspense>

            <Footer
              onPlayGame={(gameId) => {
                setIsDailyChallengeMode(false);
                handleStartGame(gameId);
              }}
              onNavClick={handleNavClick}
            />
          </main>
        </>
      )}

      {/* Dedicated Profile Page */}
      {gameState === 'PROFILE_PAGE' && (
        <>
          <Header
            activeTab={activeTab}
            onNavClick={handleNavClick}
            audioFx={audioFx}
            rushPoints={dailyProgress.rushPoints}
            streak={dailyProgress.streak}
            locker={lockerState}
          />

          <main className="lobby-content">
            <Suspense fallback={<div className="lobby-loading font-mono">LOADING PROFILE...</div>}>
              <ProfilePage
                locker={lockerState}
                rushPoints={dailyProgress.rushPoints}
                onNavigateToLocker={() => handleNavClick('locker')}
                onNavigateToDaily={() => handleNavClick('daily')}
                onNavigateToLogin={() => navigateTo('/login')}
                onNavigateToSignup={() => navigateTo('/signup')}
                onNavigateToHome={handleGoHome}
              />
            </Suspense>

            <Footer
              onPlayGame={(gameId) => {
                setIsDailyChallengeMode(false);
                handleStartGame(gameId);
              }}
              onNavClick={handleNavClick}
            />
          </main>
        </>
      )}

      {/* Dedicated 404 Not Found Page */}
      {gameState === 'NOT_FOUND_PAGE' && (
        <>
          <Header
            activeTab={activeTab}
            onNavClick={handleNavClick}
            audioFx={audioFx}
            rushPoints={dailyProgress.rushPoints}
            streak={dailyProgress.streak}
            locker={lockerState}
          />

          <main className="lobby-content">
            <Suspense fallback={<div className="lobby-loading font-mono">LOADING...</div>}>
              <NotFoundPage
                onGoHome={handleGoHome}
                onPlayGame={(gameId) => {
                  setIsDailyChallengeMode(false);
                  handleStartGame(gameId);
                }}
              />
            </Suspense>

            <Footer
              onPlayGame={(gameId) => {
                setIsDailyChallengeMode(false);
                handleStartGame(gameId);
              }}
              onNavClick={handleNavClick}
            />
          </main>
        </>
      )}

      {/* Automatic Onboarding Modal for Authenticated Players without a chosen handle */}
      <UsernameSetupModal
        isOpen={Boolean(needsUsernameSetup && !dismissedUsernameModal && user && !isGuest)}
        onComplete={() => setDismissedUsernameModal(true)}
        onSkip={() => setDismissedUsernameModal(true)}
      />

      {/* How To Play Modal */}
      {gameState === 'HOWTOPLAY' && (
        <HowToPlayModal
          gameId={currentGameId}
          gameName={currentGame.name}
          title={`${currentGame.icon} ${currentGame.name}`}
          subtitle={
            currentGameId === 'dodge'
              ? 'Survive. Collect. Risk everything.'
              : currentGameId === 'stack'
              ? 'How high can you build?'
              : currentGameId === 'number-rush'
              ? "Think fast. Numbers don't wait."
              : currentGameId === 'memory'
              ? 'How much can you remember?'
              : currentGameId === 'color-maze'
              ? 'Paint every tile.'
              : 'How fast can you react?'
          }
          overview={
            currentGameId === 'aim'
              ? 'AIM is a high-speed target acquisition game. React instantly, aim accurately, and pop shrinking targets before the round countdown expires.'
              : currentGameId === 'dodge'
              ? 'DODGE is a survival reflex game. Pilot your core through lethal hazard waves, collect score multipliers, and graze close to danger for bonus points.'
              : currentGameId === 'stack'
              ? 'STACK tests your precision timing and rhythm. Place oscillating blocks on top of the tower without overhang slicing to construct the tallest skyscraper.'
              : currentGameId === 'number-rush'
              ? 'NUMBER RUSH is a mental arithmetic speed sprint. Calculate math equations in milliseconds and select the matching answer tile before time runs out.'
              : currentGameId === 'memory'
              ? 'MEMORY challenges sequence recall. Memorize illuminated pattern expansions and reproduce the full sequence accurately under time pressure.'
              : 'COLOR MAZE is a labyrinth sliding puzzle. Swipe and slide the roller ball through corridors to paint 100% of the maze floor before time expires.'
          }
          controls={
            currentGameId === 'aim'
              ? 'Mouse Click or Screen Tap on targets'
              : currentGameId === 'dodge'
              ? 'WASD / Arrow Keys or Touch Joystick'
              : currentGameId === 'stack'
              ? 'Spacebar, Click, or Tap to drop block'
              : currentGameId === 'number-rush'
              ? 'Keys 1-4 or Tap on answer tile'
              : currentGameId === 'memory'
              ? 'Click or Tap pattern buttons'
              : 'Arrow Keys, WASD, or Touch Swipe'
          }
          skillsTested={
            currentGameId === 'aim'
              ? 'Reaction Speed & Click Precision'
              : currentGameId === 'dodge'
              ? 'Reflexes & Hazard Avoidance'
              : currentGameId === 'stack'
              ? 'Timing Precision & Rhythm'
              : currentGameId === 'number-rush'
              ? 'Mental Math & Rapid Processing'
              : currentGameId === 'memory'
              ? 'Working Memory & Pattern Recall'
              : 'Maze Pathfinding & Spatial Timing'
          }
          proTip={
            currentGameId === 'aim'
              ? 'Chain hits without missing to maintain maximum score combo multipliers.'
              : currentGameId === 'dodge'
              ? 'Collect yellow gems to accelerate multiplier tiers while grazing hazard borders.'
              : currentGameId === 'stack'
              ? '3 consecutive perfect drops restores chopped block width.'
              : currentGameId === 'number-rush'
              ? 'Use parity and estimation tricks to eliminate wrong answers instantly.'
              : currentGameId === 'memory'
              ? 'Group sequence steps into chunks of 3 for rapid recall.'
              : 'Chain swipe turns continuously so the roller never stops moving.'
          }
          rules={
            currentGameId === 'dodge'
              ? DODGE_RULES
              : currentGameId === 'stack'
              ? STACK_RULES
              : currentGameId === 'number-rush'
              ? NUMBER_RUSH_RULES
              : currentGameId === 'memory'
              ? MEMORY_RULES
              : currentGameId === 'color-maze'
              ? COLOR_MAZE_RULES
              : undefined
          }
          flowSteps={
            currentGameId === 'dodge'
              ? DODGE_FLOW
              : currentGameId === 'stack'
              ? STACK_FLOW
              : currentGameId === 'number-rush'
              ? NUMBER_RUSH_FLOW
              : currentGameId === 'memory'
              ? MEMORY_FLOW
              : currentGameId === 'color-maze'
              ? COLOR_MAZE_FLOW
              : undefined
          }
          onStart={handleConfirmStart}
          onClose={handleGoHome}
        />
      )}

      {/* Countdown Screen */}
      {gameState === 'COUNTDOWN' && (
        <Countdown onComplete={handleCountdownComplete} audioFx={audioFx} />
      )}

      {/* Active Game Screen with optional Daily Challenge HUD */}
      {(gameState === 'PLAYING' || gameState === 'GAMEOVER' || gameState === 'DAILY_RESULT') && (
        <GameErrorBoundary
          key={`game-boundary-${currentGameId}-${gameRetryGen}`}
          onGoHome={handleGoHome}
          onRetry={(attempts) => {
            setGameRetryGen((prev) => prev + 1);
            prefetchGameChunk(currentGameId);
            setGameState('COUNTDOWN');
          }}
        >
          <Suspense fallback={<GameLoadingFallback gameName={currentGame?.name || 'RUSH'} />}>
            {isDailyChallengeMode && activeDailyChallenge && (
              <DailyChallengeOverlay challenge={activeDailyChallenge} />
            )}

            {currentGameId === 'aim' ? (
              <AimGame
                bestScore={aimBestScore}
                onGameOver={handleGameOver}
                audioFx={audioFx}
              />
            ) : currentGameId === 'dodge' ? (
              <DodgeGame
                bestScore={dodgeBestScore}
                onGameOver={handleGameOver}
                audioFx={audioFx}
              />
            ) : currentGameId === 'stack' ? (
              <StackGame
                bestScore={stackBestScore}
                onGameOver={handleGameOver}
                audioFx={audioFx}
              />
            ) : currentGameId === 'number-rush' ? (
              <NumberRushGame
                bestScore={numberRushBestScore}
                onGameOver={handleGameOver}
                audioFx={audioFx}
              />
            ) : currentGameId === 'memory' ? (
              <MemoryGame
                bestScore={memoryBestScore}
                onGameOver={handleGameOver}
                audioFx={audioFx}
              />
            ) : (
              <ColorMazeGame
                bestScore={colorMazeBestScore}
                onGameOver={handleGameOver}
                onHome={handleGoHome}
                audioFx={audioFx}
              />
            )}
          </Suspense>
        </GameErrorBoundary>
      )}

      {/* Standard Game Over Modal Screen */}
      {gameState === 'GAMEOVER' && (
        <GameOverModal
          title="GAME OVER"
          score={lastScore}
          bestScore={Math.max(lastScore, currentBestScore)}
          isNewHighScore={isNewBest}
          extraMetrics={extraMetrics}
          submissionStatus={submissionStatus}
          isGuest={Boolean(isGuest || !user)}
          onPlayAgain={handlePlayAgain}
          onHome={handleGoHome}
          onNavigateToAuth={() => {
            setIsDailyChallengeMode(false);
            navigateTo('/login');
          }}
          onNavigateToLeaderboard={() => {
            setIsDailyChallengeMode(false);
            navigateTo('/leaderboard');
          }}
          onNavigateToDaily={() => {
            setIsDailyChallengeMode(false);
            navigateTo('/daily');
          }}
          audioFx={audioFx}
        />
      )}

      {/* Daily Challenge Result Modal Screen */}
      {gameState === 'DAILY_RESULT' && (() => {
        const todayChallenges = getTodayChallenges();
        const dateStr = getTodayDateString();
        const todayRecord = dailyProgress.dailyAttempts?.[dateStr] || {};
        const isExtremeCompleted = Boolean(todayRecord.extreme?.completed);
        const canContinueToExtreme = Boolean(
          activeDailyChallenge?.tier === 'QUICK_WIN' &&
          dailyResultData?.isCompleted &&
          todayChallenges?.extreme &&
          !isExtremeCompleted
        );

        return (
          <DailyChallengeResultModal
            challenge={activeDailyChallenge}
            result={dailyResultData}
            score={lastScore}
            canContinueToExtreme={canContinueToExtreme}
            onContinueToExtreme={canContinueToExtreme ? () => {
              handlePlayDailyChallenge(todayChallenges.extreme);
            } : null}
            onPlayAgain={handlePlayAgain}
            onGoHome={handleGoHome}
          />
        );
      })()}

      {/* Daily Visit +10 RP Claim Toast */}
      {dailyVisitToast && (
        <div className="daily-visit-toast font-mono animate-pop" role="status" aria-live="polite">
          <div className="visit-toast-icon">
            <Sparkles size={20} className="icon-gold" />
          </div>
          <div className="visit-toast-body">
            <span className="visit-toast-title">DAILY VISIT BONUS</span>
            <span className="visit-toast-sub">+{dailyVisitToast.reward} RUSH POINTS CLAIMED!</span>
          </div>
        </div>
      )}

      {/* Non-blocking Achievement Unlock Notification Toast Queue */}
      <AchievementUnlockToast
        badges={achievementToasts}
        onDismiss={handleDismissAchievementToast}
      />
    </div>
  );
}

