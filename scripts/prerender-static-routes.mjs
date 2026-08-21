/**
 * ONE MORE RUSH — Static / Prerender Build Script
 * Generates static, fully crawlable HTML for all public discovery routes in dist/
 * Consumes the unified ROUTE_SEO_DATA single source of truth from src/config/seoContent.js
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_SITE_URL, ROUTE_SEO_DATA, ALL_GAMES } from '../src/config/seoContent.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.resolve(__dirname, '../dist');

if (!fs.existsSync(DIST_DIR)) {
  console.error('Error: dist directory does not exist. Run "vite build" first.');
  process.exit(1);
}

const templatePath = path.join(DIST_DIR, 'index.html');
const templateHtml = fs.readFileSync(templatePath, 'utf8');

// Helper to escape HTML attributes
function escapeHtml(str = '') {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Generate structured data JSON-LD string
function generateStructuredData(meta, canonicalUrl) {
  let structuredData;

  if (meta.type === 'game' && meta.gameName) {
    structuredData = [
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: `${DEFAULT_SITE_URL}/`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Games',
            item: `${DEFAULT_SITE_URL}/#games-section`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: meta.gameName,
            item: canonicalUrl,
          },
        ],
      },
      {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: `${meta.gameName} — One More Rush`,
        url: canonicalUrl,
        applicationCategory: 'GameApplication',
        operatingSystem: 'Any',
        genre: meta.genre || 'Arcade Game',
        description: meta.description,
        inLanguage: 'en',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
      },
    ];
  } else if (meta.breadcrumbName) {
    structuredData = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: `${DEFAULT_SITE_URL}/`,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: meta.breadcrumbName,
          item: canonicalUrl,
        },
      ],
    };
  } else {
    structuredData = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'ONE MORE RUSH',
      url: `${DEFAULT_SITE_URL}/`,
      description: meta.description,
    };
  }

  return JSON.stringify(structuredData, null, 2);
}

// Generate meaningful visible initial HTML for pre-rendering
function generateInitialHtml(meta) {
  const otherGames = ALL_GAMES.filter((g) => g.id !== meta.gameId);

  if (meta.type === 'game') {
    return `
      <div class="app-shell lobby-mode">
        <header class="platform-header">
          <div class="header-container">
            <div class="header-main-bar">
              <a href="/" class="header-brand" title="ONE MORE RUSH — Home">
                <span class="logo-text">ONE MORE RUSH</span>
              </a>
              <nav class="header-nav header-nav-desktop" aria-label="Main Navigation">
                <a href="/" class="nav-link">Home</a>
                <a href="/#games-section" class="nav-link active">Games</a>
                <a href="/daily" class="nav-link">Daily</a>
                <a href="/locker" class="nav-link">Locker</a>
                <a href="/leaderboard" class="nav-link">Leaderboard</a>
              </nav>
            </div>
          </div>
        </header>

        <main class="game-landing-seo-container" style="max-width: 900px; margin: 2rem auto; padding: 1.5rem;">
          <nav class="howtoplay-breadcrumbs font-mono" aria-label="Breadcrumb" style="display: flex; gap: 8px; margin-bottom: 1rem; color: #888;">
            <a href="/" style="color: #00f2fe; text-decoration: none;">Home</a>
            <span>/</span>
            <a href="/#games-section" style="color: #00f2fe; text-decoration: none;">Games</a>
            <span>/</span>
            <span style="color: #fff; font-weight: bold;">${escapeHtml(meta.gameName)}</span>
          </nav>

          <article class="glass-panel" style="background: rgba(14, 14, 22, 0.95); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 20px; padding: 2rem;">
            <header style="text-align: center; margin-bottom: 1.5rem;">
              <h1 class="font-heading" style="font-size: 2.2rem; color: #ffffff; margin-bottom: 0.5rem;">${escapeHtml(meta.h1)}</h1>
              <p class="font-heading" style="font-size: 1.1rem; color: #00f2fe; margin-bottom: 1rem;">"${escapeHtml(meta.subtitle || '')}"</p>
              <a href="${meta.path}" class="btn-primary start-now-btn" style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; font-weight: 800; font-size: 1.1rem; padding: 12px 32px; background: linear-gradient(135deg, #ff3562, #ffb703); color: #fff; border-radius: 9999px; text-decoration: none; box-shadow: 0 0 30px rgba(255, 53, 98, 0.4);">
                PLAY ${escapeHtml(meta.gameName)} NOW
              </a>
            </header>

            <section style="margin-bottom: 1.5rem; line-height: 1.6; color: #ccc;">
              <h2 style="font-size: 1.2rem; color: #fff; margin-bottom: 0.5rem;">Game Overview</h2>
              <p>${escapeHtml(meta.overview)}</p>
              <p><strong>Objective:</strong> ${escapeHtml(meta.objective)}</p>
            </section>

            <section style="margin-bottom: 1.5rem;">
              <h2 style="font-size: 1.2rem; color: #fff; margin-bottom: 0.5rem;">How to Play &amp; Rules</h2>
              <ul style="list-style: disc; padding-left: 1.5rem; color: #ccc; line-height: 1.6;">
                ${(meta.howToPlay || []).map((step) => `<li>${escapeHtml(step)}</li>`).join('')}
              </ul>
            </section>

            <section style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
              <div style="background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 1rem;">
                <h3 style="font-size: 1rem; color: #00f2fe; margin-bottom: 0.4rem;">🎮 Controls</h3>
                <p style="color: #bbb; font-size: 0.9rem; margin: 0;">${escapeHtml(meta.controls)}</p>
              </div>
              <div style="background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 1rem;">
                <h3 style="font-size: 1rem; color: #ffb703; margin-bottom: 0.4rem;">🧭 Skills Tested</h3>
                <p style="color: #bbb; font-size: 0.9rem; margin: 0;">${escapeHtml(meta.skillsTested)}</p>
              </div>
            </section>

            <section style="background: rgba(255, 53, 98, 0.08); border: 1px solid rgba(255, 53, 98, 0.25); border-radius: 12px; padding: 1rem; margin-bottom: 2rem;">
              <h3 style="font-size: 1rem; color: #ff3562; margin-bottom: 0.4rem;">💡 Pro Tip</h3>
              <p style="color: #ffb4c4; font-size: 0.92rem; margin: 0;">${escapeHtml(meta.proTip)}</p>
            </section>

            <section style="border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 1.5rem;">
              <h2 style="font-size: 1.15rem; color: #fff; margin-bottom: 1rem;">Explore Other Arcade Games</h2>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 0.75rem;">
                ${otherGames
                  .map(
                    (g) => `
                  <a href="/games/${g.id}" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0.85rem; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; text-decoration: none; color: #fff; text-align: center;">
                    <span style="font-size: 1.5rem; margin-bottom: 4px;">${g.icon}</span>
                    <span style="font-weight: 700; font-size: 0.85rem;">${g.name}</span>
                  </a>
                `
                  )
                  .join('')}
              </div>
            </section>
          </article>
        </main>

        <footer class="platform-footer" style="padding: 2rem 1rem; text-align: center; color: #777; font-size: 0.85rem;">
          <p>© ${new Date().getFullYear()} ONE MORE RUSH. Free online browser arcade.</p>
        </footer>
      </div>
    `;
  }

  // Non-game public routes (Home, Daily, Leaderboard, Locker, About, Support, Privacy, Terms)
  return `
    <div class="app-shell lobby-mode">
      <header class="platform-header">
        <div class="header-container">
          <div class="header-main-bar">
            <a href="/" class="header-brand" title="ONE MORE RUSH — Home">
              <span class="logo-text">ONE MORE RUSH</span>
            </a>
            <nav class="header-nav header-nav-desktop" aria-label="Main Navigation">
              <a href="/" class="nav-link ${meta.path === '/' ? 'active' : ''}">Home</a>
              <a href="/#games-section" class="nav-link">Games</a>
              <a href="/daily" class="nav-link ${meta.path === '/daily' ? 'active' : ''}">Daily</a>
              <a href="/locker" class="nav-link ${meta.path === '/locker' ? 'active' : ''}">Locker</a>
              <a href="/leaderboard" class="nav-link ${meta.path === '/leaderboard' ? 'active' : ''}">Leaderboard</a>
            </nav>
          </div>
        </div>
      </header>

      <main style="max-width: 1100px; margin: 2rem auto; padding: 1.5rem;">
        ${
          meta.breadcrumbName
            ? `
          <nav class="howtoplay-breadcrumbs font-mono" aria-label="Breadcrumb" style="display: flex; gap: 8px; margin-bottom: 1rem; color: #888;">
            <a href="/" style="color: #00f2fe; text-decoration: none;">Home</a>
            <span>/</span>
            <span style="color: #fff; font-weight: bold;">${escapeHtml(meta.breadcrumbName)}</span>
          </nav>
        `
            : ''
        }

        <article class="glass-panel" style="background: rgba(14, 14, 22, 0.95); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 20px; padding: 2rem;">
          <h1 class="font-heading" style="font-size: 2.2rem; color: #ffffff; margin-bottom: 1rem;">${escapeHtml(meta.h1)}</h1>
          <p style="font-size: 1.05rem; line-height: 1.6; color: #ccc; margin-bottom: 1.5rem;">${escapeHtml(meta.overview || meta.description)}</p>

          ${
            meta.features
              ? `
            <section style="margin-bottom: 2rem;">
              <h2 style="font-size: 1.25rem; color: #00f2fe; margin-bottom: 0.75rem;">Highlights &amp; Features</h2>
              <ul style="list-style: disc; padding-left: 1.5rem; color: #bbb; line-height: 1.7;">
                ${meta.features.map((f) => `<li>${escapeHtml(f)}</li>`).join('')}
              </ul>
            </section>
          `
              : ''
          }

          <section style="border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 1.5rem;">
            <h2 style="font-size: 1.25rem; color: #fff; margin-bottom: 1rem;">Play Free Arcade Games</h2>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 1rem;">
              ${ALL_GAMES.map(
                (g) => `
                <a href="/games/${g.id}" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 1rem; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; text-decoration: none; color: #fff; text-align: center;">
                  <span style="font-size: 1.8rem; margin-bottom: 6px;">${g.icon}</span>
                  <span style="font-weight: 700; font-size: 0.95rem; margin-bottom: 2px;">${g.name}</span>
                  <span style="font-size: 0.75rem; color: #888;">${g.tagline}</span>
                </a>
              `
              ).join('')}
            </div>
          </section>
        </article>
      </main>

      <footer class="platform-footer" style="padding: 2rem 1rem; text-align: center; color: #777; font-size: 0.85rem;">
        <p>© ${new Date().getFullYear()} ONE MORE RUSH. Free online browser arcade.</p>
      </footer>
    </div>
  `;
}

// Generate static HTML document for a specific route
function renderRouteHtml(meta) {
  const canonicalUrl = `${DEFAULT_SITE_URL}${meta.path === '/' ? '/' : meta.path}`;
  const ogImageUrl = `${DEFAULT_SITE_URL}/og-image.png`;
  const structuredData = generateStructuredData(meta, canonicalUrl);
  const initialBodyHtml = generateInitialHtml(meta);

  let html = templateHtml;

  // Replace Title
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${meta.title}</title>`);

  // Replace Meta Description
  html = html.replace(
    /<meta\s+name="description"\s+content="[\s\S]*?"\s*\/?>/i,
    `<meta name="description" content="${escapeHtml(meta.description)}" />`
  );

  // Replace Canonical Link
  html = html.replace(
    /<link\s+rel="canonical"\s+href="[\s\S]*?"\s*\/?>/i,
    `<link rel="canonical" href="${canonicalUrl}" />`
  );

  // Replace OG tags
  html = html.replace(
    /<meta\s+property="og:title"\s+content="[\s\S]*?"\s*\/?>/i,
    `<meta property="og:title" content="${escapeHtml(meta.title)}" />`
  );
  html = html.replace(
    /<meta\s+property="og:description"\s+content="[\s\S]*?"\s*\/?>/i,
    `<meta property="og:description" content="${escapeHtml(meta.description)}" />`
  );
  html = html.replace(
    /<meta\s+property="og:url"\s+content="[\s\S]*?"\s*\/?>/i,
    `<meta property="og:url" content="${canonicalUrl}" />`
  );
  html = html.replace(
    /<meta\s+property="og:image"\s+content="[\s\S]*?"\s*\/?>/i,
    `<meta property="og:image" content="${ogImageUrl}" />`
  );

  // Replace Twitter tags
  html = html.replace(
    /<meta\s+name="twitter:title"\s+content="[\s\S]*?"\s*\/?>/i,
    `<meta name="twitter:title" content="${escapeHtml(meta.title)}" />`
  );
  html = html.replace(
    /<meta\s+name="twitter:description"\s+content="[\s\S]*?"\s*\/?>/i,
    `<meta name="twitter:description" content="${escapeHtml(meta.description)}" />`
  );
  html = html.replace(
    /<meta\s+name="twitter:image"\s+content="[\s\S]*?"\s*\/?>/i,
    `<meta name="twitter:image" content="${ogImageUrl}" />`
  );

  // Replace Structured Data
  html = html.replace(
    /<script\s+id="seo-structured-data"\s+type="application\/ld\+json">[\s\S]*?<\/script>/i,
    `<script id="seo-structured-data" type="application/ld+json">\n${structuredData}\n    </script>`
  );

  // Inject initial pre-rendered HTML into #root
  html = html.replace(
    /<div id="root"><\/div>/i,
    `<div id="root">${initialBodyHtml}</div>`
  );

  return html;
}

// Prerender all target public routes
console.log('--- ONE MORE RUSH BUILD-TIME STATIC ROUTE PRERENDER ---');
const routes = Object.keys(ROUTE_SEO_DATA);
let generatedCount = 0;

for (const route of routes) {
  const meta = ROUTE_SEO_DATA[route];
  const renderedHtml = renderRouteHtml(meta);

  let targetFilePath;
  if (route === '/') {
    targetFilePath = path.join(DIST_DIR, 'index.html');
  } else {
    const routeDir = path.join(DIST_DIR, route.replace(/^\//, ''));
    fs.mkdirSync(routeDir, { recursive: true });
    targetFilePath = path.join(routeDir, 'index.html');
  }

  fs.writeFileSync(targetFilePath, renderedHtml, 'utf8');
  console.log(`✓ Prerendered [${route}] -> ${path.relative(DIST_DIR, targetFilePath)}`);
  generatedCount++;
}

console.log(`\n✅ Successfully generated ${generatedCount} static HTML public landing pages.\n`);
