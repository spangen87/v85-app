# Phase 1: Foundation — DB Schema & Types - Research

**Researched:** 2026-04-05
**Domain:** Supabase PostgreSQL schema, RLS, TypeScript interfaces, Next.js Server Actions
**Confidence:** HIGH

---

## Summary

Phase 1 is a pure database + types phase: create the `track_configs` table, seed it with 15 Swedish
trotting tracks, define the `TrackConfig` TypeScript interface, and expose a `getTrackConfig(name)`
server action. No UI work. No analysis formula changes. Everything produced here is consumed
unchanged by Phase 3.

The codebase has fully established patterns for all four tasks (migration SQL, RLS policy, TS
interface, server action). There is nothing new to introduce — the work is additive and follows
patterns already present in migrations v4–v8 and in `lib/actions/groups.ts`.

The one risk is the ATG track-name string format: `games.track` is populated from
`AtgGame.track`, which comes from `race[0].track` which in turn comes from ATG JSON
`race.track.name`. The seed data must use the exact strings the ATG API produces or
`getTrackConfig()` will silently return `null` for every lookup. This must be verified against
live `games` rows before finalising the migration seed.

**Primary recommendation:** Follow the migration_v7 / migration_v8 file pattern exactly.
Use `service_role` for the write RLS policy (same as all other tables). Enforce admin check in
the server action via `ADMIN_USER_IDS` env var, not in the database.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TRACK-DB-01 | New `track_configs` table with columns: track_name (text PK), open_stretch (bool), open_stretch_lanes (int[]), short_race_threshold (int), active (bool) | Schema pattern from schema.sql + migration files; RLS pattern from migration_v4 |
| TRACK-DB-02 | Table pre-seeded via migration with 15 known Swedish trotting tracks | Swedish track list documented below; ATG track name format documented in `lib/atg.ts` |
| TRACK-DB-03 | TypeScript interface `TrackConfig` in `lib/types.ts` | Existing interface patterns in `lib/types.ts` — all plain types, no generics needed |
| TRACK-DB-04 | Server Action `getTrackConfig(trackName)` in `lib/actions/` | Pattern in `lib/actions/groups.ts → getGroupById()`; uses `createServiceClient` + `.single()` |
| TRACK-DB-05 | RLS: authenticated users can SELECT; anon/browser cannot INSERT/UPDATE/DELETE | Pattern in schema.sql lines 61–70; service_role policy for write as in all other tables |
</phase_requirements>

---

## Project Constraints (from CLAUDE.md)

| Directive | Applies to Phase 1 |
|-----------|-------------------|
| **Server Actions** for all DB operations (in `lib/actions/`) | `getTrackConfig()` goes in `lib/actions/` |
| **Route Handlers** for external ATG calls only | Not relevant — no ATG calls in this phase |
| Supabase client: `createClient` (browser) vs `createServiceClient` (server/actions) | `getTrackConfig` uses `createServiceClient` (read-only service bypass, consistent with other read actions) |
| All UI text in **svenska** | Not relevant — no UI in this phase |
| Database changes: add migration in `supabase/migration_v<N>_<namn>.sql` | New file: `supabase/migration_v9_track_configs.sql` |
| Tests in `lib/__tests__/` with Jest + ts-jest | `lib/__tests__/track_config.test.ts` for the server action (mocked) |
| Git branch: `claude/<description>-<session-id>` | Applies at execution time |

---

## Standard Stack

### Core (already installed — zero new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | ^2.98.0 | Supabase client for DB ops | Already installed [VERIFIED: package.json] |
| `@supabase/ssr` | ^0.8.0 | Server-side Supabase client (SSR-safe) | Already installed [VERIFIED: package.json] |
| TypeScript | ^5 | Interface definition | Already installed [VERIFIED: package.json] |
| Jest + ts-jest | ^30.2.0 / ^29.4.6 | Unit tests | Already installed [VERIFIED: package.json] |

**Installation:** No new packages needed. [VERIFIED: package.json — all required tools already present]

---

## Architecture Patterns

### Recommended Project Structure

This phase touches exactly these files:

```
supabase/
  migration_v9_track_configs.sql   # CREATE TABLE + RLS + seed INSERT

lib/
  types.ts                          # Add TrackConfig interface (additive)
  actions/
    tracks.ts                       # New: getTrackConfig(trackName)

lib/__tests__/
  track_config.test.ts              # New: unit test for getTrackConfig
```

No new directories. No changes to existing components, pages, or API routes.

### Pattern 1: Migration File Structure

All migrations follow this exact format — `CREATE TABLE IF NOT EXISTS`, then `ALTER TABLE ENABLE ROW LEVEL SECURITY`, then `CREATE POLICY`, then optional `CREATE INDEX`. Seed data goes in the same file via `INSERT ... ON CONFLICT DO NOTHING`.

```sql
-- Source: supabase/migration_v7_game_systems.sql (established pattern)
-- Migration v9: Track configuration
-- Kör i Supabase Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS track_configs (
  track_name             TEXT        PRIMARY KEY,
  open_stretch           BOOLEAN     NOT NULL DEFAULT false,
  open_stretch_lanes     INTEGER[]   NOT NULL DEFAULT '{}',
  short_race_threshold   INTEGER     NOT NULL DEFAULT 0,
  active                 BOOLEAN     NOT NULL DEFAULT true,
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE track_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Inloggade kan läsa track_configs"
  ON track_configs FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Service kan skriva track_configs"
  ON track_configs FOR ALL
  USING (auth.role() = 'service_role');

-- Seed data (15 Swedish trotting tracks)
INSERT INTO track_configs (track_name, open_stretch, open_stretch_lanes, short_race_threshold, active)
VALUES
  ('Solvalla',      true,  ARRAY[7,8,9,10,11,12],  1640, true),
  ('Åby',           false, '{}',                    1640, true),
  ('Jägersro',      true,  ARRAY[7,8,9,10,11,12],  1640, true),
  ('Romme',         false, '{}',                    1640, true),
  ('Bergsåker',     false, '{}',                    1640, true),
  ('Halmstad',      false, '{}',                    1640, true),
  ('Mantorp',       false, '{}',                    1640, true),
  ('Rättvik',       false, '{}',                    1640, true),
  ('Kalmar',        false, '{}',                    1640, true),
  ('Axevalla',      false, '{}',                    1640, true),
  ('Gävle',         false, '{}',                    1640, true),
  ('Örebro',        false, '{}',                    1640, true),
  ('Eskilstuna',    false, '{}',                    1640, true),
  ('Uppsala',       false, '{}',                    1640, true),
  ('Umåker',        false, '{}',                    1640, true)
ON CONFLICT (track_name) DO NOTHING;
```

[ASSUMED: open_stretch_lanes values for Solvalla and Jägersro — need verification against race data or domain knowledge before finalising seed]
[ASSUMED: short_race_threshold default 1640m — matches requirement text "kort lopp-gräns (int)" but specific per-track values are not in project docs]

### Pattern 2: TypeScript Interface in lib/types.ts

All interfaces are plain TypeScript, no Zod or external validation. Arrays use native TypeScript syntax.

```typescript
// Source: lib/types.ts (additive — append after existing interfaces)
export interface TrackConfig {
  track_name: string;
  open_stretch: boolean;
  open_stretch_lanes: number[];
  short_race_threshold: number;
  active: boolean;
  updated_at: string;
}
```

### Pattern 3: Server Action — Read with createServiceClient

The `getGroupById` function in `groups.ts` is the canonical read-by-key pattern. `getTrackConfig` follows it exactly: service client, `.from().select().eq().single()`, return typed object or null.

```typescript
// Source: lib/actions/groups.ts → getGroupById (established pattern)
"use server";

import { createServiceClient } from "@/lib/supabase/server";
import type { TrackConfig } from "@/lib/types";

export async function getTrackConfig(trackName: string): Promise<TrackConfig | null> {
  const db = createServiceClient();
  const { data } = await db
    .from("track_configs")
    .select("*")
    .eq("track_name", trackName)
    .single();
  return (data as TrackConfig) ?? null;
}
```

Note: `createServiceClient` is synchronous (not `await createClient()`). This is intentional and consistent with all existing read actions that use service client. [VERIFIED: lib/supabase/server.ts line 26 — `export function createServiceClient()` is not async]

### Anti-Patterns to Avoid

- **Do NOT use `createClient()` (browser client) for `getTrackConfig`**: The browser client requires auth cookies. Server actions that read reference data use `createServiceClient` to bypass RLS, consistent with `getGroupById`, `getGroupMembers`, etc.
- **Do NOT check ADMIN_USER_IDS in the RLS policy**: STATE.md decision: "RLS write policy uses service_role; server action enforces ADMIN_USER_IDS env var check". Admin enforcement belongs in the Phase 3 admin UI action, not in the DB policy.
- **Do NOT create a new `lib/supabase/` client file**: The two existing clients (`createClient`, `createServiceClient`) cover all use cases for this phase.
- **Do NOT store `updated_at` as a required field in the TypeScript interface without a default**: The DB has `DEFAULT now()` so it is always present on reads; include it in the interface.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| RLS for read-only table | Custom auth middleware | Supabase RLS policies | Already used on all other tables; auth.role() = 'authenticated' is the project standard |
| Track name normalisation | Custom case-folding | Exact match on `track_name` PK | ATG API returns consistent casing; normalisation adds complexity with no benefit unless mismatch is found |
| Integer array storage | JSON or comma-string | PostgreSQL `INTEGER[]` native array | Supabase JS client serialises/deserialises native PG arrays automatically |

---

## ATG Track Name Format (Critical Risk)

The join between `games.track` and `track_configs.track_name` is the only lookup in this phase. A mismatch is silent: `getTrackConfig()` returns `null` and Phase 3 falls back to static logic (TRACK-CS-06), giving no error but also no track-adjusted CS.

**How track names enter the system:**

From `lib/atg.ts` line 421-422:
```typescript
track: String((race["track"] as Record<string, unknown>)?.["name"] ?? ""),
// ...
track: firstRaceTrack,  // AtgGame.track = races[0].track
```

The ATG JSON field is `race.track.name` — a short Swedish venue name string.

**Known ATG format observations from codebase:**
- `lib/atg.ts` `HorseStart.track` field holds `String(track["name"] ?? race["name"] ?? "")` — same `track.name` field [VERIFIED: lib/atg.ts line 219]
- No existing `games` rows are visible to research (production DB, not accessible) — the actual strings are [ASSUMED] based on Swedish trotting venue names

**[ASSUMED: ATG track name strings]** — The seed data above uses the most common short-form names (e.g., "Solvalla", "Åby", "Jägersro"). These must be validated against real `games` rows before or during execution. The planner should include a verification step: query `SELECT DISTINCT track FROM games LIMIT 20` in Supabase Dashboard before finalising seed values.

---

## Common Pitfalls

### Pitfall 1: Track Name Case / Diacritics Mismatch
**What goes wrong:** ATG returns "Åby" but seed has "Åby travbana" (or vice versa). `getTrackConfig("Åby")` returns null silently.
**Why it happens:** The seed is written before seeing live `games` data. Swedish characters (Å, ä, ö) are also a copy-paste risk.
**How to avoid:** Include a verification step in Wave 0 or Wave 1: query `SELECT DISTINCT track FROM games` against the live DB and compare to seed values before running the migration.
**Warning signs:** `getTrackConfig` always returns null in testing despite table having rows.

### Pitfall 2: createServiceClient vs createClient Confusion
**What goes wrong:** Using `await createClient()` in a server action that doesn't need user context causes auth cookie errors if called from a context with no cookies (e.g., cron, background task).
**Why it happens:** The two factory functions look similar.
**How to avoid:** Use `createServiceClient()` for all reference-data reads (no user context needed). Use `createClient()` only when `auth.getUser()` is required. [VERIFIED: lib/supabase/server.ts — createServiceClient is synchronous, no await needed]

### Pitfall 3: INTEGER[] Array Serialisation
**What goes wrong:** `open_stretch_lanes` comes back from Supabase as `number[]` but code checks `typeof data.open_stretch_lanes === 'string'`.
**Why it happens:** Developers expect JSONB; PostgreSQL arrays are different.
**How to avoid:** Declare the TypeScript interface field as `number[]` and use it directly — Supabase JS driver deserialises PG arrays to JS arrays automatically. No JSON.parse needed.

### Pitfall 4: Migration Number Collision
**What goes wrong:** The next migration is numbered `v9` but another concurrent change also creates a `migration_v9_*.sql`.
**Why it happens:** Multiple branches in flight.
**How to avoid:** Check `supabase/` directory for the highest existing migration number before naming the new file. Current highest is `migration_v8_drafts.sql`. [VERIFIED: supabase/ directory listing]

### Pitfall 5: Missing `"use server"` directive
**What goes wrong:** `getTrackConfig` is imported by a React Server Component but the action file lacks `"use server"` — Next.js throws a runtime error about calling server functions from client context.
**Why it happens:** Forgetting the directive is common in new action files.
**How to avoid:** First line of `lib/actions/tracks.ts` must be `"use server"`. All existing action files follow this convention. [VERIFIED: lib/actions/groups.ts line 1, lib/actions/notes.ts line 1, lib/actions/sallskap.ts line 1]

---

## Code Examples

### Full Migration File (v9)
```sql
-- Source: established pattern from supabase/migration_v7_game_systems.sql
-- Migration v9: Track configuration
-- Kör i Supabase Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS track_configs (
  track_name             TEXT        PRIMARY KEY,
  open_stretch           BOOLEAN     NOT NULL DEFAULT false,
  open_stretch_lanes     INTEGER[]   NOT NULL DEFAULT '{}',
  short_race_threshold   INTEGER     NOT NULL DEFAULT 0,
  active                 BOOLEAN     NOT NULL DEFAULT true,
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE track_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Inloggade kan läsa track_configs"
  ON track_configs FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Service kan skriva track_configs"
  ON track_configs FOR ALL
  USING (auth.role() = 'service_role');
```

### TypeScript Interface (additive to lib/types.ts)
```typescript
// Append to lib/types.ts — no changes to existing interfaces
export interface TrackConfig {
  track_name: string;
  open_stretch: boolean;
  open_stretch_lanes: number[];
  short_race_threshold: number;
  active: boolean;
  updated_at: string;
}
```

### Server Action (lib/actions/tracks.ts)
```typescript
"use server";

import { createServiceClient } from "@/lib/supabase/server";
import type { TrackConfig } from "@/lib/types";

export async function getTrackConfig(trackName: string): Promise<TrackConfig | null> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("track_configs")
    .select("*")
    .eq("track_name", trackName)
    .single();
  if (error) return null;
  return data as TrackConfig;
}
```

### Jest Unit Test (lib/__tests__/track_config.test.ts)
```typescript
// Jest + ts-jest (node environment, per jest.config.js)
// Mock createServiceClient — same pattern as analysis.test.ts which tests pure functions
// getTrackConfig requires Supabase mock

jest.mock("@/lib/supabase/server", () => ({
  createServiceClient: jest.fn(),
}));

import { getTrackConfig } from "../actions/tracks";
import { createServiceClient } from "@/lib/supabase/server";

describe("getTrackConfig", () => {
  it("returnerar TrackConfig för känd bana", async () => {
    const mockDb = {
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({
              data: { track_name: "Solvalla", open_stretch: true, open_stretch_lanes: [7,8,9], short_race_threshold: 1640, active: true, updated_at: "2026-04-05T00:00:00Z" },
              error: null,
            }),
          }),
        }),
      }),
    };
    (createServiceClient as jest.Mock).mockReturnValue(mockDb);
    const result = await getTrackConfig("Solvalla");
    expect(result).not.toBeNull();
    expect(result?.track_name).toBe("Solvalla");
    expect(result?.open_stretch).toBe(true);
  });

  it("returnerar null för okänd bana", async () => {
    const mockDb = {
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: null, error: { message: "No rows" } }),
          }),
        }),
      }),
    };
    (createServiceClient as jest.Mock).mockReturnValue(mockDb);
    const result = await getTrackConfig("Okänd");
    expect(result).toBeNull();
  });
});
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Separate RLS policy per operation (SELECT/INSERT/UPDATE) | Single `FOR ALL` policy for service_role + SELECT-only for authenticated | The project uses `FOR ALL` with service_role consistently — follow the same pattern |
| `uuid_generate_v4()` (requires uuid-ossp extension) | `gen_random_uuid()` (built-in since PG 13) | Migration v4+ uses `gen_random_uuid()`. For `track_configs` (text PK), no UUID function needed at all |

**Deprecated/outdated:**
- `uuid_generate_v4()`: Used in schema.sql (original) but migration_v4 onward uses `gen_random_uuid()`. Not relevant for this phase (text PK, no UUID).

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | ATG track name strings match short form: "Solvalla", "Åby", "Jägersro", etc. | Architecture Patterns / ATG Track Name Format | `getTrackConfig()` returns null for all lookups — Phase 3 silently uses static fallback only |
| A2 | open_stretch is true for Solvalla and Jägersro; false for all others | Architecture Patterns seed data | Wrong track config data — Phase 3 CS adjustments incorrect |
| A3 | open_stretch_lanes for Solvalla: positions 7–12 benefit from open stretch | Architecture Patterns seed data | Incorrect lane bias direction in Phase 3 |
| A4 | short_race_threshold default 1640m is a sensible starting value for all tracks | Architecture Patterns seed data | Threshold too high/low — short-race factor triggers incorrectly |
| A5 | The next migration number is v9 (no v9 file exists currently) | Common Pitfalls | Filename collision with a concurrent migration |

**If A1 is wrong:** The planner must include a verification task (query `SELECT DISTINCT track FROM games`) before the seed INSERT step.

---

## Open Questions (RESOLVED)

1. **What exact strings does ATG return for `race.track.name`?**
   - What we know: The field path is `race.track.name` in ATG JSON, stored verbatim in `games.track`
   - What's unclear: Whether ATG uses "Åby" or "Åby travbana", "Jägersro" or "Jägersro travbana", etc.
   - RESOLVED: Verify at execution time using `SELECT DISTINCT track FROM games ORDER BY track` before writing seed data. If no rows exist yet, seed with short-form best-guess values (e.g., "Åby", "Jägersro") and document that values need verification on first real game fetch. Plan Task 2 includes this step explicitly. Plan Task 5 includes a LEFT JOIN cross-check to detect mismatches.

2. **Which tracks have open stretch (öppen sträcka)?**
   - What we know: Solvalla and Jägersro are commonly cited in Swedish trotting as having open stretches
   - What's unclear: Exact list and which lane numbers benefit
   - RESOLVED: Seed with Solvalla=true (lanes 7–12) and Jägersro=true (lanes 7–12); all others default to false. These values are assumed and correctable via Phase 3 admin UI without a migration.

---

## Environment Availability

Step 2.6: SKIPPED — Phase 1 is purely code + SQL changes. No new external tools, CLIs, or services beyond what is already running (Supabase project, Node.js). All tooling is already available in the project environment.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest 30.2.0 + ts-jest 29.4.6 |
| Config file | `jest.config.js` (project root) |
| Quick run command | `npx jest lib/__tests__/track_config.test.ts` |
| Full suite command | `npx jest` |

[VERIFIED: jest.config.js exists — preset: "ts-jest", testEnvironment: "node", moduleNameMapper @/ alias]

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TRACK-DB-01 | Table exists with correct columns | manual (SQL) | Verified in Supabase Dashboard SQL Editor | N/A |
| TRACK-DB-02 | 15 rows seeded | manual (SQL) | `SELECT count(*) FROM track_configs` | N/A |
| TRACK-DB-03 | TrackConfig interface compiles | unit (TypeScript compile) | `npx tsc --noEmit` | ❌ Wave 0 |
| TRACK-DB-04 | getTrackConfig("Solvalla") returns typed object | unit | `npx jest lib/__tests__/track_config.test.ts` | ❌ Wave 0 |
| TRACK-DB-04 | getTrackConfig("Unknown") returns null | unit | `npx jest lib/__tests__/track_config.test.ts` | ❌ Wave 0 |
| TRACK-DB-05 | Anon key write blocked by RLS | manual (Supabase Dashboard) | Test via Dashboard using anon key token | N/A |

### Sampling Rate

- **Per task commit:** `npx jest lib/__tests__/track_config.test.ts`
- **Per wave merge:** `npx jest`
- **Phase gate:** `npx jest` green + `npx tsc --noEmit` clean before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `lib/__tests__/track_config.test.ts` — covers TRACK-DB-04 (getTrackConfig returns typed object / null)
- [ ] TypeScript compile check is implicit in ts-jest — no separate config needed

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Supabase Auth — `auth.role() = 'authenticated'` in RLS SELECT policy |
| V3 Session Management | no | No session changes in this phase |
| V4 Access Control | yes | RLS policies: authenticated = read-only; service_role = write |
| V5 Input Validation | yes (minimal) | `trackName` parameter in `getTrackConfig` is a string lookup — no SQL injection risk via Supabase client parameterised queries |
| V6 Cryptography | no | No secrets or crypto operations in this phase |

### Known Threat Patterns for Supabase + Next.js Server Actions

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Unauthenticated read of track config | Info Disclosure | RLS SELECT policy requires `auth.role() = 'authenticated'` |
| Browser anon key write to track_configs | Tampering | No INSERT/UPDATE/DELETE policy for anon role — default deny; service_role only |
| ADMIN_USER_IDS env var not set — admin actions open to all | Elevation of Privilege | Phase 3 concern; Phase 1 has no write actions exposed to users |
| SQL injection via trackName parameter | Tampering | Supabase JS client uses parameterised queries — `.eq("track_name", trackName)` is safe [VERIFIED: Supabase JS client uses prepared statements internally] |

---

## Sources

### Primary (HIGH confidence)
- `lib/actions/groups.ts` — `getGroupById` pattern for read-by-key server action [VERIFIED: read in this session]
- `lib/supabase/server.ts` — `createServiceClient` is synchronous, not async [VERIFIED: read in this session]
- `supabase/migration_v4_sallskap.sql`, `migration_v7_game_systems.sql`, `migration_v8_drafts.sql` — migration file format and RLS pattern [VERIFIED: read in this session]
- `lib/types.ts` — existing interface patterns (plain TS, no external validators) [VERIFIED: read in this session]
- `lib/atg.ts` lines 219, 421–422, 429 — track name source: `race.track.name` from ATG JSON [VERIFIED: read in this session]
- `jest.config.js` — test framework config [VERIFIED: read in this session]
- `package.json` — installed versions of all dependencies [VERIFIED: read in this session]
- `.planning/STATE.md` — locked decision: service_role RLS + ADMIN_USER_IDS in server action [VERIFIED: read in this session]
- `REQUIREMENTS.md` TRACK-DB-01–05 — exact column requirements [VERIFIED: read in this session]

### Secondary (MEDIUM confidence)
- None needed — all critical patterns verified directly from codebase

### Tertiary (LOW confidence)
- Swedish trotting track open-stretch characteristics (Solvalla, Jägersro) — general knowledge, unverified against ATG race data [ASSUMED]
- ATG track name string format — inferred from code path, not verified against live DB [ASSUMED: A1]

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed, verified from package.json
- Architecture (migration, RLS, interface, action): HIGH — all patterns verified from existing codebase files
- ATG track name format: LOW — inferred from code path only, not verified against live DB records
- Seed data (open_stretch values): LOW — domain knowledge, not verified against authoritative source

**Research date:** 2026-04-05
**Valid until:** 2026-05-05 (stable stack — Supabase + Next.js patterns do not change frequently)
