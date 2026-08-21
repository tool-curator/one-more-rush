/**
 * ONE MORE RUSH — Daily Challenge Service V3
 * Dual-tier Daily Challenges: QUICK WIN (10–50 RP) & EXTREME RUSH (500–1,000 RP).
 * Deterministic date-based selection, objective evaluation, independent rewards, and shared daily streak.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import { getScopedKey, emitScopeChange, getActiveStorageScope } from './storageScopeService.js';
import { isMigrationBarrierActive, getPendingGuestConversion } from './migrationBarrierService.js';

export const STORAGE_KEY_DAILY_PROGRESS = 'oneMoreRush.daily.progress';
export const STORAGE_KEY_RUSH_POINTS = 'oneMoreRush.points';

// ── STREAK MILESTONE CONFIGURATION (3d -> +100, 7d -> +300, 14d -> +500) ────
export const STREAK_MILESTONES = [
  { days: 3, bonusPoints: 100, label: '3-Day Milestone' },
  { days: 7, bonusPoints: 300, label: '7-Day Milestone' },
  { days: 14, bonusPoints: 500, label: '14-Day Milestone' },
];

/**
 * Derives next streak milestone info for presentation / UI tracking.
 * Safe against negative, null, undefined, and non-numeric inputs.
 * Strictly presentational; never mutates economy or calls RPCs.
 */
export function getNextMilestoneInfo(currentStreak) {
  const streak = Math.max(0, parseInt(currentStreak, 10) || 0);

  if (streak >= 14) {
    return {
      currentStreak: streak,
      nextMilestone: 14,
      daysRemaining: 0,
      bonusPoints: 500,
      progressPercent: 100,
      isMaxTier: true,
      prevMilestone: 7,
      label: 'All Milestones Complete',
      ariaLabel: `${streak} day streak, all major streak milestones unlocked`,
    };
  }

  if (streak >= 7) {
    const prev = 7;
    const next = 14;
    const bonus = 500;
    const remaining = Math.max(0, next - streak);
    const progressPercent = Math.min(100, Math.max(0, Math.round(((streak - prev) / (next - prev)) * 100)));
    return {
      currentStreak: streak,
      nextMilestone: next,
      daysRemaining: remaining,
      bonusPoints: bonus,
      progressPercent,
      isMaxTier: false,
      prevMilestone: prev,
      label: '14-Day Milestone',
      ariaLabel: `${streak} day streak, ${progressPercent} percent progress toward the day ${next} milestone worth ${bonus} Rush Points`,
    };
  }

  if (streak >= 3) {
    const prev = 3;
    const next = 7;
    const bonus = 300;
    const remaining = Math.max(0, next - streak);
    const progressPercent = Math.min(100, Math.max(0, Math.round(((streak - prev) / (next - prev)) * 100)));
    return {
      currentStreak: streak,
      nextMilestone: next,
      daysRemaining: remaining,
      bonusPoints: bonus,
      progressPercent,
      isMaxTier: false,
      prevMilestone: prev,
      label: '7-Day Milestone',
      ariaLabel: `${streak} day streak, ${progressPercent} percent progress toward the day ${next} milestone worth ${bonus} Rush Points`,
    };
  }

  // streak < 3 (0, 1, 2)
  const prev = 0;
  const next = 3;
  const bonus = 100;
  const remaining = Math.max(0, next - streak);
  const progressPercent = Math.min(100, Math.max(0, Math.round((streak / next) * 100)));
  return {
    currentStreak: streak,
    nextMilestone: next,
    daysRemaining: remaining,
    bonusPoints: bonus,
    progressPercent,
    isMaxTier: false,
    prevMilestone: prev,
    label: '3-Day Milestone',
    ariaLabel: `${streak} day streak, ${progressPercent} percent progress toward the day ${next} milestone worth ${bonus} Rush Points`,
  };
}

// ── 1. QUICK WIN CHALLENGES (30 Definitions, 5 per Game, 10–50 RP) ──────────
export const QUICK_WIN_CHALLENGES = [
  // Dodge
  {
    id: 'quick_dodge_safe_step',
    gameId: 'dodge',
    gameName: 'DODGE',
    gameIcon: '🛡️',
    tier: 'QUICK_WIN',
    title: 'SAFE STEP',
    description: 'Survive the opening hazard wave and stay alert.',
    difficulty: 'EASY',
    rewardPoints: 15,
    objectives: [
      { id: 'time', label: 'Survive 15 seconds', target: 15, unit: 's', metric: 'time' },
    ],
  },
  {
    id: 'quick_dodge_survival_scout',
    gameId: 'dodge',
    gameName: 'DODGE',
    gameIcon: '🛡️',
    tier: 'QUICK_WIN',
    title: 'SURVIVAL SCOUT',
    description: 'Stay alive for 22 seconds without getting cornered.',
    difficulty: 'EASY+',
    rewardPoints: 25,
    objectives: [
      { id: 'time', label: 'Survive 22 seconds', target: 22, unit: 's', metric: 'time' },
    ],
  },
  {
    id: 'quick_dodge_gem_harvest',
    gameId: 'dodge',
    gameName: 'DODGE',
    gameIcon: '🛡️',
    tier: 'QUICK_WIN',
    title: 'GEM HARVEST',
    description: 'Collect 8 gems scattered across the arena.',
    difficulty: 'EASY',
    rewardPoints: 20,
    objectives: [
      { id: 'gems', label: 'Collect 8 gems', target: 8, unit: '', metric: 'foodCount' },
    ],
  },
  {
    id: 'quick_dodge_danger_entry',
    gameId: 'dodge',
    gameName: 'DODGE',
    gameIcon: '🛡️',
    tier: 'QUICK_WIN',
    title: 'DANGER ENTRY',
    description: 'Survive until Danger 2 begins.',
    difficulty: 'EASY/HARDER',
    rewardPoints: 30,
    objectives: [
      { id: 'danger', label: 'Reach Danger 2', target: 2, unit: '', metric: 'dangerLevel' },
    ],
  },
  {
    id: 'quick_dodge_drift_master',
    gameId: 'dodge',
    gameName: 'DODGE',
    gameIcon: '🛡️',
    tier: 'QUICK_WIN',
    title: 'DRIFT SCOUT',
    description: 'Collect 12 gems and survive 20 seconds.',
    difficulty: 'EASY/HARDER',
    rewardPoints: 35,
    objectives: [
      { id: 'gems', label: 'Collect 12 gems', target: 12, unit: '', metric: 'foodCount' },
      { id: 'time', label: 'Survive 20 seconds', target: 20, unit: 's', metric: 'time' },
    ],
  },

  // Aim
  {
    id: 'quick_aim_first_shot',
    gameId: 'aim',
    gameName: 'AIM',
    gameIcon: '🎯',
    tier: 'QUICK_WIN',
    title: 'FIRST SHOT',
    description: 'Hit 10 expanding targets consecutively.',
    difficulty: 'EASY',
    rewardPoints: 15,
    objectives: [
      { id: 'hits', label: 'Hit 10 targets', target: 10, unit: '', metric: 'hits' },
    ],
  },
  {
    id: 'quick_aim_accuracy_check',
    gameId: 'aim',
    gameName: 'AIM',
    gameIcon: '🎯',
    tier: 'QUICK_WIN',
    title: 'ACCURACY CHECK',
    description: 'Hit 15 targets to verify reflex sharpness.',
    difficulty: 'EASY+',
    rewardPoints: 25,
    objectives: [
      { id: 'hits', label: 'Hit 15 targets', target: 15, unit: '', metric: 'hits' },
    ],
  },
  {
    id: 'quick_aim_target_drill',
    gameId: 'aim',
    gameName: 'AIM',
    gameIcon: '🎯',
    tier: 'QUICK_WIN',
    title: 'TARGET DRILL',
    description: 'Score at least 4,000 points in standard aim practice.',
    difficulty: 'EASY',
    rewardPoints: 20,
    objectives: [
      { id: 'score', label: 'Score 4,000 pts', target: 4000, unit: 'pts', metric: 'score' },
    ],
  },
  {
    id: 'quick_aim_combo_spark',
    gameId: 'aim',
    gameName: 'AIM',
    gameIcon: '🎯',
    tier: 'QUICK_WIN',
    title: 'COMBO SPARK',
    description: 'Build a quick 5x combo streak.',
    difficulty: 'EASY',
    rewardPoints: 20,
    objectives: [
      { id: 'combo', label: 'Reach 5x Combo', target: 5, unit: 'x', metric: 'combo' },
    ],
  },
  {
    id: 'quick_aim_sharp_eye',
    gameId: 'aim',
    gameName: 'AIM',
    gameIcon: '🎯',
    tier: 'QUICK_WIN',
    title: 'SHARP EYE',
    description: 'Hit 18 targets and score 5,000 points.',
    difficulty: 'EASY/HARDER',
    rewardPoints: 35,
    objectives: [
      { id: 'hits', label: 'Hit 18 targets', target: 18, unit: '', metric: 'hits' },
      { id: 'score', label: 'Score 5,000 pts', target: 5000, unit: 'pts', metric: 'score' },
    ],
  },

  // Stack
  {
    id: 'quick_stack_first_tier',
    gameId: 'stack',
    gameName: 'STACK',
    gameIcon: '🧱',
    tier: 'QUICK_WIN',
    title: 'FIRST TIER',
    description: 'Stack blocks up to Height 8.',
    difficulty: 'EASY',
    rewardPoints: 15,
    objectives: [
      { id: 'height', label: 'Reach Height 8', target: 8, unit: '', metric: 'height' },
    ],
  },
  {
    id: 'quick_stack_rooftop_drop',
    gameId: 'stack',
    gameName: 'STACK',
    gameIcon: '🧱',
    tier: 'QUICK_WIN',
    title: 'ROOFTOP DROP',
    description: 'Stack blocks cleanly up to Height 12.',
    difficulty: 'EASY+',
    rewardPoints: 25,
    objectives: [
      { id: 'height', label: 'Reach Height 12', target: 12, unit: '', metric: 'height' },
    ],
  },
  {
    id: 'quick_stack_center_drop',
    gameId: 'stack',
    gameName: 'STACK',
    gameIcon: '🧱',
    tier: 'QUICK_WIN',
    title: 'CENTER DROP',
    description: 'Land 2 Perfect drops on center.',
    difficulty: 'EASY+',
    rewardPoints: 25,
    objectives: [
      { id: 'perfects', label: 'Land 2 Perfect drops', target: 2, unit: '', metric: 'perfects' },
    ],
  },
  {
    id: 'quick_stack_tower_build',
    gameId: 'stack',
    gameName: 'STACK',
    gameIcon: '🧱',
    tier: 'QUICK_WIN',
    title: 'TOWER BUILD',
    description: 'Score at least 2,500 points in stack mode.',
    difficulty: 'EASY',
    rewardPoints: 20,
    objectives: [
      { id: 'score', label: 'Score 2,500 pts', target: 2500, unit: 'pts', metric: 'score' },
    ],
  },
  {
    id: 'quick_stack_high_rise',
    gameId: 'stack',
    gameName: 'STACK',
    gameIcon: '🧱',
    tier: 'QUICK_WIN',
    title: 'HIGH RISE',
    description: 'Reach Height 15 with at least 1 Perfect drop.',
    difficulty: 'EASY/HARDER',
    rewardPoints: 35,
    objectives: [
      { id: 'height', label: 'Reach Height 15', target: 15, unit: '', metric: 'height' },
      { id: 'perfects', label: 'Land 1 Perfect drop', target: 1, unit: '', metric: 'perfects' },
    ],
  },

  // Number Rush
  {
    id: 'quick_num_quick_math',
    gameId: 'number-rush',
    gameName: 'NUMBER RUSH',
    gameIcon: '🔢',
    tier: 'QUICK_WIN',
    title: 'QUICK MATH',
    description: 'Solve 6 math questions correctly.',
    difficulty: 'EASY',
    rewardPoints: 15,
    objectives: [
      { id: 'correct', label: 'Solve 6 questions', target: 6, unit: '', metric: 'correctCount' },
    ],
  },
  {
    id: 'quick_num_calculation_check',
    gameId: 'number-rush',
    gameName: 'NUMBER RUSH',
    gameIcon: '🔢',
    tier: 'QUICK_WIN',
    title: 'CALCULATION CHECK',
    description: 'Solve 10 questions before timeout.',
    difficulty: 'EASY+',
    rewardPoints: 25,
    objectives: [
      { id: 'correct', label: 'Solve 10 questions', target: 10, unit: '', metric: 'correctCount' },
    ],
  },
  {
    id: 'quick_num_steady_accuracy',
    gameId: 'number-rush',
    gameName: 'NUMBER RUSH',
    gameIcon: '🔢',
    tier: 'QUICK_WIN',
    title: 'STEADY MIND',
    description: 'Solve 8 questions with at least 70% accuracy.',
    difficulty: 'EASY+',
    rewardPoints: 25,
    objectives: [
      { id: 'correct', label: 'Solve 8 questions', target: 8, unit: '', metric: 'correctCount' },
      { id: 'accuracy', label: 'Maintain 70%+ Accuracy', target: 70, unit: '%', metric: 'accuracy' },
    ],
  },
  {
    id: 'quick_num_combo_focus',
    gameId: 'number-rush',
    gameName: 'NUMBER RUSH',
    gameIcon: '🔢',
    tier: 'QUICK_WIN',
    title: 'COMBO FOCUS',
    description: 'Streak 4 consecutive correct answers.',
    difficulty: 'EASY',
    rewardPoints: 20,
    objectives: [
      { id: 'combo', label: 'Reach 4x Combo', target: 4, unit: 'x', metric: 'maxCombo' },
    ],
  },
  {
    id: 'quick_num_speed_runner',
    gameId: 'number-rush',
    gameName: 'NUMBER RUSH',
    gameIcon: '🔢',
    tier: 'QUICK_WIN',
    title: 'SPEED SOLVER',
    description: 'Solve 12 questions and score 3,000 points.',
    difficulty: 'EASY/HARDER',
    rewardPoints: 35,
    objectives: [
      { id: 'correct', label: 'Solve 12 questions', target: 12, unit: '', metric: 'correctCount' },
      { id: 'score', label: 'Score 3,000 pts', target: 3000, unit: 'pts', metric: 'score' },
    ],
  },

  // Memory
  {
    id: 'quick_mem_short_recall',
    gameId: 'memory',
    gameName: 'MEMORY',
    gameIcon: '🧠',
    tier: 'QUICK_WIN',
    title: 'SHORT RECALL',
    description: 'Reproduce a sequence of 4 illuminated tiles.',
    difficulty: 'EASY',
    rewardPoints: 15,
    objectives: [
      { id: 'seq', label: 'Reach Sequence Length 4', target: 4, unit: '', metric: 'longestSequence' },
    ],
  },
  {
    id: 'quick_mem_neural_spark',
    gameId: 'memory',
    gameName: 'MEMORY',
    gameIcon: '🧠',
    tier: 'QUICK_WIN',
    title: 'NEURAL SPARK',
    description: 'Reach a sequence length of 5 tiles.',
    difficulty: 'EASY+',
    rewardPoints: 25,
    objectives: [
      { id: 'seq', label: 'Reach Sequence Length 5', target: 5, unit: '', metric: 'longestSequence' },
    ],
  },
  {
    id: 'quick_mem_round_cleared',
    gameId: 'memory',
    gameName: 'MEMORY',
    gameIcon: '🧠',
    tier: 'QUICK_WIN',
    title: 'ROUND CLEARED',
    description: 'Successfully complete Round 3.',
    difficulty: 'EASY',
    rewardPoints: 20,
    objectives: [
      { id: 'round', label: 'Reach Round 3', target: 3, unit: '', metric: 'round' },
    ],
  },
  {
    id: 'quick_mem_pattern_step',
    gameId: 'memory',
    gameName: 'MEMORY',
    gameIcon: '🧠',
    tier: 'QUICK_WIN',
    title: 'PATTERN STEP',
    description: 'Score at least 2,500 points in memory mode.',
    difficulty: 'EASY',
    rewardPoints: 20,
    objectives: [
      { id: 'score', label: 'Score 2,500 pts', target: 2500, unit: 'pts', metric: 'score' },
    ],
  },
  {
    id: 'quick_mem_clean_memory',
    gameId: 'memory',
    gameName: 'MEMORY',
    gameIcon: '🧠',
    tier: 'QUICK_WIN',
    title: 'CLEAN MEMORY',
    description: 'Reach Sequence Length 6 cleanly.',
    difficulty: 'EASY/HARDER',
    rewardPoints: 35,
    objectives: [
      { id: 'seq', label: 'Reach Sequence Length 6', target: 6, unit: '', metric: 'longestSequence' },
    ],
  },

  // Color Maze
  {
    id: 'quick_maze_corridor_swipe',
    gameId: 'color-maze',
    gameName: 'COLOR MAZE',
    gameIcon: '🎨',
    tier: 'QUICK_WIN',
    title: 'CORRIDOR SWIPE',
    description: 'Paint 100% of all maze corridors.',
    difficulty: 'EASY',
    rewardPoints: 20,
    objectives: [
      { id: 'coverage', label: '100% Maze Coverage', target: 100, unit: '%', metric: 'coverage' },
    ],
  },
  {
    id: 'quick_maze_finisher',
    gameId: 'color-maze',
    gameName: 'COLOR MAZE',
    gameIcon: '🎨',
    tier: 'QUICK_WIN',
    title: 'MAZE FINISHER',
    description: 'Complete the maze in under 45 seconds.',
    difficulty: 'EASY+',
    rewardPoints: 25,
    objectives: [
      { id: 'coverage', label: '100% Maze Coverage', target: 100, unit: '%', metric: 'coverage' },
      { id: 'time', label: 'Complete under 45s', target: 45, unit: 's', metric: 'time', operator: '<=' },
    ],
  },
  {
    id: 'quick_maze_efficient_path',
    gameId: 'color-maze',
    gameName: 'COLOR MAZE',
    gameIcon: '🎨',
    tier: 'QUICK_WIN',
    title: 'EFFICIENT PATH',
    description: 'Complete the maze in under 35 moves.',
    difficulty: 'EASY+',
    rewardPoints: 25,
    objectives: [
      { id: 'coverage', label: '100% Maze Coverage', target: 100, unit: '%', metric: 'coverage' },
      { id: 'moves', label: 'Finish under 35 moves', target: 35, unit: '', metric: 'moves', operator: '<=' },
    ],
  },
  {
    id: 'quick_maze_star_runner',
    gameId: 'color-maze',
    gameName: 'COLOR MAZE',
    gameIcon: '🎨',
    tier: 'QUICK_WIN',
    title: 'STAR RUNNER',
    description: 'Complete the maze and earn at least 1 Star.',
    difficulty: 'EASY',
    rewardPoints: 20,
    objectives: [
      { id: 'coverage', label: '100% Maze Coverage', target: 100, unit: '%', metric: 'coverage' },
      { id: 'stars', label: 'Earn at least 1 Star', target: 1, unit: '★', metric: 'stars' },
    ],
  },
  {
    id: 'quick_maze_swift_roller',
    gameId: 'color-maze',
    gameName: 'COLOR MAZE',
    gameIcon: '🎨',
    tier: 'QUICK_WIN',
    title: 'SWIFT ROLLER',
    description: 'Finish in under 30 moves and under 40 seconds.',
    difficulty: 'EASY/HARDER',
    rewardPoints: 35,
    objectives: [
      { id: 'coverage', label: '100% Maze Coverage', target: 100, unit: '%', metric: 'coverage' },
      { id: 'moves', label: 'Finish under 30 moves', target: 30, unit: '', metric: 'moves', operator: '<=' },
      { id: 'time', label: 'Complete under 40s', target: 40, unit: 's', metric: 'time', operator: '<=' },
    ],
  },
];

// ── 2. EXTREME RUSH CHALLENGES (30 Definitions, 5 per Game, 500–900 RP) ─────
export const EXTREME_RUSH_CHALLENGES = [
  // Dodge
  {
    id: 'dodge_swarm_survive',
    gameId: 'dodge',
    gameName: 'DODGE',
    gameIcon: '🛡️',
    tier: 'EXTREME',
    title: 'SURVIVE THE SWARM',
    description: 'Survive the hazard swarm and collect gems under intensifying danger.',
    difficulty: 'HARD',
    rewardPoints: 750,
    objectives: [
      { id: 'time', label: 'Survive 45 seconds', target: 45, unit: 's', metric: 'time' },
      { id: 'danger', label: 'Reach Danger 3', target: 3, unit: '', metric: 'dangerLevel' },
      { id: 'gems', label: 'Collect 20 gems', target: 20, unit: '', metric: 'foodCount' },
    ],
  },
  {
    id: 'dodge_speed_rush',
    gameId: 'dodge',
    gameName: 'DODGE',
    gameIcon: '🛡️',
    tier: 'EXTREME',
    title: 'SPEED DRIFT',
    description: 'Collect gems rapidly while maintaining an active multiplier combo.',
    difficulty: 'HARD',
    rewardPoints: 650,
    objectives: [
      { id: 'time', label: 'Survive 35 seconds', target: 35, unit: 's', metric: 'time' },
      { id: 'gems', label: 'Collect 18 gems', target: 18, unit: '', metric: 'foodCount' },
      { id: 'combo', label: 'Reach 6x Combo', target: 6, unit: 'x', metric: 'maxCombo' },
    ],
  },
  {
    id: 'dodge_endurance_pro',
    gameId: 'dodge',
    gameName: 'DODGE',
    gameIcon: '🛡️',
    tier: 'EXTREME',
    title: 'APEX SURVIVOR',
    description: 'Endure extreme hazard swarms and reach maximum survival threshold.',
    difficulty: 'EXTREME',
    rewardPoints: 900,
    objectives: [
      { id: 'time', label: 'Survive 60 seconds', target: 60, unit: 's', metric: 'time' },
      { id: 'danger', label: 'Reach Danger 4', target: 4, unit: '', metric: 'dangerLevel' },
      { id: 'gems', label: 'Collect 30 gems', target: 30, unit: '', metric: 'foodCount' },
    ],
  },
  {
    id: 'dodge_gem_collector',
    gameId: 'dodge',
    gameName: 'DODGE',
    gameIcon: '🛡️',
    tier: 'EXTREME',
    title: 'GEM HOARDER',
    description: 'Prioritize gem pickups while dodging dense incoming enemy waves.',
    difficulty: 'HARD',
    rewardPoints: 600,
    objectives: [
      { id: 'gems', label: 'Collect 25 gems', target: 25, unit: '', metric: 'foodCount' },
      { id: 'time', label: 'Survive 30 seconds', target: 30, unit: 's', metric: 'time' },
      { id: 'score', label: 'Score 10,000 pts', target: 10000, unit: 'pts', metric: 'score' },
    ],
  },
  {
    id: 'dodge_combo_master',
    gameId: 'dodge',
    gameName: 'DODGE',
    gameIcon: '🛡️',
    tier: 'EXTREME',
    title: 'COMBO FRENZY',
    description: 'Maintain high momentum without taking damage to peak your combo multiplier.',
    difficulty: 'HARD',
    rewardPoints: 700,
    objectives: [
      { id: 'combo', label: 'Reach 8x Combo', target: 8, unit: 'x', metric: 'maxCombo' },
      { id: 'score', label: 'Score 12,000 pts', target: 12000, unit: 'pts', metric: 'score' },
      { id: 'time', label: 'Survive 35 seconds', target: 35, unit: 's', metric: 'time' },
    ],
  },

  // Aim
  {
    id: 'aim_precision_strikes',
    gameId: 'aim',
    gameName: 'AIM',
    gameIcon: '🎯',
    tier: 'EXTREME',
    title: 'PRECISION STRIKES',
    description: 'Hit expanding targets with pinpoint speed and consistency.',
    difficulty: 'HARD',
    rewardPoints: 600,
    objectives: [
      { id: 'hits', label: 'Hit 25 targets', target: 25, unit: '', metric: 'hits' },
      { id: 'score', label: 'Score 12,000 pts', target: 12000, unit: 'pts', metric: 'score' },
      { id: 'combo', label: 'Reach 10x Combo', target: 10, unit: 'x', metric: 'combo' },
    ],
  },
  {
    id: 'aim_reflex_test',
    gameId: 'aim',
    gameName: 'AIM',
    gameIcon: '🎯',
    tier: 'EXTREME',
    title: 'REFLEX TEST',
    description: 'Maintain an unbroken rhythm against rapidly shrinking targets.',
    difficulty: 'HARD',
    rewardPoints: 700,
    objectives: [
      { id: 'hits', label: 'Hit 30 targets', target: 30, unit: '', metric: 'hits' },
      { id: 'combo', label: 'Reach 12x Combo', target: 12, unit: 'x', metric: 'combo' },
      { id: 'score', label: 'Score 18,000 pts', target: 18000, unit: 'pts', metric: 'score' },
    ],
  },
  {
    id: 'aim_deadeye_elite',
    gameId: 'aim',
    gameName: 'AIM',
    gameIcon: '🎯',
    tier: 'EXTREME',
    title: 'DEADEYE ELITE',
    description: 'Chain massive combos without dropping a single target.',
    difficulty: 'EXTREME',
    rewardPoints: 850,
    objectives: [
      { id: 'hits', label: 'Hit 40 targets', target: 40, unit: '', metric: 'hits' },
      { id: 'combo', label: 'Reach 16x Combo', target: 16, unit: 'x', metric: 'combo' },
      { id: 'score', label: 'Score 25,000 pts', target: 25000, unit: 'pts', metric: 'score' },
    ],
  },
  {
    id: 'aim_speed_drill',
    gameId: 'aim',
    gameName: 'AIM',
    gameIcon: '🎯',
    tier: 'EXTREME',
    title: 'RAPID TARGETING',
    description: 'Demonstrate quick target acquisition under tightening timers.',
    difficulty: 'HARD',
    rewardPoints: 650,
    objectives: [
      { id: 'hits', label: 'Hit 28 targets', target: 28, unit: '', metric: 'hits' },
      { id: 'score', label: 'Score 15,000 pts', target: 15000, unit: 'pts', metric: 'score' },
    ],
  },
  {
    id: 'aim_combo_blitz',
    gameId: 'aim',
    gameName: 'AIM',
    gameIcon: '🎯',
    tier: 'EXTREME',
    title: 'COMBO SURGE',
    description: 'Reach a formidable combo streak on high-velocity targets.',
    difficulty: 'HARD',
    rewardPoints: 650,
    objectives: [
      { id: 'combo', label: 'Reach 14x Combo', target: 14, unit: 'x', metric: 'combo' },
      { id: 'score', label: 'Score 16,000 pts', target: 16000, unit: 'pts', metric: 'score' },
    ],
  },

  // Stack
  {
    id: 'stack_tower_builder',
    gameId: 'stack',
    gameName: 'STACK',
    gameIcon: '🧱',
    tier: 'EXTREME',
    title: 'TOWER FOUNDATION',
    description: 'Build a solid vertical stack with clean overlaps.',
    difficulty: 'HARD',
    rewardPoints: 600,
    objectives: [
      { id: 'height', label: 'Reach Height 20', target: 20, unit: '', metric: 'height' },
      { id: 'score', label: 'Score 6,000 pts', target: 6000, unit: 'pts', metric: 'score' },
    ],
  },
  {
    id: 'stack_perfect_tower',
    gameId: 'stack',
    gameName: 'STACK',
    gameIcon: '🧱',
    tier: 'EXTREME',
    title: 'PERFECT TOWER',
    description: 'Time your drops dead-center for maximum accuracy and perfect bonuses.',
    difficulty: 'HARD',
    rewardPoints: 700,
    objectives: [
      { id: 'height', label: 'Reach Height 25', target: 25, unit: '', metric: 'height' },
      { id: 'perfects', label: 'Land 5 Perfect drops', target: 5, unit: '', metric: 'perfects' },
      { id: 'score', label: 'Score 8,000 pts', target: 8000, unit: 'pts', metric: 'score' },
    ],
  },
  {
    id: 'stack_skyscraper_zen',
    gameId: 'stack',
    gameName: 'STACK',
    gameIcon: '🧱',
    tier: 'EXTREME',
    title: 'SKYSCRAPER ZEN',
    description: 'Ascend into the upper atmosphere with flawless timing.',
    difficulty: 'EXTREME',
    rewardPoints: 850,
    objectives: [
      { id: 'height', label: 'Reach Height 35', target: 35, unit: '', metric: 'height' },
      { id: 'perfects', label: 'Land 8 Perfect drops', target: 8, unit: '', metric: 'perfects' },
      { id: 'combo', label: 'Reach 6x Flow Combo', target: 6, unit: 'x', metric: 'bestCombo' },
    ],
  },
  {
    id: 'stack_precision_drop',
    gameId: 'stack',
    gameName: 'STACK',
    gameIcon: '🧱',
    tier: 'EXTREME',
    title: 'PRECISION DROP',
    description: 'Prioritize centered placements to preserve block width.',
    difficulty: 'HARD',
    rewardPoints: 650,
    objectives: [
      { id: 'height', label: 'Reach Height 24', target: 24, unit: '', metric: 'height' },
      { id: 'perfects', label: 'Land 4 Perfect drops', target: 4, unit: '', metric: 'perfects' },
    ],
  },
  {
    id: 'stack_flow_runner',
    gameId: 'stack',
    gameName: 'STACK',
    gameIcon: '🧱',
    tier: 'EXTREME',
    title: 'FLOW RUNNER',
    description: 'Trigger Flow Mode streaks and score massive placement points.',
    difficulty: 'HARD',
    rewardPoints: 750,
    objectives: [
      { id: 'height', label: 'Reach Height 28', target: 28, unit: '', metric: 'height' },
      { id: 'score', label: 'Score 10,000 pts', target: 10000, unit: 'pts', metric: 'score' },
      { id: 'combo', label: 'Reach 4x Flow Combo', target: 4, unit: 'x', metric: 'bestCombo' },
    ],
  },

  // Number Rush
  {
    id: 'number_rush_math_blitz',
    gameId: 'number-rush',
    gameName: 'NUMBER RUSH',
    gameIcon: '🔢',
    tier: 'EXTREME',
    title: 'CALCULATION FRENZY',
    description: 'Compute equations fast and maintain high mental accuracy.',
    difficulty: 'HARD',
    rewardPoints: 600,
    objectives: [
      { id: 'correct', label: 'Solve 20 questions', target: 20, unit: '', metric: 'correctCount' },
      { id: 'accuracy', label: 'Maintain 80%+ Accuracy', target: 80, unit: '%', metric: 'accuracy' },
    ],
  },
  {
    id: 'number_rush_rapid_calc',
    gameId: 'number-rush',
    gameName: 'NUMBER RUSH',
    gameIcon: '🔢',
    tier: 'EXTREME',
    title: 'RAPID MATRIX',
    description: 'Answer equations consecutively to unlock higher rush multipliers.',
    difficulty: 'HARD',
    rewardPoints: 650,
    objectives: [
      { id: 'correct', label: 'Solve 25 questions', target: 25, unit: '', metric: 'correctCount' },
      { id: 'combo', label: 'Reach 8x Combo', target: 8, unit: 'x', metric: 'maxCombo' },
      { id: 'score', label: 'Score 8,000 pts', target: 8000, unit: 'pts', metric: 'score' },
    ],
  },
  {
    id: 'number_rush_flawless_mind',
    gameId: 'number-rush',
    gameName: 'NUMBER RUSH',
    gameIcon: '🔢',
    tier: 'EXTREME',
    title: 'FLAWLESS MIND',
    description: 'Survive deep rounds under razor-thin decision time with near-zero errors.',
    difficulty: 'EXTREME',
    rewardPoints: 850,
    objectives: [
      { id: 'correct', label: 'Solve 30 questions', target: 30, unit: '', metric: 'correctCount' },
      { id: 'accuracy', label: 'Maintain 90%+ Accuracy', target: 90, unit: '%', metric: 'accuracy' },
      { id: 'combo', label: 'Reach 12x Combo', target: 12, unit: 'x', metric: 'maxCombo' },
    ],
  },
  {
    id: 'number_rush_combo_surge',
    gameId: 'number-rush',
    gameName: 'NUMBER RUSH',
    gameIcon: '🔢',
    tier: 'EXTREME',
    title: 'COMBO STRIKE',
    description: 'Streak correct solutions to build an exponential score.',
    difficulty: 'HARD',
    rewardPoints: 650,
    objectives: [
      { id: 'correct', label: 'Solve 22 questions', target: 22, unit: '', metric: 'correctCount' },
      { id: 'combo', label: 'Reach 8x Combo', target: 8, unit: 'x', metric: 'maxCombo' },
    ],
  },
  {
    id: 'number_rush_speed_solver',
    gameId: 'number-rush',
    gameName: 'NUMBER RUSH',
    gameIcon: '🔢',
    tier: 'EXTREME',
    title: 'SPEED DEMON',
    description: 'Outpace the shrinking countdown bar with rapid reflex calculations.',
    difficulty: 'HARD',
    rewardPoints: 700,
    objectives: [
      { id: 'correct', label: 'Solve 22 questions', target: 22, unit: '', metric: 'correctCount' },
      { id: 'score', label: 'Score 12,000 pts', target: 12000, unit: 'pts', metric: 'score' },
    ],
  },

  // Memory
  {
    id: 'memory_pattern_novice',
    gameId: 'memory',
    gameName: 'MEMORY',
    gameIcon: '🧠',
    tier: 'EXTREME',
    title: 'PATTERN SYNC',
    description: 'Recall the illuminated pattern sequence accurately.',
    difficulty: 'HARD',
    rewardPoints: 600,
    objectives: [
      { id: 'seq', label: 'Reach Sequence Length 7', target: 7, unit: '', metric: 'longestSequence' },
      { id: 'score', label: 'Score 7,000 pts', target: 7000, unit: 'pts', metric: 'score' },
    ],
  },
  {
    id: 'memory_neural_matrix',
    gameId: 'memory',
    gameName: 'MEMORY',
    gameIcon: '🧠',
    tier: 'EXTREME',
    title: 'NO SECOND CHANCES',
    description: 'Memorize and reproduce complex sequences without losing a single heart.',
    difficulty: 'HARD',
    rewardPoints: 750,
    objectives: [
      { id: 'seq', label: 'Reach Sequence Length 8', target: 8, unit: '', metric: 'longestSequence' },
      { id: 'mistakes', label: 'Make 0 mistakes', target: 0, unit: '', metric: 'mistakes', operator: '<=' },
      { id: 'score', label: 'Score 10,000 pts', target: 10000, unit: 'pts', metric: 'score' },
    ],
  },
  {
    id: 'memory_mind_palace',
    gameId: 'memory',
    gameName: 'MEMORY',
    gameIcon: '🧠',
    tier: 'EXTREME',
    title: 'MIND PALACE',
    description: 'Master long multi-tile sequences across reverse and blink patterns.',
    difficulty: 'EXTREME',
    rewardPoints: 900,
    objectives: [
      { id: 'seq', label: 'Reach Sequence Length 10', target: 10, unit: '', metric: 'longestSequence' },
      { id: 'score', label: 'Score 15,000 pts', target: 15000, unit: 'pts', metric: 'score' },
    ],
  },
  {
    id: 'memory_recall_drill',
    gameId: 'memory',
    gameName: 'MEMORY',
    gameIcon: '🧠',
    tier: 'EXTREME',
    title: 'NEURAL RECALL',
    description: 'Replay rapid sequences with high precision.',
    difficulty: 'HARD',
    rewardPoints: 650,
    objectives: [
      { id: 'seq', label: 'Reach Sequence Length 8', target: 8, unit: '', metric: 'longestSequence' },
      { id: 'score', label: 'Score 8,500 pts', target: 8500, unit: 'pts', metric: 'score' },
    ],
  },
  {
    id: 'memory_zero_fault',
    gameId: 'memory',
    gameName: 'MEMORY',
    gameIcon: '🧠',
    tier: 'EXTREME',
    title: 'ZERO FAULT',
    description: 'Navigate multiple rounds cleanly with steady recall.',
    difficulty: 'HARD',
    rewardPoints: 700,
    objectives: [
      { id: 'seq', label: 'Reach Sequence Length 8', target: 8, unit: '', metric: 'longestSequence' },
      { id: 'round', label: 'Reach Round 6', target: 6, unit: '', metric: 'round' },
    ],
  },

  // Color Maze
  {
    id: 'color_maze_speed_painter',
    gameId: 'color-maze',
    gameName: 'COLOR MAZE',
    gameIcon: '🎨',
    tier: 'EXTREME',
    title: 'SPEED PAINTER',
    description: 'Cover all corridors cleanly and finish the maze under time pressure.',
    difficulty: 'HARD',
    rewardPoints: 600,
    objectives: [
      { id: 'coverage', label: '100% Maze Coverage', target: 100, unit: '%', metric: 'coverage' },
      { id: 'time', label: 'Complete under 30s', target: 30, unit: 's', metric: 'time', operator: '<=' },
    ],
  },
  {
    id: 'color_maze_precision_path',
    gameId: 'color-maze',
    gameName: 'COLOR MAZE',
    gameIcon: '🎨',
    tier: 'EXTREME',
    title: 'PRECISION PAINT',
    description: 'Slide through the labyrinth using efficient turns and optimal move paths.',
    difficulty: 'HARD',
    rewardPoints: 750,
    objectives: [
      { id: 'coverage', label: '100% Maze Coverage', target: 100, unit: '%', metric: 'coverage' },
      { id: 'moves', label: 'Finish under 26 moves', target: 26, unit: '', metric: 'moves', operator: '<=' },
      { id: 'score', label: 'Score 3,500 pts', target: 3500, unit: 'pts', metric: 'score' },
    ],
  },
  {
    id: 'color_maze_grand_master',
    gameId: 'color-maze',
    gameName: 'COLOR MAZE',
    gameIcon: '🎨',
    tier: 'EXTREME',
    title: 'LABYRINTH MASTER',
    description: 'Achieve a 3-star speed and efficiency run on today\'s maze layout.',
    difficulty: 'EXTREME',
    rewardPoints: 850,
    objectives: [
      { id: 'coverage', label: '100% Maze Coverage', target: 100, unit: '%', metric: 'coverage' },
      { id: 'stars', label: 'Earn 3 Stars', target: 3, unit: '★', metric: 'stars' },
      { id: 'score', label: 'Score 4,200 pts', target: 4200, unit: 'pts', metric: 'score' },
    ],
  },
  {
    id: 'color_maze_efficient_roll',
    gameId: 'color-maze',
    gameName: 'COLOR MAZE',
    gameIcon: '🎨',
    tier: 'EXTREME',
    title: 'EFFICIENT ROLL',
    description: 'Plan slides carefully to minimize redundant corridor passes.',
    difficulty: 'HARD',
    rewardPoints: 650,
    objectives: [
      { id: 'coverage', label: '100% Maze Coverage', target: 100, unit: '%', metric: 'coverage' },
      { id: 'moves', label: 'Finish under 25 moves', target: 25, unit: '', metric: 'moves', operator: '<=' },
    ],
  },
  {
    id: 'color_maze_star_collector',
    gameId: 'color-maze',
    gameName: 'COLOR MAZE',
    gameIcon: '🎨',
    tier: 'EXTREME',
    title: 'STAR COLLECTOR',
    description: 'Paint the whole maze to secure a top-tier star rating and score bonus.',
    difficulty: 'HARD',
    rewardPoints: 700,
    objectives: [
      { id: 'coverage', label: '100% Maze Coverage', target: 100, unit: '%', metric: 'coverage' },
      { id: 'stars', label: 'Earn at least 2 Stars', target: 2, unit: '★', metric: 'stars' },
      { id: 'score', label: 'Score 3,800 pts', target: 3800, unit: 'pts', metric: 'score' },
    ],
  },
];

// Alias for backward compatibility
export const CHALLENGE_DEFINITIONS = EXTREME_RUSH_CHALLENGES;

/**
 * Format date as YYYY-MM-DD
 */
export function getTodayDateString(d = new Date()) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Deterministic hash of string to positive integer
 */
export function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * Deterministically pick today's challenges (Quick Win + Extreme Rush)
 */
export function getTodayChallenges(date = new Date()) {
  const dateStr = typeof date === 'string' ? date : getTodayDateString(date);

  const extremeHash = hashString(`onemore_daily_extreme_v3_${dateStr}`);
  const quickHash = hashString(`onemore_daily_quick_v3_${dateStr}`);

  // Pick Extreme
  const extremeIndex = extremeHash % EXTREME_RUSH_CHALLENGES.length;
  const extremeChallenge = {
    ...EXTREME_RUSH_CHALLENGES[extremeIndex],
    tier: 'EXTREME',
    dateStr,
    seed: extremeHash,
  };

  // Pick Quick Win (prefer different game than Extreme)
  let quickIndex = quickHash % QUICK_WIN_CHALLENGES.length;
  if (QUICK_WIN_CHALLENGES[quickIndex].gameId === extremeChallenge.gameId) {
    quickIndex = (quickIndex + 1) % QUICK_WIN_CHALLENGES.length;
  }

  const quickWinChallenge = {
    ...QUICK_WIN_CHALLENGES[quickIndex],
    tier: 'QUICK_WIN',
    dateStr,
    seed: quickHash,
  };

  return {
    dateStr,
    quickWin: quickWinChallenge,
    extreme: extremeChallenge,
  };
}

/**
 * Backward-compatible single challenge getter
 */
export function getDailyChallenge(date = new Date()) {
  const { extreme } = getTodayChallenges(date);
  return extreme;
}

function defaultTierAttempt() {
  return {
    completed: false,
    rewardClaimed: false,
    rewardEarned: 0,
    bestScore: 0,
    attempts: 0,
    lastMetrics: null,
    challengeId: null,
  };
}

function getDefaultDailyProgress() {
  return {
    version: 3,
    rushPoints: 0,
    streak: 0,
    lastCompletedDate: null,
    dailyAttempts: {},
  };
}

function getStorage() {
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  if (typeof localStorage !== 'undefined') return localStorage;
  if (typeof global !== 'undefined' && global.window?.localStorage) return global.window.localStorage;
  return null;
}

/**
 * Load persisted Daily Challenge progress with V2 -> V3 Migration
 */
export function loadDailyProgress() {
  try {
    const storage = getStorage();
    if (!storage) return getDefaultDailyProgress();
    const scopedKey = getScopedKey('daily.progress');
    let raw = storage.getItem(scopedKey);

    // Fallback: If user-scoped progress is empty, check if this user has an active migration barrier
    // with a preserved pending guest conversion snapshot
    if (!raw) {
      const scopeId = getActiveStorageScope();
      if (scopeId && scopeId.startsWith('user_')) {
        const userId = scopeId.replace('user_', '');
        if (isMigrationBarrierActive(userId)) {
          const pending = getPendingGuestConversion(userId);
          if (pending?.dailyProgressSnapshot) {
            raw = JSON.stringify(pending.dailyProgressSnapshot);
            try {
              storage.setItem(scopedKey, raw);
            } catch (e) {}
          }
        }
      }
    }

    if (!raw) return getDefaultDailyProgress();
    const parsed = JSON.parse(raw);

    const migratedDailyAttempts = {};
    if (parsed.dailyAttempts && typeof parsed.dailyAttempts === 'object') {
      Object.entries(parsed.dailyAttempts).forEach(([dateKey, attemptData]) => {
        if (!attemptData) return;
        // Check if legacy V2 format (flat attempt)
        if (attemptData.quickWin === undefined && attemptData.extreme === undefined) {
          migratedDailyAttempts[dateKey] = {
            quickWin: defaultTierAttempt(),
            extreme: {
              completed: Boolean(attemptData.completed),
              rewardClaimed: Boolean(attemptData.rewardClaimed),
              rewardEarned: attemptData.rewardEarned || 0,
              bestScore: attemptData.bestScore || 0,
              attempts: attemptData.attempts || 1,
              lastMetrics: attemptData.lastMetrics || null,
              challengeId: attemptData.challengeId || null,
            },
          };
        } else {
          // Already V3 format
          migratedDailyAttempts[dateKey] = {
            quickWin: {
              ...defaultTierAttempt(),
              ...(attemptData.quickWin || {}),
            },
            extreme: {
              ...defaultTierAttempt(),
              ...(attemptData.extreme || {}),
            },
          };
        }
      });
    }

    return {
      version: 3,
      rushPoints: typeof parsed.rushPoints === 'number' ? parsed.rushPoints : 0,
      streak: typeof parsed.streak === 'number' ? parsed.streak : 0,
      lastCompletedDate: parsed.lastCompletedDate || null,
      dailyAttempts: migratedDailyAttempts,
    };
  } catch (e) {
    console.warn('Failed to load daily challenge progress:', e);
    return getDefaultDailyProgress();
  }
}

/**
 * Save Daily Challenge progress
 */
export function saveDailyProgress(progress) {
  try {
    const storage = getStorage();
    if (!storage) return;
    storage.setItem(getScopedKey('daily.progress'), JSON.stringify(progress));
    storage.setItem(getScopedKey('points'), String(progress.rushPoints || 0));
  } catch (e) {
    console.warn('Failed to save daily challenge progress:', e);
  }
}

/**
 * Evaluate if a game's run metrics satisfied the challenge objectives
 */
export function evaluateChallenge(challenge, metrics = {}, finalScore = 0) {
  const enriched = {
    ...metrics,
    score: typeof metrics.score === 'number' ? metrics.score : finalScore,
    coverage: typeof metrics.coverage === 'number' ? metrics.coverage : (metrics.moves !== undefined ? 100 : 0),
    hits: typeof metrics.hits === 'number' ? metrics.hits : (metrics.targetsHit || 0),
    time: typeof metrics.time === 'number' ? metrics.time : (metrics.survivalTime || 0),
    combo: typeof metrics.combo === 'number' ? metrics.combo : (metrics.maxCombo || metrics.bestCombo || 0),
    maxCombo: typeof metrics.maxCombo === 'number' ? metrics.maxCombo : (metrics.combo || metrics.bestCombo || 0),
    bestCombo: typeof metrics.bestCombo === 'number' ? metrics.bestCombo : (metrics.maxCombo || metrics.combo || 0),
    mistakes: typeof metrics.mistakes === 'number' ? metrics.mistakes : 0,
  };

  const objectivesStatus = challenge.objectives.map((obj) => {
    const currentVal = enriched[obj.metric] !== undefined ? enriched[obj.metric] : 0;
    const op = obj.operator || '>=';
    let met = false;

    if (op === '<=') {
      met = currentVal <= obj.target;
    } else {
      met = currentVal >= obj.target;
    }

    return {
      ...obj,
      current: currentVal,
      met,
    };
  });

  const completed = objectivesStatus.every((o) => o.met);

  return {
    completed,
    objectivesStatus,
  };
}

/**
 * Record a player's Daily Challenge run attempt with dual-tier tracking & streak preservation
 */
export function recordDailyAttempt(
  challenge,
  metrics = {},
  finalScore = 0,
  { isAuthenticated = false, hasServerEconomyIdentity = false } = {}
) {
  const isServerAuthoritative = Boolean(isAuthenticated || hasServerEconomyIdentity);
  const dateStr = challenge.dateStr || getTodayDateString();
  const tierKey = challenge.tier === 'QUICK_WIN' ? 'quickWin' : 'extreme';
  const progress = loadDailyProgress();
  const evaluation = evaluateChallenge(challenge, metrics, finalScore);

  if (!progress.dailyAttempts[dateStr]) {
    progress.dailyAttempts[dateStr] = {
      quickWin: defaultTierAttempt(),
      extreme: defaultTierAttempt(),
    };
  }

  const dayRecord = progress.dailyAttempts[dateStr];
  const existingTierAttempt = dayRecord[tierKey] || defaultTierAttempt();

  const isAlreadyClaimed = Boolean(existingTierAttempt.rewardClaimed);
  const isFirstCompletionForTier = evaluation.completed && !existingTierAttempt.completed && !isAlreadyClaimed;
  let rewardEarned = 0;
  let streakBonus = 0;

  if (isFirstCompletionForTier && !isAlreadyClaimed) {
    // Check if ANY tier was already completed today
    const wasAnyTierCompletedToday = progress.lastCompletedDate === dateStr;

    if (!wasAnyTierCompletedToday) {
      // First completion of the calendar day qualifies the streak!
      const targetDate = challenge.dateStr ? new Date(`${challenge.dateStr}T00:00:00Z`) : new Date();
      const yesterday = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate() - 1));
      const yesterdayStr = getTodayDateString(yesterday);

      if (progress.lastCompletedDate === yesterdayStr) {
        progress.streak = (progress.streak || 0) + 1;
      } else if (progress.streak > 0 && !progress.lastCompletedDate) {
        // Unbroken streak active from server without explicit date tag
        progress.streak += 1;
      } else {
        // Brand new or streak reset
        progress.streak = 1;
      }

      progress.lastCompletedDate = dateStr;

      // Milestone streak bonuses (granted once per day)
      if (progress.streak === 3) streakBonus = 100;
      else if (progress.streak === 7) streakBonus = 300;
      else if (progress.streak === 14) streakBonus = 500;
    }

    // Base Tier Reward Points
    rewardEarned = challenge.rewardPoints || (tierKey === 'quickWin' ? 25 : 750);

    if (!isServerAuthoritative) {
      // PURE OFFLINE FALLBACK ONLY: Award local points when no server session exists
      progress.rushPoints += (rewardEarned + streakBonus);
    }
  }

  // Update Tier Record (Server-authoritative mode leaves rewardClaimed = false and rewardEarned = 0 until cloud RPC confirmation)
  const isClaimedLocally = !isServerAuthoritative && isFirstCompletionForTier;
  const newBestScore = Math.max(existingTierAttempt.bestScore || 0, finalScore);
  dayRecord[tierKey] = {
    completed: existingTierAttempt.completed || evaluation.completed,
    rewardClaimed: isAlreadyClaimed || isClaimedLocally,
    rewardEarned: (existingTierAttempt.rewardEarned || 0) + (isClaimedLocally ? rewardEarned : 0),
    bestScore: newBestScore,
    attempts: (existingTierAttempt.attempts || 0) + 1,
    lastMetrics: metrics,
    challengeId: challenge.id,
  };

  saveDailyProgress(progress);

  return {
    isCompleted: evaluation.completed || existingTierAttempt.completed,
    isFirstCompletionToday: isFirstCompletionForTier,
    rewardEarned: isAlreadyClaimed ? 0 : rewardEarned,
    streakBonus: isAlreadyClaimed ? 0 : streakBonus,
    totalRushPoints: progress.rushPoints,
    currentStreak: progress.streak,
    bestScore: newBestScore,
    objectivesStatus: evaluation.objectivesStatus,
    tier: challenge.tier,
  };
}

/**
 * Initiates a server-issued Daily Challenge attempt token for authenticated players (anti-abuse hardening).
 */
export async function startDailyChallengeAttemptCloud({ challenge }) {
  if (!isSupabaseConfigured || !supabase || !challenge?.id) return { success: false, attemptId: null };

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) return { success: false, attemptId: null };

    const expectedUserId = session.user.id;
    const expectedScope = getActiveStorageScope();
    if (expectedScope !== `user_${expectedUserId}` || isMigrationBarrierActive(expectedUserId)) {
      return { success: false, attemptId: null };
    }

    const { data, error } = await supabase.rpc('start_daily_challenge_attempt', {
      p_challenge_id: challenge.id,
      p_tier: challenge.tier || 'QUICK_WIN',
    });

    if (error) {
      console.warn('[DailyChallenge] start_daily_challenge_attempt warning:', error.message);
      return { success: false, attemptId: null, error: error.message };
    }

    return { success: true, attemptId: data };
  } catch (err) {
    console.warn('[DailyChallenge] start_daily_challenge_attempt error:', err.message);
    return { success: false, attemptId: null, error: err.message };
  }
}

/**
 * Asynchronously synchronizes Daily Challenge completion rewards to the cloud ledger for authenticated players.
 * Note: Zero economic values (amounts/bonuses) are sent from client; server determines them authoritatively.
 */
export async function claimDailyChallengeRewardCloud({
  challenge,
  metrics = {},
  finalScore = 0,
  attemptId = null,
}) {
  if (!isSupabaseConfigured || !supabase) return { success: false, reason: 'NOT_CONFIGURED' };

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) return { success: false, reason: 'GUEST' };

    const expectedUserId = session.user.id;
    const expectedScope = getActiveStorageScope();

    // 1. Pre-flight verification: Scope must match user and migration barrier must be inactive
    if (expectedScope !== `user_${expectedUserId}`) {
      console.warn(
        `[DailyChallenge] Cloud reward claim aborted: active scope (${expectedScope}) does not match expected user_${expectedUserId}.`
      );
      return { success: false, reason: 'STALE_SCOPE' };
    }

    // Migration barrier check: Daily Challenge cloud reward claim is strictly suppressed if user is in a blocked/unmigrated state
    if (isMigrationBarrierActive(expectedUserId)) {
      console.warn(`[DailyChallenge] Cloud reward claim suppressed by migration barrier for user ${expectedUserId}.`);
      return {
        success: false,
        reason: 'MIGRATION_BARRIER_ACTIVE',
      };
    }

    const { data, error } = await supabase.rpc('claim_daily_challenge_reward', {
      p_challenge_id: challenge.id || 'challenge_daily',
      p_tier: challenge.tier || 'EXTREME_PUSH',
      p_metadata: {
        game_id: challenge.gameId,
        score: finalScore,
        metrics,
        attempt_id: attemptId || undefined,
      },
      p_attempt_id: attemptId || undefined,
    });

    // 2. Post-await Async Ownership & Barrier Re-validation: Ensure ownership did not change while RPC was in flight
    const currentScope = getActiveStorageScope();
    if (currentScope !== expectedScope || currentScope !== `user_${expectedUserId}`) {
      console.warn(
        `[DailyChallenge] Cloud reward claim response discarded: active storage scope changed from ${expectedScope} to ${currentScope} during in-flight RPC.`
      );
      return { success: false, reason: 'STALE_SCOPE' };
    }

    if (isMigrationBarrierActive(expectedUserId)) {
      console.warn(
        `[DailyChallenge] Cloud reward claim response discarded: migration barrier became active for user ${expectedUserId} during in-flight RPC.`
      );
      return { success: false, reason: 'MIGRATION_BARRIER_ACTIVE' };
    }

    if (error) {
      console.warn('Daily challenge RPC warning:', error.message);
      return { success: false, error: error.message };
    }

    const record = Array.isArray(data) ? data[0] : data;
    if (record) {
      // Sync local tier record to rewardClaimed = true upon cloud RPC confirmation
      const currentProgress = loadDailyProgress();
      const dateStr = challenge.dateStr || getTodayDateString();
      const tierKey = (challenge.tier || '').toUpperCase() === 'QUICK_WIN' ? 'quickWin' : 'extreme';
      if (!currentProgress.dailyAttempts) {
        currentProgress.dailyAttempts = {};
      }
      if (!currentProgress.dailyAttempts[dateStr]) {
        currentProgress.dailyAttempts[dateStr] = {
          quickWin: defaultTierAttempt(),
          extreme: defaultTierAttempt(),
        };
      }
      const tierAttempt = currentProgress.dailyAttempts[dateStr][tierKey];
      if (tierAttempt) {
        tierAttempt.completed = true;
        tierAttempt.rewardClaimed = true;
        if (record.awarded) {
          tierAttempt.rewardEarned = Number(record.total_awarded || record.tier_reward || 0);
        }
      }

      // Synchronize authoritative cloud balance returned by RPC into authenticated UI state
      if (record.balance !== undefined && record.balance !== null) {
        currentProgress.rushPoints = Number(record.balance);
      }

      // Synchronize authoritative cloud streak returned by RPC into authenticated UI state
      if (record.current_streak !== undefined && record.current_streak !== null) {
        currentProgress.streak = Number(record.current_streak);
        currentProgress.lastCompletedDate = dateStr;
      } else if (record.streak !== undefined && record.streak !== null) {
        currentProgress.streak = Number(record.streak);
        currentProgress.lastCompletedDate = dateStr;
      }

      saveDailyProgress(currentProgress);
      emitScopeChange();
    }
    return { success: true, record };
  } catch (err) {
    console.warn('Network error during daily challenge reward sync:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Read-only status synchronization: Hydrates today's Daily Challenge claim status,
 * current unbroken streak, and cloud balance from the server ledger for authenticated players.
 */
export async function syncDailyChallengeStatusCloud({ user = null, isGuest = true } = {}) {
  if (!user || !user.id || !isSupabaseConfigured || !supabase) return null;

  const expectedUserId = user.id;
  const expectedScope = getActiveStorageScope();

  // 1. Pre-flight verification: Scope must match user and migration barrier must be inactive
  if (expectedScope !== `user_${expectedUserId}`) {
    console.warn(
      `[DailyChallenge] Cloud status sync aborted: active scope (${expectedScope}) does not match expected user_${expectedUserId}.`
    );
    return null;
  }

  // Guest migration failure is a synchronization barrier. Do not hydrate authenticated
  // Daily Challenge state from the cloud because the cloud does not contain the rejected guest-local state.
  if (isMigrationBarrierActive(expectedUserId)) {
    console.warn(
      `[DailyChallenge] Cloud synchronization suppressed by migration barrier for user ${expectedUserId}. Local Daily Challenge state preserved.`
    );
    return null;
  }

  try {
    console.info('[DailyChallenge] DAILY_SYNC_STARTED', { userId: expectedUserId });
    const { data, error } = await supabase.rpc('get_daily_challenge_status');

    // 2. Post-await Async Ownership & Barrier Re-validation: Ensure ownership did not change while RPC was in flight
    const currentScope = getActiveStorageScope();
    if (currentScope !== expectedScope || currentScope !== `user_${expectedUserId}`) {
      console.warn(
        `[DailyChallenge] Cloud status sync response discarded: active storage scope changed from ${expectedScope} to ${currentScope} during in-flight RPC.`
      );
      return null;
    }

    if (isMigrationBarrierActive(expectedUserId)) {
      console.warn(
        `[DailyChallenge] Cloud status sync response discarded: migration barrier became active for user ${expectedUserId} during in-flight RPC.`
      );
      return null;
    }

    if (error) {
      console.warn('Daily challenge status RPC warning:', error.message);
      return null;
    }

    const record = Array.isArray(data) ? data[0] : data;
    if (!record) return null;

    const currentProgress = loadDailyProgress();
    const dateStr = record.challenge_date || getTodayDateString();

    if (!currentProgress.dailyAttempts[dateStr]) {
      currentProgress.dailyAttempts[dateStr] = {
        quickWin: defaultTierAttempt(),
        extreme: defaultTierAttempt(),
      };
    }

    const dayRecord = currentProgress.dailyAttempts[dateStr];

    if (record.quick_win_claimed) {
      dayRecord.quickWin.completed = true;
      dayRecord.quickWin.rewardClaimed = true;
      dayRecord.quickWin.rewardEarned = Number(record.quick_win_points || 25);
    }

    if (record.extreme_claimed) {
      dayRecord.extreme.completed = true;
      dayRecord.extreme.rewardClaimed = true;
      dayRecord.extreme.rewardEarned = Number(record.extreme_points || 750);
    }

    if (typeof record.current_streak === 'number') {
      currentProgress.streak = record.current_streak;
      if (record.quick_win_claimed || record.extreme_claimed) {
        currentProgress.lastCompletedDate = dateStr;
      } else if (record.current_streak > 0) {
        const nowUtc = new Date();
        const yesterday = new Date(Date.UTC(nowUtc.getUTCFullYear(), nowUtc.getUTCMonth(), nowUtc.getUTCDate() - 1));
        currentProgress.lastCompletedDate = getTodayDateString(yesterday);
      }
    }

    if (record.cloud_balance !== undefined && record.cloud_balance !== null) {
      currentProgress.rushPoints = Number(record.cloud_balance);
    }

    saveDailyProgress(currentProgress);
    emitScopeChange();

    console.info('[DailyChallenge] DAILY_SYNC_COMPLETED', {
      userId: expectedUserId,
      streak: record.current_streak,
      balance: record.cloud_balance,
      quickWin: record.quick_win_claimed,
      extreme: record.extreme_claimed,
    });

    return record;
  } catch (err) {
    console.warn('Network error during daily challenge status sync:', err.message);
    return null;
  }
}
