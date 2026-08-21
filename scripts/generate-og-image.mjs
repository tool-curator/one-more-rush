import fs from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>ONE MORE RUSH Social Preview</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@700;800;900&family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Space+Grotesk:wght@600;700&display=swap" rel="stylesheet">
<style>
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    -webkit-font-smoothing: antialiased;
  }

  body {
    width: 1200px;
    height: 630px;
    background-color: #06070a;
    color: #ffffff;
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
    overflow: hidden;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* Deep Cyber Ambient Glows */
  .bg-ambient {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
  }

  .glow-pink {
    position: absolute;
    top: -120px;
    left: 15%;
    width: 550px;
    height: 550px;
    background: radial-gradient(circle, rgba(255, 53, 98, 0.28) 0%, rgba(255, 53, 98, 0.05) 55%, transparent 70%);
    filter: blur(50px);
  }

  .glow-cyan {
    position: absolute;
    top: -100px;
    right: 15%;
    width: 550px;
    height: 550px;
    background: radial-gradient(circle, rgba(0, 242, 254, 0.25) 0%, rgba(0, 242, 254, 0.05) 55%, transparent 70%);
    filter: blur(50px);
  }

  .glow-violet {
    position: absolute;
    bottom: -150px;
    left: 50%;
    transform: translateX(-50%);
    width: 750px;
    height: 450px;
    background: radial-gradient(circle, rgba(138, 43, 226, 0.22) 0%, transparent 70%);
    filter: blur(60px);
  }

  /* Geometric Cyber Grid Overlay */
  .grid-pattern {
    position: absolute;
    inset: 0;
    background-image: 
      linear-gradient(to right, rgba(255, 255, 255, 0.035) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(255, 255, 255, 0.035) 1px, transparent 1px);
    background-size: 50px 50px;
    mask-image: radial-gradient(ellipse 80% 70% at 50% 45%, black 40%, transparent 85%);
    -webkit-mask-image: radial-gradient(ellipse 80% 70% at 50% 45%, black 40%, transparent 85%);
  }

  /* Main Glass Frame Container */
  .card-container {
    width: 1140px;
    height: 574px;
    background: radial-gradient(120% 100% at 50% 10%, rgba(18, 20, 32, 0.82) 0%, rgba(8, 9, 15, 0.94) 100%);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 28px;
    position: relative;
    z-index: 10;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    padding: 40px 48px 36px;
    box-shadow: 
      0 30px 80px rgba(0, 0, 0, 0.7),
      inset 0 1px 1px rgba(255, 255, 255, 0.2),
      inset 0 0 40px rgba(0, 242, 254, 0.04);
  }

  /* Top Pill Badge */
  .top-badge {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    background: rgba(0, 242, 254, 0.08);
    border: 1px solid rgba(0, 242, 254, 0.35);
    padding: 8px 24px;
    border-radius: 100px;
    box-shadow: 0 0 25px rgba(0, 242, 254, 0.2);
  }

  .top-badge-icon {
    font-size: 16px;
    color: #ffb703;
    filter: drop-shadow(0 0 6px rgba(255, 183, 3, 0.8));
  }

  .top-badge-text {
    font-family: 'Space Grotesk', monospace;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.22em;
    color: #00f2fe;
    text-transform: uppercase;
  }

  .badge-divider {
    color: rgba(255, 255, 255, 0.3);
    font-size: 12px;
  }

  .top-badge-extra {
    font-family: 'Space Grotesk', monospace;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.15em;
    color: #cbd5e1;
    text-transform: uppercase;
  }

  /* Main Hero Header Section */
  .hero-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    margin-top: 4px;
  }

  .brand-logo-title {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    margin-bottom: 8px;
  }

  .bolt-svg {
    width: 48px;
    height: 58px;
    filter: drop-shadow(0 0 16px rgba(255, 53, 98, 0.75)) drop-shadow(0 0 30px rgba(0, 242, 254, 0.5));
  }

  .main-title {
    font-family: 'Outfit', sans-serif;
    font-size: 78px;
    font-weight: 900;
    letter-spacing: -0.025em;
    text-transform: uppercase;
    line-height: 1;
    background: linear-gradient(180deg, #ffffff 0%, #f1f5f9 65%, #cbd5e1 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    filter: drop-shadow(0 0 30px rgba(255, 255, 255, 0.35)) drop-shadow(0 0 60px rgba(0, 242, 254, 0.25));
  }

  .subtitle-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    margin-top: 4px;
  }

  .subtitle {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 26px;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    background: linear-gradient(90deg, #00f2fe 0%, #38bdf8 50%, #ff3562 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    filter: drop-shadow(0 0 12px rgba(0, 242, 254, 0.4));
  }

  .tagline-bar {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 16px;
    font-weight: 600;
    color: #94a3b8;
    margin-top: 10px;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .tagline-dot {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: #ff3562;
    box-shadow: 0 0 6px #ff3562;
  }

  /* Six Game Cards Grid */
  .games-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 14px;
    width: 100%;
    margin-top: 12px;
  }

  .game-card {
    background: rgba(255, 255, 255, 0.035);
    border-radius: 16px;
    padding: 14px 10px 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    position: relative;
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.3);
  }

  /* Game Card Specific Glow Accents */
  .card-aim {
    border-top: 2px solid #00f2fe;
    box-shadow: 0 8px 25px rgba(0, 242, 254, 0.12), inset 0 0 15px rgba(0, 242, 254, 0.03);
  }
  .card-dodge {
    border-top: 2px solid #ff3562;
    box-shadow: 0 8px 25px rgba(255, 53, 98, 0.12), inset 0 0 15px rgba(255, 53, 98, 0.03);
  }
  .card-stack {
    border-top: 2px solid #ffb703;
    box-shadow: 0 8px 25px rgba(255, 183, 3, 0.12), inset 0 0 15px rgba(255, 183, 3, 0.03);
  }
  .card-math {
    border-top: 2px solid #38bdf8;
    box-shadow: 0 8px 25px rgba(56, 189, 248, 0.12), inset 0 0 15px rgba(56, 189, 248, 0.03);
  }
  .card-memory {
    border-top: 2px solid #c084fc;
    box-shadow: 0 8px 25px rgba(192, 132, 252, 0.12), inset 0 0 15px rgba(192, 132, 252, 0.03);
  }
  .card-maze {
    border-top: 2px solid #00e676;
    box-shadow: 0 8px 25px rgba(0, 230, 118, 0.12), inset 0 0 15px rgba(0, 230, 118, 0.03);
  }

  .game-icon-wrap {
    font-size: 28px;
    margin-bottom: 6px;
    line-height: 1;
    filter: drop-shadow(0 2px 8px rgba(0,0,0,0.5));
  }

  .game-name {
    font-family: 'Outfit', sans-serif;
    font-size: 15px;
    font-weight: 800;
    letter-spacing: 0.02em;
    color: #ffffff;
    white-space: nowrap;
    margin-bottom: 2px;
  }

  .game-genre {
    font-family: 'Space Grotesk', monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .genre-aim { color: #00f2fe; }
  .genre-dodge { color: #ff3562; }
  .genre-stack { color: #ffb703; }
  .genre-math { color: #38bdf8; }
  .genre-memory { color: #c084fc; }
  .genre-maze { color: #00e676; }

  /* Bottom Micro Features Bar */
  .footer-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 0 6px;
    margin-top: 4px;
  }

  .domain-brand {
    font-family: 'Space Grotesk', monospace;
    font-size: 14px;
    font-weight: 700;
    color: #ffffff;
    letter-spacing: 0.08em;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .domain-dot {
    width: 8px;
    height: 8px;
    background: #00e676;
    border-radius: 50%;
    box-shadow: 0 0 8px #00e676;
  }

  .features-pills {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .feature-item {
    font-size: 13px;
    font-weight: 600;
    color: #94a3b8;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .feature-item span {
    color: #ffb703;
  }
</style>
</head>
<body>

  <!-- Ambient Glow Backgrounds -->
  <div class="bg-ambient">
    <div class="glow-pink"></div>
    <div class="glow-cyan"></div>
    <div class="glow-violet"></div>
    <div class="grid-pattern"></div>
  </div>

  <!-- Main Card Container -->
  <div class="card-container">

    <!-- Top Badge -->
    <div class="top-badge">
      <span class="top-badge-icon">⚡</span>
      <span class="top-badge-text">Instant Browser Arcade</span>
      <span class="badge-divider">•</span>
      <span class="top-badge-extra">No Download Required</span>
    </div>

    <!-- Center Hero / Branding -->
    <div class="hero-section">
      <div class="brand-logo-title">
        <!-- Stylized Electric Bolt SVG -->
        <svg class="bolt-svg" viewBox="0 0 32 38" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="ogBoltGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#00f2fe" />
              <stop offset="45%" stop-color="#a06cd5" />
              <stop offset="100%" stop-color="#ff3562" />
            </linearGradient>
          </defs>
          <path d="M19 2L3 22H16L13 36L29 16H16L19 2Z" fill="url(#ogBoltGrad)" stroke="#ffffff" stroke-width="1.2" stroke-linejoin="round" />
        </svg>
        <h1 class="main-title">ONE MORE RUSH</h1>
      </div>

      <div class="subtitle-row">
        <h2 class="subtitle">Free Online Arcade Games</h2>
      </div>

      <div class="tagline-bar">
        <span>Test Reaction Speed</span>
        <div class="tagline-dot"></div>
        <span>Daily Challenges</span>
        <div class="tagline-dot"></div>
        <span>Global Leaderboards</span>
        <div class="tagline-dot"></div>
        <span>Pure Skill</span>
      </div>
    </div>

    <!-- The Six Arcade Games Showcase -->
    <div class="games-grid">
      <!-- 1. AIM -->
      <div class="game-card card-aim">
        <div class="game-icon-wrap">🎯</div>
        <div class="game-name">AIM</div>
        <div class="game-genre genre-aim">Precision</div>
      </div>

      <!-- 2. DODGE -->
      <div class="game-card card-dodge">
        <div class="game-icon-wrap">🛡️</div>
        <div class="game-name">DODGE</div>
        <div class="game-genre genre-dodge">Survival</div>
      </div>

      <!-- 3. STACK -->
      <div class="game-card card-stack">
        <div class="game-icon-wrap">🧱</div>
        <div class="game-name">STACK</div>
        <div class="game-genre genre-stack">Timing</div>
      </div>

      <!-- 4. NUMBER RUSH -->
      <div class="game-card card-math">
        <div class="game-icon-wrap">🔢</div>
        <div class="game-name">NUMBER RUSH</div>
        <div class="game-genre genre-math">Speed Math</div>
      </div>

      <!-- 5. MEMORY -->
      <div class="game-card card-memory">
        <div class="game-icon-wrap">🧠</div>
        <div class="game-name">MEMORY</div>
        <div class="game-genre genre-memory">Pattern</div>
      </div>

      <!-- 6. COLOR MAZE -->
      <div class="game-card card-maze">
        <div class="game-icon-wrap">🎨</div>
        <div class="game-name">COLOR MAZE</div>
        <div class="game-genre genre-maze">Pathfinding</div>
      </div>
    </div>

    <!-- Bottom Features & Domain Row -->
    <div class="footer-row">
      <div class="domain-brand">
        <div class="domain-dot"></div>
        <span>onemorerush.com</span>
      </div>
      <div class="features-pills">
        <div class="feature-item">
          <span>🏆</span> 6 Skill Games
        </div>
        <div class="feature-item">
          <span>🔥</span> Daily Streaks
        </div>
        <div class="feature-item">
          <span>⚡</span> 60 FPS Instant Play
        </div>
      </div>
    </div>

  </div>

</body>
</html>`;

const tempHtmlPath = path.join(PROJECT_ROOT, 'og-template.html');
const outputPngPath = path.join(PROJECT_ROOT, 'public', 'og-image.png');

fs.writeFileSync(tempHtmlPath, htmlContent, 'utf8');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const formattedHtmlPath = tempHtmlPath.replace(/\\/g, '/');
const formattedOutPath = outputPngPath.replace(/\\/g, '/');

console.log('Generating 1200x630 Open Graph preview image...');

execSync(
  `"${chromePath}" --headless=new --disable-gpu --window-size=1200,630 --hide-scrollbars --force-device-scale-factor=1 --virtual-time-budget=3000 --screenshot="${formattedOutPath}" "file:///${formattedHtmlPath}"`
);

// Verify generated PNG
const buf = fs.readFileSync(outputPngPath);
const width = buf.readUInt32BE(16);
const height = buf.readUInt32BE(20);
const sizeKb = (buf.length / 1024).toFixed(1);

console.log(`✅ og-image.png successfully generated: ${width}x${height}px (${sizeKb} KB) at ${outputPngPath}`);

// Cleanup temporary template file
fs.unlinkSync(tempHtmlPath);

// Also remove test-render.mjs if present
const testRenderPath = path.join(PROJECT_ROOT, 'scripts', 'test-render.mjs');
if (fs.existsSync(testRenderPath)) {
  fs.unlinkSync(testRenderPath);
}
