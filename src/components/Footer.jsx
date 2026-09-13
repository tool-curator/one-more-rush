import React from 'react';
import { BRAND } from '../config/brand';
import { GAMES } from '../games/gameRegistry';
import './Footer.css';

export function Footer({ onPlayGame, onNavClick }) {
  return (
    <footer className="platform-footer">
      <div className="footer-container">
        <div className="footer-top-grid">
          {/* Brand Column */}
          <div className="footer-brand-col">
            <h3 className="footer-brand-title font-heading">{BRAND.name}</h3>
            <p className="footer-brand-tagline">{BRAND.tagline}</p>
            <p className="footer-brand-desc">{BRAND.subtitle}</p>
          </div>

          {/* Games Column */}
          <div className="footer-links-col">
            <h4 className="footer-col-title font-mono">GAMES</h4>
            <ul className="footer-links-list">
              {GAMES.map((game) => (
                <li key={game.id}>
                  <a
                    href={`/games/${game.id}`}
                    className="footer-link-btn"
                    onClick={(e) => {
                      e.preventDefault();
                      onPlayGame && onPlayGame(game.id);
                    }}
                    title={`Play ${game.name}`}
                  >
                    <span>{game.icon} {game.name}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Navigation Column */}
          <div className="footer-links-col">
            <h4 className="footer-col-title font-mono">ARCADE</h4>
            <ul className="footer-links-list">
              <li>
                <a
                  href="/"
                  className="footer-link-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavClick && onNavClick('home');
                  }}
                  title="Arcade Home"
                >
                  Home
                </a>
              </li>
              <li>
                <a
                  href="/#games-section"
                  className="footer-link-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavClick && onNavClick('games');
                  }}
                  title="Explore All Games"
                >
                  All Games
                </a>
              </li>
              <li>
                <a
                  href="/daily"
                  className="footer-link-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavClick && onNavClick('daily');
                  }}
                  title="Daily Challenges"
                >
                  Daily Challenge
                </a>
              </li>
              <li>
                <a
                  href="/locker"
                  className="footer-link-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavClick && onNavClick('locker');
                  }}
                  title="Rush Locker Cosmetics"
                >
                  Rush Locker
                </a>
              </li>
              <li>
                <a
                  href="/leaderboard"
                  className="footer-link-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavClick && onNavClick('leaderboard');
                  }}
                  title="Global Leaderboards"
                >
                  Leaderboards
                </a>
              </li>
            </ul>
          </div>

          {/* About & Legal Column */}
          <div className="footer-links-col">
            <h4 className="footer-col-title font-mono">INFO &amp; SUPPORT</h4>
            <ul className="footer-links-list">
              <li>
                <a
                  href="/about"
                  className="footer-link-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavClick && onNavClick('about');
                  }}
                  title="About One More Rush"
                >
                  About One More Rush
                </a>
              </li>
              <li>
                <a
                  href="/support"
                  className="footer-link-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavClick && onNavClick('support');
                  }}
                  title="Support &amp; Frequently Asked Questions"
                >
                  Support &amp; FAQ
                </a>
              </li>
              <li>
                <a
                  href="/contact"
                  className="footer-link-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavClick && onNavClick('contact');
                  }}
                  title="Contact One More Rush"
                >
                  Contact Us
                </a>
              </li>
              <li>
                <a
                  href="/privacy"
                  className="footer-link-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavClick && onNavClick('privacy');
                  }}
                  title="Privacy Policy"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a
                  href="/cookies"
                  className="footer-link-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavClick && onNavClick('cookies');
                  }}
                  title="Cookie Policy"
                >
                  Cookie Policy
                </a>
              </li>
              <li>
                <a
                  href="/terms"
                  className="footer-link-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavClick && onNavClick('terms');
                  }}
                  title="Terms of Use"
                >
                  Terms of Use
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="footer-bottom-bar">
          <span className="footer-copyright font-mono">
            © {new Date().getFullYear()} {BRAND.name}. All rights reserved.
          </span>
          <span className="footer-subtext font-mono">
            Crafted for speed, precision, and one more try.
          </span>
        </div>
      </div>
    </footer>
  );
}
