# ONE MORE RUSH — Backend Architecture Specification

## 1. Overview & Platform Choice

ONE MORE RUSH uses **Supabase (PostgreSQL)** as its backend infrastructure platform. 

### Why Supabase?
- **Standard PostgreSQL**: Full ACID compliance, robust indexing, JSONB support for rich game telemetry, and strong relational constraints.
- **Built-in Row Level Security (RLS)**: Fine-grained security at the database engine level.
- **Seamless Auth Integration**: Native 1:1 mapping with `auth.users` and cryptographic JWTs.
- **Database RPC Aggregation**: Server-side window functions (`DENSE_RANK()`, `ROW_NUMBER()`) for efficient one-best-score-per-player leaderboard queries without downloading entire tables.
- **Edge Functions / Server Authority**: Serverless runtime for anti-cheat verification and server-authoritative Rush Point ledgers in Phase 6D.

---

## 2. Environment Variables & Security

Configuration is managed via standard Vite environment variables.

| Variable Name | Exposure | Description | Example |
| :--- | :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | Public (Client) | Supabase project API gateway | `https://xyz.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Public (Client) | Supabase public anonymous API key | `eyJhbGciOi...` |
| `VITE_SITE_URL` | Public (Client) | Canonical production domain | `https://onemorerush.com` |

> [!IMPORTANT]
> **Strict Security Rule:** `service_role` keys, database passwords, and private API secrets must **never** be added to `.env`, client code, or public repositories. Only the `anon` key is used in frontend code with PostgreSQL Row Level Security (RLS).

---

## 3. Database Schema & Tables

The schema is maintained via versioned SQL migrations in `supabase/migrations/`.

### 3.1 `profiles` Table
Stores player identity, display preferences, and unlocked/equipped cosmetic references.

```sql
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_frame TEXT NOT NULL DEFAULT 'classic',
  title TEXT NOT NULL DEFAULT 'rookie',
  victory_effect TEXT NOT NULL DEFAULT 'none',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT username_length CHECK (char_length(username) >= 3 AND char_length(username) <= 20)
);
```

### 3.2 `game_scores` Table
Normalized table storing score submissions across all 6 arcade games with structured JSONB telemetry.

```sql
CREATE TABLE public.game_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  game_id TEXT NOT NULL CHECK (game_id IN ('aim', 'dodge', 'stack', 'number-rush', 'memory', 'color-maze')),
  score BIGINT NOT NULL CHECK (score >= 0),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
```

### 3.3 Database Indexes & Unique Constraints
- `idx_profiles_username_lower`: `(lower(trim(username)))` for case-insensitive unique player handles.
- `idx_game_scores_game_score`: `(game_id, score DESC)` for fast leaderboard queries.
- `idx_game_scores_user_game`: `(user_id, game_id)` for quick personal record lookups.
- `idx_game_scores_created`: `(created_at DESC)` for time-sliced leaderboard queries.

### 3.4 RPC Functions (Phase 6C)
- `public.get_game_leaderboard(p_game_id text, p_limit int)`: Aggregates the top player runs using `ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY score DESC)` to guarantee **exactly one entry per player** with their equipped frame and title.
- `public.get_user_game_rank(p_game_id text, p_user_id uuid)`: Computes the specific player's dense rank and personal best score for the requested game.

---

## 4. Row Level Security (RLS) Policies

Both `profiles` and `game_scores` enforce strict RLS:

```
[Public / Anonymous Users]
  ├─ SELECT profiles (Read public usernames & frames) ────► ALLOW
  ├─ SELECT game_scores (Read leaderboard rankings) ──────► ALLOW
  ├─ EXECUTE RPC get_game_leaderboard / get_user_game_rank ► ALLOW
  └─ INSERT / UPDATE / DELETE ───────────────────────────► DENY

[Authenticated Users]
  ├─ SELECT (all public profiles and scores) ─────────────► ALLOW
  ├─ INSERT own profile (auth.uid() = id) ────────────────► ALLOW
  ├─ UPDATE own profile cosmetics/username (auth.uid()=id) ► ALLOW
  ├─ INSERT own game_scores (auth.uid() = user_id) ──────► ALLOW
  └─ UPDATE / DELETE another user's scores ───────────────► DENY
```

---

## 5. Storage & Reward State Model

| Storage Key | Type | Authority | Description |
| :--- | :--- | :--- | :--- |
| `onemore_best_aim` | `number` | LocalStorage | AIM personal best score |
| `onemore_best_dodge` | `number` | LocalStorage | DODGE personal best score |
| `onemore_best_stack` | `number` | LocalStorage | STACK personal best score |
| `onemore_best_stack_height`| `number` | LocalStorage | STACK personal best tower height |
| `onemore_best_number_rush` | `number` | LocalStorage | NUMBER RUSH personal best score |
| `onemore_best_memory` | `number` | LocalStorage | MEMORY personal best score |
| `oneMoreRush.colorMaze` | `JSON Object` | LocalStorage | COLOR MAZE progress `{ highestUnlockedLevel, totalStars, levels, overallBestScore }` |
| `oneMoreRush.points` | `number` | LocalStorage (Cloud in 6D) | Total Rush Points balance |
| `oneMoreRush.locker` | `JSON Object` | LocalStorage (Cloud in 6E) | Cosmetic inventory & equipped items |
| `oneMoreRush.dailyProgress`| `JSON Object` | LocalStorage (Cloud in 6D) | Daily challenge streak and completion history |
| `onemore_daily_visit_date` | `string` (YYYY-MM-DD) | LocalStorage (Cloud in 6D) | Last claimed Daily Visit Reward (+10 RP) date |

> [!NOTE]
> **Daily Visit Reward (+10 RP)**: Currently operates as an idempotent local reward granted once per calendar day upon visiting the site. In Phase 6D, this will be synchronized to a server-authoritative ledger in Supabase.

---

## 6. Phase Roadmap

```
┌─────────────────────────────────────────────────────────────┐
│ Phase 6A: Backend Foundation & DB Architecture (COMPLETE)    │
│ - Supabase client setup, SQL initial schema, RLS policies   │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Phase 6B: Authentication & Profile System (COMPLETE)        │
│ - Email/Password auth, session persistence, username claim  │
│ - Case-insensitive handles, permission fix (PG 42501)       │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Phase 6C: Global Leaderboards & Score Submission (COMPLETE) │
│ - Strict personal-best-only score submission                │
│ - 1-per-player leaderboard RPC aggregation                  │
│ - Profile cosmetic synchronization (frames & titles)        │
│ - Guest local-only gameplay & public leaderboard viewing    │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Phase 6D: Rush Points & Daily Challenge Cloud Authority     │
│ - Server-validated daily mission completions & ledger       │
│ - Tamper-proof cloud Rush Points balances                   │
│ - Server-authoritative daily visit claim verification       │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Phase 6E: Rush Locker Cloud Sync & Cosmetics Ownership      │
│ - Cross-device cosmetic item ownership & profile frames     │
└─────────────────────────────────────────────────────────────┘
```
