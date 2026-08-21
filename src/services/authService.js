/**
 * ONE MORE RUSH — Authentication & User Profile Service (Phase 6B / Phase 2.1)
 * Supports Email/Password authentication, anonymous guest sessions, session restoration,
 * profile updates, and case-insensitive username setup.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase.js';

// Regex for valid username: 3 to 20 alphanumeric characters or underscores, no spaces
export const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

/**
 * Checks if the username is the default auto-generated placeholder (player_<8 chars of this user's uuid>)
 */
export function isPlaceholderUsername(username, userId) {
  if (!username || typeof username !== 'string') return true;
  const trimmed = username.trim();
  if (!trimmed) return true;
  if (!userId) return false;
  const rawId = String(userId).toLowerCase();
  const cleanId = rawId.replace(/-/g, '');
  const lowerUser = trimmed.toLowerCase();
  const placeholder1 = `player_${rawId.substring(0, 8)}`;
  const placeholder2 = `player_${cleanId.substring(0, 8)}`;
  return lowerUser === placeholder1 || lowerUser === placeholder2;
}

/**
 * Validates a candidate username according to ONE MORE RUSH rules
 */
export function validateUsername(username) {
  if (!username || typeof username !== 'string') {
    return { valid: false, error: 'Username is required.' };
  }
  const trimmed = username.trim();
  if (trimmed.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters.' };
  }
  if (trimmed.length > 20) {
    return { valid: false, error: 'Username cannot exceed 20 characters.' };
  }
  if (!USERNAME_REGEX.test(trimmed)) {
    return { valid: false, error: 'Username can only contain letters, numbers, and underscores.' };
  }
  return { valid: true, error: null, sanitized: trimmed };
}

/**
 * Friendly error translator for Supabase Auth and Database errors
 */
export function formatAuthError(err) {
  if (!err) return null;
  const msg = typeof err === 'string' ? err : err.message || '';

  if (msg.includes('Username change limit exceeded') || msg.includes('Username may only be changed once')) {
    return 'Your one-time username change has already been used. Usernames can no longer be modified.';
  }
  if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials')) {
    return 'Incorrect email or password. Please double check and try again.';
  }
  if (msg.includes('User already registered') || msg.includes('already registered')) {
    return 'An account with this email already exists. Please sign in.';
  }
  if (msg.includes('Password should be at least') || msg.includes('weak_password')) {
    return 'Password must be at least 6 characters long.';
  }
  if (msg.includes('duplicate key') || msg.includes('profiles_username_lower') || msg.includes('unique constraint')) {
    return 'This username is already taken. Please choose a different one.';
  }
  if (msg.includes('rate limit') || msg.includes('over_email_send_rate_limit')) {
    return 'Too many attempts. Please wait a moment before trying again.';
  }
  if (msg.includes('Failed to fetch') || msg.includes('network')) {
    return 'Network connection issue. Please check your connection and retry.';
  }
  if (msg.includes('Email not confirmed')) {
    return 'Please check your inbox to verify your email before logging in.';
  }
  if (msg.includes('Anonymous sign-ins are disabled') || msg.includes('anonymous_provider_disabled')) {
    return 'Anonymous guest access is currently not enabled on the server.';
  }
  return msg || 'An unexpected error occurred. Please try again.';
}

/**
 * Signs in anonymously to establish a stable Supabase Auth guest identity (Phase 2.1)
 */
export async function signInAnonymously() {
  if (!isSupabaseConfigured || !supabase) {
    return { user: null, session: null, error: 'Backend is not currently configured.' };
  }

  try {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) {
      return { user: null, session: null, error: formatAuthError(error) };
    }
    return {
      user: data.user,
      session: data.session,
      error: null,
    };
  } catch (err) {
    return { user: null, session: null, error: formatAuthError(err) };
  }
}

/**
 * Signs up a new player with email and password, or upgrades an existing anonymous guest session
 */
export async function signUp({ email, password, username, currentUser = null }) {
  if (!isSupabaseConfigured || !supabase) {
    return { user: null, session: null, error: 'Backend is not currently configured.' };
  }

  const cleanEmail = email.trim();
  const validUser = username ? validateUsername(username) : null;
  if (username && validUser && !validUser.valid) {
    return { user: null, session: null, error: validUser.error };
  }

  const isAnonymous = Boolean(currentUser?.is_anonymous || currentUser?.app_metadata?.provider === 'anonymous');

  try {
    // If the current session is an anonymous guest, UPGRADE the existing anonymous identity
    if (isAnonymous && currentUser?.id) {
      const beforeUserId = currentUser.id;
      console.info('[Auth] Upgrading anonymous guest identity to permanent account...', { beforeUserId });

      const { data, error } = await supabase.auth.updateUser({
        email: cleanEmail,
        password,
        data: {
          username: validUser?.sanitized || null,
          display_name: validUser?.sanitized || cleanEmail.split('@')[0],
        },
      });

      if (error) {
        return { user: null, session: null, error: formatAuthError(error) };
      }

      const afterUserId = data.user?.id;
      console.info('[Auth] Anonymous guest successfully upgraded to permanent account.', {
        beforeUserId,
        afterUserId,
        idPreserved: beforeUserId === afterUserId,
      });

      // Verify active session state and determine if Supabase requires email confirmation
      const { data: sessionData } = await supabase.auth.getSession();
      const currentSession = sessionData?.session;
      const hasActiveConfirmedSession = Boolean(
        currentSession?.user &&
        currentSession.user.email === cleanEmail &&
        !data.user?.email_change &&
        !data.user?.new_email
      );

      const needsEmailConfirmation = Boolean(
        !hasActiveConfirmedSession ||
        data.user?.email_change ||
        data.user?.new_email ||
        (!data.user?.email_confirmed_at && data.user?.confirmation_sent_at)
      );

      return {
        user: data.user,
        session: needsEmailConfirmation ? null : (currentSession || null),
        needsEmailConfirmation,
        isUpgradedFromAnonymous: true,
        error: null,
      };
    }

    // Standard new signup for users without an active anonymous session
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          username: validUser?.sanitized || null,
          display_name: validUser?.sanitized || cleanEmail.split('@')[0],
        },
      },
    });

    if (error) {
      return { user: null, session: null, error: formatAuthError(error) };
    }

    const needsEmailConfirmation = Boolean(data.user && !data.session);

    return {
      user: data.user,
      session: data.session,
      needsEmailConfirmation,
      isUpgradedFromAnonymous: false,
      error: null,
    };
  } catch (err) {
    return { user: null, session: null, error: formatAuthError(err) };
  }
}

/**
 * Signs in an existing player with email and password
 */
export async function signIn({ email, password }) {
  if (!isSupabaseConfigured || !supabase) {
    return { user: null, session: null, error: 'Backend is not currently configured.' };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      return { user: null, session: null, error: formatAuthError(error) };
    }

    return {
      user: data.user,
      session: data.session,
      error: null,
    };
  } catch (err) {
    return { user: null, session: null, error: formatAuthError(err) };
  }
}

/**
 * Signs out the current authenticated player
 */
export async function signOut() {
  if (!isSupabaseConfigured || !supabase) {
    return { error: null };
  }

  try {
    const { error } = await supabase.auth.signOut();
    return { error: error ? formatAuthError(error) : null };
  } catch (err) {
    return { error: formatAuthError(err) };
  }
}

/**
 * Fetches profile record for a given user UUID
 */
export async function getProfile(userId) {
  if (!isSupabaseConfigured || !supabase || !userId) {
    return { profile: null, error: null };
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      return { profile: null, error: formatAuthError(error) };
    }

    return { profile: data, error: null };
  } catch (err) {
    return { profile: null, error: formatAuthError(err) };
  }
}

/**
 * Checks whether a username is available (case-insensitive)
 */
export async function isUsernameAvailable(username, currentUserId = null) {
  if (!isSupabaseConfigured || !supabase) {
    return { available: true, error: null };
  }

  const validation = validateUsername(username);
  if (!validation.valid) {
    return { available: false, error: validation.error };
  }

  try {
    const lower = validation.sanitized.toLowerCase();
    let query = supabase
      .from('profiles')
      .select('id')
      .ilike('username', lower);

    if (currentUserId) {
      query = query.neq('id', currentUserId);
    }

    const { data, error } = await query.limit(1);

    if (error) {
      return { available: false, error: formatAuthError(error) };
    }

    return { available: !data || data.length === 0, error: null };
  } catch (err) {
    return { available: false, error: formatAuthError(err) };
  }
}

/**
 * Updates an authenticated player's profile fields in public.profiles
 */
export async function updateProfile(userId, updates) {
  if (!isSupabaseConfigured || !supabase || !userId) {
    return { success: false, error: 'Backend is not currently configured.' };
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      return { success: false, error: formatAuthError(error) };
    }

    return { success: true, profile: data, error: null };
  } catch (err) {
    return { success: false, error: formatAuthError(err) };
  }
}

/**
 * Updates an authenticated player's username
 */
export async function updateUsername(userId, newUsername) {
  const validation = validateUsername(newUsername);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const sanitized = validation.sanitized;
  const { available, error: availError } = await isUsernameAvailable(sanitized, userId);
  if (availError) {
    return { success: false, error: availError };
  }
  if (!available) {
    return { success: false, error: 'This username is already taken. Please choose another.' };
  }

  return updateProfile(userId, {
    username: sanitized,
    display_name: sanitized,
  });
}

/**
 * Synchronizes equipped cosmetics to the user's public profile in Supabase
 */
export async function syncEquippedCosmeticsToProfile(cosmeticUpdates, userId = null) {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: 'Backend is not currently configured.' };
  }

  try {
    let targetUserId = userId;
    if (!targetUserId) {
      const { data: { session } } = await supabase.auth.getSession();
      targetUserId = session?.user?.id;
    }
    if (!targetUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      targetUserId = user?.id;
    }
    if (!targetUserId) return { success: false, error: 'User is not registered' };

    return updateProfile(targetUserId, cosmeticUpdates);
  } catch (err) {
    return { success: false, error: formatAuthError(err) };
  }
}

/**
 * Username change eligibility check
 * Derives authority strictly from server profile (username_changes_count >= 1).
 * Falls back to localStorage cache if profile is not yet hydrated.
 */
export function hasUsedUsernameChange(userId, profile = null) {
  if (profile && typeof profile.username_changes_count === 'number') {
    return profile.username_changes_count >= 1;
  }
  if (!userId) return false;
  try {
    const key = `oneMoreRush.user_${userId}.usernameChangeUsed`;
    return window.localStorage.getItem(key) === 'true';
  } catch (_) {
    return false;
  }
}

export function markUsernameChangeUsed(userId) {
  if (!userId) return;
  try {
    const key = `oneMoreRush.user_${userId}.usernameChangeUsed`;
    window.localStorage.setItem(key, 'true');
  } catch (_) {}
}

