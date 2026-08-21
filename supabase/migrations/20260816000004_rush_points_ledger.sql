-- ============================================================================
-- ONE MORE RUSH — Phase 6D-A Cloud Rush Points Transaction Ledger
-- Server-authoritative economy foundation for Rush Points balances & rewards
-- ============================================================================

-- 1. Create Transaction Ledger Table
create table if not exists public.rush_point_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount bigint not null check (amount <> 0),
  source text not null,
  source_id text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- 2. Indexes for Performance & Duplicate Claim Protection
-- Fast lookup of user transaction history
create index if not exists idx_rpt_user_id 
  on public.rush_point_transactions(user_id);

-- Time-sorted ledger queries
create index if not exists idx_rpt_created_at 
  on public.rush_point_transactions(created_at desc);

-- Idempotent unique constraint for source-specific rewards (e.g. daily_visit + 2026-08-16)
create unique index if not exists idx_rpt_user_source_id 
  on public.rush_point_transactions(user_id, source, source_id) 
  where source_id is not null;

-- 3. Row Level Security (RLS)
alter table public.rush_point_transactions enable row level security;

-- Authenticated users can ONLY SELECT their own transaction history
create policy "Users can view own transactions"
  on public.rush_point_transactions
  for select
  to authenticated
  using (auth.uid() = user_id);

-- NO DIRECT INSERT / UPDATE / DELETE POLICIES FOR CLIENTS
-- All modifications must occur through validated server-side RPC functions.

-- 4. Grants & Privilege Hardening
-- Grant SELECT only to authenticated users (evaluated via RLS)
grant select on table public.rush_point_transactions to authenticated;

-- Ensure anonymous users have zero access to the transaction ledger
revoke all on table public.rush_point_transactions from anon;

-- Explicitly revoke direct client modification privileges
revoke insert, update, delete on table public.rush_point_transactions from authenticated;

-- 5. Read-Only Function: Get Player's Authoritative Cloud Balance
create or replace function public.get_user_rush_points_balance(p_user_id uuid)
returns bigint as $$
declare
  v_balance bigint;
begin
  -- Validate caller authority: authenticated user can only query their own balance
  if auth.role() = 'authenticated' and auth.uid() <> p_user_id then
    raise exception 'Unauthorized balance query' using errcode = '42501';
  end if;

  select coalesce(sum(amount), 0)::bigint
  into v_balance
  from public.rush_point_transactions
  where user_id = p_user_id;

  return v_balance;
end;
$$ language plpgsql stable security definer set search_path = public;

-- Grant execution to authenticated users
grant execute on function public.get_user_rush_points_balance(uuid) to authenticated;
revoke execute on function public.get_user_rush_points_balance(uuid) from anon;
