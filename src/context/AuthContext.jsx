/**
 * ONE MORE RUSH — Authentication Context (Phase 2.1 Final Hardened)
 *
 * AUTH LIFECYCLE INVARIANTS:
 * 1. Single Listener: supabase.auth.onAuthStateChange is subscribed EXACTLY ONCE on mount
 *    and NEVER re-created across user state changes (deps = []).
 * 2. Stable Callbacks: Access to `user` state inside auth listeners uses `userRef`.
 * 3. Zero Async Re-entrancy: onAuthStateChange listener is strictly synchronous.
 * 4. Anonymous State Isolation: Anonymous guest creation is handled in a dedicated, serialized effect.
 * 5. Single-Owner Handoff: captureAnonymousGuestHandoff occurs ONLY during explicit handleSignUp
 *    and is synchronously bound before permanent user state propagation.
 */

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import {
  signUp as apiSignUp,
  signIn as apiSignIn,
  signOut as apiSignOut,
  getProfile,
  isPlaceholderUsername,
} from '../services/authService.js';
import { setActiveStorageScope } from '../services/storageScopeService.js';
import {
  captureAnonymousGuestHandoff,
  bindHandoffToPermanentUser,
  getGuestMigrationCandidateAmount,
  MAX_GUEST_MIGRATION_RP,
} from '../services/guestConversionHandoffService.js';
import { hydrateLockerFromProfile } from '../services/lockerService.js';

const AuthContext = createContext({
  session: null,
  user: null,
  profile: null,
  loading: true,
  isGuest: true,
  isAnonymousGuest: false,
  isRegisteredUser: false,
  needsUsernameSetup: false,
  isMigrationReady: true,
  activeSignupContext: null,
  signUp: async () => {},
  signIn: async () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
  updateProfileState: () => {},
});

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileResolved, setProfileResolved] = useState(false);
  const [isMigrationReady, setIsMigrationReady] = useState(true);
  const [activeSignupContext, setActiveSignupContext] = useState(null);

  // Synchronized ref tracking current user state for stable listeners without re-subscription
  const userRef = useRef(null);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Synchronized ref tracking active signup handoff context during anonymous -> permanent signup transitions
  const activeSignupHandoffRef = useRef(null);

  // Trigger state to request an anonymous guest session outside onAuthStateChange
  const [needsAnonymous, setNeedsAnonymous] = useState(false);

  // In-flight guard: true strictly while an anonymous creation network request is in flight
  // Lock is released exclusively in the request's finally block
  const isCreatingAnonRef = useRef(false);

  // Monotonic sequence counter tracking PERMANENT auth operations (login, signup, registered signout)
  const permanentAuthSeqRef = useRef(0);

  // Explicit token representing the active, owned anonymous creation operation
  // Reset to 0 whenever a permanent auth event occurs to reject any late/unowned anonymous auth events
  const activeAnonymousOpRef = useRef(0);

  // Identity classification (Phase 2.1)
  const isAnonymousGuest = Boolean(user?.is_anonymous || user?.app_metadata?.provider === 'anonymous');
  const isRegisteredUser = Boolean(user && !isAnonymousGuest);
  const isGuest = isAnonymousGuest || (!user && !authLoading);

  // Guard tracking active logout in-flight to prevent any UI popup flash
  const isLoggingOutRef = useRef(false);

  // Profile resolution check: evaluate username presence and placeholder handle detection
  const needsUsernameSetup = Boolean(
    !isLoggingOutRef.current &&
    isRegisteredUser &&
    user &&
    profileResolved &&
    (!profile || !profile.username || isPlaceholderUsername(profile.username, user?.id))
  );

  // Diagnostics for profile resolution & username setup decision
  useEffect(() => {
    if (isRegisteredUser && profileResolved) {
      console.info('[Profile] PROFILE_RESOLUTION', {
        permanentUserId: user?.id,
        username: profile?.username || null,
        isPlaceholder: Boolean(profile?.username && isPlaceholderUsername(profile.username, user?.id)),
      });
      if (!profile || !profile.username || isPlaceholderUsername(profile.username, user?.id)) {
        console.info('[Profile] USERNAME_SETUP_REQUIRED', {
          permanentUserId: user?.id,
          username: profile?.username || null,
        });
      } else {
        console.info('[Profile] USERNAME_SETUP_NOT_REQUIRED', {
          permanentUserId: user?.id,
          username: profile?.username,
        });
      }
    }
  }, [isRegisteredUser, profileResolved, profile?.username, user?.id]);

  // Fetch or refresh the player's profile (invoked on-demand or by dedicated effect)
  const refreshProfile = useCallback(async (userId) => {
    const targetId = userId || user?.id;
    if (!targetId || !isSupabaseConfigured || isAnonymousGuest) {
      setProfile(null);
      setProfileResolved(true);
      return null;
    }

    setProfileLoading(true);
    try {
      const { profile: data } = await getProfile(targetId);
      setProfile(data || null);
      setProfileResolved(true);
      return data;
    } catch (err) {
      console.warn('[Auth] Profile refresh error:', err);
      setProfileResolved(true);
      return null;
    } finally {
      setProfileLoading(false);
    }
  }, [user?.id, isAnonymousGuest]);

  // 1. Initial Session Restoration & SYNCHRONOUS onAuthStateChange Listener
  // Invariant: Subscribed EXACTLY ONCE on mount for the lifetime of AuthProvider ([] dependencies).
  // Zero async Supabase calls inside onAuthStateChange callback (prevents deadlock/re-entrancy).
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      if (!isSupabaseConfigured || !supabase) {
        setActiveStorageScope(null);
        if (mounted) {
          setAuthLoading(false);
          setProfileResolved(true);
          setIsMigrationReady(true);
        }
        return;
      }

      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();

        if (initialSession?.user) {
          // Valid existing session restored (anonymous or registered)
          setActiveStorageScope(initialSession.user.id);
          if (mounted) {
            setSession(initialSession);
            setUser(initialSession.user);
            setIsMigrationReady(true);
            const isAnon = Boolean(
              initialSession.user.is_anonymous || initialSession.user.app_metadata?.provider === 'anonymous'
            );
            if (isAnon) {
              setProfile(null);
              setProfileResolved(true);
            } else {
              setProfile(null);
              setProfileResolved(false);
            }
          }
        } else {
          // No session found on startup -> trigger anonymous creation outside this flow
          setActiveStorageScope(null);
          if (mounted) {
            setUser(null);
            setSession(null);
            setIsMigrationReady(true);
            setNeedsAnonymous(true);
          }
        }
      } catch (err) {
        console.warn('[Auth] Session restoration warning:', err);
        setActiveStorageScope(null);
        if (mounted) {
          setUser(null);
          setSession(null);
          setIsMigrationReady(true);
          setNeedsAnonymous(true);
        }
      } finally {
        if (mounted) setAuthLoading(false);
      }
    }

    initAuth();

    // Synchronous auth listener: strictly updates React state and storage scope
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        if (!mounted) return;

        const isAnon = Boolean(
          currentSession?.user?.is_anonymous || currentSession?.user?.app_metadata?.provider === 'anonymous'
        );

        if (event === 'SIGNED_OUT' || !currentSession?.user) {
          // Authoritative signout: invalidate pending ops and anonymous ownership, reset state
          permanentAuthSeqRef.current += 1;
          activeAnonymousOpRef.current = 0;
          activeSignupHandoffRef.current = null;
          setActiveSignupContext(null);
          setIsMigrationReady(true);

          setActiveStorageScope(null);
          setUser(null);
          setSession(null);
          setProfile(null);
          setProfileResolved(true);
          setNeedsAnonymous(true);
        } else if (isAnon) {
          // Verify ownership: accept anonymous event ONLY if it belongs to an active, owned anonymous operation
          // and no permanent user or permanent auth operation is active
          const isOwnedOp = activeAnonymousOpRef.current > 0 && isCreatingAnonRef.current;
          const currentAppUser = userRef.current;
          const hasPermanentUser = Boolean(
            currentAppUser &&
            !currentAppUser.is_anonymous &&
            currentAppUser.app_metadata?.provider !== 'anonymous'
          );

          if (!isOwnedOp || hasPermanentUser) {
            console.info('[Auth] Rejected unowned/late anonymous auth event (permanent user is active or operation was invalidated).');
            return;
          }

          setActiveStorageScope(currentSession.user.id);
          setSession(currentSession);
          setUser(currentSession.user);
          setProfile(null);
          setProfileResolved(true);
          setIsMigrationReady(true);
          setNeedsAnonymous(false);
        } else {
          // Registered permanent user arrival: invalidate anonymous operation ownership immediately
          permanentAuthSeqRef.current += 1;
          activeAnonymousOpRef.current = 0;

          console.info('[Auth] AUTH_EVENT', {
            permanentUserId: currentSession.user.id,
            anonymousUserId: activeSignupHandoffRef.current?.expectedAnonymousUserId || null,
            conversionIntentId: activeSignupHandoffRef.current?.expectedConversionIntentId || null,
            event,
          });

          // If an active signup handoff is in flight, bind it synchronously BEFORE state change
          if (activeSignupHandoffRef.current) {
            const bindRes = bindHandoffToPermanentUser({
              permanentUserId: currentSession.user.id,
              expectedAnonymousUserId: activeSignupHandoffRef.current.expectedAnonymousUserId,
              expectedConversionIntentId: activeSignupHandoffRef.current.expectedConversionIntentId,
            });
            if (bindRes?.success) {
              activeSignupHandoffRef.current.boundPermanentUserId = currentSession.user.id;
              activeSignupHandoffRef.current.bindSuccess = true;
              setActiveSignupContext({ ...activeSignupHandoffRef.current });
              setIsMigrationReady(true);
            }
          } else {
            setIsMigrationReady(true);
          }

          setActiveStorageScope(currentSession.user.id);
          setSession(currentSession);
          setUser(currentSession.user);
          setProfile(null);
          setProfileResolved(false);
          setNeedsAnonymous(false);
        }

        setAuthLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  // 2. Dedicated Effect for Anonymous Guest Session Creation (Outside onAuthStateChange)
  // Fully serialized with in-flight lock, sequence counter, and explicit operation ownership
  useEffect(() => {
    let active = true;

    async function establishAnonymousSession() {
      if (!needsAnonymous || user || !isSupabaseConfigured || !supabase) {
        return;
      }

      // In-flight lock: serialize to prevent duplicate simultaneous calls (e.g. StrictMode)
      if (isCreatingAnonRef.current) return;
      isCreatingAnonRef.current = true;

      // Capture the permanent auth sequence generation and create a unique anonymous operation ID
      const targetSeq = permanentAuthSeqRef.current;
      const currentOpId = ++activeAnonymousOpRef.current;

      try {
        const { data, error } = await supabase.auth.signInAnonymously();

        // If unmounted or a permanent auth operation occurred while in flight, discard the anonymous result
        if (!active || permanentAuthSeqRef.current !== targetSeq || activeAnonymousOpRef.current !== currentOpId) {
          console.info('[Auth] Discarding anonymous session result: Permanent auth operation occurred while in flight.');
          return;
        }

        if (error) {
          console.warn('[Auth] Anonymous sign-in error:', error.message);
          setActiveStorageScope(null);
        } else if (data?.user) {
          setActiveStorageScope(data.user.id);
          setSession(data.session);
          setUser(data.user);
          setProfile(null);
          setProfileResolved(true);
          setIsMigrationReady(true);
        }
      } catch (err) {
        console.warn('[Auth] Anonymous sign-in exception:', err);
        if (active && permanentAuthSeqRef.current === targetSeq && activeAnonymousOpRef.current === currentOpId) {
          setActiveStorageScope(null);
        }
      } finally {
        // Lock is released exclusively in finally block when the network request has settled
        isCreatingAnonRef.current = false;
        if (active && permanentAuthSeqRef.current === targetSeq && activeAnonymousOpRef.current === currentOpId) {
          activeAnonymousOpRef.current = 0;
          setNeedsAnonymous(false);
        }
      }
    }

    establishAnonymousSession();

    return () => {
      active = false;
    };
  }, [needsAnonymous, user]);

  // 3. Dedicated Effect for Registered User Profile Loading (Outside onAuthStateChange)
  useEffect(() => {
    let active = true;

    const isAnon = Boolean(user?.is_anonymous || user?.app_metadata?.provider === 'anonymous');
    if (!user || isAnon || !isSupabaseConfigured) {
      setProfile(null);
      setProfileResolved(true);
      return;
    }

    async function loadProfile() {
      setProfileLoading(true);
      try {
        const { profile: data } = await getProfile(user.id);
        if (active) {
          if (data) {
            hydrateLockerFromProfile(data);
          }
          setProfile(data || null);
          setProfileResolved(true);
        }
      } catch (err) {
        console.warn('[Auth] Profile load exception:', err);
        if (active) {
          setProfile(null);
          setProfileResolved(true);
        }
      } finally {
        if (active) setProfileLoading(false);
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, [user?.id, user?.is_anonymous]);

  // Public Auth Action Wrappers
  const handleSignIn = async ({ email, password }) => {
    // Invalidate any in-flight anonymous request & ownership
    permanentAuthSeqRef.current += 1;
    activeAnonymousOpRef.current = 0;
    activeSignupHandoffRef.current = null;
    setActiveSignupContext(null);
    setIsMigrationReady(true);
    setNeedsAnonymous(false);

    const res = await apiSignIn({ email, password });
    if (res.user && res.session) {
      setActiveStorageScope(res.user.id);
      setUser(res.user);
      setSession(res.session);
    }
    return res;
  };

  const handleSignUp = async ({ email, password, username }) => {
    // 0. Pre-signup Guest Migration Cap Check:
    // If the guest progression candidate balance exceeds the 50k migration cap, refuse conversion BEFORE Supabase signUp
    const candidatePoints = getGuestMigrationCandidateAmount(userRef.current);
    if (candidatePoints > MAX_GUEST_MIGRATION_RP) {
      console.warn(
        `[Auth] SIGNUP_BLOCKED_OVER_CAP: Guest candidate points (${candidatePoints} RP) exceed migration cap (${MAX_GUEST_MIGRATION_RP} RP). Halting signup to protect guest session.`
      );
      return {
        error: 'EXCEEDS_MIGRATION_CAP',
        candidatePoints,
        maxAllowed: MAX_GUEST_MIGRATION_RP,
      };
    }

    // Capture the active anonymous state and retain conversion context for THIS signup operation
    let handoff = null;
    let handoffContext = null;
    const isAnon = Boolean(user?.is_anonymous || user?.app_metadata?.provider === 'anonymous');
    if (isAnon || user?.id) {
      handoff = captureAnonymousGuestHandoff(user);
      if (handoff) {
        handoffContext = {
          expectedAnonymousUserId: handoff.sourceAnonymousUserId,
          expectedConversionIntentId: handoff.conversionIntentId,
          boundPermanentUserId: null,
          bindSuccess: false,
        };
      }
    }
    activeSignupHandoffRef.current = handoffContext;
    setActiveSignupContext(handoffContext);
    setIsMigrationReady(!handoffContext);

    console.info('[Auth] SIGNUP_STARTED', {
      permanentUserId: null,
      anonymousUserId: handoff?.sourceAnonymousUserId || null,
      conversionIntentId: handoff?.conversionIntentId || null,
    });

    // Invalidate any in-flight anonymous request & ownership
    permanentAuthSeqRef.current += 1;
    activeAnonymousOpRef.current = 0;
    setNeedsAnonymous(false);

    let signupSuccessful = false;
    try {
      const res = await apiSignUp({ email, password, username, currentUser: user });

      if (res.error) {
        return res;
      }

      signupSuccessful = Boolean(res.user);

      // Fallback verification: bind handoff if not already bound by synchronous onAuthStateChange
      if (res.user && handoffContext) {
        const bindRes = bindHandoffToPermanentUser({
          permanentUserId: res.user.id,
          expectedAnonymousUserId: handoffContext.expectedAnonymousUserId,
          expectedConversionIntentId: handoffContext.expectedConversionIntentId,
        });
        if (bindRes?.success) {
          handoffContext.boundPermanentUserId = res.user.id;
          handoffContext.bindSuccess = true;
          setActiveSignupContext({ ...handoffContext });
          setIsMigrationReady(true);
        }
      }

      if (res.user) {
        setActiveStorageScope(res.user.id);
        setUser(res.user);
        if (res.session) setSession(res.session);
      }
      return res;
    } catch (err) {
      signupSuccessful = false;
      throw err;
    } finally {
      // BUG 3 Fix: Do NOT destroy activeSignupHandoffRef if signup succeeded
      // Only clear if signup explicitly failed
      if (!signupSuccessful) {
        activeSignupHandoffRef.current = null;
        setActiveSignupContext(null);
        setIsMigrationReady(true);
      }
    }
  };

  const handleSignOut = async () => {
    isLoggingOutRef.current = true;
    // Invalidate pending auth operations and immediately clear state
    permanentAuthSeqRef.current += 1;
    activeAnonymousOpRef.current = 0;
    activeSignupHandoffRef.current = null;
    setActiveSignupContext(null);
    setIsMigrationReady(true);

    setActiveStorageScope(null);
    setUser(null);
    setSession(null);
    setProfile(null);
    setProfileResolved(true);

    try {
      const res = await apiSignOut();
      return res;
    } finally {
      isLoggingOutRef.current = false;
      setNeedsAnonymous(true);
    }
  };

  const updateProfileState = (updatedProfile) => {
    setProfile((prev) => ({ ...prev, ...updatedProfile }));
  };

  // State machine resolution: loading is true during initial session check or while resolving registered profile
  const loading = authLoading || (Boolean(isRegisteredUser) && (!profileResolved || profileLoading));

  const value = {
    session,
    user,
    profile,
    loading,
    isGuest,
    isAnonymousGuest,
    isRegisteredUser,
    needsUsernameSetup,
    isMigrationReady,
    activeSignupContext,
    signUp: handleSignUp,
    signIn: handleSignIn,
    signOut: handleSignOut,
    refreshProfile,
    updateProfileState,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

