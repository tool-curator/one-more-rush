/**
 * ONE MORE RUSH — Supabase Client Module
 * Safe frontend client configuration with fallback availability flag.
 * Only public VITE_ keys are exposed here. Never include service_role or secrets.
 */

import { createClient } from '@supabase/supabase-js';

const env =
  typeof import.meta !== 'undefined' && import.meta.env
    ? import.meta.env
    : typeof process !== 'undefined' && process.env
    ? process.env
    : {};

const supabaseUrl = env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || '';

export let isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('https://') &&
  supabaseAnonKey.length > 10
);

export let supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export function setMockSupabaseClient(mockClient) {
  supabase = mockClient;
  isSupabaseConfigured = Boolean(mockClient);
}

/**
 * Helper to check client readiness and provide unified error logging
 */
export function getSupabaseClient() {
  if (!isSupabaseConfigured || !supabase) {
    return { client: null, available: false, error: 'SUPABASE_NOT_CONFIGURED' };
  }
  return { client: supabase, available: true, error: null };
}
