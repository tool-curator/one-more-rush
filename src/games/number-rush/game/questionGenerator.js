// Question Generator for Number Rush
// Fast, local, deterministic, unambiguous mental arcade math challenge generator.

// Helper utilities
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const shuffleArray = (array) => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const isPrime = (n) => {
  if (n < 2) return false;
  if (n === 2 || n === 3) return true;
  if (n % 2 === 0 || n % 3 === 0) return false;
  for (let i = 5; i * i <= n; i += 6) {
    if (n % i === 0 || n % (i + 2) === 0) return false;
  }
  return true;
};

const PRIMES_POOL = [11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97];
const COMPOSITES_POOL = [
  12, 14, 15, 16, 18, 20, 21, 22, 24, 25, 26, 27, 28, 30,
  32, 33, 34, 35, 36, 38, 39, 40, 42, 44, 45, 46, 48, 49,
  50, 51, 52, 54, 55, 56, 57, 58, 60, 62, 63, 64, 65, 66,
  68, 69, 70, 72, 74, 75, 76, 77, 78, 80, 81, 82, 84, 85,
  86, 87, 88, 90, 91, 92, 93, 94, 95, 96, 98, 99
];

/**
 * Format raw question into standard output structure with randomized answer grid
 */
const formatQuestion = ({ title, prompt, correctAnswer, rawDistractors, phase, explanation }) => {
  const correctStr = String(correctAnswer);
  
  // Clean distractors: ensure uniqueness, non-empty, and none equal to correct answer
  const distSet = new Set();
  for (const d of rawDistractors) {
    const s = String(d);
    if (s !== correctStr && !distSet.has(s)) {
      distSet.add(s);
    }
  }

  // Fallback generation if distractors were not sufficient
  let fallbackVal = Number(correctAnswer) || 10;
  let offset = 1;
  while (distSet.size < 3) {
    const candidate = String(fallbackVal + offset);
    if (candidate !== correctStr && !distSet.has(candidate)) {
      distSet.add(candidate);
    }
    offset = offset > 0 ? -offset : -offset + 1;
  }

  const selectedDistractors = Array.from(distSet).slice(0, 3);
  const choices = shuffleArray([correctStr, ...selectedDistractors]);
  const correctIndex = choices.indexOf(correctStr);

  return {
    title,
    prompt,
    choices,
    correctIndex,
    correctAnswer: correctStr,
    phase,
    explanation: explanation || `${title}: ${correctStr}`,
  };
};

// ----------------------------------------------------
// PHASE 1 — FIND THE NUMBER (Rounds 1–5)
// ----------------------------------------------------
const generatePhase1 = () => {
  const target = getRandomInt(10, 99);
  const distractors = [];
  while (distractors.length < 3) {
    const val = getRandomInt(10, 99);
    if (val !== target && !distractors.includes(val)) {
      distractors.push(val);
    }
  }
  return formatQuestion({
    title: 'FIND THE NUMBER',
    prompt: `FIND: ${target}`,
    correctAnswer: target,
    rawDistractors: distractors,
    phase: 1,
    explanation: `Find exact target ${target}`,
  });
};

// ----------------------------------------------------
// PHASE 2 — SIMPLE OPERATIONS (Rounds 6–10)
// ----------------------------------------------------
const generatePhase2 = () => {
  const opType = getRandomInt(1, 4);
  let title = 'SIMPLE OPERATIONS';
  let prompt = '';
  let correctAnswer = 0;
  let rawDistractors = [];

  if (opType === 1) {
    // Addition: A + B
    const a = getRandomInt(8, 48);
    const b = getRandomInt(7, 45);
    correctAnswer = a + b;
    prompt = `${a} + ${b} = ?`;
    rawDistractors = [
      correctAnswer + 2,
      correctAnswer - 2,
      correctAnswer + 10,
      correctAnswer - 5,
      correctAnswer + 1,
      correctAnswer - 1,
    ];
  } else if (opType === 2) {
    // Subtraction: A - B
    const a = getRandomInt(25, 95);
    const b = getRandomInt(6, a - 5);
    correctAnswer = a - b;
    prompt = `${a} - ${b} = ?`;
    rawDistractors = [
      correctAnswer + 2,
      correctAnswer - 2,
      correctAnswer + 10,
      correctAnswer - 4,
      a + b,
    ];
  } else if (opType === 3) {
    // Multiplication: A × B
    const a = getRandomInt(3, 12);
    const b = getRandomInt(3, 12);
    correctAnswer = a * b;
    prompt = `${a} × ${b} = ?`;
    rawDistractors = [
      correctAnswer + a,
      correctAnswer - b,
      correctAnswer + 4,
      correctAnswer - 6,
      correctAnswer + 10,
    ];
  } else {
    // Division: A ÷ B
    const b = getRandomInt(2, 10);
    const result = getRandomInt(3, 12);
    const a = b * result;
    correctAnswer = result;
    prompt = `${a} ÷ ${b} = ?`;
    rawDistractors = [
      result + 1,
      result - 1,
      result + 2,
      result + 3,
      result * 2,
    ];
  }

  return formatQuestion({
    title,
    prompt,
    correctAnswer,
    rawDistractors,
    phase: 2,
  });
};

// ----------------------------------------------------
// PHASE 3 — NUMBER RULES (Rounds 11–15)
// ----------------------------------------------------
const generatePhase3 = () => {
  const ruleType = getRandomInt(1, 6);

  if (ruleType === 1) {
    // FIND THE EVEN NUMBER
    const evenTarget = getRandomInt(6, 45) * 2;
    const odds = [];
    while (odds.length < 3) {
      const val = getRandomInt(5, 45) * 2 + 1;
      if (!odds.includes(val)) odds.push(val);
    }
    return formatQuestion({
      title: 'NUMBER RULES',
      prompt: 'FIND THE EVEN NUMBER',
      correctAnswer: evenTarget,
      rawDistractors: odds,
      phase: 3,
    });
  }

  if (ruleType === 2) {
    // FIND THE ODD NUMBER
    const oddTarget = getRandomInt(5, 45) * 2 + 1;
    const evens = [];
    while (evens.length < 3) {
      const val = getRandomInt(6, 45) * 2;
      if (!evens.includes(val)) evens.push(val);
    }
    return formatQuestion({
      title: 'NUMBER RULES',
      prompt: 'FIND THE ODD NUMBER',
      correctAnswer: oddTarget,
      rawDistractors: evens,
      phase: 3,
    });
  }

  if (ruleType === 3) {
    // FIND THE PRIME
    const primeTarget = PRIMES_POOL[getRandomInt(0, PRIMES_POOL.length - 1)];
    const composites = [];
    while (composites.length < 3) {
      const val = COMPOSITES_POOL[getRandomInt(0, COMPOSITES_POOL.length - 1)];
      if (!composites.includes(val) && val !== primeTarget) {
        composites.push(val);
      }
    }
    return formatQuestion({
      title: 'NUMBER RULES',
      prompt: 'FIND THE PRIME',
      correctAnswer: primeTarget,
      rawDistractors: composites,
      phase: 3,
    });
  }

  if (ruleType === 4) {
    // FIND THE LOWEST
    const nums = [];
    while (nums.length < 4) {
      const val = getRandomInt(12, 95);
      if (!nums.includes(val)) nums.push(val);
    }
    const lowest = Math.min(...nums);
    const distractors = nums.filter((n) => n !== lowest);
    return formatQuestion({
      title: 'NUMBER RULES',
      prompt: 'FIND THE LOWEST',
      correctAnswer: lowest,
      rawDistractors: distractors,
      phase: 3,
    });
  }

  if (ruleType === 5) {
    // FIND THE HIGHEST
    const nums = [];
    while (nums.length < 4) {
      const val = getRandomInt(12, 95);
      if (!nums.includes(val)) nums.push(val);
    }
    const highest = Math.max(...nums);
    const distractors = nums.filter((n) => n !== highest);
    return formatQuestion({
      title: 'NUMBER RULES',
      prompt: 'FIND THE HIGHEST',
      correctAnswer: highest,
      rawDistractors: distractors,
      phase: 3,
    });
  }

  // FIND THE MULTIPLE OF 5
  const m5Target = getRandomInt(3, 19) * 5;
  const nonM5 = [];
  while (nonM5.length < 3) {
    const val = getRandomInt(11, 98);
    if (val % 5 !== 0 && !nonM5.includes(val)) {
      nonM5.push(val);
    }
  }
  return formatQuestion({
    title: 'NUMBER RULES',
    prompt: 'FIND THE MULTIPLE OF 5',
    correctAnswer: m5Target,
    rawDistractors: nonM5,
    phase: 3,
  });
};

// ----------------------------------------------------
// PHASE 4 — NUMBER PATTERNS (Rounds 16–20)
// ----------------------------------------------------
const generatePhase4 = () => {
  const patternType = getRandomInt(1, 4);
  let prompt = '';
  let correctAnswer = 0;
  let rawDistractors = [];

  if (patternType === 1) {
    // Arithmetic addition sequence (e.g. 5 → 10 → 15 → ?)
    const start = getRandomInt(2, 15);
    const step = getRandomInt(2, 7);
    const n1 = start;
    const n2 = start + step;
    const n3 = start + step * 2;
    correctAnswer = start + step * 3;
    prompt = `${n1} → ${n2} → ${n3} → ?`;
    rawDistractors = [
      correctAnswer - step,
      correctAnswer + step,
      correctAnswer + 1,
      correctAnswer - 2,
    ];
  } else if (patternType === 2) {
    // Arithmetic subtraction sequence (e.g. 20 → 16 → 12 → ?)
    const step = getRandomInt(2, 5);
    const target = getRandomInt(4, 15);
    const n3 = target + step;
    const n2 = target + step * 2;
    const n1 = target + step * 3;
    correctAnswer = target;
    prompt = `${n1} → ${n2} → ${n3} → ?`;
    rawDistractors = [
      correctAnswer - step,
      correctAnswer + step,
      correctAnswer - 1,
      correctAnswer + 2,
    ];
  } else if (patternType === 3) {
    // Geometric multiplication sequence (e.g. 2 → 4 → 8 → ?)
    const start = getRandomInt(2, 4);
    const ratio = getRandomInt(2, 3);
    const n1 = start;
    const n2 = start * ratio;
    const n3 = n2 * ratio;
    correctAnswer = n3 * ratio;
    prompt = `${n1} → ${n2} → ${n3} → ?`;
    rawDistractors = [
      n3 + ratio,
      correctAnswer - 2,
      correctAnswer + ratio,
      n3 * (ratio + 1),
    ];
  } else {
    // Square numbers sequence (1, 4, 9 -> 16 or 4, 9, 16 -> 25)
    const base = getRandomInt(1, 4);
    const n1 = base * base;
    const n2 = (base + 1) * (base + 1);
    const n3 = (base + 2) * (base + 2);
    correctAnswer = (base + 3) * (base + 3);
    prompt = `${n1} → ${n2} → ${n3} → ?`;
    rawDistractors = [
      correctAnswer - 3,
      correctAnswer + 3,
      correctAnswer - 5,
      correctAnswer + (base + 3),
    ];
  }

  return formatQuestion({
    title: 'NUMBER PATTERNS',
    prompt,
    correctAnswer,
    rawDistractors,
    phase: 4,
  });
};

// ----------------------------------------------------
// PHASE 5 & ADVANCED — COMPARISON & MIXED (Rounds 21+)
// ----------------------------------------------------
const generatePhase5 = () => {
  const subType = getRandomInt(1, 4);

  if (subType === 1) {
    // Which is closest to X? (e.g. 50 or 100)
    const targetBase = getRandomInt(0, 1) === 0 ? 50 : 100;
    const targetDiffs = [3, 8, 14, 21]; // Guaranteed unique distances!
    const bestDiff = targetDiffs[0];
    const otherDiffs = shuffleArray(targetDiffs.slice(1));
    const allDiffs = [bestDiff, ...otherDiffs];

    const choicesVals = allDiffs.map((d, i) => {
      // Alternate sign randomly
      const sign = i % 2 === 0 ? -1 : 1;
      return targetBase + d * sign;
    });

    const correctAnswer = choicesVals[0]; // corresponding to bestDiff
    const distractors = choicesVals.slice(1);

    return formatQuestion({
      title: 'FAST COMPARISON',
      prompt: `Which is closest to ${targetBase}?`,
      correctAnswer,
      rawDistractors: distractors,
      phase: 5,
    });
  }

  if (subType === 2) {
    // Which number is divisible by 3?
    const mult3 = getRandomInt(7, 28) * 3;
    const non3 = [];
    while (non3.length < 3) {
      const val = getRandomInt(16, 89);
      if (val % 3 !== 0 && !non3.includes(val)) {
        non3.push(val);
      }
    }
    return formatQuestion({
      title: 'FAST COMPARISON',
      prompt: 'Which number is divisible by 3?',
      correctAnswer: mult3,
      rawDistractors: non3,
      phase: 5,
    });
  }

  if (subType === 3) {
    // Mixed Math: (A + B) × C or A × B + C
    const a = getRandomInt(4, 12);
    const b = getRandomInt(3, 10);
    const c = getRandomInt(2, 5);
    const isParen = getRandomInt(0, 1) === 0;

    let correctAnswer = 0;
    let prompt = '';
    if (isParen) {
      correctAnswer = (a + b) * c;
      prompt = `(${a} + ${b}) × ${c} = ?`;
    } else {
      correctAnswer = a * b + c;
      prompt = `${a} × ${b} + ${c} = ?`;
    }

    const distractors = [
      correctAnswer + c,
      correctAnswer - b,
      correctAnswer + 10,
      correctAnswer - 5,
    ];

    return formatQuestion({
      title: 'ADVANCED MIXED',
      prompt,
      correctAnswer,
      rawDistractors: distractors,
      phase: 5,
    });
  }

  // Combined Rule: FIND THE MULTIPLE OF 4
  const mult4 = getRandomInt(4, 22) * 4;
  const non4 = [];
  while (non4.length < 3) {
    const val = getRandomInt(14, 94);
    if (val % 4 !== 0 && !non4.includes(val)) {
      non4.push(val);
    }
  }
  return formatQuestion({
    title: 'ADVANCED MIXED',
    prompt: 'Which number is divisible by 4?',
    correctAnswer: mult4,
    rawDistractors: non4,
    phase: 5,
  });
};

/**
 * Main Question Generator router based on current round
 */
export const generateQuestion = (round = 1) => {
  if (round <= 5) {
    return generatePhase1();
  }
  if (round <= 10) {
    return generatePhase2();
  }
  if (round <= 15) {
    return generatePhase3();
  }
  if (round <= 20) {
    return generatePhase4();
  }
  if (round <= 30) {
    return generatePhase5();
  }
  
  // Round 31+: Pick randomly from Phase 3, 4, 5 with equal probability
  const rand = getRandomInt(1, 3);
  if (rand === 1) return generatePhase3();
  if (rand === 2) return generatePhase4();
  return generatePhase5();
};
