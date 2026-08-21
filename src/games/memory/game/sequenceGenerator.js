// Sequence Generator for Memory Arcade Game
// Deterministic, fair, progressive memory challenge generator.

// Color palette for 2x2 grid
export const COLOR_TILES_2X2 = [
  { id: 0, color: '#00f2fe', label: 'BLUE', emoji: '🔵', name: 'Blue' },
  { id: 1, color: '#ffb703', label: 'YELLOW', emoji: '🟡', name: 'Yellow' },
  { id: 2, color: '#ff3562', label: 'RED', emoji: '🔴', name: 'Red' },
  { id: 3, color: '#00e676', label: 'GREEN', emoji: '🟢', name: 'Green' },
];

// Symbols list for Symbol/Mixed phase
export const SYMBOLS_POOL = ['◆', '●', '▲', '★', '■', '✦', '⬟', '❖', '✚'];

// Color palette for 3x3 grid
export const COLOR_TILES_3X3 = [
  { id: 0, color: '#00f2fe', symbol: '◆', name: 'Cyan Diamond' },
  { id: 1, color: '#ffb703', symbol: '●', name: 'Gold Circle' },
  { id: 2, color: '#ff3562', symbol: '▲', name: 'Red Triangle' },
  { id: 3, color: '#00e676', symbol: '★', name: 'Green Star' },
  { id: 4, color: '#8a2be2', symbol: '■', name: 'Purple Square' },
  { id: 5, color: '#ff70a6', symbol: '✦', name: 'Pink Fourstar' },
  { id: 6, color: '#70e000', symbol: '⬟', name: 'Lime Pentagon' },
  { id: 7, color: '#ff9770', symbol: '❖', name: 'Orange Diamond' },
  { id: 8, color: '#4cc9f0', symbol: '✚', name: 'Sky Cross' },
];

export const POS_LABELS_3X3 = [
  'Top-left',
  'Top-center',
  'Top-right',
  'Middle-left',
  'Center',
  'Middle-right',
  'Bottom-left',
  'Bottom-center',
  'Bottom-right',
];

export const POS_LABELS_2X2 = [
  'Top-left',
  'Top-right',
  'Bottom-left',
  'Bottom-right',
];

const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const shuffleArray = (array) => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

/**
 * Generate sequence and challenge payload for a given round
 */
export const generateMemoryRound = (round = 1) => {
  // Determine Phase
  let phase = 1; // 1: Color, 2: Position, 3: Symbol, 4: Mixed
  let gridSize = 2; // 2x2 or 3x3
  let sequenceLength = Math.min(10, Math.floor((round - 1) * 0.45) + 1);

  if (round <= 3) {
    phase = 1;
    gridSize = 2;
    sequenceLength = round;
  } else if (round <= 7) {
    phase = 1;
    gridSize = 2;
    sequenceLength = Math.min(5, round - 1);
  } else if (round <= 12) {
    phase = 2; // Position Memory
    gridSize = 3;
    sequenceLength = Math.min(6, round - 5);
  } else if (round <= 16) {
    phase = 3; // Symbol Memory
    gridSize = 3;
    sequenceLength = Math.min(7, round - 8);
  } else {
    phase = 4; // Mixed Memory
    gridSize = 3;
    sequenceLength = Math.min(9, Math.floor(round * 0.4) + 3);
  }

  // Determine Special Challenge Modes:
  // ~75% Classic sequence modes, ~25% Special modes (SNAPSHOT, GLITCH, MEMORY_RUSH, REVERSE, BLINK, DISTRACTOR)
  let challengeType = null;

  if (round >= 5) {
    const roll = Math.random();
    if (roll < 0.28) {
      const specialTypes = ['SNAPSHOT', 'GLITCH', 'MEMORY_RUSH', 'REVERSE', 'BLINK', 'DISTRACTOR'];
      challengeType = specialTypes[getRandomInt(0, specialTypes.length - 1)];
    }
  }

  const tileCount = gridSize * gridSize;
  const tiles = gridSize === 2 ? COLOR_TILES_2X2 : COLOR_TILES_3X3;
  const posLabels = gridSize === 2 ? POS_LABELS_2X2 : POS_LABELS_3X3;

  // 1. SNAPSHOT MODE PAYLOAD
  let snapshotActivePositions = [];
  let snapshotViewTimeMs = 1250;
  if (challengeType === 'SNAPSHOT') {
    const numActive = round <= 10 ? getRandomInt(2, 3) : round <= 18 ? getRandomInt(3, 4) : getRandomInt(4, 5);
    const posSet = new Set();
    while (posSet.size < numActive) {
      posSet.add(getRandomInt(0, tileCount - 1));
    }
    snapshotActivePositions = Array.from(posSet);
  }

  // 2. GLITCH MODE PAYLOAD (UNAMBIGUOUS 3x3 / 2x2 POSITIONAL SELECTION)
  let glitchInitialTiles = [];
  let glitchModifiedTiles = [];
  let glitchOptions = [];
  let glitchCorrectIndex = 0;

  if (challengeType === 'GLITCH') {
    glitchInitialTiles = tiles.map((t) => ({ ...t }));
    glitchModifiedTiles = tiles.map((t) => ({ ...t }));

    // Select target tile position that glitches
    const targetIdx = getRandomInt(0, tileCount - 1);
    const targetTile = glitchModifiedTiles[targetIdx];

    // High contrast, fair color/symbol change
    if (targetTile.color === '#00f2fe') targetTile.color = '#ff3562';
    else if (targetTile.color === '#ffb703') targetTile.color = '#8a2be2';
    else targetTile.color = '#00f2fe';

    if (targetTile.symbol) {
      targetTile.symbol = targetTile.symbol === '◆' ? '★' : '◆';
    }

    // Correct answer is the exact position label of the glitched tile
    const correctLabel = posLabels[targetIdx];

    // Distractors are 3 distinct position labels from the remaining pool
    const otherLabels = posLabels.filter((l) => l !== correctLabel);
    const distractorLabels = shuffleArray(otherLabels).slice(0, 3);

    const rawOpts = shuffleArray([correctLabel, ...distractorLabels]);
    glitchOptions = rawOpts;
    glitchCorrectIndex = rawOpts.indexOf(correctLabel);
  }

  // 3. DISPLAY TIMING & MEMORY RUSH SPEED
  let displaySpeedMs = Math.max(380, 800 - Math.min(420, (round - 1) * 25));
  if (challengeType === 'BLINK') {
    displaySpeedMs = 280;
  } else if (challengeType === 'MEMORY_RUSH') {
    displaySpeedMs = 320;
    sequenceLength = Math.min(5, Math.max(3, sequenceLength));
  }

  // Generate sequence of tile IDs
  const sequence = [];
  for (let i = 0; i < sequenceLength; i++) {
    let nextTile = getRandomInt(0, tileCount - 1);
    if (i >= 2 && sequence[i - 1] === nextTile && sequence[i - 2] === nextTile) {
      nextTile = (nextTile + getRandomInt(1, tileCount - 1)) % tileCount;
    }
    sequence.push(nextTile);
  }

  const targetSequence = challengeType === 'REVERSE' ? [...sequence].reverse() : [...sequence];

  return {
    round,
    phase,
    gridSize,
    sequenceLength,
    challengeType,
    tiles,
    sequence,
    targetSequence,
    displaySpeedMs,
    gapSpeedMs: 140,
    // Snapshot specific payload
    snapshotActivePositions,
    snapshotViewTimeMs,
    // Glitch specific payload
    glitchInitialTiles,
    glitchModifiedTiles,
    glitchOptions,
    glitchCorrectIndex,
  };
};
