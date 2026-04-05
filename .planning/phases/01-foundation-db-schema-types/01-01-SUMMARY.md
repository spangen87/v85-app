---
phase: 01-foundation-db-schema-types
plan: 01
subsystem: database-schema-types
tags: [supabase, migration, typescript, track-config, rls, server-action, tdd]
dependency_graph:
  requires: []
  provides:
    - track_configs table (Supabase)
    - TrackConfig TypeScript interface
    - getTrackConfig() server action
  affects:
    - Phase 3: CS adjustment algorithm can now look up track-specific config
    - Phase 3: Admin UI can read/write track_configs via service client
tech_stack:
  added: []
  patterns:
    - Server action using createServiceClient() (synchronous) for DB reads
    - RLS policy: authenticated SELECT, service_role ALL
    - TDD: test stub (RED) before implementation (GREEN)
key_files:
  created:
    - supabase/migration_v9_track_configs.sql
    - lib/actions/tracks.ts
    - lib/__tests__/track_config.test.ts
  modified:
    - lib/types.ts
decisions:
  - track_name is PRIMARY KEY (TEXT) — join key must match games.track exactly
  - open_stretch=true seeded for Solvalla and Jägersro (outer lanes 7-12); all others false
  - short_race_threshold=1640 for all tracks (correctable via Phase 3 admin UI)
  - RLS write via service_role only; no authenticated write policy
  - Seed values are best-guess; Phase 3 admin UI provides correction path
metrics:
  duration: ~10 min
  completed: "2026-04-05"
  tasks_completed: 4
  tasks_total: 5
  files_created: 3
  files_modified: 1
requirements:
  - TRACK-DB-01
  - TRACK-DB-02
  - TRACK-DB-03
  - TRACK-DB-04
  - TRACK-DB-05
---

# Phase 01 Plan 01: Foundation DB Schema + Types Summary

**One-liner:** Supabase `track_configs` table with 15 Swedish trotting tracks, RLS policies, `TrackConfig` TypeScript interface, and `getTrackConfig()` server action — all unit-tested and TypeScript-clean.

## What Was Built

### 1. Migration v9 — `supabase/migration_v9_track_configs.sql`

New table `track_configs` with the following schema:

| Column | Type | Default |
|--------|------|---------|
| `track_name` | TEXT PRIMARY KEY | — |
| `open_stretch` | BOOLEAN NOT NULL | false |
| `open_stretch_lanes` | INTEGER[] NOT NULL | '{}' |
| `short_race_threshold` | INTEGER NOT NULL | 0 |
| `active` | BOOLEAN NOT NULL | true |
| `updated_at` | TIMESTAMPTZ NOT NULL | now() |

RLS policies:
- `"Inloggade kan läsa track_configs"` — SELECT for `auth.role() = 'authenticated'`
- `"Service kan skriva track_configs"` — ALL for `auth.role() = 'service_role'`

15-row seed INSERT with `ON CONFLICT (track_name) DO NOTHING`.

### 2. TrackConfig interface — `lib/types.ts`

Appended after existing `GameSystem` interface (line 87). No existing interfaces modified.

```typescript
export interface TrackConfig {
  track_name: string;
  open_stretch: boolean;
  open_stretch_lanes: number[];
  short_race_threshold: number;
  active: boolean;
  updated_at: string;
}
```

### 3. Server action — `lib/actions/tracks.ts`

```typescript
export async function getTrackConfig(trackName: string): Promise<TrackConfig | null>
```

Follows the `getGroupById` pattern from `lib/actions/groups.ts`. Uses `createServiceClient()` (synchronous), `.eq("track_name", trackName).single()`. Returns null on error.

### 4. Unit tests — `lib/__tests__/track_config.test.ts`

3 tests with mocked Supabase client:
- `returnerar TrackConfig för känd bana` — success path
- `returnerar null för okänd bana` — error path (null return)
- `open_stretch_lanes är number[]` — array type assertion

All 3 tests pass. Full suite: 91 tests passing across 8 test suites.

## Track Name Verification

**Status: Not yet verified against live database.**

Per STATE.md data risk note: `track_name` must match `games.track` (ATG API `track.name` field) exactly. The seed values use best-guess short-form names (no "travbana" suffix).

Seed values used:
| Track | open_stretch | open_stretch_lanes | short_race_threshold |
|-------|-------------|---------------------|---------------------|
| Solvalla | true | [7,8,9,10,11,12] | 1640 |
| Åby | false | [] | 1640 |
| Jägersro | true | [7,8,9,10,11,12] | 1640 |
| Romme | false | [] | 1640 |
| Bergsåker | false | [] | 1640 |
| Halmstad | false | [] | 1640 |
| Mantorp | false | [] | 1640 |
| Rättvik | false | [] | 1640 |
| Kalmar | false | [] | 1640 |
| Axevalla | false | [] | 1640 |
| Gävle | false | [] | 1640 |
| Örebro | false | [] | 1640 |
| Eskilstuna | false | [] | 1640 |
| Uppsala | false | [] | 1640 |
| Umåker | false | [] | 1640 |

**open_stretch values note:** Solvalla=true and Jägersro=true are assumed based on known Swedish trotting track layouts. These values should be confirmed and corrected via Phase 3 admin UI if needed.

**Action required at Task 5 checkpoint:** Run the LEFT JOIN verification query against the live games table to detect name mismatches before phase sign-off.

## Task 4 Status: Manual Migration Required

The Supabase CLI `db push` requires a linked project (`SUPABASE_ACCESS_TOKEN` not set in environment, `supabase link` not configured in this worktree). The migration must be applied manually:

1. Open Supabase Dashboard → project `wehxpwfnxefdfiknmgos` → SQL Editor
2. Copy and paste the full contents of `supabase/migration_v9_track_configs.sql`
3. Execute the SQL

## Commits

| Hash | Type | Description |
|------|------|-------------|
| `98fcb75` | test | Add failing tests for getTrackConfig (RED) |
| `e8eab40` | chore | Add migration v9 — track_configs table, RLS, 15-row seed |
| `3c2d428` | feat | Add TrackConfig interface and getTrackConfig server action |

## Deviations from Plan

### Auth Gate: Supabase CLI push not available

**Found during:** Task 4
**Issue:** `SUPABASE_ACCESS_TOKEN` not set in environment; `supabase link` not configured. `npx supabase db push` exits with "Cannot find project ref."
**Fix:** Migration must be applied manually via Supabase Dashboard SQL Editor (as the plan itself anticipated as fallback). This is documented at Task 5 checkpoint.
**Impact:** Task 4 code verification (dry-run confirms migration file is syntactically valid; actual push is manual).

No other deviations — plan executed exactly as written.

## Phase 3 Dependency

`TrackConfig` interface in `lib/types.ts` is stable and exported. Phase 3 imports it via:
```typescript
import type { TrackConfig } from '@/lib/types';
```

`getTrackConfig()` in `lib/actions/tracks.ts` is the sole server action for track config reads. Phase 3 admin write actions will use a separate `updateTrackConfig()` in the same file (not implemented in this plan — out of scope for Phase 1).

## Known Stubs

None — all code paths are implemented and tested. The seed data values (open_stretch, open_stretch_lanes) are best-guess but are explicitly documented as such and correctable via Phase 3 admin UI.

## Self-Check: PASS (partial — pending Task 5 checkpoint)

Files created:
- supabase/migration_v9_track_configs.sql — EXISTS
- lib/actions/tracks.ts — EXISTS
- lib/__tests__/track_config.test.ts — EXISTS
- lib/types.ts (TrackConfig appended) — EXISTS

Commits:
- 98fcb75 — EXISTS
- e8eab40 — EXISTS
- 3c2d428 — EXISTS

Tests: 3/3 passing. Full suite: 91/91 passing.
TypeScript: npx tsc --noEmit exits 0.

Pending: Task 4 manual migration + Task 5 human verification checkpoint.
