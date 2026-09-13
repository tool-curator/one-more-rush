import React, { useState } from 'react';
import { Mail, Copy, CheckCircle2, Send, MessageSquare, Bug, Shield, HelpCircle, Sparkles, Clock, AlertTriangle } from 'lucide-react';
import { SUPPORT_CONFIG } from '../config/brand.js';
import './InfoPages.css';

export function ContactPage() {
  const [copiedToast, setCopiedToast] = useState(false);

  const handleCopyToClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(SUPPORT_CONFIG.supportEmail);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = SUPPORT_CONFIG.supportEmail;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 3000);
    } catch (err) {
      console.warn('Failed to copy to clipboard:', err);
    }
  };

  return (
    <div className="info-page-container">
      {/* ── Page Hero ─────────────────────────────────────────────────── */}
      <div className="info-page-hero">
        <div className="info-hero-badge font-mono">
          <Mail size={14} className="icon-cyan" />
          <span>DIRECT SUPPORT &amp; INQUIRIES</span>
        </div>
        <h1 className="info-hero-title font-heading">CONTACT ONE MORE RUSH</h1>
        <p className="info-hero-subtitle">
          Have feedback, spotted a gameplay bug, need help with your player account, or have privacy inquiries? Get in touch with our team.
        </p>
      </div>

      {/* ── Main Content Card ─────────────────────────────────────────── */}
      <div className="info-content-card glass-panel">
        {/* Section 1: Primary Contact Method */}
        <section>
          <h2 className="font-heading">
            <Mail size={20} className="icon-cyan" /> OFFICIAL CONTACT METHOD
          </h2>
          <p>
            The official contact channel for ONE MORE RUSH is via email. All inquiries, player reports, and support requests are delivered directly to the platform maintainers:
          </p>

          <div className="support-feedback-card" style={{ marginTop: '1rem', padding: '1.5rem', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
              <div style={{ background: 'rgba(0, 242, 254, 0.1)', border: '1px solid rgba(0, 242, 254, 0.3)', borderRadius: '12px', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Mail size={24} className="icon-cyan" />
              </div>
              <div>
                <span className="font-mono" style={{ fontSize: '0.78rem', color: '#94a3b8', letterSpacing: '0.08em' }}>PRIMARY SUPPORT EMAIL</span>
                <div className="font-mono" style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#ffffff' }}>
                  {SUPPORT_CONFIG.supportEmail}
                </div>
              </div>
            </div>

            <div className="support-actions-row font-mono" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              <a
                href={`mailto:${SUPPORT_CONFIG.supportEmail}`}
                className="btn-primary btn-support-send"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '8px', textDecoration: 'none', color: '#fff' }}
              >
                <Send size={16} />
                <span>SEND EMAIL NOW</span>
              </a>

              <button
                type="button"
                className="btn-secondary btn-support-copy"
                onClick={handleCopyToClipboard}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '8px' }}
              >
                {copiedToast ? (
                  <>
                    <CheckCircle2 size={16} className="icon-cyan" />
                    <span>COPIED TO CLIPBOARD!</span>
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    <span>COPY EMAIL ADDRESS</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* Section 2: What We Can Help With */}
        <section>
          <h2 className="font-heading">
            <HelpCircle size={20} className="icon-cyan" /> WHAT YOU CAN CONTACT US FOR
          </h2>
          <p>
            Please feel free to reach out regarding any of the following topics:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ff3562', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                <Bug size={18} />
                <span>Technical Bugs &amp; Glitches</span>
              </div>
              <p style={{ fontSize: '0.88rem', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
                Report unexpected canvas behavior, sound glitches, control unresponsiveness, or display errors on your device.
              </p>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ffb703', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                <Shield size={18} />
                <span>Account &amp; Auth Support</span>
              </div>
              <p style={{ fontSize: '0.88rem', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
                Assistance with username setup, password resets, cloud score synchronization, or guest-to-account progression migration.
              </p>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#00f2fe', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                <Sparkles size={18} />
                <span>Gameplay Feedback &amp; Ideas</span>
              </div>
              <p style={{ fontSize: '0.88rem', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
                Share your balance feedback, difficulty suggestions, or game design ideas directly with the creators.
              </p>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#a855f7', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                <MessageSquare size={18} />
                <span>Privacy &amp; Data Inquiries</span>
              </div>
              <p style={{ fontSize: '0.88rem', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
                Inquire about our data practices, request deletion of an authenticated player account, or ask compliance questions.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: Response Guidance */}
        <section>
          <h2 className="font-heading">
            <Clock size={20} className="icon-cyan" /> RESPONSE EXPECTATIONS
          </h2>
          <p>
            ONE MORE RUSH is maintained by an independent development team. We review all incoming messages and aim to respond to legitimate inquiries within <strong>24 to 48 business hours</strong>.
          </p>
          <div className="info-callout-box">
            <span className="info-callout-title font-mono">TIPS FOR FASTER ASSISTANCE</span>
            <p className="info-callout-desc">
              When reporting a bug or account issue, please include:
            </p>
            <ul style={{ margin: '0.5rem 0 0 1.25rem', color: '#cbd5e1', fontSize: '0.9rem' }}>
              <li>Your registered player username (if you have one).</li>
              <li>The game or feature affected (e.g., Aim, Stack, Daily Challenge, Locker).</li>
              <li>Your device and browser type (e.g., Chrome on Windows 11, Safari on iOS).</li>
              <li>A brief description of what happened and steps to reproduce the issue.</li>
            </ul>
          </div>
        </section>

        {/* Section 4: Self-Help Resources */}
        <section>
          <h2 className="font-heading">
            <HelpCircle size={20} className="icon-cyan" /> LOOKING FOR QUICK ANSWERS?
          </h2>
          <p>
            Many common questions regarding Rush Points (RP), Daily Challenge mechanics, streaks, and cosmetic unlocking are already answered in our help center:
          </p>
          <p>
            Visit our <a href="/support" style={{ color: '#00f2fe', textDecoration: 'underline', fontWeight: 'bold' }}>Support &amp; FAQ Page</a> to browse instant answers to frequent player questions.
          </p>
        </section>
      </div>
    </div>
  );
}
