/**
 * ONE MORE RUSH — Unified Game Content & Documentation Registry
 * Single source of truth for rich game guides, controls, scoring math, mechanics, and FAQs.
 * Shared between build-time static HTML prerendering and client-side React UI.
 */

export const GAME_CONTENT = {
  aim: {
    id: 'aim',
    name: 'AIM',
    icon: '🎯',
    tagline: 'Test your reaction speed & target precision.',
    genre: 'Target Precision Reflex Arcade',
    h1: 'AIM — Target Precision & Reflex Game',
    metaTitle: 'AIM — Free Online Aim & Target Precision Game | One More Rush',
    metaDescription: 'Sharpen your clicking speed, reaction time, and cursor precision in AIM. Features progressive target scaling, anti-repetition spawning, and combo multipliers.',
    introduction: 'AIM is a high-speed browser target acquisition arcade game designed to measure and sharpen your clicking speed, reaction time, and cursor accuracy under intense countdown pressure. Test your hand-eye coordination with zero installation and instant 60 FPS canvas responsiveness.',
    objective: 'Click or tap spawned circular targets as rapidly and accurately as possible before the round countdown timer expires. Any click outside an active target triggers an instant Misclick Game Over, making precision just as critical as raw speed.',
    controls: [
      { device: 'Desktop', input: 'Left Mouse Click', description: 'Point and click directly on the center of each spawned circular target.' },
      { device: 'Mobile / Tablet', input: 'Direct Screen Tap', description: 'Tap directly on targets with zero input latency. Minimum target size is increased on touch devices for ergonomic accuracy.' },
    ],
    mechanics: [
      {
        title: 'Progressive Target Sizing',
        description: 'Targets start at a generous 88px diameter and scale smoothly down to 36px on desktop (44px on mobile and touch devices) across your first 40 hits. Smaller targets demand higher mouse precision and finer pointer control.',
      },
      {
        title: 'Progressive Countdown Pressure',
        description: 'The target duration countdown begins at 2000ms (2.0 seconds) and steadily tightens down to a 600ms floor after 50 hits. The circular timer ring and top progress bar turn from blue to warning yellow at 50% time, and critical red at 25% time.',
      },
      {
        title: 'Anti-Repetition Vector Spawning',
        description: 'Targets spawn within a safe 14% to 86% screen boundary. The engine evaluates up to 10 candidate locations per spawn, enforcing a minimum 24% screen separation from the last two target locations to prevent repetitive clustering and test full-screen visual scanning.',
      },
      {
        title: 'Sudden-Death Misclick Penalty',
        description: 'Clicking anywhere on the playfield background outside an active target results in an immediate Misclick Game Over. Hasty, erratic clicks are punished; calm precision under time pressure is the path to high scores.',
      },
    ],
    scoring: {
      overview: 'Scoring in AIM rewards both lightning-fast reflexes and sustained accuracy streaks.',
      rules: [
        'Base Target Hit: 100 points per successful target hit.',
        'Reaction Speed Bonus: Sub-400ms twitch reactions receive up to (targetDuration - reactionTime) / 12 bonus points added to the base score.',
        'Combo Multiplier: Consecutive hits without missing increment your combo multiplier (1x, 2x, 3x...), multiplying total hit score exponentially.',
        'Momentum Tiers: Chaining 5+ hits unlocks Surge; 15+ hits unlocks Hyper; 30+ hits triggers Overdrive visual momentum.',
        'High Score Tracking: Session score, total hits, accuracy percentage, and average reaction time in milliseconds are logged at game over.',
      ],
    },
    strategies: [
      {
        title: 'Prioritize Streak Preservation Over Wild Speed',
        text: 'Because your score scales directly with your combo multiplier, maintaining a streak of 20+ hits yields vastly more points than frantically clicking and risking a sudden-death misclick.',
      },
      {
        title: 'Aim for the Core Center',
        text: 'As targets shrink down toward the 36px minimum, clipping the outer edge increases your misclick risk. Focus your eyes on the bright inner circle rather than the outer ring.',
      },
      {
        title: 'Anticipate Full-Screen Gaze Shifts',
        text: 'Because the anti-repetition algorithm ensures new targets spawn far from previous locations, avoid fixating on the spot where a target was just popped. Immediately widen your visual field across the full arena.',
      },
      {
        title: 'Optimize Desktop Mouse Sensitivity',
        text: 'A moderate DPI setting with mouse pointer acceleration disabled in your operating system provides the most consistent physical muscle memory for micro-flicks.',
      },
    ],
    mobile: 'On mobile and tablet devices, AIM automatically configures a larger 44px minimum target floor to account for finger occlusion. The touch listener uses direct pointer events for minimal touch-to-hit latency.',
    leaderboard: 'Scores achieved by registered players are verified by server validation rules before being listed on the Global Arcade Leaderboards. Scoring 20,000 or more points unlocks the Sharpshooter achievement badge in your Rush Locker.',
    faq: [
      {
        q: 'What causes a Game Over in AIM?',
        a: 'A run ends either when the countdown timer for an active target reaches zero (Timeout) or when you click on the background playfield outside the target (Misclick).',
      },
      {
        q: 'What is the minimum target size?',
        a: 'Targets start at 88px and shrink progressively down to 36px on desktop browsers. On touch devices, the minimum size is ergonomically capped at 44px.',
      },
      {
        q: 'How is the reaction speed bonus calculated?',
        a: 'When you hit a target faster than 400 milliseconds after it appears, the game calculates a reaction time bonus that is added to your base 100-point reward before your combo multiplier is applied.',
      },
      {
        q: 'How do I unlock the Sharpshooter badge?',
        a: 'Achieve a score of 20,000 points or higher in a single session of AIM to automatically unlock the Sharpshooter badge in your Rush Locker.',
      },
      {
        q: 'Can I play AIM on a smartphone or tablet?',
        a: 'Yes, AIM supports full mobile touch controls with zero installation required. Direct tap input allows you to test two-thumb or single-finger tapping speed.',
      },
    ],
    relatedGames: ['dodge', 'number-rush', 'memory'],
  },

  dodge: {
    id: 'dodge',
    name: 'DODGE',
    icon: '🛡️',
    tagline: 'Survive hazard waves, collect gems & risk everything.',
    genre: 'Survival Reflex Arcade',
    h1: 'DODGE — Reflex Survival & Hazard Game',
    metaTitle: 'DODGE — Free Reflex & Survival Arcade Game | One More Rush',
    metaDescription: 'Survive dynamic hazard waves, collect score gems, and master risk-reward graze mechanics in DODGE, an intense browser survival arcade game.',
    introduction: 'DODGE is an intense kinetic survival arcade game where you pilot an agile energy core through bullet-hell hazard waves, dynamic arena shrinkage, and high-risk near-miss grazing zones. Engineered for instant 60 FPS gameplay with smooth vector controls.',
    objective: 'Survive as long as possible while weaving through diverse enemy hazard patterns. Collect glowing yellow score gems to charge your score multiplier up to 5x, graze close to hazard borders for proximity points, and pick up powerful shields and speed boosts.',
    controls: [
      { device: 'Desktop', input: 'WASD or Arrow Keys', description: 'Smooth 8-directional vector movement for precise micro-dodging through narrow hazard gaps.' },
      { device: 'Mobile / Tablet', input: 'Virtual Touch Joystick', description: 'A floating virtual thumbstick appears under your touch with dynamic angle and distance tracking.' },
    ],
    mechanics: [
      {
        title: 'Wave Director & Escalating Danger Levels',
        description: 'The Wave Director scales threat intensity based on your survival time: Level 1 Warmup (0–10s), Level 2 Pressure (10–30s), Level 3 Chasers (30–60s), Level 4 Multiple Threats (60–90s), Level 5 Projectile Phase (90–120s), and Level 6+ Chaos (120s+).',
      },
      {
        title: 'Dynamic Hazard Enemy Types',
        description: 'Bouncers ricochet off walls at increasing speeds; Chasers spawn at Level 3+ and actively track your core coordinates; Shooters appear at Level 5+, aiming and firing high-velocity energy bullets across the arena.',
      },
      {
        title: 'Arena Boundary Shrinkage',
        description: 'Starting at Danger Level 4 (around 60 seconds of survival), the outer arena boundaries compress inward by up to 110 pixels. This confines hazards into a tighter corridor and forces close-quarters evasion.',
      },
      {
        title: 'Graze & Near-Miss Proximity Bonuses',
        description: 'Skimming closely along the outer edge of lethal hazards without colliding triggers a Near Miss bonus. Grazing rewards instant bonus points and accelerates multiplier charging.',
      },
      {
        title: 'Powerup Arsenal',
        description: 'Collect rotating utility powerups: Shield (absorbs one fatal collision), Speed Boost (+40% core velocity), Slow Motion (reduces hazard speed by 50%), 2X Score (doubles point values for 10s), and Magnet (draws score gems toward your core).',
      },
    ],
    scoring: {
      overview: 'Scoring in DODGE combines collectible gem value, survival duration, and active multiplier tiers.',
      rules: [
        'Score Gems: Collecting yellow gems awards base points: Tier 1 (100 pts), Tier 2 (250 pts), Tier 3 (500 pts).',
        'Multiplier Ladder: Chaining gem pickups builds your multiplier tier up to 5x. A 3.5-second decay timer resets if you go too long without collecting a gem.',
        'Graze Bonus: Near-miss proximity scores are multiplied by your active score multiplier.',
        'Survival Time: Every second survived grants baseline endurance points.',
        '3 Core Hearts: Players start with 3 health hearts. Collisions deduct 1 heart and grant a brief invulnerability grace window.',
      ],
    },
    strategies: [
      {
        title: 'Anchor Near the Arena Center in Early Waves',
        text: 'During Levels 1 to 3, staying near the middle of the board gives you the maximum reaction time to spot incoming bouncers before they reach your sector.',
      },
      {
        title: 'Loop Chasers Around Obstacles',
        text: 'Chasers home in directly on your current position. Lead them into circular loops around slower bouncers so they cannot cut off your escape path.',
      },
      {
        title: 'Watch the Multiplier Decay Bar',
        text: 'The 3.5-second decay bar beneath your score shows when your multiplier is about to drop. Prioritize grabbing a nearby gem before making risky graze runs.',
      },
      {
        title: 'Save Shields for the Arena Shrink Phase',
        text: 'When the warning flashes that the arena is shrinking at Level 4, grabbing a Shield powerup is your insurance against sudden corner traps.',
      },
    ],
    mobile: 'On touchscreens, the virtual joystick centers dynamically under your thumb wherever you press, offering 360-degree analog-feel steering with zero physical thumb drift.',
    leaderboard: 'Global leaderboards track total score, survival time, highest danger level reached, near-misses, and powerups used. Scoring 20,000+ points unlocks the Survivor achievement badge in your Rush Locker.',
    faq: [
      {
        q: 'How does the arena shrinking mechanic work?',
        a: 'At Danger Level 4 (survival time ~60s), a warning banner alerts you that the arena is shrinking. The boundary walls move inward, reducing the playable surface area to intensify action.',
      },
      {
        q: 'What happens when I collide with a hazard?',
        a: 'You lose 1 of your 3 health hearts and receive a brief invulnerability window. When all 3 hearts are lost, your run ends and final stats are calculated.',
      },
      {
        q: 'What is the Graze mechanic?',
        a: 'Passing very close to a hazard border without touching it registers a Near Miss, awarding instant score points and contributing to your session stats.',
      },
      {
        q: 'Can multiple powerups be active at once?',
        a: 'Yes, you can hold an active Shield while benefiting from Speed Boost or 2X Score multipliers at the same time.',
      },
      {
        q: 'How do I unlock the Survivor badge?',
        a: 'Achieve a score of 20,000 points or higher in DODGE to earn the Survivor achievement badge in your Rush Locker.',
      },
    ],
    relatedGames: ['aim', 'stack', 'color-maze'],
  },

  stack: {
    id: 'stack',
    name: 'STACK',
    icon: '🧱',
    tagline: 'Build the tallest tower with precision timing & rhythm.',
    genre: 'Isometric Precision Timing Arcade',
    h1: 'STACK — Isometric Tower & Timing Game',
    metaTitle: 'STACK — Free Block Stacking & Timing Game | One More Rush',
    metaDescription: 'Construct the tallest skyscraper in STACK. Master precision block drops, 6px perfect alignment thresholds, overhang slicing physics, and Flow Mode.',
    introduction: 'STACK is a rhythmic isometric precision timing arcade game where oscillating 3D blocks must be dropped flush on top of a growing skyscraper tower. Overhanging portions are sliced off with realistic gravity debris physics; master perfect timing to maintain surface area and climb toward the clouds.',
    objective: 'Drop each oscillating block with exact alignment on top of the base beneath it. Construct the highest tower possible while managing accelerating block speeds, modifier rounds, and shrinking platform sizes.',
    controls: [
      { device: 'Desktop', input: 'Spacebar or Left Click', description: 'Press the spacebar or click anywhere on screen to release the moving block onto the tower base.' },
      { device: 'Mobile / Tablet', input: 'Screen Tap', description: 'Tap anywhere on the screen to instantly drop the moving block.' },
    ],
    mechanics: [
      {
        title: '6.0px Perfect Alignment Threshold',
        description: 'When the moving block is released within 6.0 logical pixels (~2.3% of the initial 260px width) of the base below, the game registers a PERFECT drop. The block snaps flush with the base, losing zero width, and triggers harmonic synthesizer notes.',
      },
      {
        title: 'Overhang Slicing & Gravity Debris',
        description: 'Any alignment error exceeding 6.0 pixels slices off the overhanging portion of the block. The sliced debris tumbles downward under gravity physics, and the remaining surface width becomes the new narrower base for all future blocks.',
      },
      {
        title: 'Flow Mode & Multipliers',
        description: 'Chaining 5 consecutive perfect placements triggers FLOW MODE. Flow Mode lasts 8 seconds, doubles all placement scores (2x), and rewards extra timer seconds (+2s) for subsequent perfect hits.',
      },
      {
        title: 'Progressive Oscillation Speed',
        description: 'Block travel speed starts at a gentle 240 px/s and accelerates dynamically: 300 px/s at height 5, 360 px/s at height 10, 450 px/s at height 20, up to a maximum base cap of 620 px/s (700 px/s in Speed rounds).',
      },
      {
        title: 'Modifier Rounds (Height 15+)',
        description: 'Every 8 levels starting after height 15, special challenge rounds appear: Speed Round (+15% velocity), Mirror Round (reverses alternating entry direction), Blind Round (block opacity pulses), and Double Score (2x placement reward).',
      },
    ],
    scoring: {
      overview: 'Scoring in STACK rewards consecutive precision placements and tall tower construction.',
      rules: [
        'Perfect Drop Base: 500 base points multiplied by your combo tier (up to 10x).',
        'Flow Mode Multiplier: Doubles all placement points (2x) while Flow Mode is active.',
        'Sliced Drop Score: Proportional points based on the percentage of surface area successfully retained.',
        'Height Milestones: Height milestones (10, 20, 30, 40...) trigger celebratory visual fanfare and camera adjustments.',
        'Game Over Condition: If a block misses the base entirely or remaining width shrinks below 5px, the tower collapses and the run ends.',
      ],
    },
    strategies: [
      {
        title: 'Focus on the Leading Edge',
        text: 'Rather than looking at the center of the moving block, fix your gaze on the leading front edge as it approaches the corresponding edge of the platform beneath it.',
      },
      {
        title: 'Listen for the Musical Scale Chime',
        text: 'Each consecutive perfect drop plays an ascending note in a harmonic musical scale, giving you immediate audio confirmation of whether your release timing was dead-on.',
      },
      {
        title: 'Use Spacebar on Desktop for Lower Latency',
        text: 'Tapping the physical Spacebar on a mechanical or laptop keyboard typically has lower travel latency and tactile bounce than clicking a mouse button.',
      },
      {
        title: 'Adjust Timing After an Overhang Cut',
        text: 'When a block gets sliced narrower, it travels across the alignment zone faster. Slightly lead your release press to compensate for the reduced overlap window.',
      },
    ],
    mobile: 'STACK features a vertically centered isometric camera that smoothly tracks upward as your tower rises, maintaining optimal drop visibility on both portrait and landscape mobile screens.',
    leaderboard: 'Leaderboard metrics include Total Score, Tower Height Reached, Total Perfect Drops, and Longest Perfect Streak. Reaching tower height 25 or higher unlocks the Builder achievement badge in your Rush Locker.',
    faq: [
      {
        q: 'What is the tolerance for a Perfect drop in STACK?',
        a: 'A drop qualifies as Perfect when it is aligned within 6.0 logical pixels of the block below it. Perfect drops snap flush with the platform and lose zero surface area.',
      },
      {
        q: 'How does Flow Mode activate?',
        a: 'Landing 5 consecutive perfect drops activates Flow Mode for 8 seconds, doubling placement points and granting bonus time for additional perfects.',
      },
      {
        q: 'What happens when block edges are sliced off?',
        a: 'The overhanging part of the block is sliced off by gravity physics, permanently reducing the platform width for all subsequent levels until the game ends.',
      },
      {
        q: 'What is the minimum block width before game over?',
        a: 'If your block width shrinks below 5 pixels or misses the base completely, the block drops into the void and the game ends.',
      },
      {
        q: 'How do I unlock the Builder badge?',
        a: 'Build your tower to a height of 25 blocks or higher in a single run of STACK to unlock the Builder badge in your Rush Locker.',
      },
    ],
    relatedGames: ['dodge', 'number-rush', 'color-maze'],
  },

  'number-rush': {
    id: 'number-rush',
    name: 'NUMBER RUSH',
    icon: '🔢',
    tagline: 'Fast-paced mental math under intense pressure.',
    genre: 'Speed Mental Arithmetic Arcade',
    h1: 'NUMBER RUSH — Mental Arithmetic Speed Game',
    metaTitle: 'NUMBER RUSH — Free Fast Math & Number Game | One More Rush',
    metaDescription: 'Test your rapid mental math, numerical agility, and decision speed across 5 progressive arithmetic phases in NUMBER RUSH.',
    introduction: 'NUMBER RUSH is a rapid-fire mental math speed sprint testing quick arithmetic, number theory rules, sequence pattern recognition, and numerical working memory against an accelerating countdown timer.',
    objective: 'Solve arithmetic equations and mathematical pattern challenges in fractions of a second, selecting the matching answer tile from four options before the timer expires. Survive as many rounds as possible without exhausting your 3 hearts.',
    controls: [
      { device: 'Desktop', input: 'Number Keys (1, 2, 3, 4) or Mouse Click', description: 'Press keys 1, 2, 3, or 4 on your keyboard corresponding to the four answer tiles, or click with the mouse pointer.' },
      { device: 'Mobile / Tablet', input: 'Direct Screen Tap', description: 'Tap directly on the matching answer tile on your touchscreen.' },
    ],
    mechanics: [
      {
        title: '5 Progressive Mathematical Phases',
        description: 'Phase 1: Find The Number (Rounds 1–5, rapid scanning among distractors); Phase 2: Simple Operations (Rounds 6–10, addition, subtraction, multiplication, division); Phase 3: Number Rules (Rounds 11–15, odd, even, primes, lowest/highest); Phase 4: Sequences (Rounds 16–20, arithmetic and geometric progressions); Phase 5: Mixed Speed Sprint (Rounds 21+, combined challenges).',
      },
      {
        title: 'Rush Mode & Overdrive Acceleration',
        description: 'Rush Mode activates during rounds 10–14 and 20–24, tightening decision timers by 8% and boosting multiplier gains. Overdrive kicks in at round 25+, applying maximum speed pressure with a 2.2-second minimum decision window.',
      },
      {
        title: '3-Heart Health System',
        description: 'Players start with 3 hearts. Submitting an incorrect answer or allowing the round timer to run out deducts 1 heart and resets your streak multiplier. Three mistakes ends the run.',
      },
      {
        title: 'Intelligent Distractor Generation',
        description: 'Distractor choices are mathematically calibrated close to the correct answer (off by ±1, ±2, or common calculation traps) to test genuine numerical comprehension rather than superficial guessing.',
      },
    ],
    scoring: {
      overview: 'Scoring rewards correct answer speed, high accuracy percentages, and sustained streaks.',
      rules: [
        'Base Correct Answer: 200 points per correct equation solved.',
        'Streak Multiplier: Correct answer streaks build your score multiplier up to 5x.',
        'Time Bonus: Submitting answers quickly adds fractional bonus seconds to your decision window.',
        'Session Metrics: Total score, highest round reached, correct answer streak, and overall accuracy percentage are recorded at game over.',
      ],
    },
    strategies: [
      {
        title: 'Use Number Row Keys (1–4) on Desktop',
        text: 'Rest your left-hand fingers on keys 1, 2, 3, and 4. Eliminating physical mouse travel time saves 200–300 milliseconds on every question.',
      },
      {
        title: 'Eliminate Wrong Answers via Parity',
        text: 'In addition and multiplication, check the last digit: an Even number multiplied by an Odd number must end in an Even digit. This instantly rules out invalid odd distractors.',
      },
      {
        title: 'Memorize the Two-Digit Prime Pool',
        text: 'Phase 3 frequently tests prime identification. Memorize the two-digit primes tested: 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97.',
      },
      {
        title: 'Estimate Magnitude for Sequences',
        text: 'In Phase 4 sequences, calculate the difference between the first two terms immediately to determine if the pattern is adding, subtracting, or multiplying.',
      },
    ],
    mobile: 'On mobile devices, NUMBER RUSH renders a 2x2 responsive touch grid with prominent touch buttons and clear visual tap highlights.',
    leaderboard: 'Scores are verified on the global leaderboards with tracking for round reached, correct answer count, and accuracy rate. Achieving 15,000+ points unlocks the Calculator achievement badge in your Rush Locker.',
    faq: [
      {
        q: 'What types of math questions appear in NUMBER RUSH?',
        a: 'Questions progress through 5 phases: rapid number finding, basic arithmetic (+, -, ×, ÷), number theory rules (even, odd, primes), sequence pattern recognition, and mixed speed sprints.',
      },
      {
        q: 'What are the keyboard shortcuts on PC?',
        a: 'Keys 1, 2, 3, and 4 correspond directly to the four displayed answer choices from left to right, allowing you to answer without moving the mouse.',
      },
      {
        q: 'What is the penalty for a wrong answer?',
        a: 'A wrong answer deducts 1 heart from your 3 starting hearts and resets your active combo multiplier. You have 3 mistakes before the game ends.',
      },
      {
        q: 'What happens in Rush Mode?',
        a: 'Rush Mode triggers during rounds 10–14 and 20–24, accelerating the countdown timer and offering higher multiplier rewards.',
      },
      {
        q: 'How do I unlock the Calculator badge?',
        a: 'Earn a score of 15,000 points or more in a single run of NUMBER RUSH to unlock the Calculator achievement badge in your Rush Locker.',
      },
    ],
    relatedGames: ['memory', 'aim', 'stack'],
  },

  memory: {
    id: 'memory',
    name: 'MEMORY',
    icon: '🧠',
    tagline: 'Expand pattern recall & visual sequence retention.',
    genre: 'Visual Sequence Working Memory Arcade',
    h1: 'MEMORY — Visual Sequence & Pattern Game',
    metaTitle: 'MEMORY — Free Memory Pattern & Sequence Game | One More Rush',
    metaDescription: 'Train your sequence recall, working memory, and change detection in MEMORY. Features 2x2 and 3x3 grids, Snapshot challenges, and Glitch mode.',
    introduction: 'MEMORY is a visual working memory and pattern recognition arcade game where players observe, retain, and replicate illuminated tile sequences, spatial flash patterns, and glitch change detections. Designed to challenge and expand your short-term recall under time pressure.',
    objective: 'Observe sequence demonstrations and replicate the exact chronological order of illuminated tiles without making 3 mistakes. Adapt to expanding grids and special challenge rounds including Snapshot and Glitch modes.',
    controls: [
      { device: 'Desktop', input: 'Mouse Click or Number Keys', description: 'Click grid tiles with your mouse pointer or press corresponding number keys in chronological order.' },
      { device: 'Mobile / Tablet', input: 'Direct Screen Tap', description: 'Tap grid cells in the exact order they were illuminated.' },
    ],
    mechanics: [
      {
        title: '2x2 to 3x3 Grid Evolution',
        description: 'Rounds 1–7 utilize an accessible 2x2 grid with 4 bold color tiles (Cyan, Yellow, Red, Green). Starting at Round 8, the arena expands to a 3x3 grid with 9 coordinate cells and geometric symbol identifiers.',
      },
      {
        title: '4 Distinct Memory Phases',
        description: 'Phase 1: Color Memory (Rounds 1–7, sequence length 1–5); Phase 2: Position Memory (Rounds 8–12, 3x3 grid, sequence length 3–6); Phase 3: Symbol Memory (Rounds 13–16, 9 geometric symbols, sequence length 5–7); Phase 4: Mixed Speed Memory (Rounds 17+, combined challenges up to 9 steps).',
      },
      {
        title: 'Special Challenge Modes (Round 5+)',
        description: 'Snapshot Mode flashes multiple tiles simultaneously for 1.2s; Glitch Mode flashes a pattern and then alters a single tile, challenging you to spot the change; Reverse Mode requires inputting the sequence backwards; Memory Rush plays at double speed.',
      },
      {
        title: '3-Heart Health & Focus Mode',
        description: 'Players have 3 hearts. Inputting a wrong tile loses 1 heart and shows the correct sequence before advancing. Chaining 5+ error-free rounds activates Focus Mode with enhanced visual clarity and audio chimes.',
      },
    ],
    scoring: {
      overview: 'Scoring rewards sequence length, round depth, and error-free execution streaks.',
      rules: [
        'Round Completion: 300 base points per successfully reproduced sequence.',
        'Per-Tile Reward: 50 points per correct individual tile input.',
        'Streak Multiplier: Error-free rounds scale your multiplier up to 4x.',
        'Session Stats: Final score, longest sequence completed, total completed sequences, and accuracy rate are recorded at game over.',
      ],
    },
    strategies: [
      {
        title: 'Chunk Long Sequences into Groups of Three',
        text: 'Working memory retains items best in groups of 3. For a 6-step sequence, memorize the first three tiles as a single unit, then the next three as a second unit.',
      },
      {
        title: 'Trace Geometric Motion Paths',
        text: 'Rather than memorizing names or numbers, visualize the light path as a continuous geometric shape (e.g., a triangle, an outer circle, or an S-curve across the grid).',
      },
      {
        title: 'Associate Sound Frequencies',
        text: 'Each of the 9 tiles emits a distinct musical synthesizer frequency. Listening to the melodic pattern provides dual auditory-visual encoding.',
      },
      {
        title: 'In Snapshot Mode, Note the Negative Space',
        text: 'When 6 out of 9 tiles illuminate in Snapshot mode, it is mentally faster to note the 3 unlit tiles and tap everything else.',
      },
    ],
    mobile: 'On mobile devices, tiles render with clear high-contrast borders and instant visual touch highlights to prevent accidental double-taps.',
    leaderboard: 'Scores are verified and ranked on the global leaderboards with tracking for highest round, longest sequence, and accuracy percentage. Clearing round 10 unlocks the Mastermind achievement badge in your Rush Locker.',
    faq: [
      {
        q: 'When does the grid expand from 2x2 to 3x3?',
        a: 'The grid starts as a 4-tile 2x2 layout for rounds 1–7. At Round 8, the grid expands to a 9-tile 3x3 layout with geometric symbol identifiers.',
      },
      {
        q: 'What is Glitch Challenge Mode?',
        a: 'In Glitch Mode, an initial grid pattern flashes and then re-appears with one tile subtly changed. You must spot and tap the specific tile that altered.',
      },
      {
        q: 'What is Snapshot Mode?',
        a: 'Snapshot mode flashes a pattern of tiles all at once for 1.2 seconds. You must remember and tap all illuminated tiles without worrying about order.',
      },
      {
        q: 'How many mistakes can I make before losing?',
        a: 'You start with 3 hearts. Making an incorrect input loses 1 heart and reveals the correct sequence before moving to the next round. The run ends when all 3 hearts are lost.',
      },
      {
        q: 'How do I earn the Mastermind badge?',
        a: 'Clear round 10 or higher in a single session of MEMORY to unlock the Mastermind achievement badge in your Rush Locker.',
      },
    ],
    relatedGames: ['number-rush', 'aim', 'color-maze'],
  },

  'color-maze': {
    id: 'color-maze',
    name: 'COLOR MAZE',
    icon: '🎨',
    tagline: 'Paint every labyrinth corridor & slide to the finish.',
    genre: 'Kinetic Sliding Labyrinth Puzzle',
    h1: 'COLOR MAZE — Labyrinth Painter & Sliding Puzzle',
    metaTitle: 'COLOR MAZE — Free Maze & Ball Control Game | One More Rush',
    metaDescription: 'Paint every corridor in COLOR MAZE. Test your swipe pathfinding, wall-to-wall sliding physics, move efficiency, and 3-star maze optimization.',
    introduction: 'COLOR MAZE is a kinetic sliding labyrinth puzzle where you pilot a paint roller ball through intricate geometric mazes, coating every unpainted floor corridor with glowing neon color before the clock expires. Master move efficiency, path planning, and smooth wall-to-wall sliding physics.',
    objective: 'Slide the roller through corridors until 100% of the maze floor is coated in paint. Achieve 3-star ratings across handcrafted and procedural benchmark levels by minimizing moves and maximizing speed.',
    controls: [
      { device: 'Desktop', input: 'Arrow Keys or WASD', description: 'Press any directional key to launch the roller gliding continuously until it collides with a wall.' },
      { device: 'Mobile / Tablet', input: '4-Way Touch Swipe', description: 'Swipe Up, Down, Left, or Right on your touchscreen to launch the roller gliding along corridors.' },
    ],
    mechanics: [
      {
        title: 'Continuous Wall-to-Wall Sliding Physics',
        description: 'When launched in any direction, the roller ball glides continuously in a straight line until it collides with a wall obstacle. The ball cannot be stopped mid-corridor; every move must be calculated to land at an intersection with an exit.',
      },
      {
        title: '100% Floor Coverage Requirement',
        description: 'Every floor corridor traversed is permanently coated in glowing neon paint. Every single reachable floor tile must be painted to complete the level and advance.',
      },
      {
        title: 'Par Move Efficiency & 3-Star Rating',
        description: 'Each level features a designated par move threshold: completing the maze at or below par with fast execution awards 3 Stars; moderate efficiency awards 2 Stars; exploratory completion awards 1 Star.',
      },
      {
        title: 'Handcrafted & Procedural Levels',
        description: 'Levels 1–15 feature handcrafted benchmark labyrinths progressing from simple 5x5 corridors to intricate 9x9 multi-loop mazes. Level 16+ introduces procedurally generated mazes deterministically validated for 100% solvability.',
      },
      {
        title: '5 Dynamic Visual Themes',
        description: 'Mazes cycle through 5 distinct neon themes: Cyber Cyan, Neon Coral, Electric Violet, Solar Amber, and Emerald Matrix, rendered with offscreen canvas acceleration for locked 60 FPS performance.',
      },
    ],
    scoring: {
      overview: 'Scoring in COLOR MAZE combines base level completion rewards with move efficiency and time bonuses.',
      rules: [
        'Level Completion: 1,000 base points for achieving 100% paint coverage.',
        'Move Efficiency Bonus: Extra score awarded for every move under the designated par threshold.',
        'Time Bonus: Bonus points scale with how quickly the maze was fully painted.',
        'Star Tracking: Your star rating (1–3 stars), best time, and lowest move count are permanently saved per level.',
      ],
    },
    strategies: [
      {
        title: 'Queue Directional Swipes in Flight',
        text: 'You can swipe or press your next directional key while the roller ball is still in motion. The engine registers the input and executes an immediate turn the instant the ball hits the wall.',
      },
      {
        title: 'Paint Outer Perimeter Corridors First',
        text: 'Clearing the outer boundary walls first simplifies the remaining labyrinth and avoids backtracking through already-painted central pathways.',
      },
      {
        title: 'Identify Bottleneck Dead Ends Early',
        text: 'Look for corridors that only have one entrance and exit. Plan your path so that entering the bottleneck naturally spits you out into an unpainted section.',
      },
      {
        title: 'Plan Ahead for Wall Stop Positions',
        text: 'Because the roller only halts upon wall impact, verify that a move leaves you adjacent to a new corridor rather than trapping you in a loop of already-painted tiles.',
      },
    ],
    mobile: 'COLOR MAZE features full-screen touch swipe recognition with customizable swipe sensitivity and zero edge clipping on portrait and landscape displays.',
    leaderboard: 'Scores are verified on global leaderboards with tracking for overall score, total stars earned, highest level cleared, and best times. Clearing level 15+ unlocks the Maze Painter achievement badge in your Rush Locker.',
    faq: [
      {
        q: 'Can I stop the ball in the middle of a corridor?',
        a: 'No, once launched, the roller ball travels continuously until it collides with a wall block or obstacle. Path planning involves choosing routes that end at useful wall intersections.',
      },
      {
        q: 'How do I earn 3 stars on a level?',
        a: '3 stars are awarded by painting 100% of the maze floor while staying at or below the level par move count and completing the level quickly.',
      },
      {
        q: 'Can I replay completed levels to improve my stars?',
        a: 'Yes, your best score, fastest completion time, and star rating per level are saved automatically, allowing you to replay any level to optimize your route.',
      },
      {
        q: 'Are higher levels randomly generated?',
        a: 'Levels 1–15 are handcrafted benchmark labyrinths. Starting from level 16 onwards, the game features procedurally generated mazes mathematically validated for 100% solvability.',
      },
      {
        q: 'How do I unlock the Maze Painter badge?',
        a: 'Clear level 15 or higher in COLOR MAZE to unlock the Maze Painter achievement badge in your Rush Locker.',
      },
    ],
    relatedGames: ['stack', 'dodge', 'memory'],
  },
};

export function getGameContent(gameId) {
  return GAME_CONTENT[gameId] || null;
}
