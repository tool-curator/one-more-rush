import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.resolve(__dirname, '../dist');

const GAMES_TO_VERIFY = [
  {
    id: 'aim',
    name: 'AIM',
    expectedKeywords: ['Progressive Target Sizing', 'Sudden-Death Misclick Penalty', 'Sharpshooter', 'Anti-Repetition Vector Spawning', 'sub-400ms'],
  },
  {
    id: 'dodge',
    name: 'DODGE',
    expectedKeywords: ['Wave Director', 'Dynamic Hazard Enemy Types', 'Arena Boundary Shrinkage', 'Near-Miss', 'Powerup Arsenal', 'Survivor'],
  },
  {
    id: 'stack',
    name: 'STACK',
    expectedKeywords: ['6.0 logical pixels', 'Flow Mode', 'Slicing', 'Tower Height', 'Builder'],
  },
  {
    id: 'number-rush',
    name: 'NUMBER RUSH',
    expectedKeywords: ['5 Progressive Mathematical Phases', 'Rush Mode', 'Overdrive Acceleration', '3-Heart Health System', 'Calculator'],
  },
  {
    id: 'memory',
    name: 'MEMORY',
    expectedKeywords: ['Glitch Challenge Mode', 'Snapshot Mode', 'Mastermind', 'Visual Sequence', 'Working Memory'],
  },
  {
    id: 'color-maze',
    name: 'COLOR MAZE',
    expectedKeywords: ['Labyrinth Painter', 'Continuous Wall-to-Wall Sliding Physics', 'Par Move Efficiency', '3-Star Rating', 'Maze Painter'],
  },
];

console.log('====================================================');
console.log('  ONE MORE RUSH — PHASE 2 STATIC HTML VERIFICATION  ');
console.log('====================================================\n');

let allPassed = true;

for (const game of GAMES_TO_VERIFY) {
  const filePath = path.join(DIST_DIR, 'games', game.id, 'index.html');
  console.log(`--- Testing [${game.name}] (${path.relative(DIST_DIR, filePath)}) ---`);

  if (!fs.existsSync(filePath)) {
    console.error(`❌ ERROR: File does not exist at ${filePath}`);
    allPassed = false;
    continue;
  }

  const html = fs.readFileSync(filePath, 'utf8');

  // 1. Extract Title
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1] : 'MISSING';

  // 2. Extract H1
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const h1 = h1Match ? h1Match[1].trim() : 'MISSING';

  // 3. Count H2 sections
  const h2Matches = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].map(m => m[1].trim());

  // 4. Extract Canonical
  const canonicalMatch = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i);
  const canonical = canonicalMatch ? canonicalMatch[1] : 'MISSING';

  // 5. Extract Robots Directive
  const robotsMatch = html.match(/<meta\s+name="robots"\s+content="([^"]+)"/i);
  const robots = robotsMatch ? robotsMatch[1] : 'MISSING';

  // 6. Check Structured Data (JSON-LD)
  const jsonLdMatches = [...html.matchAll(/<script\s+id="seo-structured-data"\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];
  let jsonLdParsed = null;
  let hasFaqSchema = false;
  let hasWebappSchema = false;
  if (jsonLdMatches.length > 0) {
    try {
      jsonLdParsed = JSON.parse(jsonLdMatches[0][1]);
      if (Array.isArray(jsonLdParsed)) {
        hasFaqSchema = jsonLdParsed.some(item => item['@type'] === 'FAQPage');
        hasWebappSchema = jsonLdParsed.some(item => item['@type'] === 'WebApplication');
      }
    } catch (err) {
      console.warn('JSON-LD parse error:', err.message);
    }
  }

  // 7. Check Raw Pre-Render Content inside #root (all content up to closing body tag)
  const rootContentMatch = html.match(/<div id="root">([\s\S]*?)<\/div>\s*<\/body>/i);
  const rootContent = rootContentMatch ? rootContentMatch[1] : '';
  const rootLength = rootContent.length;

  // 8. Verify Game-Specific Unique Keywords (case-insensitive for safety)
  const missingKeywords = [];
  for (const kw of game.expectedKeywords) {
    if (!html.toLowerCase().includes(kw.toLowerCase())) {
      missingKeywords.push(kw);
    }
  }

  // 9. Verify Semantic Elements inside #root
  const hasControlsTable = rootContent.includes('<table class="controls-table');
  const hasFaqSection = rootContent.includes('<dl class="faq-list">');
  const hasPlayButton = rootContent.includes('launch-game-button');
  const hasRelatedGames = rootContent.includes('related-games-grid');
  const hasArticle = rootContent.includes('<article class="game-guide-article');

  console.log(`• Title: ${title}`);
  console.log(`• H1: ${h1}`);
  console.log(`• Canonical: ${canonical} (Expected: https://onemorerush.com/games/${game.id})`);
  console.log(`• Robots Directive: ${robots}`);
  console.log(`• H2 Sections (${h2Matches.length}): ${h2Matches.join(' | ')}`);
  console.log(`• #root Static Pre-rendered HTML Length: ${rootLength.toLocaleString()} characters`);
  console.log(`• Semantic <article> wrapper: ${hasArticle ? '✓ YES' : '❌ NO'}`);
  console.log(`• Controls <table> in HTML: ${hasControlsTable ? '✓ YES' : '❌ NO'}`);
  console.log(`• FAQ <dl> in HTML: ${hasFaqSection ? '✓ YES' : '❌ NO'}`);
  console.log(`• Structured Data: WebApplication: ${hasWebappSchema ? '✓' : '❌'}, FAQPage: ${hasFaqSchema ? '✓' : '❌'}`);
  console.log(`• Play CTA Button: ${hasPlayButton ? '✓ YES' : '❌ NO'}`);
  console.log(`• Related Games Links: ${hasRelatedGames ? '✓ YES' : '❌ NO'}`);

  if (missingKeywords.length === 0) {
    console.log(`• Unique Engine Keywords: ALL FOUND (${game.expectedKeywords.join(', ')})`);
  } else {
    console.error(`❌ MISSING KEYWORDS: ${missingKeywords.join(', ')}`);
    allPassed = false;
  }

  const isCanonicalValid = canonical === `https://onemorerush.com/games/${game.id}`;
  const isRobotsValid = robots.includes('index, follow');

  if (h2Matches.length >= 7 && rootLength > 5000 && isCanonicalValid && isRobotsValid && hasControlsTable && hasFaqSection && hasArticle) {
    console.log(`✅ [${game.name}] STATIC HTML QUALITY: EXCELLENT\n`);
  } else {
    console.error(`❌ [${game.name}] STATIC HTML QUALITY FAILED CRITERIA\n`);
    allPassed = false;
  }
}

if (allPassed) {
  console.log('🎉 ALL 6 GAME ROUTES PASSED STATIC HTML & SEO QUALITY VERIFICATION!\n');
  process.exit(0);
} else {
  console.error('⚠️ SOME GAME ROUTES FAILED VERIFICATION.\n');
  process.exit(1);
}
