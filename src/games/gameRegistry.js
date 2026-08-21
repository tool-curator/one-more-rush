export const GAMES = [
  {
    id: 'aim',
    name: 'AIM',
    icon: '🎯',
    tagline: 'Test your reaction speed.',
    path: 'games/aim',
    storageKey: 'onemore_best_aim',
    active: true,
  },
  {
    id: 'dodge',
    name: 'DODGE',
    icon: '🛡️',
    tagline: 'Survive. Collect. Risk everything.',
    path: 'games/dodge',
    storageKey: 'onemore_best_dodge',
    active: true,
    featured: true,
  },
  {
    id: 'stack',
    name: 'STACK',
    icon: '🧱',
    tagline: 'Timing & balance. Stack blocks to reach new heights.',
    path: 'games/stack',
    storageKey: 'onemore_best_stack',
    active: true, // PLAYABLE
  },
  {
    id: 'number-rush',
    name: 'NUMBER RUSH',
    icon: '🔢',
    tagline: 'Rapid mental arithmetic and speed reaction.',
    path: 'games/number-rush',
    storageKey: 'onemore_best_number_rush',
    active: true, // PLAYABLE
  },
  {
    id: 'memory',
    name: 'MEMORY',
    icon: '🧠',
    tagline: 'Sequence recall and pattern expansion.',
    path: 'games/memory',
    storageKey: 'onemore_best_memory',
    active: true, // PLAYABLE
  },
  {
    id: 'color-maze',
    name: 'COLOR MAZE',
    icon: '🎨',
    tagline: 'Paint every corridor. Slide to the finish.',
    path: 'games/color-maze',
    storageKey: 'onemore_best_color_maze',
    active: true, // PLAYABLE
  },
];

export const getGameById = (id) => GAMES.find((game) => game.id === id) || null;
export const getGameOrDefault = (id) => GAMES.find((game) => game.id === id) || GAMES[0];
export const getFeaturedGame = () => GAMES.find((game) => game.featured) || GAMES[0];
