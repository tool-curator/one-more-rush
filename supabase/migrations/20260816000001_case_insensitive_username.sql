-- ============================================================================
-- ONE MORE RUSH — Phase 6B Case-Insensitive Username Uniqueness
-- Ensures database-level uniqueness across any casing (e.g., Gautam vs gautam)
-- ============================================================================

-- Create unique index on lower(username) for case-insensitive uniqueness
create unique index if not exists idx_profiles_username_lower
  on public.profiles (lower(trim(username)));
