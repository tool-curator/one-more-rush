import React, { useState } from 'react';
import {
  HelpCircle,
  ChevronDown,
  MessageSquare,
  Bug,
  Sparkles,
  Info,
  CheckCircle2,
  Mail,
  Copy,
  Send,
  ExternalLink,
  Shield,
  LifeBuoy,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { SUPPORT_CONFIG } from '../config/brand.js';
import './InfoPages.css';

export function SupportPage() {
  const { user, profile } = useAuth();
  const [openFaqIndex, setOpenFaqIndex] = useState(0);

  // Feedback form state
  const [reportType, setReportType] = useState('BUG'); // 'BUG' | 'FEEDBACK' | 'SUPPORT'
  const [gameOrArea, setGameOrArea] = useState('Aim');
  const [description, setDescription] = useState('');
  const [stepsToReproduce, setStepsToReproduce] = useState('');
  const [copiedToast, setCopiedToast] = useState(false);

  const currentUsername = profile?.username || user?.user_metadata?.username || (user ? 'Authenticated Player' : 'Guest Player');

  const FAQ_ITEMS = [
    {
      q: 'How do I earn RP?',
      a: 'Rush Points (RP) are earned through gameplay performance and daily consistency. You earn +35 RP for your first completion of a Quick Win Daily Challenge, +600 RP for the Extreme Rush Challenge, +10 RP for your Daily Visit bonus, and bonus RP when establishing milestone personal bests across all arcade games. RP is 100% virtual and used exclusively in the Rush Locker for cosmetic unlocks.',
    },
    {
      q: 'How does Daily Challenge work?',
      a: 'Every calendar day (at 00:00 UTC), a new challenge deterministically rotates across the six arcade games. There are two challenge tiers available every day: "Quick Win" (an accessible milestone) and "Extreme Rush" (a high-precision mastery run). You can practice and replay as many times as you like, but reward RP is granted on your first successful clear of the day.',
    },
    {
      q: 'How does the streak work?',
      a: 'Your daily streak increments by 1 for each consecutive day you successfully complete at least one Daily Challenge. If a full UTC calendar day passes without completing a challenge, your streak resets to 0. Maintaining your streak unlocks prestigious achievements such as the ONE MORE badge (awarded at a 3+ day streak).',
    },
    {
      q: 'How do Locker purchases work?',
      a: 'The Rush Locker is the cosmetic workshop of One More Rush. You can spend your earned Rush Points to unlock avatar frames, custom player titles, and celebratory victory effects. Locker items are 100% cosmetic and provide zero gameplay advantages or pay-to-win mechanics. Purchased items are permanently attached to your account/inventory.',
    },
    {
      q: 'How do achievements work?',
      a: 'Achievements and badges represent skill and dedication milestones (such as FIRST PLAY for starting any game, ONE MORE for reaching a 3-day daily streak, SHARPSHOOTER for 20k+ in AIM, SURVIVOR for 20k+ in DODGE, BUILDER for height 25+ in STACK, etc.). When you achieve an unlock condition, an in-game notification celebrates your accomplishment and unlocks the badge in your Rush Locker.',
    },
    {
      q: 'Why is my leaderboard score not showing?',
      a: 'Leaderboards display verified records from your active player account. When playing as an unauthenticated guest or with a placeholder handle, your personal bests are safely recorded locally in your browser. Once you create a registered account and confirm a custom username, your high score runs qualify for future global competitive leaderboard listings.',
    },
    {
      q: 'How do I create an account?',
      a: 'Click "Sign In" or "Create Account" in the top navigation bar or Player Profile page. Provide a valid email address and password (minimum 6 characters), then claim your custom player handle (3–20 alphanumeric characters). You can also play immediately as a guest and upgrade to a permanent account at any time.',
    },
    {
      q: 'How does guest progress work?',
      a: 'When playing without an account, all of your high scores, Rush Points, daily challenge completions, streaks, and unlocked cosmetics are saved directly in your web browser using LocalStorage. You enjoy full access to all six arcade games, daily missions, and cosmetic customizations without entering any credentials.',
    },
    {
      q: 'What happens when I sign up?',
      a: 'When you create an account from an active guest session, your local progress—including earned Rush Points (up to the 50,000 RP net migration cap), daily streaks, and arcade personal bests—is seamlessly migrated to your secure cloud profile. Your progress is backed up and accessible across browser cache clears.',
    },
  ];

  const toggleFaq = (idx) => {
    setOpenFaqIndex((prev) => (prev === idx ? null : idx));
  };

  const generateReportText = () => {
    const subject =
      reportType === 'BUG'
        ? SUPPORT_CONFIG.bugReportSubject
        : reportType === 'FEEDBACK'
        ? SUPPORT_CONFIG.feedbackSubject
        : SUPPORT_CONFIG.contactSubject;

    const device = typeof navigator !== 'undefined' ? `${navigator.userAgent} (${window.innerWidth}x${window.innerHeight})` : 'Web Browser';

    let body = `TYPE: ${reportType}\n`;
    body += `USERNAME: ${currentUsername}\n`;
    body += `GAME / AREA: ${gameOrArea}\n\n`;
    body += `DESCRIPTION / FEEDBACK:\n${description || '(No description provided)'}\n\n`;

    if (reportType === 'BUG') {
      body += `STEPS TO REPRODUCE:\n${stepsToReproduce || '(No steps provided)'}\n\n`;
    }

    body += `BROWSER / DEVICE:\n${device}\n`;

    return { subject, body };
  };

  const handleOpenEmail = () => {
    const { subject, body } = generateReportText();
    const recipient = SUPPORT_CONFIG.supportEmail;
    const encodedTo = encodeURIComponent(recipient);
    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(body);

    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodedTo}&su=${encodedSubject}&body=${encodedBody}`;
    const mailtoUrl = `mailto:${encodedTo}?subject=${encodedSubject}&body=${encodedBody}`;

    try {
      const opened = window.open(gmailUrl, '_blank', 'noopener,noreferrer');
      if (!opened || opened.closed || typeof opened.closed === 'undefined') {
        window.location.href = mailtoUrl;
      }
    } catch (e) {
      window.location.href = mailtoUrl;
    }
  };

  const handleCopyToClipboard = async () => {
    const { subject, body } = generateReportText();
    const fullText = `Subject: ${subject}\n\n${body}`;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(fullText);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = fullText;
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
          <LifeBuoy size={14} className="icon-cyan" />
          <span>HELP & SUPPORT CENTER</span>
        </div>
        <h1 className="info-hero-title font-heading">SUPPORT & FAQ</h1>
        <p className="info-hero-subtitle">
          Everything you need to know about Rush Points, Daily Challenges, cosmetics, and fair play.
        </p>
      </div>

      {/* ── Main Content Card ─────────────────────────────────────────── */}
      <div className="info-content-card glass-panel">
        {/* Section 1: FAQ Accordion */}
        <section>
          <h2 className="font-heading">
            <HelpCircle size={20} className="icon-cyan" /> FREQUENTLY ASKED QUESTIONS
          </h2>

          <div className="faq-list">
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div key={idx} className={`faq-item ${isOpen ? 'open' : ''}`}>
                  <button
                    className="faq-question-btn"
                    onClick={() => toggleFaq(idx)}
                    aria-expanded={isOpen}
                  >
                    <span className="faq-question-text">{item.q}</span>
                    <ChevronDown size={18} className="faq-chevron" />
                  </button>
                  {isOpen && (
                    <div className="faq-answer">
                      <p>{item.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Section 2: Feedback & Bug Reporting */}
        <section>
          <h2 className="font-heading">
            <MessageSquare size={20} className="icon-cyan" /> COMMUNITY FEEDBACK & BUG REPORTS
          </h2>
          <p>
            Have feedback on game feel, spotted an unexpected bug, or need help with your player account? Send your report directly to the team:
          </p>

          <div className="support-feedback-card">
            {/* Mode Selector */}
            <div className="support-type-tabs font-mono">
              <button
                type="button"
                className={`support-tab-btn ${reportType === 'BUG' ? 'active' : ''}`}
                onClick={() => setReportType('BUG')}
              >
                <Bug size={14} />
                <span>REPORT A BUG</span>
              </button>
              <button
                type="button"
                className={`support-tab-btn ${reportType === 'FEEDBACK' ? 'active' : ''}`}
                onClick={() => setReportType('FEEDBACK')}
              >
                <Sparkles size={14} />
                <span>SEND FEEDBACK</span>
              </button>
              <button
                type="button"
                className={`support-tab-btn ${reportType === 'SUPPORT' ? 'active' : ''}`}
                onClick={() => setReportType('SUPPORT')}
              >
                <Shield size={14} />
                <span>CONTACT SUPPORT</span>
              </button>
            </div>

            {/* Form Fields */}
            <div className="support-field-group">
              <label className="support-label font-mono">PLAYER HANDLE</label>
              <input
                type="text"
                value={currentUsername}
                className="support-input font-mono"
                readOnly
              />
            </div>

            <div className="support-field-group">
              <label htmlFor="support-area-select" className="support-label font-mono">GAME / AREA</label>
              <select
                id="support-area-select"
                value={gameOrArea}
                onChange={(e) => setGameOrArea(e.target.value)}
                className="support-input font-mono"
              >
                <option value="Aim">AIM (Target Precision)</option>
                <option value="Dodge">DODGE (Hazard Survival)</option>
                <option value="Stack">STACK (Timing Precision)</option>
                <option value="Number Rush">NUMBER RUSH (Mental Math)</option>
                <option value="Memory">MEMORY (Sequence Recall)</option>
                <option value="Color Maze">COLOR MAZE (Puzzle Painter)</option>
                <option value="Daily Challenge">DAILY CHALLENGE</option>
                <option value="Rush Locker">RUSH LOCKER (Cosmetics)</option>
                <option value="Leaderboard">LEADERBOARD</option>
                <option value="Profile & Auth">PLAYER PROFILE & AUTH</option>
                <option value="General">GENERAL / OTHER</option>
              </select>
            </div>

            <div className="support-field-group">
              <label htmlFor="support-description-input" className="support-label font-mono">
                {reportType === 'BUG' ? 'DESCRIPTION OF THE ISSUE' : 'YOUR FEEDBACK / MESSAGE'}
              </label>
              <textarea
                id="support-description-input"
                placeholder={
                  reportType === 'BUG'
                    ? 'Describe what happened, what went wrong, and what you expected to see...'
                    : 'Share ideas, balance feedback, or questions with the developer...'
                }
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="support-textarea"
                rows={4}
              />
            </div>

            {reportType === 'BUG' && (
              <div className="support-field-group animate-fade">
                <label htmlFor="support-steps-input" className="support-label font-mono">STEPS TO REPRODUCE (OPTIONAL)</label>
                <textarea
                  id="support-steps-input"
                  placeholder="1. Start game... 2. Click... 3. Notice unexpected behavior..."
                  value={stepsToReproduce}
                  onChange={(e) => setStepsToReproduce(e.target.value)}
                  className="support-textarea"
                  rows={3}
                />
              </div>
            )}

            {/* Email Dispatch & Copy Actions */}
            <div className="support-actions-row font-mono">
              <button
                type="button"
                className="btn-primary btn-support-send"
                onClick={handleOpenEmail}
              >
                <Send size={16} />
                <span>SEND TO SUPPORT</span>
              </button>

              <button
                type="button"
                className="btn-secondary btn-support-copy"
                onClick={handleCopyToClipboard}
              >
                {copiedToast ? (
                  <>
                    <CheckCircle2 size={16} className="icon-cyan" />
                    <span>COPIED TO CLIPBOARD!</span>
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    <span>COPY DETAILS</span>
                  </>
                )}
              </button>
            </div>

            <div className="support-notice-pill font-mono">
              <Info size={14} />
              <span>
                Support destination: <strong>{SUPPORT_CONFIG.supportEmail}</strong>
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
