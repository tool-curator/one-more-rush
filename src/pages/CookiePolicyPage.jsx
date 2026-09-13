import React from 'react';
import { Cookie, HardDrive, Shield, Lock, Info, ExternalLink, Sliders, CheckCircle2, UserCheck } from 'lucide-react';
import { SUPPORT_CONFIG } from '../config/brand.js';
import './InfoPages.css';

export function CookiePolicyPage() {
  const lastUpdated = 'September 2026';

  return (
    <div className="info-page-container">
      {/* ── Page Hero ─────────────────────────────────────────────────── */}
      <div className="info-page-hero">
        <div className="info-hero-badge font-mono">
          <Cookie size={14} className="icon-cyan" />
          <span>COOKIE &amp; STORAGE TRANSPARENCY</span>
        </div>
        <h1 className="info-hero-title font-heading">COOKIE POLICY</h1>
        <p className="info-hero-subtitle">
          Detailed, transparent information about the cookies, browser local storage, and third-party technologies used on ONE MORE RUSH.
        </p>
        <span className="info-last-updated font-mono">LAST UPDATED: {lastUpdated.toUpperCase()}</span>
      </div>

      {/* ── Main Content Card ─────────────────────────────────────────── */}
      <div className="info-content-card glass-panel">
        {/* Section 1: Overview */}
        <section>
          <h2 className="font-heading">
            <Info size={20} className="icon-cyan" /> 1. WHAT ARE COOKIES AND LOCAL STORAGE?
          </h2>
          <p>
            When you visit ONE MORE RUSH, standard web technologies are utilized to store small pieces of information on your device. These technologies help deliver fast, responsive arcade gameplay, remember your preferences, and maintain website stability:
          </p>
          <ul>
            <li>
              <strong>Browser Local Storage (LocalStorage):</strong> A standard client-side storage mechanism built into modern web browsers. It allows web applications to store data locally on your device with no expiration date until manually cleared. LocalStorage does not send data to web servers with every HTTP request.
            </li>
            <li>
              <strong>HTTP Cookies:</strong> Small text files placed on your browser or device by web servers. Cookies can be &quot;session cookies&quot; (which expire when you close your browser) or &quot;persistent cookies&quot; (which remain stored until their set expiration date or until you delete them).
            </li>
            <li>
              <strong>Third-Party Technologies:</strong> Scripts and tags provided by third-party services (such as Google) that may set cookies or read browser identifiers to measure performance or deliver advertising.
            </li>
          </ul>
        </section>

        {/* Section 2: How We Use Browser Local Storage */}
        <section>
          <h2 className="font-heading">
            <HardDrive size={20} className="icon-cyan" /> 2. BROWSER LOCAL STORAGE (CORE GAMEPLAY)
          </h2>
          <p>
            ONE MORE RUSH is engineered with an instant-play philosophy. To allow you to play immediately without forced account creation, we rely extensively on your browser&apos;s <strong>LocalStorage</strong> to save your game state directly on your device.
          </p>
          <p>The following data is saved strictly on your local device via LocalStorage:</p>
          <ul>
            <li>
              <strong>High Scores &amp; Personal Bests:</strong> Your record scores, maximum combo multipliers, and completion stats across AIM, DODGE, STACK, NUMBER RUSH, MEMORY, and COLOR MAZE.
            </li>
            <li>
              <strong>Daily Challenge Progress:</strong> Daily challenge completion statuses, rotation dates, and active streak counters.
            </li>
            <li>
              <strong>Rush Locker Cosmetics:</strong> Your virtual Rush Points (RP) balance, unlocked avatar frames, titles, victory effects, and achievement badges.
            </li>
            <li>
              <strong>Player Preferences:</strong> Audio settings (sound effects mute/unmute toggle) and user interface states.
            </li>
          </ul>
          <div className="info-callout-box">
            <span className="info-callout-title font-mono">LOCALSTORAGE PRIVACY NOTICE</span>
            <p className="info-callout-desc">
              LocalStorage data remains strictly on your device and is not transmitted to our servers during guest play. If you clear your browser cache or site data, guest progress will be reset unless previously migrated to a registered cloud account.
            </p>
          </div>
        </section>

        {/* Section 3: Essential & Authentication Technologies */}
        <section>
          <h2 className="font-heading">
            <Lock size={20} className="icon-cyan" /> 3. ESSENTIAL &amp; AUTHENTICATION TECHNOLOGIES
          </h2>
          <p>
            When you register an account or sign in to ONE MORE RUSH, our authentication provider, <strong>Supabase</strong>, utilizes client-side storage to manage your authenticated session securely:
          </p>
          <ul>
            <li>
              <strong>Session Tokens (JWTs):</strong> Cryptographically signed authentication tokens stored securely in client storage to maintain your active login state as you navigate between games and pages.
            </li>
            <li>
              <strong>Security Tokens:</strong> Verification tokens used to authenticate server requests when submitting scores or claiming server-verified Daily Challenge rewards.
            </li>
          </ul>
        </section>

        {/* Section 4: Google AdSense & Advertising Cookies */}
        <section>
          <h2 className="font-heading">
            <Shield size={20} className="icon-cyan" /> 4. GOOGLE ADSENSE &amp; ADVERTISING COOKIES
          </h2>
          <p>
            ONE MORE RUSH uses <strong>Google AdSense</strong> to display advertisements. Google, as a third-party vendor, uses cookies and related technologies to serve advertisements on our website:
          </p>
          <ul>
            <li>
              Google&apos;s use of advertising cookies enables it and its advertising partners to serve ads to our users based on their visits to ONE MORE RUSH and other websites across the Internet.
            </li>
            <li>
              Cookies help measure the effectiveness of advertisements, prevent the same advertisement from continuously reappearing, and detect and prevent fraudulent ad clicks.
            </li>
            <li>
              Depending on your location and consent choices, ads served by Google may be personalized (based on your prior browsing history) or non-personalized (contextual to the current page).
            </li>
          </ul>
          <div className="info-callout-box gold">
            <span className="info-callout-title font-mono">OPTING OUT OF PERSONALIZED ADVERTISING</span>
            <p className="info-callout-desc">
              You can opt out of personalized advertising from Google by visiting{' '}
              <a
                href="https://adssettings.google.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#ffb703', textDecoration: 'underline' }}
              >
                Google Ads Settings <ExternalLink size={12} style={{ display: 'inline', verticalAlign: 'middle' }} />
              </a>
              . Alternatively, you can opt out of third-party vendor cookies for personalized advertising by visiting{' '}
              <a
                href="https://www.aboutads.info"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#ffb703', textDecoration: 'underline' }}
              >
                aboutads.info <ExternalLink size={12} style={{ display: 'inline', verticalAlign: 'middle' }} />
              </a>
              .
            </p>
          </div>
        </section>

        {/* Section 5: Analytics Technologies */}
        <section>
          <h2 className="font-heading">
            <Sliders size={20} className="icon-cyan" /> 5. ANALYTICS &amp; PERFORMANCE MEASUREMENT
          </h2>
          <p>
            We utilize <strong>Google Analytics (GA4)</strong> to understand how players interact with ONE MORE RUSH, identify technical performance bottlenecks, and monitor platform stability:
          </p>
          <ul>
            <li>
              <strong>Google Analytics Cookies:</strong> Google Analytics sets first-party cookies (such as <code>_ga</code> and <code>_ga_*</code>) to distinguish unique sessions and measure aggregated metrics like page views, game starts, and navigation patterns.
            </li>
            <li>
              <strong>Aggregated &amp; Anonymous:</strong> Analytics data is processed in aggregate without identifying individual players. We do not transmit personally identifiable information (such as passwords or payment data) to analytics services.
            </li>
            <li>
              <strong>Opt-Out:</strong> You can prevent Google Analytics from collecting data by installing the official{' '}
              <a
                href="https://tools.google.com/dlpage/gaoptout"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#00f2fe', textDecoration: 'underline' }}
              >
                Google Analytics Opt-out Browser Add-on <ExternalLink size={12} style={{ display: 'inline', verticalAlign: 'middle' }} />
              </a>
              .
            </li>
          </ul>
        </section>

        {/* Section 6: Summary Table */}
        <section>
          <h2 className="font-heading">
            <CheckCircle2 size={20} className="icon-cyan" /> 6. SUMMARY OF TECHNOLOGIES USED
          </h2>
          <div style={{ overflowX: 'auto', marginTop: '0.5rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.15)', color: '#00f2fe' }}>
                  <th style={{ padding: '8px 12px' }}>Technology</th>
                  <th style={{ padding: '8px 12px' }}>Provider</th>
                  <th style={{ padding: '8px 12px' }}>Category</th>
                  <th style={{ padding: '8px 12px' }}>Primary Purpose</th>
                </tr>
              </thead>
              <tbody style={{ color: '#cbd5e1' }}>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '8px 12px', fontWeight: 'bold' }}>LocalStorage</td>
                  <td style={{ padding: '8px 12px' }}>One More Rush (First-Party)</td>
                  <td style={{ padding: '8px 12px' }}>Essential / Functionality</td>
                  <td style={{ padding: '8px 12px' }}>Stores offline guest scores, streaks, audio toggle, and locker items.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '8px 12px', fontWeight: 'bold' }}>Session Storage / JWT</td>
                  <td style={{ padding: '8px 12px' }}>Supabase (First-Party Auth)</td>
                  <td style={{ padding: '8px 12px' }}>Essential / Security</td>
                  <td style={{ padding: '8px 12px' }}>Maintains authenticated user session and account verification.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '8px 12px', fontWeight: 'bold' }}>AdSense Cookies</td>
                  <td style={{ padding: '8px 12px' }}>Google (Third-Party)</td>
                  <td style={{ padding: '8px 12px' }}>Advertising / Marketing</td>
                  <td style={{ padding: '8px 12px' }}>Serves relevant advertisements, limits ad repetition, and detects fraud.</td>
                </tr>
                <tr>
                  <td style={{ padding: '8px 12px', fontWeight: 'bold' }}>_ga, _ga_*</td>
                  <td style={{ padding: '8px 12px' }}>Google Analytics (Third-Party)</td>
                  <td style={{ padding: '8px 12px' }}>Performance / Analytics</td>
                  <td style={{ padding: '8px 12px' }}>Aggregated visitor metrics, error monitoring, and page view counts.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 7: Managing & Disabling Cookies */}
        <section>
          <h2 className="font-heading">
            <Sliders size={20} className="icon-cyan" /> 7. HOW TO MANAGE COOKIES IN YOUR BROWSER
          </h2>
          <p>
            You have the right to accept or decline cookies. Most web browsers automatically accept cookies, but you can usually modify your browser settings to decline cookies or alert you when a cookie is being sent:
          </p>
          <ul>
            <li>
              <strong>Browser Settings:</strong> You can manage cookie preferences directly through your browser settings (Chrome, Firefox, Safari, Edge, Opera). Please note that blocking all cookies may impact certain platform features (such as staying signed in to your player profile).
            </li>
            <li>
              <strong>Private / Incognito Browsing:</strong> Using Private or Incognito mode allows you to play games without retaining cookies or LocalStorage data across browser sessions.
            </li>
            <li>
              <strong>Clearing Cache:</strong> You can delete stored cookies and clear browser LocalStorage at any time via your browser&apos;s history and privacy settings.
            </li>
          </ul>
        </section>

        {/* Section 8: Contact */}
        <section>
          <h2 className="font-heading">
            <UserCheck size={20} className="icon-cyan" /> 8. QUESTIONS &amp; CONTACT
          </h2>
          <p>
            If you have questions regarding this Cookie Policy or the storage technologies used on ONE MORE RUSH, please reach out to our team:
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
