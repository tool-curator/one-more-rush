/**
 * ONE MORE RUSH — Backend Service Layer (Phase 6A Foundation)
 * Isolated abstraction for future authentication, score sync, and cloud persistence.
 * Zero game components or UI layers interact with Supabase directly.
 */

import { supabase, isSupabaseConfigured } from '../../lib/supabase.js';

export const BACKEND_STATUS = {
  AVAILABLE: isSupabaseConfigured,
  STORAGE_MODE: isSupabaseConfigured ? 'HYBRID' : 'LOCAL_ONLY',
};

/**
 * Health check helper for backend connectivity
 */
export async function checkBackendHealth() {
  if (!isSupabaseConfigured || !supabase) {
    return { connected: false, mode: 'LOCAL_ONLY', reason: 'ENV_VARIABLES_UNSET' };
  }

  try {
    const { error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
    if (error && error.code !== 'PGRST116') {
      return { connected: false, mode: 'LOCAL_ONLY', error: error.message };
    }
    return { connected: true, mode: 'HYBRID', error: null };
  } catch (err) {
    return { connected: false, mode: 'LOCAL_ONLY', error: err.message };
  }
}
