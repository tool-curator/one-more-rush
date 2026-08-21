-- ============================================================================
-- ONE MORE RUSH — Migration 00016: Remove Obsolete Legacy RPC Wrapper
-- Drops the obsolete public.migrate_legacy_rush_points(bigint) function originally
-- introduced in early migrations, ensuring public.convert_guest_account(text)
-- is the sole active guest conversion RPC.
-- ============================================================================

-- Safely and idempotently drop dead legacy migration RPC
drop function if exists public.migrate_legacy_rush_points(bigint);
