/**
 * ONE MORE RUSH — Phase 3 Platform Content & Ad Safety Verification Script
 * Validates dist/ static files for /, /daily, /locker, /leaderboard, and private routes.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.resolve(__dirname, '../dist');

const TARGET_PLATFORM_ROUTES = [
  { path: '/', file: 'index.html', name: 'Homepage' },
  { path: '/daily', file: 'daily/index.html', name: 'Daily Challenge' },
  { path: '/locker', file: 'locker/index.html', name: 'Rush Locker' },
  { path: '/leaderboard', file: 'leaderboard/index.html', name: 'Leaderboard' },
];

const PRIVATE_ROUTES = [
  { path: '/login', file: 'login/index.html' },
  { path: '/signup', file: 'signup/index.html' },
  { path: '/profile', file: 'profile/index.html' },
  { path: '/404', file: '404/index.html' },
  { path: '/404.html', file: '404.html' },
];

console.log('===============================================================');
console.log('ONE MORE RUSH — PHASE 3 PLATFORM CONTENT & AD SAFETY AUDIT');
console.log('===============================================================\n');

let allPassed = true;

// 1. Audit Primary Platform Pages
for (const target of TARGET_PLATFORM_ROUTES) {
  const filePath = path.join(DIST_DIR, target.file);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Missing file: ${filePath}`);
    allPassed = false;
    continue;
  }

  const html = fs.readFileSync(filePath, 'utf8');

  // Title
  const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : 'NONE';

  // H1
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const h1 = h1Match ? h1Match[1].trim() : 'NONE';

  // H2 count
  const h2Matches = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)];
  const h2Count = h2Matches.length;

  // Robots
  const robotsMatch = html.match(/<meta\s+name="robots"\s+content="([^"]*)"/i);
  const robots = robotsMatch ? robotsMatch[1] : 'NONE';

  // Canonical
  const canonicalMatch = html.match(/<link\s+rel="canonical"\s+href="([^"]*)"/i);
  const canonical = canonicalMatch ? canonicalMatch[1] : 'NONE';

  // Structured Data (JSON-LD)
  const jsonLdMatch = html.match(/<script\s+id="seo-structured-data"[^>]*>([\s\S]*?)<\/script>/i);
  let hasFaqSchema = false;
  if (jsonLdMatch) {
    try {
      const parsed = JSON.parse(jsonLdMatch[1]);
      if (Array.isArray(parsed)) {
        hasFaqSchema = parsed.some(item => item['@type'] === 'FAQPage');
      } else if (parsed['@type'] === 'FAQPage') {
        hasFaqSchema = true;
      }
    } catch (e) {
      console.warn(`JSON-LD parse warning on ${target.path}:`, e.message);
    }
  }

  // Meaningful text length in #root
  const rootStartIndex = html.indexOf('<div id="root">');
  const bodyEndIndex = html.lastIndexOf('</body>');
  const rootHtml = (rootStartIndex !== -1 && bodyEndIndex !== -1)
    ? html.slice(rootStartIndex + '<div id="root">'.length, bodyEndIndex).replace(/<\/div>\s*$/, '')
    : html;
  const rootText = rootHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const textLength = rootText.length;


  // Internal game links
  const gameLinks = [...rootHtml.matchAll(/href="(\/games\/[a-z-]+)"/g)].map(m => m[1]);
  const uniqueGameLinks = [...new Set(gameLinks)];

  // Platform navigation links
  const hasDailyLink = rootHtml.includes('href="/daily"');
  const hasLockerLink = rootHtml.includes('href="/locker"');
  const hasLeaderboardLink = rootHtml.includes('href="/leaderboard"');

  // AdSense tag presence
  const hasAdSenseTag = html.includes('ca-pub-4117658743162532');

  console.log(`[PAGE] ${target.name} (${target.path})`);
  console.log(`  • Title: ${title}`);
  console.log(`  • H1: ${h1}`);
  console.log(`  • H2 count: ${h2Count}`);
  console.log(`  • Robots: ${robots}`);
  console.log(`  • Canonical: ${canonical}`);
  console.log(`  • Pre-hydrated text length: ${textLength} chars`);
  console.log(`  • Game links found: ${uniqueGameLinks.length} (${uniqueGameLinks.join(', ')})`);
  console.log(`  • Cross-platform links: daily=${hasDailyLink}, locker=${hasLockerLink}, leaderboard=${hasLeaderboardLink}`);
  console.log(`  • FAQ Schema present: ${hasFaqSchema ? 'YES' : 'NO'}`);
  console.log(`  • AdSense tag in <head>: ${hasAdSenseTag ? 'YES' : 'NO'}`);

  if (textLength < 1200) {
    console.error(`  ❌ Insufficient pre-hydrated text: ${textLength} < 1200`);
    allPassed = false;
  }
  if (h2Count < 2) {
    console.error(`  ❌ Too few H2 headings: ${h2Count} < 2`);
    allPassed = false;
  }
  if (!hasFaqSchema) {
    console.error(`  ❌ Missing FAQPage schema`);
    allPassed = false;
  }
  console.log('');
}

// 2. Audit Private / Utility Routes for AdSense suppression and noindex
console.log('--- PRIVATE / UTILITY ROUTE SAFETY AUDIT ---');
for (const target of PRIVATE_ROUTES) {
  const filePath = path.join(DIST_DIR, target.file);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Missing private route file: ${filePath}`);
    allPassed = false;
    continue;
  }

  const html = fs.readFileSync(filePath, 'utf8');
  const hasAdSense = html.includes('pagead2.googlesyndication.com/pagead/js/adsbygoogle.js');
  const hasNoindex = html.includes('content="noindex, nofollow"');

  console.log(`[PRIVATE ROUTE] ${target.path} (${target.file})`);
  console.log(`  • Robots noindex: ${hasNoindex ? 'YES (CORRECT)' : '❌ MISSING'}`);
  console.log(`  • AdSense script stripped: ${!hasAdSense ? 'YES (CORRECT)' : '❌ STILL PRESENT'}`);

  if (hasAdSense) {
    console.error(`  ❌ AdSense script found in private route ${target.path}!`);
    allPassed = false;
  }
  if (!hasNoindex) {
    console.error(`  ❌ noindex directive missing from ${target.path}!`);
    allPassed = false;
  }
}

// 3. Verify ads.txt integrity
console.log('\n--- ADS.TXT INTEGRITY CHECK ---');
const adsTxtPath = path.join(DIST_DIR, 'ads.txt');
if (fs.existsSync(adsTxtPath)) {
  const adsTxtContent = fs.readFileSync(adsTxtPath, 'utf8').trim();
  const expected = 'google.com, pub-4117658743162532, DIRECT, f08c47fec0942fa0';
  console.log(`  • Content: "${adsTxtContent}"`);
  if (adsTxtContent === expected) {
    console.log('  • Verification: ✅ EXACT MATCH');
  } else {
    console.error(`  ❌ Content mismatch! Expected "${expected}", found "${adsTxtContent}"`);
    allPassed = false;
  }
} else {
  console.error(`  ❌ Missing ads.txt in dist/`);
  allPassed = false;
}

if (!allPassed) {
  console.error('\n❌ PHASE 3 VERIFICATION FAILED. Review errors above.');
  process.exit(1);
} else {
  console.log('\n✅ ALL PHASE 3 PLATFORM CONTENT & AD SAFETY VERIFICATIONS PASSED.');
}
