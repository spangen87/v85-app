# Architecture Patterns

**Domain:** Track configuration integration into CS calculation — v85-app (brownfield)
**Researched:** 2026-04-05
**Confidence:** HIGH (based on direct codebase analysis)

---

## Recommended Architecture

Integrate `track_configs` as a server-fetched dependency that travels alongside race data,
so client components receive track configuration as a prop — exactly the same pattern used
for `starters`, `races`, and `userGroups` today. No new state management primitives needed.

---

## Database Schema

### New Table: `track_configs`

```sql
create table track_configs (
  id               uuid primary key default uuid_generate_v4(),
  track_name       text not null unique,   -- matches games.track and races.track
  open_stretch     boolean not null default false,
  open_stretch_lanes int[] not null default '{}',  -- e.g. {1,2,3,4,5}
  short_race_distance int not null default 1640,   -- metres, below = "short race"
  lane_bonuses     jsonb not null default '{}',    -- {"1": 0.08, "2": 0.05, ...}
  updated_at       timestamptz default now()
);

-- All authenticated users can read (CS calculation needs this client-side via server prop)
alter table track_configs enable row level security;

create policy "Inloggade kan lasa track_configs"
  on track_configs for select
  using (auth.role() = 'authenticated');

-- Only service role writes (admin UI uses service client, consistent with groups pattern)
create policy "Service kan skriva track_configs"
  on track_configs for all
  using (auth.role() = 'service_role');
```

### Schema Notes

- `track_name` is the join key. It must match the string stored in `games.track`, which
  comes from ATG API: `races[0].track.name` (parsed in `lib/atg.ts → parseGame()`).
  Example values from ATG: "Solvalla", "Åby", "Jägersro", "Romme", "Eskilstuna".

- `lane_bonuses` is JSONB keyed by string lane number, value is additive CS bonus
  (positive = advantage, negative = disadvantage). Example: `{"1": 0.08, "2": 0.05}`.
  String keys are used because JSONB in PostgreSQL requires string keys.

- `open_stretch_lanes` stores which post positions benefit from the open stretch.
  For most Swedish tracks with open stretch, positions 1–5 benefit in volte starts.
  Leave empty `{}` when no open-stretch effect should be applied.

- `short_race_distance` is per-track because tracks differ (e.g. Solvalla inner track
  may use 1609m as "short", other tracks 1640m or 1700m).

---

## Data Flow: DB → CS Calculation

```
Supabase: track_configs
        ↓
app/(authenticated)/page.tsx (Server Component)
  getTrackConfig(trackName)       [new server action in lib/actions/tracks.ts]
        ↓
  passes trackConfig as prop to MainPageClient
        ↓
MainPageClient (Client Component, CC)
  passes trackConfig down to AnalysisPanel and HorseCard
        ↓
AnalysisPanel / HorseCard (CC)
  computeTrackFactor(postPosition, startMethod, horseHistory, trackConfig)
  [updated signature in lib/analysis.ts]
```

### Key Design Decisions

**Decision 1: Fetch track config in the Server Component (page.tsx), not in the Client Component.**

The home page already does 3 parallel server fetches (`getAllGames`, `getProfile`,
`getMyGroups`). Adding `getTrackConfig` as a 4th parallel fetch is consistent:

```typescript
// app/(authenticated)/page.tsx
const [games, profile, userGroups, trackConfig] = await Promise.all([
  getAllGames(supabase),
  getProfile(),
  getMyGroups(),
  selectedGame ? getTrackConfig(selectedGame.track) : Promise.resolve(null),
]);
```

This avoids any client-side Supabase call for track config and keeps data fetching
server-only, consistent with how all other queries work in this codebase.

**Decision 2: Do NOT recompute CS server-side or store track-adjusted CS in the DB.**

Current pattern: `formscore` is computed server-side and stored in `starters`. CS is
computed client-side in `AnalysisPanel.tsx` from `formscore` plus distance signal and
track factor. Track config integration extends the client-side CS computation only.
Storing a track-adjusted CS in DB would require recomputing every time config changes —
wrong tradeoff for a config that changes rarely.

**Decision 3: `computeTrackFactor()` signature update is additive, not breaking.**

Current signature:
```typescript
computeTrackFactor(postPosition, startMethod, horseHistory): number
```

New signature:
```typescript
computeTrackFactor(postPosition, startMethod, horseHistory, trackConfig?: TrackConfig): number
```

The `trackConfig` parameter is optional. When absent (null), the function falls back to
current static table behavior. This means zero breakage to existing callers.

**Decision 4: Lane bonus is additive to the track factor, not multiplicative.**

Current `computeTrackFactor()` returns 0–1. The lane bonus should be applied as an
additive offset clamped to [0, 1], not as another multiplier. Multiplicative nesting
creates compounding effects that are hard to reason about when explaining to users why
a horse got a particular CS.

Proposed inner logic:
```typescript
let factor = staticTrackFactor(postPosition, startMethod);
if (trackConfig) {
  const bonusKey = String(postPosition);
  const bonus = (trackConfig.lane_bonuses as Record<string, number>)[bonusKey] ?? 0;
  // open_stretch applies only to volte starts
  const stretchBonus =
    startMethod === "volte" &&
    trackConfig.open_stretch &&
    trackConfig.open_stretch_lanes.includes(postPosition)
      ? 0.05   // configurable constant, could move to lane_bonuses
      : 0;
  factor = Math.min(1, Math.max(0, factor + bonus + stretchBonus));
}
```

---

## Component Boundaries

| Component | Responsibility | Receives track config? |
|-----------|---------------|------------------------|
| `app/(authenticated)/page.tsx` | Fetch track config via server action | Fetches it |
| `MainPageClient.tsx` | Thread config down to analysis components | Receives as prop |
| `AnalysisPanel.tsx` | Compute and display CS with track factor | Receives as prop |
| `HorseCard.tsx` | Show visual indicator if track factor boosted/penalized CS | Receives as prop |
| `lib/analysis.ts` | `computeTrackFactor()` — pure function | Receives as argument |
| `lib/actions/tracks.ts` | `getTrackConfig()`, `upsertTrackConfig()` | Owns DB access |
| `app/(authenticated)/admin/page.tsx` | Admin UI: read/write track configs | Uses server actions |

---

## Admin UI: Route and Auth Model

### Route Location

Place admin at `app/(authenticated)/admin/page.tsx`.

This route lives inside the authenticated group, giving it automatic session protection
via the existing layout. No new middleware needed.

Do NOT nest admin under `/sallskap/[groupId]/` — track configurations are global, not
per-group. The existing sällskap admin (`/sallskap/[groupId]/admin`) is per-group scope.
Global track config is a separate concern.

### Authorization Model

There is no app-level "superadmin" role in the current schema. The existing auth model
uses `groups.created_by` for group-scoped admin. For track config, two options exist:

**Recommended: Environment-variable admin list (simplest, no schema change)**

```typescript
// lib/actions/tracks.ts
const ADMIN_USER_IDS = (process.env.ADMIN_USER_IDS ?? "").split(",");

async function requireAdmin() {
  const user = await getAuthUser();
  if (!user || !ADMIN_USER_IDS.includes(user.id)) {
    throw new Error("Inte behörig");
  }
  return user;
}
```

The admin page checks this before rendering the edit form. The `getAuthUser()` helper
already exists in `lib/actions/groups.ts` — move it to a shared `lib/actions/auth.ts`
or duplicate in `lib/actions/tracks.ts` (existing pattern: actions are self-contained).

**Why not a `is_admin` column on `profiles`?**

Adds schema complexity and a migration. The app has one or two real admins (track config
is not end-user-facing). Env var is sufficient and conventional for small apps.

**Why not reuse sällskap creator check?**

Track config is global state, not group-scoped. A sällskap creator should not be able
to change track bias for all users of the app.

### Admin UI Structure

Follow the same patterns as `components/sallskap/admin/`:

```
app/(authenticated)/admin/
  page.tsx                    # Server Component — fetches all track_configs, checks admin
  TrackConfigClient.tsx       # CC — list of tracks, edit form per track
```

The edit form pattern mirrors `GroupNameForm.tsx`: controlled input, calls server action
on submit, shows inline success/error.

For the initial version, admin only sees tracks that have existing config rows (or all
rows from a pre-populated migration). An "Add track" button adds a new row.

---

## Migration Strategy: Pre-populated Track Data

### Approach

Create `supabase/migration_v8_track_configs.sql` (or next migration number in sequence).

The migration creates the table AND inserts known Swedish V85/V75 track data in a single
file. This means the table is useful immediately without requiring an admin session.

### Pre-population Data

The following tracks appear as V85/V75 hosts in Swedish trotting. Track characteristics
are well-established domain knowledge (open stretch and lane advantages are documented
by ATG and trotting press):

```sql
insert into track_configs
  (track_name, open_stretch, open_stretch_lanes, short_race_distance, lane_bonuses)
values
  -- Solvalla: open stretch (raksträcka), lane 1-4 advantage in voltstart
  ('Solvalla',       true,  '{1,2,3,4}',   1640, '{"1": 0.06, "2": 0.04, "3": 0.02, "4": 0.01}'),
  -- Åby: voltstart track, lane bias moderate
  ('Åby',            false, '{}',           1640, '{"1": 0.05, "2": 0.03}'),
  -- Jägersro: no open stretch, typical lane distribution
  ('Jägersro',       false, '{}',           1640, '{"1": 0.04, "2": 0.02}'),
  -- Romme: open stretch, bigger field, more lane variance
  ('Romme',          true,  '{1,2,3}',      1640, '{"1": 0.07, "2": 0.05, "3": 0.02}'),
  -- Eskilstuna: smaller track, autostart common, open stretch
  ('Eskilstuna',     true,  '{1,2,3}',      1609, '{"1": 0.05, "2": 0.03}'),
  -- Örebro: typically autostart, smaller track
  ('Örebro',         false, '{}',           1609, '{"1": 0.03}'),
  -- Mantorp: open stretch
  ('Mantorp',        true,  '{1,2,3,4}',    1640, '{"1": 0.06, "2": 0.04, "3": 0.02}'),
  -- Bergsåker: northern track, voltstart, no open stretch
  ('Bergsåker',      false, '{}',           1640, '{"1": 0.05, "2": 0.03}'),
  -- Halmstad: voltstart, southern Sweden
  ('Halmstad',       false, '{}',           1640, '{"1": 0.04, "2": 0.02}'),
  -- Gävle
  ('Gävle',          true,  '{1,2,3}',      1640, '{"1": 0.05, "2": 0.03}')
on conflict (track_name) do nothing;
```

### Confidence Note on Pre-populated Values

MEDIUM confidence. Track characteristics (open stretch yes/no) are stable domain facts.
Specific lane bonus magnitudes are initial estimates based on trotting domain conventions.
The admin UI exists precisely so track-by-track values can be corrected when empirical
analysis shows the pre-populated values are off. Treat migration values as informed
starting points, not ground truth.

### Migration File Naming

Check the latest migration in `supabase/` to determine the correct version number.
Currently no migration files exist in `supabase/migration_v*.sql` (only commented-out
inline SQL in `schema.sql`), so this would be `migration_v1_track_configs.sql` — or
align with whatever numbering convention is established before this milestone.

---

## Type Definitions

Add to `lib/types.ts`:

```typescript
export interface TrackConfig {
  id: string;
  track_name: string;
  open_stretch: boolean;
  open_stretch_lanes: number[];
  short_race_distance: number;
  lane_bonuses: Record<string, number>;  // key = post_position as string
  updated_at: string;
}
```

---

## Visual Indicator: HorseCard

When a `trackConfig` is provided and the horse's lane has a non-zero bonus, `HorseCard`
should show a small badge next to the CS display. Follow the existing pattern of
`DistBadge` in `AnalysisPanel.tsx`:

- Green badge (e.g. "Bra spår") when `bonus > 0`
- Gray badge when `bonus === 0` (no indicator, no noise)
- Red badge (e.g. "Dåligt spår") when `bonus < 0`

The badge should use `title` attribute for full explanation (e.g. "Spår 1 på Solvalla —
öppen raksträcka, bonus +0.06"), visible on hover. This follows the existing `title`
pattern on `DistBadge`.

Do NOT add a separate column to the `AnalysisPanel` table for this — it belongs inline
in the horse name cell or next to the existing CS badge to keep table width manageable
on mobile.

---

## Scalability Considerations

| Concern | Now | Future |
|---------|-----|--------|
| Track config reads | One per page load, server-side, cached by Next.js | Add `next: { revalidate: 3600 }` to the Supabase call — track config changes at most daily |
| Admin writes | Rare (config rarely changes) | No write scaling concern |
| Table size | ~15–20 rows (fixed set of Swedish tracks) | Will never grow meaningfully |

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Client-side Supabase fetch for track config

Fetching `track_configs` directly from a client component breaks the established pattern
(all Supabase reads happen in Server Components or Server Actions). It would also expose
service-role-less reads through the anon key, relying on RLS working correctly for a
read that could be done safely server-side.

### Anti-Pattern 2: Storing track-adjusted CS in `starters`

Track config changes after starters are saved. Storing a derived value in DB means stale
data unless a recomputation job is run. The current architecture deliberately keeps
derived scores either pre-computed at fetch time (formscore, which doesn't depend on
external config) or computed at render time (CS, which depends on user-visible factors).

### Anti-Pattern 3: Adding track_name as FK to `races` or `starters`

`track_name` in `track_configs` joins on the string value from ATG. Do not add a formal
FK constraint — track names come from an external API and may vary (e.g. "Solvalla"
vs "Solvalla S" for the south track). The join is intentionally soft; config lookup
returns null when no match, and the code falls back to static behavior.

### Anti-Pattern 4: Per-group track config

Track bias is a factual property of the physical track, not a per-group opinion. One
config per track_name is correct. Groups share the same physical-world configuration.

---

## Sources

- Direct codebase analysis: `lib/analysis.ts`, `lib/atg.ts`, `lib/types.ts`,
  `lib/actions/groups.ts`, `lib/supabase/server.ts`, `supabase/schema.sql`
- Component patterns: `components/sallskap/admin/AdminTab.tsx`,
  `components/AnalysisPanel.tsx`, `components/HorseCard.tsx`
- Page pattern: `app/(authenticated)/page.tsx`,
  `app/(authenticated)/sallskap/[groupId]/page.tsx`
- Project requirements: `.planning/PROJECT.md`
- Existing architecture: `.planning/codebase/ARCHITECTURE.md`

*Analysis confidence: HIGH for data flow and admin auth model (direct code inspection).
MEDIUM for pre-populated lane bonus magnitudes (domain knowledge, requires empirical
validation by admin after deploy).*
