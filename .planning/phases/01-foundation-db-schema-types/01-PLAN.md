---
phase: 01-foundation-db-schema-types
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/__tests__/track_config.test.ts
  - supabase/migration_v9_track_configs.sql
  - lib/types.ts
  - lib/actions/tracks.ts
autonomous: false
requirements:
  - TRACK-DB-01
  - TRACK-DB-02
  - TRACK-DB-03
  - TRACK-DB-04
  - TRACK-DB-05

must_haves:
  truths:
    - "The track_configs table exists in Supabase with the correct columns"
    - "At least 15 Swedish trotting tracks are pre-seeded in track_configs"
    - "An authenticated user can SELECT from track_configs; unauthenticated requests are blocked by RLS"
    - "getTrackConfig('Solvalla') returns a typed TrackConfig object (not null)"
    - "getTrackConfig('Okänd') returns null"
    - "Browser anon key writes to track_configs are rejected by RLS"
    - "The TrackConfig TypeScript interface in lib/types.ts compiles without errors"
  artifacts:
    - path: "supabase/migration_v9_track_configs.sql"
      provides: "CREATE TABLE, RLS policies, and 15-row seed INSERT for track_configs"
      contains: "CREATE TABLE IF NOT EXISTS track_configs"
    - path: "lib/types.ts"
      provides: "TrackConfig interface (additive — appended after existing interfaces)"
      exports: ["TrackConfig"]
    - path: "lib/actions/tracks.ts"
      provides: "getTrackConfig(trackName) server action"
      exports: ["getTrackConfig"]
    - path: "lib/__tests__/track_config.test.ts"
      provides: "Unit tests for getTrackConfig (mocked Supabase client)"
      contains: "getTrackConfig"
  key_links:
    - from: "lib/actions/tracks.ts"
      to: "track_configs (Supabase table)"
      via: "createServiceClient().from('track_configs').select('*').eq('track_name', trackName).single()"
      pattern: "createServiceClient.*track_configs"
    - from: "lib/actions/tracks.ts"
      to: "lib/types.ts"
      via: "import type { TrackConfig } from '@/lib/types'"
      pattern: "import.*TrackConfig.*from.*lib/types"
    - from: "lib/__tests__/track_config.test.ts"
      to: "lib/actions/tracks.ts"
      via: "import { getTrackConfig } from '../actions/tracks'"
      pattern: "getTrackConfig"
---

<objective>
Create the track_configs database table, seed it with 15 Swedish trotting tracks, define
the TrackConfig TypeScript interface, and expose a getTrackConfig(trackName) server action.
This is pure database and type work — no UI, no formula changes.

Purpose: Provides the data foundation that Phase 3 CS adjustment and admin UI both depend on.
Without this table and server action, Phase 3 cannot look up track-specific open-stretch or
short-race configuration.

Output:
- supabase/migration_v9_track_configs.sql — table DDL, RLS policies, 15-row seed
- lib/types.ts — TrackConfig interface appended
- lib/actions/tracks.ts — getTrackConfig() server action
- lib/__tests__/track_config.test.ts — unit tests (mocked Supabase)
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/01-foundation-db-schema-types/01-RESEARCH.md
@.planning/phases/01-foundation-db-schema-types/01-VALIDATION.md
</context>

<interfaces>
<!-- Existing interfaces the executor needs. Extracted from lib/types.ts and lib/actions/groups.ts. -->
<!-- Use these directly — no codebase exploration needed. -->

From lib/types.ts (append TrackConfig AFTER line 87 — after GameSystem interface):
```typescript
// All existing interfaces end at line 87. The TrackConfig interface goes here.
// Do NOT modify any existing interface.
```

From lib/actions/groups.ts (canonical read-by-key pattern to follow for getTrackConfig):
```typescript
export async function getGroupById(groupId: string): Promise<Group | null> {
  const db = createServiceClient();
  const { data } = await db
    .from("groups")
    .select("id, name, invite_code, created_by, created_at, atg_team_url")
    .eq("id", groupId)
    .single();
  return (data as Group) ?? null;
}
```

From lib/supabase/server.ts (verified: createServiceClient is synchronous — no await):
```typescript
export function createServiceClient()  // synchronous, not async
export async function createClient()   // async — requires auth cookies
```
</interfaces>

<tasks>

<!-- ═══════════════════════════════════════════════════════
     WAVE 0 — Test stub (must exist before Wave 1 implementation)
     Nyquist: automated test must be written before code.
     ═══════════════════════════════════════════════════════ -->

<task type="auto" tdd="true">
  <name>Task 1 (Wave 0): Create test stub for getTrackConfig</name>
  <files>lib/__tests__/track_config.test.ts</files>
  <behavior>
    - Test 1: getTrackConfig("Solvalla") with mocked Supabase returning a valid row → returns a TrackConfig object with track_name "Solvalla" and open_stretch true
    - Test 2: getTrackConfig("Okänd") with mocked Supabase returning { data: null, error: { message: "No rows" } } → returns null
    - Test 3: getTrackConfig("Solvalla") → returned object has open_stretch_lanes as a number[] (not a string)
  </behavior>
  <action>
    Create lib/__tests__/track_config.test.ts with the following structure.

    Mock createServiceClient BEFORE importing getTrackConfig (jest.mock hoisting requirement):

    ```typescript
    jest.mock("@/lib/supabase/server", () => ({
      createServiceClient: jest.fn(),
    }));

    import { getTrackConfig } from "../actions/tracks";
    import { createServiceClient } from "@/lib/supabase/server";

    const makeMockDb = (data: unknown, error: unknown) => ({
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data, error }),
          }),
        }),
      }),
    });

    describe("getTrackConfig", () => {
      it("returnerar TrackConfig för känd bana", async () => {
        const row = {
          track_name: "Solvalla",
          open_stretch: true,
          open_stretch_lanes: [7, 8, 9, 10, 11, 12],
          short_race_threshold: 1640,
          active: true,
          updated_at: "2026-04-05T00:00:00Z",
        };
        (createServiceClient as jest.Mock).mockReturnValue(makeMockDb(row, null));
        const result = await getTrackConfig("Solvalla");
        expect(result).not.toBeNull();
        expect(result?.track_name).toBe("Solvalla");
        expect(result?.open_stretch).toBe(true);
      });

      it("returnerar null för okänd bana", async () => {
        (createServiceClient as jest.Mock).mockReturnValue(
          makeMockDb(null, { message: "No rows" })
        );
        const result = await getTrackConfig("Okänd");
        expect(result).toBeNull();
      });

      it("open_stretch_lanes är number[]", async () => {
        const row = {
          track_name: "Solvalla",
          open_stretch: true,
          open_stretch_lanes: [7, 8, 9, 10, 11, 12],
          short_race_threshold: 1640,
          active: true,
          updated_at: "2026-04-05T00:00:00Z",
        };
        (createServiceClient as jest.Mock).mockReturnValue(makeMockDb(row, null));
        const result = await getTrackConfig("Solvalla");
        expect(Array.isArray(result?.open_stretch_lanes)).toBe(true);
      });
    });
    ```

    At this point lib/actions/tracks.ts does NOT exist yet — the tests MUST fail (red).
    Run the tests and confirm they fail with "Cannot find module '../actions/tracks'" before proceeding.
  </action>
  <verify>
    <automated>cd /Users/spangen87/Documents/GitHub/v-85-app-git/Namnlös && npx jest lib/__tests__/track_config.test.ts 2>&1 | head -20</automated>
  </verify>
  <done>lib/__tests__/track_config.test.ts exists and tests fail with "Cannot find module '../actions/tracks'" (expected red state before implementation)</done>
</task>

<!-- ═══════════════════════════════════════════════════════
     WAVE 1 — Implementation (migration SQL + types + server action)
     ═══════════════════════════════════════════════════════ -->

<task type="auto">
  <name>Task 2 (Wave 1): Create migration v9 — track_configs table, RLS, and seed data</name>
  <files>supabase/migration_v9_track_configs.sql</files>
  <action>
    Create supabase/migration_v9_track_configs.sql. This is an additive migration —
    it does not modify any existing table.

    BEFORE writing the seed INSERT values, run the following SQL in the Supabase
    Dashboard SQL Editor to verify the exact ATG track name strings stored in the games
    table (per STATE.md data risk, track_name must match games.track exactly):

      SELECT DISTINCT track FROM games ORDER BY track;

    If games rows exist, use the exact returned strings as track_name seed values.
    If no games rows exist yet (empty DB), use the best-guess values below and add a
    comment in the migration noting that values need verification on first game fetch.

    Best-guess ATG track name strings (short form, no "travbana" suffix):
    Solvalla, Åby, Jägersro, Romme, Bergsåker, Halmstad, Mantorp, Rättvik,
    Kalmar, Axevalla, Gävle, Örebro, Eskilstuna, Uppsala, Umåker

    Write the migration file with this exact structure (per established v4/v7 pattern):

    ```sql
    -- Migration v9: Bankonfiguration (track_configs)
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

    -- Alla autentiserade kan läsa bankonfiguration
    CREATE POLICY "Inloggade kan läsa track_configs"
      ON track_configs FOR SELECT
      USING (auth.role() = 'authenticated');

    -- Skrivning kräver service_role (admin-UI i fas 3 använder service client)
    CREATE POLICY "Service kan skriva track_configs"
      ON track_configs FOR ALL
      USING (auth.role() = 'service_role');

    -- Snabb uppslagning på track_name (PK — index skapas automatiskt)
    -- Ingen extra index behövs; PRIMARY KEY implicerar unik B-tree index

    -- Startvärden: 15 svenska travbanor
    -- OBS: track_name MÅSTE matcha games.track (ATG API track.name fält)
    -- Verifiera mot: SELECT DISTINCT track FROM games ORDER BY track
    INSERT INTO track_configs
      (track_name, open_stretch, open_stretch_lanes, short_race_threshold, active)
    VALUES
      ('Solvalla',    true,  ARRAY[7,8,9,10,11,12], 1640, true),
      ('Åby',         false, '{}',                   1640, true),
      ('Jägersro',    true,  ARRAY[7,8,9,10,11,12],  1640, true),
      ('Romme',       false, '{}',                   1640, true),
      ('Bergsåker',   false, '{}',                   1640, true),
      ('Halmstad',    false, '{}',                   1640, true),
      ('Mantorp',     false, '{}',                   1640, true),
      ('Rättvik',     false, '{}',                   1640, true),
      ('Kalmar',      false, '{}',                   1640, true),
      ('Axevalla',    false, '{}',                   1640, true),
      ('Gävle',       false, '{}',                   1640, true),
      ('Örebro',      false, '{}',                   1640, true),
      ('Eskilstuna',  false, '{}',                   1640, true),
      ('Uppsala',     false, '{}',                   1640, true),
      ('Umåker',      false, '{}',                   1640, true)
    ON CONFLICT (track_name) DO NOTHING;
    ```

    Notes on open_stretch values (per RESEARCH.md):
    - Solvalla: open_stretch=true, lanes 7–12 (outer lanes benefit from open stretch)
    - Jägersro: open_stretch=true, lanes 7–12 (same reasoning)
    - All others: open_stretch=false, empty lanes array
    - short_race_threshold: 1640m default for all tracks (Phase 3 admin UI allows per-track correction)
    - These values are ASSUMED and should be corrected via Phase 3 admin UI if needed
  </action>
  <verify>
    <automated>cd /Users/spangen87/Documents/GitHub/v-85-app-git/Namnlös && test -f supabase/migration_v9_track_configs.sql && grep -c "INSERT INTO track_configs" supabase/migration_v9_track_configs.sql && grep "CREATE TABLE IF NOT EXISTS track_configs" supabase/migration_v9_track_configs.sql && grep "auth.role() = 'authenticated'" supabase/migration_v9_track_configs.sql && grep "auth.role() = 'service_role'" supabase/migration_v9_track_configs.sql && echo "PASS"</automated>
  </verify>
  <done>
    supabase/migration_v9_track_configs.sql exists with:
    - CREATE TABLE IF NOT EXISTS track_configs (with all 6 columns)
    - ALTER TABLE ... ENABLE ROW LEVEL SECURITY
    - SELECT policy for authenticated role
    - ALL policy for service_role
    - INSERT seed with 15 Swedish track rows using ON CONFLICT DO NOTHING
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 3 (Wave 1): Add TrackConfig interface and getTrackConfig server action</name>
  <files>lib/types.ts, lib/actions/tracks.ts</files>
  <behavior>
    - getTrackConfig("Solvalla") with mocked Supabase success response → returns TrackConfig object
    - getTrackConfig("Okänd") with mocked Supabase error response → returns null
    - getTrackConfig("Solvalla") → open_stretch_lanes is number[] (not string)
    - npx tsc --noEmit passes with the new TrackConfig interface
  </behavior>
  <action>
    Step A — Append TrackConfig interface to lib/types.ts:

    Open lib/types.ts. The file currently ends after the GameSystem interface (line 87).
    Append the following AFTER the last line of the file. Do NOT modify existing interfaces.

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

    Step B — Create lib/actions/tracks.ts:

    Create the file from scratch. First line MUST be "use server" (per CLAUDE.md convention,
    verified in all existing action files).

    Follow the getGroupById pattern from groups.ts exactly:
    - Use createServiceClient() — synchronous, no await (VERIFIED: server.ts)
    - Use .select("*") to return all columns including the INTEGER[] open_stretch_lanes
    - Return (data as TrackConfig) on success, null on error
    - Do NOT check ADMIN_USER_IDS here — that belongs in Phase 3 admin action

    ```typescript
    "use server";

    import { createServiceClient } from "@/lib/supabase/server";
    import type { TrackConfig } from "@/lib/types";

    export async function getTrackConfig(
      trackName: string
    ): Promise<TrackConfig | null> {
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

    After writing both files, run the tests (which should now go GREEN):
    npx jest lib/__tests__/track_config.test.ts

    All 3 tests must pass. Then run the full TypeScript compile check:
    npx tsc --noEmit
  </action>
  <verify>
    <automated>cd /Users/spangen87/Documents/GitHub/v-85-app-git/Namnlös && npx jest lib/__tests__/track_config.test.ts --no-coverage 2>&1 | tail -10 && npx tsc --noEmit</automated>
  </verify>
  <done>
    - lib/types.ts contains exported TrackConfig interface with all 6 fields
    - lib/actions/tracks.ts starts with "use server", exports getTrackConfig
    - All 3 tests in track_config.test.ts pass (green)
    - npx tsc --noEmit exits 0 (no TypeScript errors)
  </done>
</task>

<!-- ═══════════════════════════════════════════════════════
     WAVE 2 — Schema push (BLOCKING) + human verification
     Must run AFTER all schema files are written and tests pass.
     ═══════════════════════════════════════════════════════ -->

<task type="auto">
  <name>Task 4 (Wave 2) [BLOCKING]: Push migration to Supabase</name>
  <files></files>
  <action>
    This task pushes supabase/migration_v9_track_configs.sql to the live Supabase database.
    It MUST run after Task 2 (migration file) and Task 3 (types + action) are complete.
    The phase CANNOT pass verification without this push.

    Before running, ensure the SUPABASE_ACCESS_TOKEN environment variable is set (required
    for non-TTY execution):

      echo "SUPABASE_ACCESS_TOKEN is: ${SUPABASE_ACCESS_TOKEN:-NOT SET}"

    If NOT SET, check for it in .env.local or .env:
      grep -i supabase_access_token .env.local .env 2>/dev/null

    Run the push:
      npx supabase db push

    If the push requires interactive prompts that cannot be suppressed (e.g., asking to
    confirm overwrite), this task requires manual intervention. In that case:
    - Run the migration SQL manually in Supabase Dashboard → SQL Editor
    - Copy the full contents of supabase/migration_v9_track_configs.sql and execute it

    After successful push (automated or manual), verify the table exists:
      Run in Supabase Dashboard SQL Editor:
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'track_configs'
        ORDER BY ordinal_position;

      Expected 6 rows: track_name (text), open_stretch (boolean), open_stretch_lanes (ARRAY),
      short_race_threshold (integer), active (boolean), updated_at (timestamp with time zone)

    Then verify seed count:
        SELECT count(*) FROM track_configs;
      Expected: 15
  </action>
  <verify>
    <automated>cd /Users/spangen87/Documents/GitHub/v-85-app-git/Namnlös && npx supabase db push --dry-run 2>&1 | head -20</automated>
  </verify>
  <done>
    Supabase reports migration applied successfully (or manual SQL execution confirmed).
    track_configs table exists with 6 columns and 15 rows.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 5 (Wave 2): Verify RLS policies and track lookup in Supabase</name>
  <what-built>
    - track_configs table with 15 Swedish trotting tracks
    - RLS: authenticated users can SELECT; anon key writes are blocked
    - getTrackConfig() server action (unit tested and passing)
    - TrackConfig TypeScript interface (compiles clean)
  </what-built>
  <how-to-verify>
    Run all of these checks in Supabase Dashboard SQL Editor (supabase.com → project → SQL Editor):

    1. Confirm table and columns:
       SELECT column_name, data_type
       FROM information_schema.columns
       WHERE table_name = 'track_configs'
       ORDER BY ordinal_position;
       Expected: 6 rows (track_name, open_stretch, open_stretch_lanes,
       short_race_threshold, active, updated_at)

    2. Confirm seed row count:
       SELECT count(*) FROM track_configs;
       Expected: 15

    3. Spot-check Solvalla open stretch:
       SELECT track_name, open_stretch, open_stretch_lanes
       FROM track_configs
       WHERE track_name = 'Solvalla';
       Expected: open_stretch = true, open_stretch_lanes = {7,8,9,10,11,12}

    4. Confirm RLS policies exist:
       SELECT policyname, cmd, qual
       FROM pg_policies
       WHERE tablename = 'track_configs';
       Expected: 2 policies — one SELECT (authenticated), one ALL (service_role)

    5. Verify track names match existing games rows (critical — see STATE.md data risk):
       SELECT DISTINCT g.track, tc.track_name
       FROM games g
       LEFT JOIN track_configs tc ON tc.track_name = g.track
       ORDER BY g.track;
       Expected: tc.track_name column should NOT be null for known Swedish tracks.
       If tc.track_name is null for a track, that track name in games does not match
       the seed value — update the migration seed and re-run, or use Phase 3 admin UI.

    6. Run unit tests:
       npx jest lib/__tests__/track_config.test.ts
       Expected: 3 tests passing

    7. Run TypeScript compile:
       npx tsc --noEmit
       Expected: exits 0, no errors
  </how-to-verify>
  <resume-signal>Type "approved" if all checks pass, or describe which checks failed with the actual vs expected values</resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| client → Supabase DB | Browser (anon key) can query Supabase directly — RLS is the only enforcement layer |
| server action → Supabase DB | Next.js server action uses service_role key — bypasses RLS by design for writes |
| trackName parameter | String passed to getTrackConfig() from server component or another server action |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-01 | Information Disclosure | track_configs RLS SELECT policy | mitigate | Policy: `USING (auth.role() = 'authenticated')` — only authenticated Supabase sessions can read; anon key is rejected at DB level without any app-layer check needed |
| T-01-02 | Tampering | track_configs — no INSERT/UPDATE/DELETE policy for anon | mitigate | No write policy for authenticated or anon roles means default deny applies — only service_role can write; browser anon key INSERT returns 403 RLS violation |
| T-01-03 | Tampering | getTrackConfig() trackName parameter — SQL injection | accept | Supabase JS client uses parameterised queries internally; `.eq("track_name", trackName)` never interpolates into raw SQL; no user-supplied SQL concatenation anywhere in this action |
| T-01-04 | Elevation of Privilege | Admin write actions (Phase 3) — ADMIN_USER_IDS not set | accept | Phase 1 exposes no write surface; this risk is owned by Phase 3. STATE.md decision: admin enforcement via ADMIN_USER_IDS env var in server action, not in DB policy |
| T-01-05 | Information Disclosure | track_configs data sensitivity | accept | track_configs contains only public trotting track metadata (no PII, no secrets, no financial data); disclosure to authenticated users is intentional and low-risk |
| T-01-06 | Spoofing | ATG track name mismatch — getTrackConfig silently returns null | mitigate | Wave 2 checkpoint includes explicit verification: LEFT JOIN games + track_configs to detect name mismatches before phase sign-off. Phase 3 admin UI provides correction path without migration |
</threat_model>

<verification>
Full phase verification (run before /gsd-verify-work):

1. Automated (no live DB):
   npx jest lib/__tests__/track_config.test.ts   — expect 3 passing
   npx jest                                        — expect full suite green
   npx tsc --noEmit                               — expect 0 errors

2. Live DB (Supabase Dashboard SQL Editor):
   SELECT count(*) FROM track_configs            — expect 15
   SELECT count(*) FROM pg_policies WHERE tablename = 'track_configs'  — expect 2

3. Track name cross-check (per STATE.md data risk):
   SELECT g.track, tc.track_name
   FROM games g LEFT JOIN track_configs tc ON tc.track_name = g.track
   ORDER BY g.track
   — expect no null tc.track_name for known Swedish tracks

4. RLS write block (TRACK-DB-05):
   Using anon key in Supabase Dashboard, attempt:
   INSERT INTO track_configs (track_name) VALUES ('Test')
   — expect error: "new row violates row-level security policy"
</verification>

<success_criteria>
1. track_configs table exists in Supabase with 6 columns and 15 Swedish trotting track rows
2. Authenticated Supabase session can SELECT from track_configs; unauthenticated (anon) cannot write
3. getTrackConfig("Solvalla") returns a TrackConfig object with open_stretch=true
4. getTrackConfig("Okänd") returns null
5. TrackConfig interface in lib/types.ts compiles without errors (npx tsc --noEmit exits 0)
6. All 3 unit tests in lib/__tests__/track_config.test.ts pass
7. Track names in seed data verified against games.track — no silent lookup failures for known tracks
</success_criteria>

<output>
After completion, create .planning/phases/01-foundation-db-schema-types/01-01-SUMMARY.md

Include:
- What was built (table DDL, interface, server action, unit tests)
- Actual track name strings from games.track verification (important for Phase 3)
- Any track name mismatches found and how they were resolved
- open_stretch seed values used (Solvalla=true, Jägersro=true — note as assumed, correctable in Phase 3 admin)
- Decisions made (e.g., if track names were corrected from best-guess values)
- Phase 3 dependency: TrackConfig interface is stable — Phase 3 consumes it via import type
</output>
