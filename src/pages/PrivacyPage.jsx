import React from 'react';
import { Shield, Lock, HardDrive, UserCheck, Database, Award, Info, RefreshCw, Key } from 'lucide-react';
import { SUPPORT_CONFIG } from '../config/brand.js';
import './InfoPages.css';

export function PrivacyPage() {
  const lastUpdated = 'August 19, 2026';

  return (
    <div className="info-page-container">
      {/* ── Page Hero ─────────────────────────────────────────────────── */}
      <div className="info-page-hero">
        <div className="info-hero-badge font-mono">
          <Shield size={14} className="icon-cyan" />
          <span>TRANSPARENCY & DATA PRIVACY</span>
        </div>
        <h1 className="info-hero-title font-heading">PRIVACY POLICY</h1>
        <p className="info-hero-subtitle">
          Clear, honest, and accurate information on how ONE MORE RUSH stores your game progress, player data, and account security.
        </p>
        <span className="info-last-updated font-mono">LAST UPDATED: {lastUpdated.toUpperCase()}</span>
      </div>

      {/* ── Main Content Card ─────────────────────────────────────────── */}
      <div className="info-content-card glass-panel">
        {/* Section 1: Overview */}
        <section>
          <h2 className="font-heading">
            <Info size={20} className="icon-cyan" /> 1. OVERVIEW & ARCHITECTURE
          </h2>
          <p>
            ONE MORE RUSH operates a dual-tier architecture designed to respect player choice: you can play instantly without registration (Guest Mode), or create a persistent account with email authentication (Registered Mode).
          </p>
          <p>
            This Privacy Policy explains what data is stored on your device, what data is processed on our authentication servers, and how your game progress is managed.
          </p>
        </section>

        {/* Section 2: Browser LocalStorage Usage (Guest & Client State) */}
        <section>
          <h2 className="font-heading">
            <HardDrive size={20} className="icon-cyan" /> 2. BROWSER LOCAL STORAGE (LOCALSTATE)
          </h2>
          <p>
            We use your web browser's standard <strong>LocalStorage</strong> to provide immediate, responsive arcade gameplay without requiring an account. LocalStorage stores:
          </p>
          <ul>
            <li>
              <strong>Personal High Scores:</strong> Best scores, top combo multipliers, and completion stats for all six games (AIM, DODGE, STACK, NUMBER RUSH, MEMORY, COLOR MAZE).
            </li>
            <li>
              <strong>Daily Challenge Progress:</strong> Daily mission completion timestamps, rotation keys, and active streak counters.
            </li>
            <li>
              <strong>Rush Points (RP) & Locker Inventory:</strong> Earned cosmetic currency balance, unlocked avatar frames, titles, victory effects, and achievement badges.
            </li>
            <li>
              <strong>Client Preferences:</strong> Audio settings (sound effects mute toggle) and active UI selections.
            </li>
          </ul>

          <div className="info-callout-box">
            <span className="info-callout-title font-mono">CLEARING BROWSER STORAGE</span>
            <p className="info-callout-desc">
              LocalStorage data resides solely in your browser on your physical device. If you clear your browser cache, delete cookies/site data, or play in Private/Incognito mode, local guest data will be erased unless previously migrated to a permanent account.
            </p>
          </div>
        </section>

        {/* Section 3: Registered Accounts & Supabase Cloud State */}
        <section>
          <h2 className="font-heading">
            <Key size={20} className="icon-cyan" /> 3. AUTHENTICATION & ACCOUNT DATA
          </h2>
          <p>
            When you register an account on ONE MORE RUSH, your authentication and cloud profile services are powered securely by <strong>Supabase</strong>. The data stored for registered users includes:
          </p>
          <ul>
            <li>
              <strong>Account Credentials:</strong> Your email address and securely hashed authentication credentials (managed via Supabase Auth). We never store or have access to plaintext passwords.
            </li>
            <li>
              <strong>Player Identity:</strong> Your unique player username, display handle, and account creation timestamp.
            </li>
            <li>
              <strong>Cloud Profile & Cosmetics:</strong> Your equipped avatar frame, player title, and victory effect synchronized to your public player record.
            </li>
          </ul>
        </section>

        {/* Section 4: Server Authority vs Client LocalStorage */}
        <section>
          <h2 className="font-heading">
            <Database size={20} className="icon-cyan" /> 4. SERVER-AUTHORITATIVE ECONOMY & REWARDS
          </h2>
          <p>
            To maintain fair play and protect the game economy, sensitive systems are <strong>server-authoritative</strong> for authenticated players:
          </p>
          <ul>
            <li>
              <strong>Rush Point Ledger:</strong> Authenticated RP balances, Daily Challenge rewards, and Locker cosmetic purchases are tracked in an append-only server ledger. Modifying client LocalStorage does not grant unauthorized cloud currency.
            </li>
            <li>
              <strong>Daily Challenge Rewards:</strong> Server-issued attempt tokens verify completion criteria before granting daily RP rewards and streak increments.
            </li>
            <li>
              <strong>Guest Progression Migration:</strong> When upgrading from guest to registered player, local guest progress is validated and migrated to the cloud ledger subject to a strict 50,000 RP safety cap.
            </li>
          </ul>
        </section>

        {/* Section 5: Leaderboards & Public Game Scores */}
        <section>
          <h2 className="font-heading">
            <Award size={20} className="icon-cyan" /> 5. LEADERBOARDS & GAME SCORES
          </h2>
          <p>
            When an authenticated player achieves a high score with a verified custom username, the score and associated gameplay metrics (accuracy, combo, level, duration) are submitted to our score service to determine global and personal rankings.
          </p>
          <p>
            Scores submitted to public leaderboards display only your chosen player username, score, equipped cosmetic title, and date achieved. No private personal information or email addresses are ever shown publicly.
          </p>
        </section>

        {/* Section 6: Cookies, Tracking & Third Parties */}
        <section>
          <h2 className="font-heading">
            <Lock size={20} className="icon-cyan" /> 6. COOKIES & TRACKING
          </h2>
          <p>
            ONE MORE RUSH does not utilize third-party tracking pixels, behavioral advertising networks, or commercial analytics beacons. Standard authentication tokens (JWTs) are stored in client session storage to maintain your active login session.
          </p>
          <p>
            Standard technical server logs (such as IP addresses, browser user agent strings, and request timestamps) are generated automatically by web hosting infrastructure for performance monitoring and DDoS mitigation.
          </p>
        </section>

        {/* Section 7: Security Practices */}
        <section>
          <h2 className="font-heading">
            <Shield size={20} className="icon-cyan" /> 7. SECURITY PRACTICES
          </h2>
          <p>
            We enforce industry-standard security safeguards:
          </p>
          <ul>
            <li>All web communications use encrypted HTTPS (TLS) connections.</li>
            <li>Row-Level Security (RLS) policies restrict database access so players can only modify their own profile data.</li>
            <li>Stored procedures and server ledger constraints ensure cryptographic integrity of virtual Rush Point transactions.</li>
          </ul>
        </section>

        {/* Section 8: Contact */}
        <section>
          <h2 className="font-heading">
            <UserCheck size={20} className="icon-cyan" /> 8. CONTACT & DATA INQUIRIES
          </h2>
          <p>
            If you have questions regarding this Privacy Policy or wish to request deletion of your authenticated player account, please contact support:
          </p>
          <div className="info-callout-box">
            <span className="info-callout-title font-mono">SUPPORT EMAIL</span>
            <p className="info-callout-desc font-mono">
              <a href={`mailto:${SUPPORT_CONFIG.supportEmail}`} style={{ color: '#00f2fe', textDecoration: 'underline' }}>
                {SUPPORT_CONFIG.supportEmail}
              </a>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
