import React from 'react';
import { FileText, ShieldAlert, Award, Scale, HelpCircle, Mail } from 'lucide-react';
import { SUPPORT_CONFIG } from '../config/brand.js';
import './InfoPages.css';

export function TermsPage() {
  const lastUpdated = 'September 2026';

  return (
    <div className="info-page-container">
      {/* ── Page Hero ─────────────────────────────────────────────────── */}
      <div className="info-page-hero">
        <div className="info-hero-badge font-mono">
          <FileText size={14} className="icon-cyan" />
          <span>LEGAL & RULES</span>
        </div>
        <h1 className="info-hero-title font-heading">TERMS OF USE</h1>
        <p className="info-hero-subtitle">
          Rules and terms governing the use of the ONE MORE RUSH browser arcade.
        </p>
        <span className="info-last-updated font-mono">LAST UPDATED: {lastUpdated.toUpperCase()}</span>
      </div>

      {/* ── Main Content Card ─────────────────────────────────────────── */}
      <div className="info-content-card glass-panel">
        {/* Section 1: Acceptance */}
        <section>
          <h2 className="font-heading">1. ACCEPTANCE OF TERMS</h2>
          <p>
            By accessing or playing games on ONE MORE RUSH, you agree to comply with and be bound by these Terms of Use. If you do not agree to these terms, please do not use the website.
          </p>
        </section>

        {/* Section 2: Using One More Rush */}
        <section>
          <h2 className="font-heading">2. USING ONE MORE RUSH</h2>
          <p>
            ONE MORE RUSH provides skill-based browser arcade games for personal, non-commercial entertainment. You may access and play the available games subject to fair play rules and general website availability.
          </p>
        </section>

        {/* Section 3: Game Scores & Records */}
        <section>
          <h2 className="font-heading">3. GAME SCORES</h2>
          <p>
            Scores, multipliers, and achievements are gameplay records generated during play. Score logging does not guarantee perpetual leaderboard placement, prizes, or external entitlements.
          </p>
        </section>

        {/* Section 4: Rush Points & Virtual Progression */}
        <section>
          <h2 className="font-heading">4. RUSH POINTS & VIRTUAL ITEMS</h2>
          <p>
            <strong>Rush Points (RP)</strong> are virtual, in-site progression tokens earned through arcade gameplay and Daily Challenges:
          </p>
          <ul>
            <li>Rush Points have <strong>no real-world monetary value</strong> and cannot be redeemed, refunded, or converted into cash or legal tender.</li>
            <li>Rush Points and unlocked cosmetic items (frames, titles, victory effects) are non-transferable between users or external platforms.</li>
            <li>Rush Points exist solely for cosmetic progression within the ONE MORE RUSH website and do not provide competitive gameplay advantages.</li>
            <li>ONE MORE RUSH does not currently support or feature real-money purchases or microtransactions.</li>
          </ul>
        </section>

        {/* Section 5: Fair Play & Integrity */}
        <section>
          <h2 className="font-heading">5. FAIR PLAY</h2>
          <p>
            To preserve the integrity and enjoyment of the arcade for all players, you agree not to:
          </p>
          <ul>
            <li>Use automated software, bots, scripts, or macros to simulate or falsify gameplay.</li>
            <li>Intentionally exploit unintended technical glitches or memory manipulation to fabricate high scores.</li>
            <li>Interfere with, overload, or disrupt the operation of the website.</li>
          </ul>
        </section>

        {/* Section 6: Intellectual Property */}
        <section>
          <h2 className="font-heading">6. INTELLECTUAL PROPERTY</h2>
          <p>
            All original website design, game interface layouts, original visual assets, sound synthesis routines, and codebase of ONE MORE RUSH are the intellectual property of their respective creators and protected by copyright and intellectual property laws. Third-party open-source libraries remain the property of their respective holders under their applicable licenses.
          </p>
        </section>

        {/* Section 7: Service Availability */}
        <section>
          <h2 className="font-heading">7. SERVICE AVAILABILITY</h2>
          <p>
            ONE MORE RUSH is provided on an "as-is" and "as-available" basis. We do not warrant that gameplay will be uninterrupted, error-free, or compatible with every browser configuration or legacy device.
          </p>
        </section>

        {/* Section 8: Changes to Terms */}
        <section>
          <h2 className="font-heading">8. CHANGES TO TERMS</h2>
          <p>
            We reserve the right to revise or update these Terms of Use at any time. Continued use of the website following any posted modifications constitutes acceptance of the updated terms.
          </p>
        </section>

        {/* Section 9: Termination */}
        <section>
          <h2 className="font-heading">9. RESTRICTION OF ACCESS</h2>
          <p>
            We reserve the right to restrict or suspend access to the platform for any user found in violation of these terms or engaging in unauthorized automated interference.
          </p>
        </section>

        {/* Section 10: Contact */}
        <section>
          <h2 className="font-heading">10. CONTACT &amp; INQUIRIES</h2>
          <p>
            For questions or legal inquiries regarding these Terms of Use, platform rules, or fair play policies, please contact us:
          </p>
          <div className="info-callout-box">
            <span className="info-callout-title font-mono">SUPPORT CONTACT</span>
            <p className="info-callout-desc font-mono">
              Email:{' '}
              <a href={`mailto:${SUPPORT_CONFIG.supportEmail}`} style={{ color: '#00f2fe', textDecoration: 'underline' }}>
                {SUPPORT_CONFIG.supportEmail}
              </a>
              {' '}• Visit our dedicated <a href="/contact" style={{ color: '#00f2fe', textDecoration: 'underline' }}>Contact Page</a>.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
