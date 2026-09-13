/**
 * ONE MORE RUSH — Static / Prerender Build Script
 * Generates static, fully crawlable HTML for all public discovery routes in dist/
 * Consumes the unified ROUTE_SEO_DATA single source of truth from src/config/seoContent.js
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_SITE_URL, ROUTE_SEO_DATA, AUTH_ROUTE_SEO, ALL_GAMES } from '../src/config/seoContent.js';
import { GAME_CONTENT, getGameContent } from '../src/config/gameContent.js';
import { PLATFORM_CONTENT, getPlatformContent } from '../src/config/platformContent.js';

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
    const gc = getGameContent(meta.gameId) || GAME_CONTENT[meta.gameId];
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

    if (gc?.faq && gc.faq.length > 0) {
      structuredData.push({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: gc.faq.map((item) => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.a,
          },
        })),
      });
    }
  } else {
    // Check if route has platform content with FAQ
    let platformKey = null;
    if (meta.path === '/') platformKey = 'home';
    else if (meta.path === '/daily') platformKey = 'daily';
    else if (meta.path === '/locker') platformKey = 'locker';
    else if (meta.path === '/leaderboard') platformKey = 'leaderboard';

    const pc = platformKey ? getPlatformContent(platformKey) : null;

    if (meta.breadcrumbName) {
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
              name: meta.breadcrumbName,
              item: canonicalUrl,
            },
          ],
        },
      ];
    } else {
      structuredData = [
        {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'ONE MORE RUSH',
          url: `${DEFAULT_SITE_URL}/`,
          description: meta.description,
        },
      ];
    }

    if (pc?.faq && pc.faq.length > 0) {
      structuredData.push({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: pc.faq.map((item) => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.a,
          },
        })),
      });
    }
  }

  return JSON.stringify(structuredData, null, 2);
}


// Generate meaningful visible initial HTML for pre-rendering
function generateInitialHtml(meta) {
  if (meta.noindex) {
    return `
      <div class="app-shell lobby-mode">
        <header class="platform-header">
          <div class="header-container">
            <div class="header-main-bar">
              <a href="/" class="header-brand" title="ONE MORE RUSH — Home">
                <span class="logo-text">ONE MORE RUSH</span>
              </a>
            </div>
          </div>
        </header>

        <main style="max-width: 600px; margin: 4rem auto; padding: 2rem; text-align: center;">
          <article class="glass-panel" style="background: rgba(14, 14, 22, 0.95); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 20px; padding: 2.5rem;">
            <h1 class="font-heading" style="font-size: 2rem; color: #ffffff; margin-bottom: 0.75rem;">${escapeHtml(meta.title)}</h1>
            <p style="color: #94a3b8; font-size: 0.95rem; margin-bottom: 1.5rem;">${escapeHtml(meta.description)}</p>
            <a href="/" class="btn-primary" style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; font-weight: 700; padding: 10px 24px; background: linear-gradient(135deg, #00f2fe, #4facfe); color: #000; border-radius: 9999px; text-decoration: none;">
              RETURN TO ARCADE
            </a>
          </article>
        </main>
      </div>
    `;
  }

  const otherGames = ALL_GAMES.filter((g) => g.id !== meta.gameId);

  if (meta.type === 'game') {
    const gc = getGameContent(meta.gameId) || GAME_CONTENT[meta.gameId] || GAME_CONTENT.aim;
    const currentYear = new Date().getFullYear();

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

        <main class="lobby-content">
          <div class="game-landing-container">
            <!-- Semantic Breadcrumbs -->
            <nav class="game-breadcrumbs font-mono" aria-label="Breadcrumb">
              <a href="/">Home</a>
              <span class="crumb-separator" aria-hidden="true">/</span>
              <a href="/#games-section">Games</a>
              <span class="crumb-separator" aria-hidden="true">/</span>
              <span class="crumb-active" aria-current="page">${escapeHtml(gc.name)}</span>
            </nav>

            <!-- Hero Header: Title & Short Introduction -->
            <header class="game-hero-header">
              <div class="game-badge-row">
                <span class="game-badge-pill genre-pill">${escapeHtml(gc.genre)}</span>
                <span class="game-badge-pill tech-pill">⚡ 60 FPS CANVAS</span>
                <span class="game-badge-pill security-pill">🛡️ SERVER VERIFIED</span>
              </div>
              <h1 class="game-landing-h1 font-heading">${escapeHtml(gc.h1)}</h1>
              <p class="game-landing-intro">${escapeHtml(gc.introduction)}</p>
            </header>

            <!-- Primary Game Play Hero Arena [ GAME ] -->
            <div class="game-play-hero-card glass-panel theme-${escapeHtml(gc.id)}">
              <div class="hero-card-glow" aria-hidden="true"></div>

              <div class="hero-card-header">
                <div class="hero-icon-container">
                  <span class="hero-game-icon" role="img" aria-label="${escapeHtml(gc.name)}">${gc.icon}</span>
                </div>

                <div class="hero-title-group">
                  <div class="hero-title-row">
                    <h2 class="hero-game-name font-heading">${escapeHtml(gc.name)}</h2>
                  </div>
                  <p class="hero-game-tagline font-mono">${escapeHtml(gc.tagline)}</p>
                </div>
              </div>

              <!-- Action Controls: Immediate Launch Button -->
              <div class="hero-action-row">
                <a href="${meta.path}" class="btn-hero-launch font-heading" id="launch-game-button" aria-label="Play ${escapeHtml(gc.name)} Now">
                  <span>PLAY ${escapeHtml(gc.name)} NOW</span>
                </a>
                <a href="#game-documentation" class="btn-hero-guide font-mono">
                  <span>Read Strategy &amp; Rules ↓</span>
                </a>
              </div>

              <!-- Quick Game Specs Bar -->
              <div class="hero-specs-bar font-mono">
                <div class="spec-col">
                  <span class="spec-label">PRIMARY INPUT</span>
                  <span class="spec-val">${escapeHtml(gc.controls[0]?.input || 'Mouse / Touch')}</span>
                </div>
                <div class="spec-col">
                  <span class="spec-label">CATEGORY</span>
                  <span class="spec-val">Skill &amp; Reflex Arcade</span>
                </div>
                <div class="spec-col">
                  <span class="spec-label">COMPATIBILITY</span>
                  <span class="spec-val">Desktop, Mobile &amp; Tablet</span>
                </div>
              </div>
            </div>

            <!-- Rich Semantic Game Documentation -->
            <article class="game-guide-article" id="game-documentation">
              <!-- Section: Objective & Rules -->
              <section class="guide-section guide-objective">
                <div class="section-header">
                  <h2 class="guide-section-title font-heading">Game Objective &amp; Rules</h2>
                </div>
                <div class="guide-content-box glass-panel">
                  <p class="guide-paragraph">${escapeHtml(gc.objective)}</p>
                </div>
              </section>

              <!-- Section: Controls & Input Methods -->
              <section class="guide-section guide-controls">
                <div class="section-header">
                  <h2 class="guide-section-title font-heading">Controls &amp; Input Methods</h2>
                  <p class="section-subtitle">Optimized for both high-precision desktop gaming and responsive mobile touch displays.</p>
                </div>
                <div class="table-responsive glass-panel">
                  <table class="controls-table font-mono" aria-label="${escapeHtml(gc.name)} Controls and Input Methods">
                    <thead>
                      <tr>
                        <th scope="col" style="width: 25%;">Device</th>
                        <th scope="col" style="width: 35%;">Input Method</th>
                        <th scope="col" style="width: 40%;">Action &amp; Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${gc.controls
                        .map(
                          (c) => `
                        <tr>
                          <td>
                            <div class="device-label">
                              <span>${escapeHtml(c.device)}</span>
                            </div>
                          </td>
                          <td>
                            <code class="input-code">${escapeHtml(c.input)}</code>
                          </td>
                          <td class="desc-cell">${escapeHtml(c.description)}</td>
                        </tr>
                      `
                        )
                        .join('')}
                    </tbody>
                  </table>
                </div>
              </section>

              <!-- Section: Core Mechanics & Progressive Difficulty -->
              <section class="guide-section guide-mechanics">
                <div class="section-header">
                  <h2 class="guide-section-title font-heading">Core Mechanics &amp; Difficulty Progression</h2>
                  <p class="section-subtitle">Real engine mechanics confirmed by the game source code.</p>
                </div>
                <div class="mechanics-grid">
                  ${gc.mechanics
                    .map(
                      (m, idx) => `
                    <div class="mechanic-card glass-panel">
                      <div class="mechanic-card-header">
                        <span class="mechanic-step font-mono">0${idx + 1}</span>
                        <h3 class="mechanic-title font-heading">${escapeHtml(m.title)}</h3>
                      </div>
                      <p class="mechanic-desc">${escapeHtml(m.description)}</p>
                    </div>
                  `
                    )
                    .join('')}
                </div>
              </section>

              <!-- Section: Scoring System & Multipliers -->
              <section class="guide-section guide-scoring">
                <div class="section-header">
                  <h2 class="guide-section-title font-heading">Scoring System &amp; Multipliers</h2>
                  <p class="section-subtitle">${escapeHtml(gc.scoring.overview)}</p>
                </div>
                <div class="guide-content-box glass-panel">
                  <ul class="scoring-rules-list">
                    ${gc.scoring.rules
                      .map((rule) => {
                        const colonIdx = rule.indexOf(':');
                        if (colonIdx > -1) {
                          const lead = rule.slice(0, colonIdx);
                          const rest = rule.slice(colonIdx + 1);
                          return `
                            <li class="scoring-rule-item">
                              <span class="rule-bullet" aria-hidden="true">▸</span>
                              <div>
                                <strong class="rule-lead font-heading">${escapeHtml(lead)}:</strong>
                                <span class="rule-body">${escapeHtml(rest)}</span>
                              </div>
                            </li>
                          `;
                        }
                        return `
                          <li class="scoring-rule-item">
                            <span class="rule-bullet" aria-hidden="true">▸</span>
                            <div><span class="rule-body">${escapeHtml(rule)}</span></div>
                          </li>
                        `;
                      })
                      .join('')}
                  </ul>
                </div>
              </section>

              <!-- Section: Pro Tips & Strategies -->
              <section class="guide-section guide-strategies">
                <div class="section-header">
                  <h2 class="guide-section-title font-heading">Pro Tips &amp; Proven Strategies</h2>
                  <p class="section-subtitle">Tactical advice to push your session score into top global leaderboard ranks.</p>
                </div>
                <div class="strategies-grid">
                  ${gc.strategies
                    .map(
                      (s) => `
                    <div class="strategy-card glass-panel">
                      <h3 class="strategy-title font-heading">
                        <span class="strategy-icon" aria-hidden="true">💡</span>
                        ${escapeHtml(s.title)}
                      </h3>
                      <p class="strategy-text">${escapeHtml(s.text)}</p>
                    </div>
                  `
                    )
                    .join('')}
                </div>
              </section>

              <!-- Section: Mobile Play & Touch Support -->
              <section class="guide-section guide-mobile">
                <div class="section-header">
                  <h2 class="guide-section-title font-heading">Mobile Play &amp; Touch Ergonomics</h2>
                </div>
                <div class="guide-content-box glass-panel">
                  <p class="guide-paragraph">${escapeHtml(gc.mobile)}</p>
                </div>
              </section>

              <!-- Section: Leaderboard & Achievement Badges -->
              <section class="guide-section guide-leaderboard">
                <div class="section-header">
                  <h2 class="guide-section-title font-heading">Global Leaderboards &amp; Rush Locker Badges</h2>
                </div>
                <div class="guide-content-box glass-panel">
                  <p class="guide-paragraph">${escapeHtml(gc.leaderboard)}</p>
                </div>
              </section>

              <!-- Section: Frequently Asked Questions -->
              <section class="guide-section guide-faq">
                <div class="section-header">
                  <h2 class="guide-section-title font-heading">Frequently Asked Questions</h2>
                  <p class="section-subtitle">Common questions about gameplay mechanics, scoring, and controls.</p>
                </div>
                <dl class="faq-list">
                  ${gc.faq
                    .map(
                      (item) => `
                    <div class="faq-item glass-panel">
                      <dt class="faq-question font-heading">
                        <span>${escapeHtml(item.q)}</span>
                      </dt>
                      <dd class="faq-answer">${escapeHtml(item.a)}</dd>
                    </div>
                  `
                    )
                    .join('')}
                </dl>
              </section>

              <!-- Section: Related Arcade Games -->
              <section class="guide-section guide-related">
                <div class="section-header">
                  <h2 class="guide-section-title font-heading">Related Free Arcade Games</h2>
                  <p class="section-subtitle">Challenge your reflexes with more original web games on One More Rush.</p>
                </div>
                <div class="related-games-grid">
                  ${gc.relatedGames
                    .map((relId) => {
                      const relGame = getGameContent(relId);
                      if (!relGame) return '';
                      return `
                        <a href="/games/${relGame.id}" class="related-game-card glass-panel" aria-label="Play ${escapeHtml(relGame.name)} — ${escapeHtml(relGame.tagline)}">
                          <span class="related-game-icon" role="img" aria-label="${escapeHtml(relGame.name)}">${relGame.icon}</span>
                          <span class="related-game-name font-heading">${escapeHtml(relGame.name)}</span>
                          <span class="related-game-tagline font-mono">${escapeHtml(relGame.tagline)}</span>
                          <span class="related-game-cta font-mono">PLAY GAME &rarr;</span>
                        </a>
                      `;
                    })
                    .join('')}
                </div>
              </section>
            </article>
          </div>
        </main>

        <footer class="platform-footer" style="padding: 2.5rem 1rem; text-align: center; color: #777; font-size: 0.85rem; border-top: 1px solid rgba(255, 255, 255, 0.08);">
          <div style="max-width: 900px; margin: 0 auto; display: flex; flex-direction: column; gap: 1rem; align-items: center;">
            <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 1.5rem; font-size: 0.85rem;">
              <a href="/" style="color: #aaa; text-decoration: none;">Home</a>
              <a href="/#games-section" style="color: #aaa; text-decoration: none;">All Games</a>
              <a href="/daily" style="color: #aaa; text-decoration: none;">Daily Challenge</a>
              <a href="/leaderboard" style="color: #aaa; text-decoration: none;">Leaderboard</a>
              <a href="/locker" style="color: #aaa; text-decoration: none;">Rush Locker</a>
              <a href="/about" style="color: #aaa; text-decoration: none;">About</a>
              <a href="/privacy" style="color: #aaa; text-decoration: none;">Privacy Policy</a>
              <a href="/terms" style="color: #aaa; text-decoration: none;">Terms of Use</a>
              <a href="/cookies" style="color: #aaa; text-decoration: none;">Cookie Policy</a>
              <a href="/contact" style="color: #aaa; text-decoration: none;">Contact Us</a>
            </div>
            <p>© ${currentYear} ONE MORE RUSH. Free online browser arcade. All rights reserved.</p>
          </div>
        </footer>
      </div>
    `;
  }

  const currentYear = new Date().getFullYear();

  // Platform pages: Home, Daily, Locker, Leaderboard
  let platformKey = null;
  if (meta.path === '/') platformKey = 'home';
  else if (meta.path === '/daily') platformKey = 'daily';
  else if (meta.path === '/locker') platformKey = 'locker';
  else if (meta.path === '/leaderboard') platformKey = 'leaderboard';

  const pc = platformKey ? getPlatformContent(platformKey) : null;

  if (pc) {
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

        <main class="lobby-content">
          <div style="max-width: 1100px; margin: 2rem auto; padding: 1.5rem;">
            <article class="glass-panel" style="background: rgba(14, 14, 22, 0.95); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 20px; padding: 2.5rem; margin-bottom: 2rem;">
              <header style="margin-bottom: 2rem;">
                <h1 class="font-heading" style="font-size: 2.3rem; color: #ffffff; margin-bottom: 0.8rem; letter-spacing: -0.02em;">${escapeHtml(pc.h1 || meta.h1)}</h1>
                <p style="font-size: 1.1rem; line-height: 1.7; color: #cbd5e1;">${escapeHtml(pc.introduction || meta.overview || meta.description)}</p>
              </header>

              ${
                platformKey === 'home'
                  ? `
                <!-- Pillars -->
                <section style="margin-bottom: 2.5rem;">
                  <h2 style="font-size: 1.4rem; color: #00f2fe; margin-bottom: 1.2rem;" class="font-heading">Core Architecture &amp; Platform Principles</h2>
                  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.2rem;">
                    ${pc.pillars
                      .map(
                        (p) => `
                      <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 1.2rem;">
                        <h3 style="color: #fff; font-size: 1.05rem; margin-bottom: 0.5rem;" class="font-heading">${escapeHtml(p.title)}</h3>
                        <p style="color: #94a3b8; font-size: 0.9rem; line-height: 1.6;">${escapeHtml(p.description)}</p>
                      </div>
                    `
                      )
                      .join('')}
                  </div>
                </section>

                <!-- Six Skill Disciplines -->
                <section style="margin-bottom: 2.5rem;">
                  <h2 style="font-size: 1.4rem; color: #00f2fe; margin-bottom: 1.2rem;" class="font-heading">Six Dedicated Arcade Disciplines</h2>
                  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.2rem;">
                    ${pc.disciplines
                      .map(
                        (d) => `
                      <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 1.2rem;">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 0.6rem;">
                          <span style="font-size: 1.5rem;">${d.icon}</span>
                          <div>
                            <h3 style="color: #fff; font-size: 1.05rem; margin: 0;" class="font-heading">${escapeHtml(d.name)}</h3>
                            <span style="font-size: 0.75rem; color: #00f2fe; font-family: monospace;">${escapeHtml(d.category)}</span>
                          </div>
                        </div>
                        <p style="color: #94a3b8; font-size: 0.9rem; line-height: 1.6; margin-bottom: 0.8rem;">${escapeHtml(d.summary)}</p>
                        <a href="/games/${d.id}" style="color: #00f2fe; font-size: 0.82rem; font-weight: 700; text-decoration: none; font-family: monospace;">PLAY ${escapeHtml(d.name)} &rarr;</a>
                      </div>
                    `
                      )
                      .join('')}
                  </div>
                </section>

                <!-- Progression Overview -->
                <section style="margin-bottom: 2.5rem; background: rgba(0, 242, 254, 0.04); border: 1px solid rgba(0, 242, 254, 0.2); border-radius: 14px; padding: 1.5rem;">
                  <h2 style="font-size: 1.25rem; color: #ffd166; margin-bottom: 0.6rem;" class="font-heading">Virtual Rush Points &amp; The Rush Locker</h2>
                  <p style="color: #cbd5e1; font-size: 0.95rem; line-height: 1.6; margin-bottom: 1rem;">${escapeHtml(pc.progressionOverview)}</p>
                  <div style="display: flex; flex-wrap: wrap; gap: 1rem;">
                    <a href="/daily" style="color: #00f2fe; font-weight: 700; text-decoration: none; font-size: 0.85rem;">EXPLORE DAILY CHALLENGES &rarr;</a>
                    <a href="/locker" style="color: #ff3562; font-weight: 700; text-decoration: none; font-size: 0.85rem;">OPEN RUSH LOCKER &rarr;</a>
                    <a href="/leaderboard" style="color: #ffd166; font-weight: 700; text-decoration: none; font-size: 0.85rem;">GLOBAL LEADERBOARDS &rarr;</a>
                  </div>
                </section>
              `
                  : ''
              }

              ${
                platformKey === 'daily'
                  ? `
                <!-- Daily How it works -->
                <section style="margin-bottom: 2.5rem;">
                  <h2 style="font-size: 1.4rem; color: #00f2fe; margin-bottom: 1.2rem;" class="font-heading">Daily Challenge Rules &amp; Streak Multipliers</h2>
                  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.2rem;">
                    ${pc.howItWorks
                      .map(
                        (h, idx) => `
                      <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 1.2rem;">
                        <span style="font-family: monospace; font-size: 0.8rem; color: #00f2fe; font-weight: bold;">0${idx + 1}</span>
                        <h3 style="color: #fff; font-size: 1.05rem; margin: 0.3rem 0 0.5rem;" class="font-heading">${escapeHtml(h.title)}</h3>
                        <p style="color: #94a3b8; font-size: 0.9rem; line-height: 1.6;">${escapeHtml(h.description)}</p>
                      </div>
                    `
                      )
                      .join('')}
                  </div>
                </section>
              `
                  : ''
              }

              ${
                platformKey === 'locker'
                  ? `
                <!-- Locker Economy Disclosure & Categories -->
                <section style="margin-bottom: 2.5rem; background: rgba(255, 209, 102, 0.05); border: 1px solid rgba(255, 209, 102, 0.25); border-radius: 14px; padding: 1.5rem;">
                  <h2 style="font-size: 1.2rem; color: #ffd166; margin-bottom: 0.5rem;" class="font-heading">Virtual Currency Transparency &amp; No Real-Money Policy</h2>
                  <p style="color: #cbd5e1; font-size: 0.95rem; line-height: 1.6;">${escapeHtml(pc.economyDisclosure)}</p>
                </section>

                <section style="margin-bottom: 2.5rem;">
                  <h2 style="font-size: 1.4rem; color: #00f2fe; margin-bottom: 1.2rem;" class="font-heading">Locker Customization Categories</h2>
                  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.2rem;">
                    ${pc.categories
                      .map(
                        (c) => `
                      <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 1.2rem;">
                        <span style="font-size: 1.6rem; margin-bottom: 0.5rem; display: block;">${c.icon}</span>
                        <h3 style="color: #fff; font-size: 1.05rem; margin-bottom: 0.5rem;" class="font-heading">${escapeHtml(c.name)}</h3>
                        <p style="color: #94a3b8; font-size: 0.9rem; line-height: 1.6;">${escapeHtml(c.description)}</p>
                      </div>
                    `
                      )
                      .join('')}
                  </div>
                </section>
              `
                  : ''
              }

              ${
                platformKey === 'leaderboard'
                  ? `
                <!-- Leaderboard Ranking Rules -->
                <section style="margin-bottom: 2.5rem;">
                  <h2 style="font-size: 1.4rem; color: #00f2fe; margin-bottom: 1.2rem;" class="font-heading">Leaderboard Integrity &amp; Ranking Verification</h2>
                  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.2rem;">
                    ${pc.rankingRules
                      .map(
                        (r) => `
                      <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 1.2rem;">
                        <h3 style="color: #fff; font-size: 1.05rem; margin-bottom: 0.5rem;" class="font-heading">${escapeHtml(r.title)}</h3>
                        <p style="color: #94a3b8; font-size: 0.9rem; line-height: 1.6;">${escapeHtml(r.description)}</p>
                      </div>
                    `
                      )
                      .join('')}
                  </div>
                </section>
              `
                  : ''
              }

              <!-- FAQ Definition List -->
              ${
                pc.faq && pc.faq.length > 0
                  ? `
                <section style="margin-bottom: 2.5rem;">
                  <h2 style="font-size: 1.4rem; color: #00f2fe; margin-bottom: 1.2rem;" class="font-heading">Frequently Asked Questions</h2>
                  <dl style="display: flex; flex-direction: column; gap: 1rem;">
                    ${pc.faq
                      .map(
                        (item) => `
                      <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 10px; padding: 1.2rem;">
                        <dt style="font-size: 1rem; color: #fff; font-weight: 700; margin-bottom: 0.5rem;" class="font-heading">Q: ${escapeHtml(item.q)}</dt>
                        <dd style="color: #94a3b8; font-size: 0.92rem; line-height: 1.6; margin-left: 0;">${escapeHtml(item.a)}</dd>
                      </div>
                    `
                      )
                      .join('')}
                  </dl>
                </section>
              `
                  : ''
              }

              <!-- Game Discovery Grid -->
              <section style="border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 2rem;">
                <h2 style="font-size: 1.3rem; color: #fff; margin-bottom: 1.2rem;" class="font-heading">Explore All Six Arcade Games</h2>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem;">
                  ${ALL_GAMES.map(
                    (g) => `
                    <a href="/games/${g.id}" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 1.2rem 1rem; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; text-decoration: none; color: #fff; text-align: center;">
                      <span style="font-size: 2rem; margin-bottom: 8px;">${g.icon}</span>
                      <span style="font-weight: 700; font-size: 1rem; margin-bottom: 4px;" class="font-heading">${escapeHtml(g.name)}</span>
                      <span style="font-size: 0.75rem; color: #94a3b8; font-family: monospace;">${escapeHtml(g.tagline)}</span>
                    </a>
                  `
                  ).join('')}
                </div>
              </section>
            </article>
          </div>
        </main>

        <footer class="platform-footer" style="padding: 2.5rem 1rem; text-align: center; color: #777; font-size: 0.85rem; border-top: 1px solid rgba(255, 255, 255, 0.08);">
          <div style="max-width: 900px; margin: 0 auto; display: flex; flex-direction: column; gap: 1rem; align-items: center;">
            <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 1.5rem; font-size: 0.85rem;">
              <a href="/" style="color: #aaa; text-decoration: none;">Home</a>
              <a href="/#games-section" style="color: #aaa; text-decoration: none;">All Games</a>
              <a href="/daily" style="color: #aaa; text-decoration: none;">Daily Challenge</a>
              <a href="/leaderboard" style="color: #aaa; text-decoration: none;">Leaderboard</a>
              <a href="/locker" style="color: #aaa; text-decoration: none;">Rush Locker</a>
              <a href="/about" style="color: #aaa; text-decoration: none;">About</a>
              <a href="/privacy" style="color: #aaa; text-decoration: none;">Privacy Policy</a>
              <a href="/terms" style="color: #aaa; text-decoration: none;">Terms of Use</a>
              <a href="/cookies" style="color: #aaa; text-decoration: none;">Cookie Policy</a>
              <a href="/contact" style="color: #aaa; text-decoration: none;">Contact Us</a>
            </div>
            <p>© ${currentYear} ONE MORE RUSH. Free online browser arcade. All rights reserved.</p>
          </div>
        </footer>
      </div>
    `;
  }

  // Generic fallback public routes (About, Support, Privacy, Terms, Cookies, Contact)
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
        <p>© ${currentYear} ONE MORE RUSH. Free online browser arcade.</p>
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

  // Step 11: Suppress AdSense loader script on private / utility / error pages (noindex)
  if (meta.noindex) {
    html = html.replace(
      /<script async src="https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js\?client=ca-pub-4117658743162532"[^>]*><\/script>\s*/gi,
      '<!-- AdSense omitted on private/utility/error page -->\n    '
    );
  }


  // Replace Title
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${meta.title}</title>`);

  // Replace Meta Description
  html = html.replace(
    /<meta\s+name="description"\s+content="[\s\S]*?"\s*\/?>/i,
    `<meta name="description" content="${escapeHtml(meta.description)}" />`
  );

  // Replace Robots Directive
  if (meta.noindex) {
    html = html.replace(
      /<meta\s+name="robots"\s+content="[\s\S]*?"\s*\/?>/i,
      '<meta name="robots" content="noindex, nofollow" />'
    );
  } else {
    html = html.replace(
      /<meta\s+name="robots"\s+content="[\s\S]*?"\s*\/?>/i,
      '<meta name="robots" content="index, follow" />'
    );
  }

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

  // For nested routes (e.g. /games/aim), adjust relative asset paths (./assets/ -> ../../assets/)
  const segments = (meta.path || '/').split('/').filter(Boolean);
  const depth = segments.length;
  if (depth > 0) {
    const relativePrefix = '../'.repeat(depth);
    html = html
      .replace(/(src|href)="(\.\/|\/)?assets\//g, `$1="${relativePrefix}assets/`)
      .replace(/(src|href)="(\.\/|\/)?favicon\.svg"/g, `$1="${relativePrefix}favicon.svg"`)
      .replace(/(src|href)="(\.\/|\/)?apple-touch-icon\.png"/g, `$1="${relativePrefix}apple-touch-icon.png"`)
      .replace(/(src|href)="(\.\/|\/)?manifest\.json"/g, `$1="${relativePrefix}manifest.json"`);
  }

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

// Prerender utility / private routes with noindex directives
console.log('\n--- PRERENDERING PRIVATE & UTILITY ROUTE SHELLS (NOINDEX) ---');
const authRoutes = Object.keys(AUTH_ROUTE_SEO);
for (const route of authRoutes) {
  const meta = AUTH_ROUTE_SEO[route];
  const renderedHtml = renderRouteHtml(meta);

  if (route === '/404') {
    // Write both dist/404/index.html and dist/404.html (Cloudflare Pages standard 404 handler)
    const routeDir = path.join(DIST_DIR, '404');
    fs.mkdirSync(routeDir, { recursive: true });
    fs.writeFileSync(path.join(routeDir, 'index.html'), renderedHtml, 'utf8');
    fs.writeFileSync(path.join(DIST_DIR, '404.html'), renderedHtml, 'utf8');
    console.log(`✓ Prerendered [/404] -> 404/index.html & 404.html (noindex, nofollow)`);
  } else {
    const routeDir = path.join(DIST_DIR, route.replace(/^\//, ''));
    fs.mkdirSync(routeDir, { recursive: true });
    const targetFilePath = path.join(routeDir, 'index.html');
    fs.writeFileSync(targetFilePath, renderedHtml, 'utf8');
    console.log(`✓ Prerendered [${route}] -> ${path.relative(DIST_DIR, targetFilePath)} (noindex, nofollow)`);
  }
  generatedCount++;
}

console.log(`\n✅ Successfully generated ${generatedCount} static HTML routes (public + utility).\n`);
