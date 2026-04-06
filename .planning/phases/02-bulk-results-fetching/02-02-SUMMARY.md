---
phase: 02-bulk-results-fetching
plan: 02
subsystem: ui
tags: [next.js, react, typescript, evaluation, bulk-fetch]

# Dependency graph
requires:
  - phase: 02-01
    provides: EvaluationPanel with allGames prop and GameSummary interface
provides:
  - BulkResultsButton client component with sequential fetch, 500ms delay, three-state status
  - EvaluationPanel wired to show BulkResultsButton above "Laddade omgångar" list
  - EVAL-02 through EVAL-05 requirements met
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Sequential fetch loop with inter-request delay: for...of loop + await delay(ms) between iterations"
    - "Optimistic status list: initialise all items as 'pending' before loop starts, update each as resolved"
    - "Three-state result mapping: 422 -> not_ready, res.ok -> success, other -> error"

key-files:
  created:
    - components/BulkResultsButton.tsx
  modified:
    - components/EvaluationPanel.tsx

key-decisions:
  - "pendingGames derived client-side from allGames.filter(!has_results) — no additional Supabase query needed"
  - "All statuses initialised as 'pending' at loop start so user sees the full list immediately (not revealed one by one)"
  - "router.refresh() called once after the entire batch completes — not after each individual fetch — to avoid excessive server re-renders"

requirements-completed: [EVAL-02, EVAL-03, EVAL-04, EVAL-05]

# Metrics
duration: 13min
completed: 2026-04-05
---

# Phase 02 Plan 02: BulkResultsButton Component and EvaluationPanel Integration Summary

**BulkResultsButton client component created with sequential fetch loop (500ms delay), three-state per-round status (Klar/Inte redo/Fel), and wired into EvaluationPanel above the "Laddade omgångar" list**

## Performance

- **Duration:** ~13 min
- **Started:** 2026-04-05T17:40:21Z
- **Completed:** 2026-04-05T17:52:28Z
- **Tasks:** 2 auto + 1 checkpoint (human-verify)
- **Files modified:** 2

## Accomplishments

- Created `components/BulkResultsButton.tsx` exporting `BulkResultsButton` and `FetchStatus` type
- Sequential fetch loop with 500ms delay between requests (EVAL-03)
- HTTP 422 response mapped to `not_ready` / "Inte redo" yellow badge (EVAL-04 — not treated as error)
- All per-round statuses held in `statuses` state array, visible simultaneously after partial batch (EVAL-05)
- Button `disabled={pendingCount === 0 || fetching}` with "Hämtar..." label while active (EVAL-02)
- `router.refresh()` called once after full batch completes
- Updated `EvaluationPanel.tsx`: added import, `pendingGames` derivation, and `<BulkResultsButton>` render above "Laddade omgångar" heading

## Task Commits

Each task committed atomically:

1. **Task 1: Create BulkResultsButton component** - `833e993` (feat)
2. **Task 2: Wire BulkResultsButton into EvaluationPanel** - `f56bb6c` (feat)

## Files Created/Modified

- `components/BulkResultsButton.tsx` — New file: client component with sequential fetch, delay, three-state status rendering
- `components/EvaluationPanel.tsx` — Added BulkResultsButton import, pendingGames derivation, BulkResultsButton render above rounds list

## Decisions Made

- `pendingGames` derived client-side via `allGames.filter(g => !g.has_results)` — no extra Supabase query needed since allGames already comes from the server component
- All statuses initialised as `"pending"` at loop start so the user sees the full list immediately (not revealed one by one as each request completes)
- `router.refresh()` called once after the entire batch, not after each individual fetch, to avoid excessive server re-renders while batch is in progress

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None — TypeScript compiled with zero errors, ESLint produced zero errors on the two changed files (pre-existing project-wide lint warnings are unrelated to this plan).

## User Setup Required

None — changes are UI-only (two client components). No new database tables, migrations, API routes, or environment variables.

## Known Stubs

None — `pendingGames` is derived from live `allGames` data wired from a real Supabase query (established in Plan 02-01). The fetch calls target the existing `/api/games/{gameId}/results` route. No hardcoded placeholders.

## Threat Flags

None — no new network endpoints or auth paths introduced. `BulkResultsButton` only calls the pre-existing `/api/games/{gameId}/results` POST route with game IDs sourced from the server-rendered `allGames` list (UUIDs from Supabase). Threat T-02-02-03 (no auth check in results route handler) is a pre-existing condition accepted in the threat model.

## Next Phase Readiness

- EVAL-02 through EVAL-05 complete: bulk fetch button operational with rate-limit-safe sequencing and three-state feedback
- Phase 02 complete — bulk results fetching fully implemented
- Phase 03 (track configs admin UI) can proceed with no blockers from this plan

## Self-Check: PASSED

- FOUND: `components/BulkResultsButton.tsx`
- FOUND: `components/EvaluationPanel.tsx`
- FOUND: `.planning/phases/02-bulk-results-fetching/02-02-SUMMARY.md`
- FOUND commit `833e993` (Task 1)
- FOUND commit `f56bb6c` (Task 2)
- Checkpoint human-verify: APPROVED (user confirmed BulkResultsButton works as specified)

---
*Phase: 02-bulk-results-fetching*
*Completed: 2026-04-05*
