/**
 * ONE MORE RUSH — Unified Platform Content & Documentation Registry (Phase 3)
 * Single source of truth for platform features, progression systems, rules, and FAQs.
 * Shared between build-time static HTML prerendering and client-side React UI.
 */

export const PLATFORM_CONTENT = {
  home: {
    id: 'home',
    title: 'ONE MORE RUSH — Free Online Browser Arcade Games',
    h1: 'ONE MORE RUSH — Free Online Browser Arcade',
    metaTitle: 'ONE MORE RUSH — Free Online Arcade Games | Play in Browser',
    metaDescription: 'Play free online arcade skill games on One More Rush. Six fast-paced browser games, daily challenges, rush points, vanity cosmetics, and global leaderboards.',
    introduction: 'One More Rush is an instant-play browser arcade dedicated to pure skill, lightning reflexes, and high-score chasing. Every game is built from the ground up on responsive 60 FPS HTML5 canvas engines—free of pay-to-win mechanics, microtransactions, or invasive downloads.',
    pillars: [
      {
        title: 'Zero Friction Instant Play',
        description: 'No apps to install, no loading bars, and no account required to play. Launch any of our six games directly in your desktop or mobile browser with sub-second initialization.',
      },
      {
        title: 'Pure Skill-Based Competition',
        description: 'Every run is decided by your reflexes, timing, and strategy. Scores are verified by server-authoritative validation thresholds to ensure clean, tamper-free global rankings.',
      },
      {
        title: 'Rewarding Daily Progression',
        description: 'Earn virtual Rush Points (RP) through daily check-ins, rotating dual-tier challenges, and milestone streaks. Use your points to unlock cosmetic profile customization in the Rush Locker.',
      },
    ],
    disciplines: [
      {
        id: 'aim',
        name: 'AIM',
        icon: '🎯',
        category: 'Precision Target Acquisition',
        summary: 'Sharpen your mouse precision and twitch reactions against shrinking circular targets and sudden-death misclick penalties.',
      },
      {
        id: 'dodge',
        name: 'DODGE',
        icon: '🛡️',
        category: 'Survival & Bullet Hell Hazard Evasion',
        summary: 'Pilot an agile core through ricocheting bouncers, tracking chasers, bullet-firing shooters, and compressing boundary walls.',
      },
      {
        id: 'stack',
        name: 'STACK',
        icon: '🧱',
        category: 'Isometric Timing & Rhythm',
        summary: 'Drop oscillating blocks with sub-6px precision to build the tallest skyscraper without overhang slicing physics shrinking your tower.',
      },
      {
        id: 'number-rush',
        name: 'NUMBER RUSH',
        icon: '🔢',
        category: 'Mental Arithmetic Speed Sprint',
        summary: 'Calculate rapid equations and number theory rules across 5 progressive arithmetic phases under accelerating countdown pressure.',
      },
      {
        id: 'memory',
        name: 'MEMORY',
        icon: '🧠',
        category: 'Visual Sequence Working Memory',
        summary: 'Replicate ever-expanding patterns across 2x2 and 3x3 grids while adapting to simultaneous Snapshot and Glitch disruption rounds.',
      },
      {
        id: 'color-maze',
        name: 'COLOR MAZE',
        icon: '🎨',
        category: 'Labyrinth Pathfinding & Slide Timing',
        summary: 'Slide a continuous roller ball along intricate maze corridors, coating 100% of the floor within par move thresholds for 3-star ratings.',
      },
    ],
    progressionOverview: 'Progression on One More Rush centers on self-improvement and cosmetic prestige. You earn virtual Rush Points (RP) through active gameplay, daily attendance, and competitive challenge completions. Points are stored in your browser LocalStorage immediately for guests and seamlessly synced to the cloud upon creating a free player account.',
    faq: [
      {
        q: 'Is One More Rush completely free to play?',
        a: 'Yes, 100%. Every game, daily challenge, and cosmetic unlockable on One More Rush is free to access. We do not sell virtual currency, powerups, or gameplay advantages.',
      },
      {
        q: 'Do I need to create an account to play?',
        a: 'No. You can jump in and play immediately as a guest. All high scores, daily streaks, and Rush Points are saved locally in your browser. Creating a free account lets you reserve a unique player handle, appear on global leaderboards, and sync progress across devices.',
      },
      {
        q: 'Can I play One More Rush on mobile devices?',
        a: 'Yes. All six games feature dedicated mobile touch controls—including virtual analog thumbsticks for DODGE, full-screen directional swipes for COLOR MAZE, and touch-calibrated target sizing for AIM.',
      },
      {
        q: 'What are Rush Points (RP)?',
        a: 'Rush Points are strictly virtual in-game entertainment tokens earned by completing daily challenges and playing games. They have zero real-world cash value and cannot be bought, sold, or transferred.',
      },
      {
        q: 'How are global leaderboard scores verified?',
        a: 'Submitted scores pass through automated server validation logic that verifies game-mode integrity, score plausibility boundaries, and timestamp consistency before being displayed on public leaderboards.',
      },
    ],
  },

  daily: {
    id: 'daily',
    title: 'DAILY CHALLENGES — Rotating Arcade Missions | One More Rush',
    h1: '⚡ DAILY CHALLENGES — Rotating Arcade Missions',
    metaTitle: 'DAILY CHALLENGES — Daily Browser Arcade Missions | One More Rush',
    metaDescription: 'Compete in daily rotating Quick Win and Extreme Rush missions across One More Rush. Build your streak, earn bonus Rush Points, and test your skills.',
    introduction: 'Every UTC calendar day, One More Rush generates two unique rotating challenges selected across our six arcade disciplines: Quick Win (an accessible daily goal) and Extreme Rush (a precision mastery trial). Clear either or both to maintain your daily streak and earn bonus Rush Points.',
    howItWorks: [
      {
        title: 'Deterministic UTC Midnight Reset',
        description: 'New daily missions activate simultaneously worldwide every day at 00:00 UTC. An active live countdown timer displays the exact time remaining before the next rotation.',
      },
      {
        title: 'Two Distinct Challenge Tiers',
        description: 'Quick Win awards 10–50 RP for reachable milestone targets. Extreme Rush awards 500–900 RP for conquering high-skill mastery trials.',
      },

      {
        title: 'Daily Streak Progression & Milestones',
        description: 'Completing at least one daily mission each day advances your consecutive streak counter. Hitting streak milestones unlocks major Rush Point windfalls: Day 3 (+100 RP), Day 7 (+300 RP), and Day 14 (+500 RP).',
      },
      {
        title: 'Server-Authoritative Attempt Verification',
        description: 'For registered players, daily challenge sessions generate a secure cloud attempt token that verifies start time, game conditions, and final score before crediting rewards.',
      },
    ],
    faq: [
      {
        q: 'When do Daily Challenges reset?',
        a: 'Challenges reset every day at 00:00 UTC (Universal Coordinated Time). All players worldwide receive the exact same challenges on any given calendar date.',
      },
      {
        q: 'What happens if I complete only one challenge?',
        a: 'Completing either Quick Win or Extreme Rush qualifies your daily streak for the day! You can optionally complete the second challenge on the same day for additional Rush Points.',
      },
      {
        q: 'What happens if I miss a day?',
        a: 'If a UTC calendar day passes without completing at least one challenge, your consecutive streak resets to 0. However, your accumulated Rush Points and unlocked locker cosmetics are permanently retained.',
      },
      {
        q: 'Can I replay a completed challenge?',
        a: 'Once a challenge reward has been claimed for the day, you can replay the game normally in the arcade lobby, but daily challenge bonus points are credited only once per challenge per calendar day.',
      },
      {
        q: 'Are Daily Challenges available on mobile?',
        a: 'Yes, Daily Challenges work identically on desktop, tablet, and mobile browsers with full touch support.',
      },
    ],
  },

  locker: {
    id: 'locker',
    title: 'RUSH LOCKER — Cosmetic Showcase & Vanity Unlocks | One More Rush',
    h1: '🎒 RUSH LOCKER — Player Identity & Cosmetic Customization',
    metaTitle: 'RUSH LOCKER — Free Cosmetic Showcase & Badges | One More Rush',
    metaDescription: 'Customize your One More Rush arcade identity. Unlock badges, vanity titles, animated avatar frames, and victory effects using earned Rush Points.',
    introduction: 'The Rush Locker is your personal arcade trophy room and cosmetic headquarters. Showcase your skill achievements, customize your public leaderboard identity, and spend your earned Rush Points on cosmetic titles, animated avatar frames, and high-score victory effects.',
    economyDisclosure: 'Virtual Currency Transparency: Rush Points (RP) are strictly non-monetary, virtual in-game achievement tokens. They cannot be purchased with real currency, sold, traded, or redeemed for cash. All cosmetics are unlocked solely through active gameplay and personal skill.',
    categories: [
      {
        name: 'Achievement Badges',
        icon: '🏆',
        description: 'Special permanent awards unlocked by hitting rigorous in-game performance milestones—such as Sharpshooter (20,000+ in AIM), Survivor (20,000+ in DODGE), or Builder (Tower Height 25+ in STACK). Badges are earned purely through skill, not purchased with points.',
      },
      {
        name: 'Vanity Player Titles',
        icon: '🏷️',
        description: 'Equippable player handles and reputation titles displayed next to your username on global leaderboards and profile cards, ranging from Rookie to Neon Runner, Pixel Architect, and Arcade God.',
      },
      {
        name: 'Animated Avatar Frames',
        icon: '🛡️',
        description: 'Distinctive cybernetic borders and animated energy pulses that frame your player avatar across the platform, including Cyber Cyan, Neon Pink Pulse, and Golden Prestige.',
      },
      {
        name: 'Victory Screen Effects',
        icon: '✨',
        description: 'Celebratory particle celebrations that trigger when achieving new personal best scores or concluding arcade runs, including Neon Sparks, Cosmic Stardust, and Golden Confetti.',
      },
    ],
    faq: [
      {
        q: 'How do I earn Rush Points (RP)?',
        a: 'Rush Points are earned by claiming your daily attendance check-in (+10 RP), clearing Quick Win daily challenges (10–50 RP), beating Extreme Rush daily challenges (500–900 RP), and reaching multi-day streak milestones (+100 to +500 RP).',

      },
      {
        q: 'Can I buy Rush Points with real money?',
        a: 'No. One More Rush has zero real-money microtransactions. Rush Points are earned 100% through gameplay and attendance.',
      },
      {
        q: 'Are unlocked cosmetics permanent?',
        a: 'Yes. Once an avatar frame, title, badge, or victory effect is unlocked, it remains permanently available in your Locker.',
      },
      {
        q: 'How does Locker saving work for guest players?',
        a: 'Guests have full access to the Locker, and all unlocked items and point balances are stored securely in browser LocalStorage. When you create a free account, your guest items and points automatically transfer to your cloud account.',
      },
      {
        q: 'Where do equipped cosmetics appear?',
        a: 'Your equipped frame and title appear on your platform header profile badge, player profile overview, and beside your high scores on the Global Leaderboards.',
      },
    ],
  },

  leaderboard: {
    id: 'leaderboard',
    title: 'GLOBAL LEADERBOARDS — Verified Arcade High Scores | One More Rush',
    h1: '🏆 GLOBAL LEADERBOARDS — Verified Arcade Records',
    metaTitle: 'GLOBAL LEADERBOARDS — Online Arcade High Scores | One More Rush',
    metaDescription: 'Browse global verified arcade leaderboards across all six games on One More Rush. Track world records, player ranks, and personal best scores.',
    introduction: 'The One More Rush Global Leaderboards showcase the world\'s top arcade scores across all six games. Every submitted record represents an authentic, server-validated run completed under competitive gameplay conditions.',
    rankingRules: [
      {
        title: 'Dedicated Game Leaderboard Tabs',
        description: 'Each game—AIM, DODGE, STACK, NUMBER RUSH, MEMORY, and COLOR MAZE—maintains an independent global leaderboard table displaying top ranked scores, player handles, and achievement dates.',
      },
      {
        title: 'Server-Authoritative Validation',
        description: 'Scores submitted to the cloud are checked against strict game-specific plausibility barriers and server-side RPC validation rules to filter out anomalous, invalid, or impossible inputs.',
      },
      {
        title: 'Player Identity & Vanity Display',
        description: 'Authenticated players display their chosen username along with their equipped Rush Locker vanity title and animated avatar frame directly in the global rankings.',
      },
      {
        title: 'Personal Rank & Statistics Tracking',
        description: 'The leaderboard tracks your all-time high score, personal world rank percentile, and local best performances across all game modes.',
      },
    ],
    faq: [
      {
        q: 'How do I submit my score to the Global Leaderboards?',
        a: 'Sign in to your free One More Rush account before or immediately after playing. When your run finishes, your score is automatically submitted to the global database if it qualifies for verification.',
      },
      {
        q: 'Can guest players appear on the leaderboards?',
        a: 'Guest runs are stored locally on your device for personal tracking. To protect the competitive integrity of global rankings and display a unique username, only authenticated player accounts appear on the public leaderboards.',
      },
      {
        q: 'What is the Color Maze leaderboard ranking criteria?',
        a: 'Color Maze records overall aggregate completion scores across all solved mazes, as well as level-specific best completion times and move counts.',
      },
      {
        q: 'How often are the rankings updated?',
        a: 'Leaderboard rankings update in real time immediately following successful server verification of a game run.',
      },
      {
        q: 'How do I change my username or title on the leaderboard?',
        a: 'Visit your Player Profile to update your username handle, and visit the Rush Locker to equip unlocked vanity titles and avatar frames.',
      },
    ],
  },
};

export function getPlatformContent(pageKey) {
  return PLATFORM_CONTENT[pageKey] || null;
}
