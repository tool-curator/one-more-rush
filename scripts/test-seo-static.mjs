/**
 * ONE MORE RUSH — Automated Static SEO & Crawler Verification Test Suite
 * Tests 18+ strict rules directly against generated static dist/ files without executing JavaScript.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_SITE_URL, ROUTE_SEO_DATA, AUTH_ROUTE_SEO } from '../src/config/seoContent.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.resolve(__dirname, '../dist');
const SITEMAP_PATH = path.resolve(__dirname, '../public/sitemap.xml');
const ROBOTS_PATH = path.resolve(__dirname, '../public/robots.txt');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`✅ PASSED: ${message}`);
    passedTests++;
  } else {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log('====================================================');
console.log('ONE MORE RUSH — STATIC SEO & CRAWLER VALIDATION SUITE');
console.log('====================================================\n');

// ----------------------------------------------------
// SECTION 1: STATIC ROUTE HTML GENERATION & DISCOVERY
// ----------------------------------------------------
console.log('--- SECTION 1: Static Route HTML Files in dist/ ---');

const publicRoutes = Object.keys(ROUTE_SEO_DATA);

for (const route of publicRoutes) {
  const meta = ROUTE_SEO_DATA[route];
  const relativeFilePath = route === '/' ? 'index.html' : `${route.replace(/^\//, '')}/index.html`;
  const fullPath = path.join(DIST_DIR, relativeFilePath);

  // 1. File exists
  assert(fs.existsSync(fullPath), `Rule 1: Static HTML exists for route [${route}] at ${relativeFilePath}`);

  const html = fs.readFileSync(fullPath, 'utf8');

  // 2. Title is unique and not generic placeholder
  const titleMatch = html.match(/<title>(.*?)<\/title>/i);
  assert(titleMatch && titleMatch[1] && titleMatch[1] === meta.title, `Rule 2: Title exactly matches route metadata for [${route}]`);
  if (route !== '/') {
    assert(titleMatch[1] !== ROUTE_SEO_DATA['/'].title, `Rule 2b: Non-root route [${route}] does not use generic homepage title`);
  }

  // 3. Meta description exists and matches
  const descMatch = html.match(/<meta\s+name="description"\s+content="(.*?)"\s*\/?>/i);
  assert(descMatch && descMatch[1] && descMatch[1] === meta.description, `Rule 3: Meta description matches route metadata for [${route}]`);
  if (route !== '/') {
    assert(descMatch[1] !== ROUTE_SEO_DATA['/'].description, `Rule 3b: Non-root route [${route}] does not use generic homepage description`);
  }

  // 4 & 5. Canonical URL is absolute https://onemorerush.com/...
  const canonicalMatches = [...html.matchAll(/<link\s+rel="canonical"\s+href="(.*?)"\s*\/?>/gi)];
  assert(canonicalMatches.length === 1, `Rule 14: Exactly one canonical link exists for [${route}] (no duplicate tags)`);
  const expectedCanonical = `${DEFAULT_SITE_URL}${meta.path === '/' ? '/' : meta.path}`;
  assert(canonicalMatches[0][1] === expectedCanonical, `Rules 4 & 5: Canonical URL strictly matches [${expectedCanonical}]`);

  // 6. Visible H1 exists
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  assert(h1Match && h1Match[1].trim().length > 0, `Rule 6: Visible H1 heading exists in static HTML for [${route}]`);

  // 7 & 8. Game routes have game-specific visible text, controls, objective, and tips
  if (meta.type === 'game') {
    assert(html.includes(meta.gameName), `Rule 8: Static HTML for [${route}] contains game name [${meta.gameName}]`);
    assert(html.includes(meta.overview), `Rule 7a: Static HTML for [${route}] contains game overview`);
    assert(html.includes(meta.objective), `Rule 7b: Static HTML for [${route}] contains game objective`);
    assert(html.includes(meta.controls), `Rule 7c: Static HTML for [${route}] contains game controls`);
    assert(html.includes(meta.skillsTested), `Rule 7d: Static HTML for [${route}] contains skills tested`);
    assert(html.includes(meta.proTip), `Rule 7e: Static HTML for [${route}] contains pro tips`);
    assert(html.includes(`PLAY ${meta.gameName}`), `Rule 7f: Static HTML for [${route}] contains PLAY CTA`);
  }

  // 9 & 16. JSON-LD structured data exists, is valid JSON, and describes page
  const jsonLdMatch = html.match(/<script\s+id="seo-structured-data"\s+type="application\/ld\+json">([\s\S]*?)<\/script>/i);
  assert(jsonLdMatch && jsonLdMatch[1], `Rule 9: JSON-LD structured data script exists for [${route}]`);
  let parsedJsonLd;
  try {
    parsedJsonLd = JSON.parse(jsonLdMatch[1]);
    assert(parsedJsonLd !== null, `Rule 16: JSON-LD structured data is valid JSON for [${route}]`);
  } catch (err) {
    assert(false, `Rule 16: Malformed JSON-LD in [${route}]: ${err.message}`);
  }

  // 11, 12, 13. Zero prohibited domains in metadata
  assert(!html.includes('localhost'), `Rule 11: Zero localhost references in [${route}]`);
  assert(!html.includes('pages.dev'), `Rule 12: Zero pages.dev references in [${route}]`);
  assert(!html.includes('vercel.app') && !html.includes('netlify.app'), `Rule 13: Zero temporary domains in [${route}]`);

  // 15. Robots tags
  const robotsMatches = [...html.matchAll(/<meta\s+name="robots"\s+content="(.*?)"\s*\/?>/gi)];
  assert(robotsMatches.length === 1, `Rule 15: Exactly one robots meta tag exists for [${route}]`);
  assert(robotsMatches[0][1] === 'index, follow', `Rule 15b: Public route [${route}] has robots "index, follow"`);
}

// ----------------------------------------------------
// SECTION 2: AUTH & PRIVATE ROUTES NON-INDEXABILITY
// ----------------------------------------------------
console.log('\n--- SECTION 2: Auth & Private Route Rules ---');

const authRoutes = Object.keys(AUTH_ROUTE_SEO);
for (const authPath of authRoutes) {
  const authMeta = AUTH_ROUTE_SEO[authPath];
  assert(authMeta.noindex === true, `Rule 10: Private/Auth route [${authPath}] is marked noindex`);
  const relativeFilePath = `${authPath.replace(/^\//, '')}/index.html`;
  const existsInDist = fs.existsSync(path.join(DIST_DIR, relativeFilePath));
  assert(!existsInDist, `Rule 10b: Auth route [${authPath}] is NOT statically prerendered as an indexable standalone page`);
}

// ----------------------------------------------------
// SECTION 3: SITEMAP & ROBOTS.TXT STRICT VALIDATION
// ----------------------------------------------------
console.log('\n--- SECTION 3: XML Sitemap & robots.txt Hardening ---');

assert(fs.existsSync(SITEMAP_PATH), 'Sitemap file exists in public/sitemap.xml');
const sitemapContent = fs.readFileSync(SITEMAP_PATH, 'utf8');

const sitemapLocMatches = [...sitemapContent.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);

assert(sitemapLocMatches.length >= 14, `Sitemap contains all ${sitemapLocMatches.length} canonical public routes`);

for (const loc of sitemapLocMatches) {
  // 17. Every sitemap URL is an absolute canonical URL starting with https://onemorerush.com/
  assert(loc.startsWith('https://onemorerush.com'), `Rule 17: Sitemap URL [${loc}] uses canonical HTTPS domain`);

  // 18. Zero auth routes in sitemap
  for (const authPath of authRoutes) {
    assert(!loc.endsWith(authPath), `Rule 18: Sitemap does not contain private/auth URL [${authPath}]`);
  }
}

assert(fs.existsSync(ROBOTS_PATH), 'robots.txt exists in public/robots.txt');
const robotsContent = fs.readFileSync(ROBOTS_PATH, 'utf8');
assert(robotsContent.includes('Sitemap: https://onemorerush.com/sitemap.xml'), 'robots.txt specifies absolute canonical sitemap URL');
assert(robotsContent.includes('Allow: /'), 'robots.txt allows crawling of public resources');

console.log('\n====================================================');
console.log(`✅ ALL ${totalTests} STATIC SEO & CRAWLER TESTS PASSED!`);
console.log('====================================================\n');
