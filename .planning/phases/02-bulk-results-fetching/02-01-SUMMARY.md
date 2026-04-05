---
phase: 02-bulk-results-fetching
plan: 01
subsystem: ui
tags: [next.js, supabase, react, typescript, evaluation]

# Dependency graph
requires:
  - phase: 01-foundation-db-schema-types
    provides: track_configs table and server action patterns used as reference
provides:
  - Evaluation page fetches ALL stored games (not only evaluated ones)
  - GameSummary interface with has_results boolean flag
  - EvaluationPanel renders "Laddade omgångar" list with Klar/Saknar resultat badges
  - allGames prop wired from server component to client component
affects: [02-02-bulk-results-fetching, phase-03-track-configs-admin-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Two-query pattern: Query A fetches all rows, Query B fetches subset with data; derive coverage flags client-side"
    - "Threat mitigation T-02-01-03: .limit(100) on unbounded Supabase queries"

key-files:
  created: []
  modified:
    - app/(authenticated)/evaluation/page.tsx
    - components/EvaluationPanel.tsx

key-decisions:
  - "Two separate Supabase queries (all games + starters with results) rather than a JOIN, to keep query types simple and avoid complex null-handling in the derived flag"
  - "GameSummary exported from EvaluationPanel.tsx so downstream components can import the type directly"
  - ".limit(100) applied to the games query per threat model mitigation T-02-01-03"

patterns-established:
  - "Coverage flag pattern: build a Set of IDs from the rich query, then annotate the broad query with .has(id)"

requirements-completed: [EVAL-01]

# Metrics
duration: 15min
completed: 2026-04-05
---

# Phase 02 Plan 01: Evaluation Page — All Games with Result Coverage Status Summary

**Evaluation server page refactored to query ALL stored games and annotate each with a has_results flag, rendering a "Laddade omgångar" status list in EvaluationPanel with green "Klar" / yellow "Saknar resultat" badges**

## Performance

- **Duration:** 15 min
- **Started:** 2026-04-05T12:46:32Z
- **Completed:** 2026-04-05T12:58:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added `GameSummary` interface (`game_id`, `date`, `game_type`, `track`, `has_results: boolean`) to both page and panel
- Refactored `evaluation/page.tsx` to run two Supabase queries and derive per-game result coverage via a `Set<string>` lookup
- Updated `EvaluationPanel.tsx` to accept `allGames: GameSummary[]`, render a "Laddade omgångar" section at top, and update empty-state copy to "Inga laddade omgångar ännu"
- Statistical summary (StatCard grid + expandable game list) now conditionally rendered only when `overall.races_evaluated > 0`, preserving all existing UI

## Task Commits

Each task was committed atomically:

1. **Task 1 + Task 2: Extend evaluation page query and add allGames prop to EvaluationPanel** - `daa2b6a` (feat)

_Note: Tasks 1 and 2 were committed together as a single atomic unit because Task 1 introduces a TypeScript error (missing prop) that Task 2 immediately resolves — committing Task 1 alone would produce a non-compiling state._

## Files Created/Modified

- `app/(authenticated)/evaluation/page.tsx` — Added GameSummary interface, Query A (all games with .limit(100)), resultedGameIds Set derivation, allGames prop passed to EvaluationPanel
- `components/EvaluationPanel.tsx` — Added GameSummary export, allGames prop in Props, "Laddade omgångar" list render, updated empty state, wrapped stats/game list in `overall.races_evaluated > 0` conditional

## Decisions Made

- Two separate Supabase queries rather than a complex JOIN: the starters query already has the nested select structure needed for evaluation; adding a games outer join would complicate the TypeScript types without benefit.
- `GameSummary` exported from `EvaluationPanel.tsx` (not a shared `lib/types.ts` entry) because it is only consumed by the evaluation page and panel — no cross-feature use yet.
- `.limit(100)` on the games query per threat model entry T-02-01-03 (prevent unbounded result set from historic games table).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added .limit(100) to games query per threat model mitigation T-02-01-03**
- **Found during:** Task 1 (evaluation page query implementation)
- **Issue:** Threat model marked T-02-01-03 as `mitigate` — the plan's action block did not include `.limit(100)` in the example query, but the threat register explicitly requires it to prevent unbounded result sets
- **Fix:** Added `.limit(100)` to the `supabase.from("games").select(...).order(...)` call
- **Files modified:** `app/(authenticated)/evaluation/page.tsx`
- **Verification:** TypeScript compiles cleanly; limit is present in committed code
- **Committed in:** daa2b6a (Task 1+2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 2 — threat model mitigation required by plan's own threat register)
**Impact on plan:** Necessary security/stability fix. No scope creep.

## Issues Encountered

None — both tasks executed cleanly. TypeScript compiled with zero errors after both changes were applied.

## User Setup Required

None — no external service configuration required. Changes are UI-only (server component + client component); no new database tables, migrations, or environment variables.

## Known Stubs

None — `allGames` is wired from a real Supabase query. The `has_results` flag is derived from live data. No hardcoded placeholders.

## Threat Flags

None — no new network endpoints, auth paths, or schema changes introduced. The `games` table query was already accessible to authenticated users via RLS (T-02-01-01, accepted in plan).

## Next Phase Readiness

- EVAL-01 complete: evaluation view now lists ALL loaded rounds with coverage status badges
- Plan 02-02 (bulk results fetch button) can proceed — it will add a "Hämta alla resultat" button that uses the `allGames` list to identify rounds needing results
- No blockers

## Self-Check: PASSED

- FOUND: `app/(authenticated)/evaluation/page.tsx`
- FOUND: `components/EvaluationPanel.tsx`
- FOUND: `.planning/phases/02-bulk-results-fetching/02-01-SUMMARY.md`
- FOUND: commit `daa2b6a`

---
*Phase: 02-bulk-results-fetching*
*Completed: 2026-04-05*
