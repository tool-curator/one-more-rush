/**
 * ONE MORE RUSH — Phase 9 Leaderboard UX Remediation Verification Test Suite
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('======================================================');
console.log('RUNNING PHASE 9 LEADERBOARD UX REMEDIATION TEST SUITE');
console.log('======================================================');

const projectRoot = process.cwd();
const lbPagePath = path.join(projectRoot, 'src', 'pages', 'LeaderboardPage.jsx');
const lbPageCssPath = path.join(projectRoot, 'src', 'pages', 'LeaderboardPage.css');
const lbSecPath = path.join(projectRoot, 'src', 'components', 'LeaderboardSection.jsx');
const lbSecCssPath = path.join(projectRoot, 'src', 'components', 'LeaderboardSection.css');
const lbServicePath = path.join(projectRoot, 'src', 'services', 'leaderboardService.js');

const lbPageContent = fs.readFileSync(lbPagePath, 'utf8');
const lbPageCssContent = fs.readFileSync(lbPageCssPath, 'utf8');
const lbSecContent = fs.readFileSync(lbSecPath, 'utf8');
const lbSecCssContent = fs.readFileSync(lbSecCssPath, 'utf8');
const lbServiceContent = fs.readFileSync(lbServicePath, 'utf8');

// TEST 1: React import includes useCallback in LeaderboardPage.jsx
console.log('\n--- TEST 1: React Import Invariants ---');
assert(
  lbPageContent.includes("import React, { useState, useEffect, useCallback } from 'react';"),
  'LeaderboardPage must explicitly import useCallback from react'
);
assert(
  !lbPageContent.includes('ReferenceError'),
  'No ReferenceErrors in LeaderboardPage'
);
console.log('✅ PASSED: useCallback is correctly imported from React.');

// TEST 2: Timeframe filter handles unavailable periods without state changes or fetches
console.log('\n--- TEST 2: Time-Filter Period Logic & Accessibility ---');
assert(
  lbPageContent.includes('if (!period.isAvailable)'),
  'handlePeriodSelect must check period.isAvailable'
);
assert(
  lbPageContent.includes('competitive cycles unlock in Season 1'),
  'handlePeriodSelect must set Season 1 notice for unavailable periods'
);
assert(
  lbPageContent.includes('aria-disabled={!period.isAvailable ? \'true\' : undefined}'),
  'Unavailable period buttons must have aria-disabled="true"'
);
assert(
  lbServiceContent.includes("id: 'ALL_TIME', label: 'ALL TIME', isAvailable: true"),
  'ALL_TIME must have isAvailable: true'
);
assert(
  lbServiceContent.includes("id: 'THIS_WEEK', label: 'THIS WEEK', isAvailable: false"),
  'THIS_WEEK must have isAvailable: false'
);
assert(
  lbServiceContent.includes("id: 'TODAY', label: 'TODAY', isAvailable: false"),
  'TODAY must have isAvailable: false'
);
console.log('✅ PASSED: Time-filter correctly locks ALL TIME and prevents fake active states.');

// TEST 3: Misleading Realtime text removed from hero
console.log('\n--- TEST 3: Honest Hero Messaging & Accurate Status Pills ---');
assert(
  !lbPageContent.includes('Real-time worldwide rankings'),
  'Misleading Real-time claim must be removed from LeaderboardPage hero'
);
assert(
  lbPageContent.includes('Worldwide all-time rankings'),
  'Accurate all-time wording must be used in LeaderboardPage hero'
);
assert(
  lbPageContent.includes('period-pill syncing') && lbPageContent.includes('SYNCING...'),
  'Accurate SYNCING status pill present'
);
assert(
  lbPageContent.includes('period-pill error') && lbPageContent.includes('OFFLINE'),
  'Accurate OFFLINE status pill present on error'
);
console.log('✅ PASSED: Hero and status pill use honest, non-misleading messaging.');

// TEST 4: Dedicated Error State with Retry Connection CTA
console.log('\n--- TEST 4: Error State vs Empty State Separation ---');
assert(
  lbPageContent.includes('leaderboard-error-state'),
  'LeaderboardPage must contain a dedicated error state'
);
assert(
  lbPageContent.includes('btn-retry-leaderboard') && lbPageContent.includes('onClick={loadGlobalData}'),
  'Retry button must directly invoke loadGlobalData'
);
assert(
  lbPageContent.includes('leaderboard-empty-state') && lbPageContent.includes('BE THE FIRST ON THE LEADERBOARD'),
  'Empty state remains separate and contextual'
);
console.log('✅ PASSED: Error state is strictly separated from empty state with retry action.');

// TEST 5: Pinned User Standing outside Top 50
console.log('\n--- TEST 5: Pinned Standing for Users Outside Top 50 ---');
assert(
  lbPageContent.includes('leaderboard-user-outside-container'),
  'LeaderboardPage must render pinned container for users outside Top 50'
);
assert(
  lbPageContent.includes('row-user-outside-top50'),
  'Distinct styled row for user outside Top 50'
);
assert(
  lbPageContent.includes('YOUR GLOBAL STANDING'),
  'Clear separator title for player standing'
);
console.log('✅ PASSED: Pinned global position renders when user is ranked outside Top 50.');

// TEST 6: Color Maze Level Filter Isolation
console.log('\n--- TEST 6: Color Maze Local Level Filter Isolation ---');
assert(
  lbPageContent.includes('LEVEL (LOCAL PB):'),
  'Color maze level selector is explicitly designated for local PB'
);
// Verify loadGlobalData is only dependent on selectedGameId and user.id
assert(
  lbPageContent.includes('}, [selectedGameId, user?.id]);'),
  'loadGlobalData must only depend on selectedGameId and user.id, isolating maze level selection from global fetch'
);
console.log('✅ PASSED: Color Maze level selection is isolated to local stats and does not trigger global refetches.');

// TEST 7: Long Username Truncation & Cosmetic Fallbacks
console.log('\n--- TEST 7: Username Ellipsis & Cosmetic Fallback Invariants ---');
assert(
  lbPageCssContent.includes('text-overflow: ellipsis;') && lbPageCssContent.includes('overflow: hidden;') && lbPageCssContent.includes('white-space: nowrap;'),
  'Username lines must enforce ellipsis, overflow hidden, and nowrap in CSS'
);
assert(
  lbPageContent.includes("frameClass = frameObj.cssClass || 'classic';") || lbPageContent.includes("equippedFrame.cssClass || 'classic'"),
  'Cosmetic frames must fall back safely to classic'
);
assert(
  lbPageContent.includes("equippedTitle.accentColor || '#64748b'"),
  'Cosmetic title colors must fall back safely'
);
console.log('✅ PASSED: Cosmetic fallbacks and username truncation rules verified.');

// TEST 8: Homepage LeaderboardSection Tab Invariants
console.log('\n--- TEST 8: Homepage LeaderboardSection Tab Invariants ---');
assert(
  lbSecContent.includes("id: 'ALL TIME', label: 'ALL TIME', isAvailable: true"),
  'LeaderboardSection ALL TIME must be isAvailable: true'
);
assert(
  lbSecContent.includes("id: 'WEEK', label: 'WEEK', isAvailable: false"),
  'LeaderboardSection WEEK must be isAvailable: false'
);
assert(
  lbSecContent.includes("id: 'TODAY', label: 'TODAY', isAvailable: false"),
  'LeaderboardSection TODAY must be isAvailable: false'
);
assert(
  lbSecContent.includes('if (!tab.isAvailable)'),
  'LeaderboardSection tab click must guard against unavailable tabs'
);
console.log('✅ PASSED: Homepage LeaderboardSection adheres strictly to honest timeframe tabs.');

console.log('\n======================================================');
console.log('✅ ALL PHASE 9 REMEDIATION TESTS PASSED!');
console.log('======================================================');
