import React, { useState, useEffect } from 'react';
import {
  Gem,
  Sparkles,
  Trophy,
  Check,
  Lock,
  Flame,
  ArrowRight,
  User,
  Shield,
  Layers,
  Zap,
  Tag,
  Award,
  Play,
  Eye,
  HelpCircle,
} from 'lucide-react';
import { PLATFORM_CONTENT } from '../config/platformContent.js';
import {
  FRAMES_INVENTORY,
  TITLES_INVENTORY,
  EFFECTS_INVENTORY,
  BADGES_INVENTORY,
  loadLockerState,
  hydrateLockerFromProfile,
  purchaseItem,
  equipItem,
  syncServerLockerOwnership,
  getCurrentRushPoints,
  evaluateBadges,
} from '../services/lockerService';
import { useAuth } from '../context/AuthContext';
import { syncEquippedCosmeticsToProfile } from '../services/authService';
import { VictoryEffectOverlay } from '../components/VictoryEffectOverlay';
import './LockerPage.css';

export function LockerPage({
  scores = {},
  streak = 0,
  onNavigateToDaily,
  onRushPointsChange,
  audioFx,
}) {
  const { user, profile, isGuest, updateProfileState } = useAuth();
  const [activeCategory, setActiveCategory] = useState('all');
  const [locker, setLocker] = useState(() => (profile ? hydrateLockerFromProfile(profile) : loadLockerState()));
  const [rushPoints, setRushPoints] = useState(() => getCurrentRushPoints());
  const [purchaseToast, setPurchaseToast] = useState(null);
  const [insufficientToast, setInsufficientToast] = useState(null);
  const [previewingEffectKey, setPreviewingEffectKey] = useState(null);
  const [previewTriggerKey, setPreviewTriggerKey] = useState(0);
  const [recentlyPurchasedKey, setRecentlyPurchasedKey] = useState(null);

  // Evaluate unlocked badges
  const unlockedBadges = evaluateBadges(scores, streak);

  useEffect(() => {
    let currentLocker = loadLockerState();

    // If authenticated, synchronize cloud locker ownership and hydrate from profile
    if (user && !isGuest) {
      if (profile) {
        currentLocker = hydrateLockerFromProfile(profile);
      }
      syncServerLockerOwnership(user, profile).then(() => {
        setLocker(loadLockerState());
      });
    }

    setLocker(currentLocker);
    const pts = getCurrentRushPoints();
    setRushPoints(pts);
    onRushPointsChange?.(pts);
  }, [user?.id, profile?.avatar_frame, profile?.title, profile?.victory_effect]);

  const handlePurchase = async (category, itemKey) => {
    const res = await purchaseItem(category, itemKey, { user, isGuest });
    if (res.success && !res.alreadyOwned) {
      // Play cinematic sci-fi unlock chime
      audioFx?.playUnlock?.();

      setRushPoints(res.balance);
      onRushPointsChange?.(res.balance);
      setLocker(loadLockerState());
      setRecentlyPurchasedKey(itemKey);

      // Show celebratory purchase feedback
      setPurchaseToast({
        name: res.item.name,
        price: res.item.price,
        balance: res.balance,
      });

      // Auto-hide toast after 3.5 seconds
      setTimeout(() => {
        setPurchaseToast(null);
        setRecentlyPurchasedKey(null);
      }, 3500);
    } else if (res.error === 'NOT_ENOUGH_POINTS') {
      setInsufficientToast({
        name: res.item?.name || 'Cosmetic',
        required: res.required,
        available: res.available,
      });

      setTimeout(() => {
        setInsufficientToast(null);
      }, 3500);
    } else if (res.error === 'MIGRATION_BARRIER_ACTIVE') {
      setInsufficientToast({
        name: res.item?.name || 'Item',
        required: 0,
        available: res.balance || 0,
        customTitle: 'SPENDING LOCKED',
        customMessage: 'Account migration pending resolution. Spending is locked.',
      });

      setTimeout(() => {
        setInsufficientToast(null);
      }, 3500);
    }
  };

  const handleEquip = (category, itemKey) => {
    const res = equipItem(category, itemKey);
    if (res.success) {
      audioFx?.playEquip?.();
      const updatedLocker = loadLockerState();
      setLocker(updatedLocker);

      // If user is authenticated, synchronize equipped cosmetic to public profile
      if (user && !isGuest) {
        const cosmeticField =
          category === 'frames'
            ? { avatar_frame: itemKey }
            : category === 'titles'
            ? { title: itemKey }
            : category === 'effects'
            ? { victory_effect: itemKey }
            : null;

        if (cosmeticField) {
          updateProfileState(cosmeticField);
          syncEquippedCosmeticsToProfile(cosmeticField, user?.id);
        }
      }
    }
  };

  const handlePreviewEffect = (effectKey) => {
    setPreviewingEffectKey(effectKey);
    setPreviewTriggerKey((prev) => prev + 1);
  };

  // Find currently equipped items (converging profile and scoped locker state)
  const equippedFrame =
    FRAMES_INVENTORY.find((f) => f.key === (profile?.avatar_frame || locker?.equipped?.frame)) || FRAMES_INVENTORY[0];
  const equippedTitle =
    TITLES_INVENTORY.find((t) => t.key === (profile?.title || locker?.equipped?.title)) || TITLES_INVENTORY[0];
  const equippedEffect =
    EFFECTS_INVENTORY.find((e) => e.key === (profile?.victory_effect || locker?.equipped?.effect)) || EFFECTS_INVENTORY[0];

  // Filter items according to active tab
  const showFrames = activeCategory === 'all' || activeCategory === 'frames';
  const showTitles = activeCategory === 'all' || activeCategory === 'titles';
  const showEffects = activeCategory === 'all' || activeCategory === 'effects';
  const showBadges = activeCategory === 'all' || activeCategory === 'badges';

  return (
    <div className="locker-page-container">
      {/* Top Header */}
      <div className="locker-page-header">
        <div className="locker-badge font-mono">
          <Sparkles size={14} className="icon-gold" />
          <span>COSMETICS & ARMORY</span>
        </div>
        <h1 className="locker-title font-heading">RUSH LOCKER</h1>
        <p className="locker-subtitle">
          Earn it. Unlock it. Make it yours. 100% cosmetic rewards with zero gameplay advantage.
        </p>

        <div className="locker-balance-pill font-mono">
          <Gem size={18} className="gem-pulse" />
          <span>{rushPoints.toLocaleString()} RUSH POINTS</span>
        </div>
      </div>

      {/* Purchase Success Toast */}
      {purchaseToast && (
        <div className="locker-toast toast-success animate-pop">
          <Sparkles size={20} className="toast-sparkle" />
          <div className="toast-content font-mono">
            <strong className="toast-title">✨ UNLOCKED: {purchaseToast.name}!</strong>
            <span className="toast-sub">-{purchaseToast.price.toLocaleString()} RP • Balance: {purchaseToast.balance.toLocaleString()} RP</span>
          </div>
        </div>
      )}

      {/* Insufficient Balance / Spending Locked Toast */}
      {insufficientToast && (
        <div className="locker-toast toast-warning animate-pop">
          <Lock size={18} className="toast-lock" />
          <div className="toast-content font-mono">
            <strong>{insufficientToast.customTitle || 'NOT ENOUGH RUSH POINTS'}</strong>
            <span>
              {insufficientToast.customMessage ||
                `Need ${insufficientToast.required.toLocaleString()} RP • You have ${insufficientToast.available.toLocaleString()} RP`}
            </span>
          </div>
        </div>
      )}

      {/* Profile Preview Card (Your Rush Profile) */}
      <div className="profile-preview-card glass-panel">
        <div className="profile-preview-header">
          <span className="profile-preview-tag font-mono">YOUR RUSH PROFILE</span>
          <div className="profile-equipped-tags font-mono">
            <span className="equipped-tag">
              <Sparkles size={12} /> {equippedFrame.name} FRAME
            </span>
            <span className="equipped-tag">
              <Tag size={12} /> {equippedTitle.name}
            </span>
            <span className="equipped-tag">
              <Zap size={12} /> {equippedEffect.name} EFFECT
            </span>
          </div>
        </div>

        <div className="profile-preview-body">
          {/* Avatar with Equipped Frame */}
          <div className={`avatar-frame-wrapper ${equippedFrame.cssClass}`}>
            <div className="avatar-circle">
              <User size={36} className="avatar-icon" />
            </div>
          </div>

          <div className="profile-user-info">
            <span className="profile-username font-heading">PLAYER</span>
            <span
              className="profile-equipped-title font-mono"
              style={{ color: equippedTitle.accentColor }}
            >
              {equippedTitle.name}
            </span>
            <div className="profile-points-tag font-mono">
              <Gem size={14} className="gem-emerald" />
              <span>{rushPoints.toLocaleString()} RP AVAILABLE</span>
            </div>
          </div>

          {rushPoints < 100 && (
            <div className="profile-low-balance-box font-mono">
              <p>Need more Rush Points? Complete today's daily mission!</p>
              <button
                className="btn-secondary btn-mini-daily"
                onClick={onNavigateToDaily}
              >
                <Flame size={14} />
                <span>DAILY MISSIONS</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="locker-tabs-row font-mono">
        <button
          className={`locker-tab-btn ${activeCategory === 'all' ? 'active' : ''}`}
          onClick={() => setActiveCategory('all')}
        >
          ALL
        </button>
        <button
          className={`locker-tab-btn ${activeCategory === 'frames' ? 'active' : ''}`}
          onClick={() => setActiveCategory('frames')}
        >
          🎨 FRAMES
        </button>
        <button
          className={`locker-tab-btn ${activeCategory === 'titles' ? 'active' : ''}`}
          onClick={() => setActiveCategory('titles')}
        >
          🏷️ TITLES
        </button>
        <button
          className={`locker-tab-btn ${activeCategory === 'effects' ? 'active' : ''}`}
          onClick={() => setActiveCategory('effects')}
        >
          ✨ EFFECTS
        </button>
        <button
          className={`locker-tab-btn ${activeCategory === 'badges' ? 'active' : ''}`}
          onClick={() => setActiveCategory('badges')}
        >
          🏆 BADGES
        </button>
      </div>

      {/* ── 1. PROFILE FRAMES SECTION ─────────────────────────────────── */}
      {showFrames && (
        <div className="locker-section">
          <div className="section-title-row font-mono">
            <span className="section-icon">🎨</span>
            <h2 className="section-title font-heading">PROFILE FRAMES</h2>
            <span className="section-count font-mono">({FRAMES_INVENTORY.length})</span>
          </div>

          <div className="locker-items-grid">
            {FRAMES_INVENTORY.map((item) => {
              const isOwned = locker.owned.frames?.includes(item.key) || item.price === 0;
              const isEquipped = locker.equipped.frame === item.key;
              const canAfford = rushPoints >= item.price;

              return (
                <div
                  key={item.id}
                  className={`locker-item-card glass-panel rarity-${item.rarity.toLowerCase()} ${isEquipped ? 'item-is-equipped' : ''} ${recentlyPurchasedKey === item.key ? 'item-just-purchased' : ''}`}
                >
                  <div className="card-top-row">
                    <span className={`rarity-badge font-mono badge-${item.rarity.toLowerCase()}`}>
                      {item.rarity}
                    </span>
                    {isEquipped && (
                      <span className="equipped-badge font-mono">
                        <Check size={12} /> EQUIPPED
                      </span>
                    )}
                  </div>

                  {/* Frame Visual Preview */}
                  <div className="frame-preview-box">
                    <div className={`avatar-frame-wrapper mini-frame ${item.cssClass}`}>
                      <div className="avatar-circle mini-circle">
                        <User size={24} className="avatar-icon" />
                      </div>
                    </div>
                  </div>

                  <h3 className="item-name font-heading">{item.name}</h3>
                  <p className="item-desc">{item.description}</p>

                  <div className="item-card-footer">
                    <div className="item-price-tag font-mono">
                      {item.price === 0 ? (
                        <span className="price-free">FREE</span>
                      ) : (
                        <>
                          <Gem size={14} className="icon-gem" />
                          <span>{item.price.toLocaleString()} RP</span>
                        </>
                      )}
                    </div>

                    {isEquipped ? (
                      <button className="btn-equipped font-mono" disabled>
                        <Check size={14} />
                        <span>EQUIPPED</span>
                      </button>
                    ) : isOwned ? (
                      <button
                        className="btn-secondary btn-equip font-mono"
                        onClick={() => handleEquip('frames', item.key)}
                      >
                        EQUIP
                      </button>
                    ) : (
                      <button
                        className={`btn-primary btn-unlock font-mono ${!canAfford ? 'btn-disabled' : ''}`}
                        onClick={() => handlePurchase('frames', item.key)}
                      >
                        <Lock size={14} />
                        <span>UNLOCK</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 2. PLAYER TITLES SECTION ──────────────────────────────────── */}
      {showTitles && (
        <div className="locker-section">
          <div className="section-title-row font-mono">
            <span className="section-icon">🏷️</span>
            <h2 className="section-title font-heading">PLAYER TITLES</h2>
            <span className="section-count font-mono">({TITLES_INVENTORY.length})</span>
          </div>

          <div className="locker-items-grid">
            {TITLES_INVENTORY.map((item) => {
              const isOwned = locker.owned.titles?.includes(item.key) || item.price === 0;
              const isEquipped = locker.equipped.title === item.key;
              const canAfford = rushPoints >= item.price;

              return (
                <div
                  key={item.id}
                  className={`locker-item-card glass-panel rarity-${item.rarity.toLowerCase()} ${isEquipped ? 'item-is-equipped' : ''} ${recentlyPurchasedKey === item.key ? 'item-just-purchased' : ''}`}
                >
                  <div className="card-top-row">
                    <span className={`rarity-badge font-mono badge-${item.rarity.toLowerCase()}`}>
                      {item.rarity}
                    </span>
                    {isEquipped && (
                      <span className="equipped-badge font-mono">
                        <Check size={12} /> EQUIPPED
                      </span>
                    )}
                  </div>

                  {/* Title Visual Preview */}
                  <div className="title-preview-box">
                    <span
                      className="title-preview-text font-mono"
                      style={{ color: item.accentColor }}
                    >
                      {item.name}
                    </span>
                  </div>

                  <h3 className="item-name font-heading">{item.name}</h3>
                  <p className="item-desc">{item.description}</p>

                  <div className="item-card-footer">
                    <div className="item-price-tag font-mono">
                      {item.price === 0 ? (
                        <span className="price-free">FREE</span>
                      ) : (
                        <>
                          <Gem size={14} className="icon-gem" />
                          <span>{item.price.toLocaleString()} RP</span>
                        </>
                      )}
                    </div>

                    {isEquipped ? (
                      <button className="btn-equipped font-mono" disabled>
                        <Check size={14} />
                        <span>EQUIPPED</span>
                      </button>
                    ) : isOwned ? (
                      <button
                        className="btn-secondary btn-equip font-mono"
                        onClick={() => handleEquip('titles', item.key)}
                      >
                        EQUIP
                      </button>
                    ) : (
                      <button
                        className={`btn-primary btn-unlock font-mono ${!canAfford ? 'btn-disabled' : ''}`}
                        onClick={() => handlePurchase('titles', item.key)}
                      >
                        <Lock size={14} />
                        <span>UNLOCK</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 3. VICTORY EFFECTS SECTION ────────────────────────────────── */}
      {showEffects && (
        <div className="locker-section">
          <div className="section-title-row font-mono">
            <span className="section-icon">✨</span>
            <h2 className="section-title font-heading">VICTORY EFFECTS</h2>
            <span className="section-count font-mono">({EFFECTS_INVENTORY.length})</span>
          </div>

          <div className="locker-items-grid">
            {EFFECTS_INVENTORY.map((item) => {
              const isOwned = locker.owned.effects?.includes(item.key) || item.price === 0;
              const isEquipped = locker.equipped.effect === item.key;
              const canAfford = rushPoints >= item.price;

              return (
                <div
                  key={item.id}
                  className={`locker-item-card glass-panel rarity-${item.rarity.toLowerCase()} ${isEquipped ? 'item-is-equipped' : ''} ${recentlyPurchasedKey === item.key ? 'item-just-purchased' : ''}`}
                >
                  <div className="card-top-row">
                    <span className={`rarity-badge font-mono badge-${item.rarity.toLowerCase()}`}>
                      {item.rarity}
                    </span>
                    {isEquipped && (
                      <span className="equipped-badge font-mono">
                        <Check size={12} /> EQUIPPED
                      </span>
                    )}
                  </div>

                  {/* Effect Visual Preview */}
                  <div className="effect-preview-box">
                    {previewingEffectKey === item.key && (
                      <VictoryEffectOverlay
                        effectKey={item.key}
                        triggerKey={previewTriggerKey}
                        isInlinePreview={true}
                        onComplete={() => setPreviewingEffectKey(null)}
                      />
                    )}
                    <span className="effect-preview-icon">{item.icon}</span>
                    <span
                      className="effect-preview-tag font-mono"
                      style={{ color: item.accentColor }}
                    >
                      {item.name}
                    </span>
                    <button
                      type="button"
                      className="btn-preview-effect font-mono"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreviewEffect(item.key);
                      }}
                      title={`Preview ${item.name} victory effect`}
                    >
                      <Play size={11} fill="currentColor" />
                      <span>PREVIEW EFFECT</span>
                    </button>
                  </div>

                  <h3 className="item-name font-heading">{item.name}</h3>
                  <p className="item-desc">{item.description}</p>

                  <div className="item-card-footer">
                    <div className="item-price-tag font-mono">
                      {item.price === 0 ? (
                        <span className="price-free">FREE</span>
                      ) : (
                        <>
                          <Gem size={14} className="icon-gem" />
                          <span>{item.price.toLocaleString()} RP</span>
                        </>
                      )}
                    </div>

                    {isEquipped ? (
                      <button className="btn-equipped font-mono" disabled>
                        <Check size={14} />
                        <span>EQUIPPED</span>
                      </button>
                    ) : isOwned ? (
                      <button
                        className="btn-secondary btn-equip font-mono"
                        onClick={() => handleEquip('effects', item.key)}
                      >
                        EQUIP
                      </button>
                    ) : (
                      <button
                        className={`btn-primary btn-unlock font-mono ${!canAfford ? 'btn-disabled' : ''}`}
                        onClick={() => handlePurchase('effects', item.key)}
                      >
                        <Lock size={14} />
                        <span>UNLOCK</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 4. ACHIEVEMENT BADGES SECTION ─────────────────────────────── */}
      {showBadges && (
        <div className="locker-section">
          <div className="section-title-row font-mono">
            <span className="section-icon">🏆</span>
            <h2 className="section-title font-heading">ACHIEVEMENT BADGES</h2>
            <span className="section-count font-mono">
              ({unlockedBadges.length}/{BADGES_INVENTORY.length} UNLOCKED)
            </span>
          </div>

          <div className="locker-items-grid badges-grid">
            {BADGES_INVENTORY.map((badge) => {
              const isUnlocked = unlockedBadges.includes(badge.key);

              return (
                <div
                  key={badge.id}
                  className={`locker-item-card glass-panel badge-card ${isUnlocked ? 'badge-unlocked' : 'badge-locked'}`}
                >
                  <div className="badge-icon-box">
                    <span className="badge-symbol">{badge.icon}</span>
                  </div>

                  <h3 className="item-name font-heading">{badge.name}</h3>
                  <p className="item-desc">{badge.description}</p>

                  <div className="badge-condition-box font-mono">
                    <span className="condition-label">UNLOCK CRITERIA:</span>
                    <span className="condition-text">{badge.unlockCondition}</span>
                  </div>

                  <div className="badge-status-row font-mono">
                    {isUnlocked ? (
                      <span className="badge-status-unlocked">
                        <Check size={14} /> UNLOCKED
                      </span>
                    ) : (
                      <span className="badge-status-locked">
                        <Lock size={14} /> LOCKED
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 5. VIRTUAL ECONOMY & TRANSPARENCY GUIDE ─────────────────────── */}
      <div className="locker-guide-section glass-panel">
        <div className="section-title-row font-mono">
          <span className="section-icon">💎</span>
          <h2 className="section-title font-heading">RUSH POINTS &amp; VIRTUAL ECONOMY</h2>
        </div>

        <p className="locker-guide-intro font-body">
          {PLATFORM_CONTENT.locker.economyDisclosure}
        </p>

        <div className="locker-categories-grid">
          {PLATFORM_CONTENT.locker.categories.map((cat, idx) => (
            <div key={idx} className="locker-cat-card">
              <div className="cat-card-header">
                <span className="cat-icon">{cat.icon}</span>
                <h3 className="cat-name font-heading">{cat.name}</h3>
              </div>
              <p className="cat-desc">{cat.description}</p>
            </div>
          ))}
        </div>

        <div className="locker-guide-links font-mono">
          <a
            href="/daily"
            className="guide-btn btn-daily"
            onClick={(e) => {
              e.preventDefault();
              if (onNavigateToDaily) onNavigateToDaily();
            }}
          >
            <span>EARN POINTS IN DAILY CHALLENGE</span>
            <ArrowRight size={14} />
          </a>
          <a href="/leaderboard" className="guide-btn btn-leaderboard">
            <span>VIEW LEADERBOARD IDENTITIES</span>
            <ArrowRight size={14} />
          </a>
        </div>
      </div>

      {/* ── 6. RUSH LOCKER FAQ ────────────────────────────────────────── */}
      <div className="locker-faq-section glass-panel">
        <div className="section-title-row font-mono">
          <span className="section-icon">❓</span>
          <h2 className="section-title font-heading">RUSH LOCKER FAQ</h2>
        </div>
        <p className="locker-faq-subtitle font-body">
          Frequently asked questions regarding vanity cosmetics, Rush Point earning, and cloud account synchronization.
        </p>

        <dl className="locker-faq-list">
          {PLATFORM_CONTENT.locker.faq.map((item, idx) => (
            <div key={idx} className="locker-faq-item">
              <dt className="locker-faq-question font-heading">
                <HelpCircle size={18} className="text-gold" aria-hidden="true" />
                <span>{item.q}</span>
              </dt>
              <dd className="locker-faq-answer">{item.a}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
