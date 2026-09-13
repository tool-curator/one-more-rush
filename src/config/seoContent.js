import { GAME_CONTENT } from './gameContent.js';

/**
 * ONE MORE RUSH — Unified SEO Content & Route Registry (Single Source of Truth)
 * Shared between build-time static HTML prerendering and client-side runtime SEO services.
 */

export const DEFAULT_SITE_URL = 'https://onemorerush.com';

export const ALL_GAMES = Object.values(GAME_CONTENT).map((gc) => ({
  id: gc.id,
  name: gc.name,
  icon: gc.icon,
  tagline: gc.tagline,
}));

// Build game route configurations directly from GAME_CONTENT single source of truth
const GAME_ROUTES_SEO = Object.values(GAME_CONTENT).reduce((acc, gc) => {
  acc[`/games/${gc.id}`] = {
    path: `/games/${gc.id}`,
    gameId: gc.id,
    gameName: gc.name,
    genre: gc.genre,
    title: gc.metaTitle,
    description: gc.metaDescription,
    h1: `${gc.icon} ${gc.h1}`,
    subtitle: gc.tagline,
    type: 'game',
    overview: gc.introduction,
    objective: gc.objective,
    howToPlay: gc.mechanics.map((m) => `${m.title}: ${m.description}`),
    controls: gc.controls.map((c) => `${c.device}: ${c.input} — ${c.description}`).join(' | '),
    skillsTested: gc.genre,
    proTip: gc.strategies[0]?.text || '',
    flowSteps: ['PREPARE', 'REACT', 'CHAIN COMBOS', 'BEAT YOUR BEST'],
  };
  return acc;
}, {});

export const ROUTE_SEO_DATA = {
  '/': {
    path: '/',
    title: 'ONE MORE RUSH — Free Online Arcade Games',
    description: 'Play free online arcade games on One More Rush. Test your aim, reflexes, memory, timing, speed and precision across six fast-paced browser games.',
    h1: 'ONE MORE RUSH — Free Online Arcade Games',
    type: 'website',
    overview: 'One More Rush is an instant-play browser arcade featuring six responsive, skill-based games designed for high-score chasing, daily challenges, and personal bests. No installations, pay-to-win mechanics, or friction.',
    features: [
      'Six original arcade games testing aim, reflexes, timing, math, memory, and pathfinding.',
      'Daily rotating challenges with Quick Win and Extreme Rush difficulty tiers.',
      'Rush Points (RP) economy for unlocking cosmetic avatar frames, titles, and victory effects.',
      'Instant browser-local progress saving and seamless optional cloud account upgrades.',
    ],
  },
  ...GAME_ROUTES_SEO,
  '/daily': {
    path: '/daily',
    breadcrumbName: 'Daily Challenge',
    title: 'DAILY CHALLENGE — Daily Arcade Challenges | One More Rush',
    description: 'Compete in daily rotating Quick Win and Extreme Rush arcade missions. Build your streak, earn Rush Points, and climb leaderboards on One More Rush.',
    h1: '⚡ DAILY CHALLENGE — Rotating Arcade Missions',
    type: 'website',
    overview: 'Every UTC calendar day, One More Rush generates two distinct challenge missions across our arcade lineup: Quick Win (an accessible milestone) and Extreme Rush (a precision mastery challenge). Clear them daily to build your streak and earn Rush Points.',
    features: [
      '10–50 Rush Points (RP) for Quick Win daily completions.',
      '500–900 Rush Points (RP) for mastering Extreme Rush challenges.',
      'Daily streak progression unlocking milestone windfalls and exclusive badges.',
      'Deterministic calendar rotation synchronized at 00:00 UTC.',
    ],

  },
  '/leaderboard': {
    path: '/leaderboard',
    breadcrumbName: 'Leaderboard',
    title: 'LEADERBOARD — One More Rush Arcade High Scores',
    description: 'View global top scores and personal best arcade records across Aim, Dodge, Stack, Number Rush, Memory, and Color Maze on One More Rush.',
    h1: '🏆 ARCADE LEADERBOARDS — Global High Scores',
    type: 'website',
    overview: 'Track your personal best arcade records and view verified global player achievements across all six skill games. Compare your performance against competitive players worldwide.',
    features: [
      'Game-by-game rankings for Aim, Dodge, Stack, Number Rush, Memory, and Color Maze.',
      'Verified score records tied to registered player handles.',
      'Local personal best tracking for guest players with automatic cloud sync upon sign-in.',
    ],
  },
  '/locker': {
    path: '/locker',
    breadcrumbName: 'Rush Locker',
    title: 'RUSH LOCKER — Cosmetic Frames, Titles & Victory Effects | One More Rush',
    description: 'Customize your arcade profile with avatar frames, prestige titles, celebratory victory effects, and achievement badges in the Rush Locker.',
    h1: '💎 RUSH LOCKER — Cosmetic Workshop & Badges',
    type: 'website',
    overview: 'The Rush Locker is the cosmetic workshop of One More Rush. Spend your earned Rush Points on animated avatar frames, player titles, and celebratory victory effects with zero pay-to-win mechanics.',
    features: [
      '100% cosmetic customizations: avatar frames, player titles, and victory effects.',
      'Achievement badges awarded for genuine skill milestones across all games.',
      'Rush Points earned strictly through gameplay and daily challenge completions.',
    ],
  },
  '/about': {
    path: '/about',
    breadcrumbName: 'About',
    title: 'ABOUT ONE MORE RUSH — Free Online Arcade Platform',
    description: 'Learn about One More Rush, an instant-play browser arcade designed for pure skill, responsive controls, daily challenges, and personal best records.',
    h1: 'ℹ️ ABOUT ONE MORE RUSH — Browser Arcade',
    type: 'website',
    overview: 'One More Rush was created with one philosophy: provide instant, responsive, and skill-testing browser arcade games that feel satisfying to play and master. No ads mid-run, no pay-to-win tricks, and no barriers.',
    features: [
      'Pure skill-based gameplay with instant 60 FPS canvas rendering.',
      'Privacy-first architecture: full guest play with local browser progress saving.',
      'Fair-play competitive leaderboards and daily challenge rotation.',
    ],

  },
  '/support': {
    path: '/support',
    breadcrumbName: 'Support & FAQ',
    title: 'SUPPORT & FAQ — One More Rush Help Center',
    description: 'Find answers about Rush Points, Daily Challenges, cosmetics, achievements, fair play rules, and submit feedback or bug reports on One More Rush.',
    h1: '🛟 SUPPORT & FAQ — Help Center',
    type: 'website',
    overview: 'Have questions about Rush Points, Daily Challenges, cosmetic unlocks, or account features? Browse our comprehensive FAQ or contact the team directly.',
    features: [
      'Frequently asked questions on Rush Points, streaks, and game mechanics.',
      'Direct bug reporting and community feedback tool.',
      'Official support channel: support.onemorerush@gmail.com.',
    ],
  },
  '/privacy': {
    path: '/privacy',
    breadcrumbName: 'Privacy Policy',
    title: 'PRIVACY POLICY — One More Rush',
    description: 'Read our transparent privacy policy. Learn how One More Rush handles local game progress, authentication, Google AdSense, and user data protection.',
    h1: '🔒 PRIVACY POLICY — Transparent Data Practices',
    type: 'website',
    overview: 'One More Rush operates with transparent, privacy-first principles. We prioritize local client-side storage for game progress, provide secure cloud authentication for registered players, and clearly disclose third-party advertising and analytics services.',
    features: [
      'Guest progress is stored 100% locally in your browser LocalStorage.',
      'Cloud accounts use secure, authenticated email and password storage.',
      'Transparent disclosure of Google AdSense advertising cookies and GA4 analytics measurement.',
      'Player controls to manage personalized ad preferences and opt-out options.',
    ],
  },
  '/terms': {
    path: '/terms',
    breadcrumbName: 'Terms of Use',
    title: 'TERMS OF USE & FAIR PLAY — One More Rush',
    description: 'Review the terms of service, virtual Rush Points rules, leaderboard integrity guidelines, and fair play standards for One More Rush.',
    h1: '📜 TERMS OF USE & FAIR PLAY GUIDELINES',
    type: 'website',
    overview: 'Please review the terms of service and fair play guidelines for One More Rush. Rush Points (RP) are strictly virtual entertainment points with no monetary cash-out value.',
    features: [
      'Fair play guidelines prohibiting automated bots and exploit scripts.',
      'Virtual currency terms: Rush Points are non-monetary cosmetic tokens.',
      'Leaderboard integrity and competitive community standards.',
      'Direct support contact at support.onemorerush@gmail.com.',
    ],
  },
  '/cookies': {
    path: '/cookies',
    breadcrumbName: 'Cookie Policy',
    title: 'COOKIE POLICY — One More Rush',
    description: 'Learn about the cookies, browser local storage, and third-party technologies used on One More Rush, including Google AdSense and Analytics.',
    h1: '🍪 COOKIE & LOCAL STORAGE POLICY',
    type: 'website',
    overview: 'Transparent information regarding the use of browser cookies, LocalStorage, and third-party services on One More Rush.',
    features: [
      'Detailed breakdown of browser LocalStorage vs HTTP cookies.',
      'Disclosures for Google AdSense advertising and GA4 measurement cookies.',
      'Clear instructions for managing, controlling, or disabling cookies.',
    ],
  },
  '/contact': {
    path: '/contact',
    breadcrumbName: 'Contact Us',
    title: 'CONTACT US — One More Rush Support & Feedback',
    description: 'Get in touch with the One More Rush team for bug reports, account assistance, gameplay feedback, and inquiries.',
    h1: '📬 CONTACT ONE MORE RUSH',
    type: 'website',
    overview: 'Have a question, feedback, or need help with your account? Reach out to the One More Rush team directly via email.',
    features: [
      'Direct support channel: support.onemorerush@gmail.com.',
      'Dedicated channels for bug reporting, account help, and player feedback.',
      'Direct communication with the platform development team.',
    ],
  },
};

export const AUTH_ROUTE_SEO = {
  '/login': {
    path: '/login',
    title: 'SIGN IN — One More Rush',
    description: 'Sign in to your One More Rush player account to manage your profile and global records.',
    noindex: true,
  },
  '/signup': {
    path: '/signup',
    title: 'CREATE ACCOUNT — One More Rush',
    description: 'Create a free One More Rush account to claim your player username and save your progress.',
    noindex: true,
  },
  '/profile': {
    path: '/profile',
    title: 'PLAYER PROFILE — One More Rush',
    description: 'View your player profile, equipped cosmetics, title, and Rush Points on One More Rush.',
    noindex: true,
  },
  '/404': {
    path: '/404',
    title: 'PAGE NOT FOUND — One More Rush',
    description: 'The page you are looking for does not exist on One More Rush.',
    noindex: true,
  },
};
