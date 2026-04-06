---
phase: 03-track-cs-adjustment-admin-ui
plan: 01
subsystem: api
tags: [analysis, track-factor, tdd, typescript]

# Dependency graph
requires:
  - phase: 01-foundation-db-schema-types
    provides: TrackConfig interface in lib/types.ts
provides:
  - computeTrackFactor() with 5-param signature accepting optional trackConfig and raceDistance
  - Open-stretch +0.12 delta modifier for configured outer lanes
  - Short-race -0.08 delta modifier for postPosition >= 5 when raceDistance <= threshold
  - Non-breaking fallback: no-config call identical to prior implementation
affects:
  - 03-02 (CS data flow — calls computeTrackFactor with trackConfig)
  - 03-03 (HorseCard badge — uses same modified function)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "adjustedStaticF pattern: apply modifiers to static factor before dynamic blend"
    - "Optional param extension: add optional 4th/5th params to pure function without breaking 3-arg callers"

key-files:
  created: []
  modified:
    - lib/analysis.ts
    - lib/__tests__/analysis.test.ts

key-decisions:
  - "Open-stretch and short-race deltas are applied to adjustedStaticF before the dynamic blend (0.5 * adjustedStaticF + 0.5 * dynamicF) — modulates TRACK_BIAS_VOLTE rather than stacking separate modifier on final result"
  - "short_race_threshold is inclusive: raceDistance <= threshold triggers delta (1640m at 1640m threshold triggers -0.08)"
  - "Deltas are compile-time constants (+0.12, -0.08) — not configurable per-request"

patterns-established:
  - "adjustedStaticF: apply track config modifiers to static factor before dynamic blend"

requirements-completed:
  - TRACK-CS-01
  - TRACK-CS-02
  - TRACK-CS-03
  - TRACK-CS-04
  - TRACK-CS-06

# Metrics
duration: 2min
completed: 2026-04-05
---

# Phase 3 Plan 01: Extend computeTrackFactor with track config modifiers

**computeTrackFactor() extended with open-stretch (+0.12) and short-race (-0.08) deltas via optional TrackConfig and raceDistance params, verified with 8 new TDD tests (28 total green)**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-05T22:02:10Z
- **Completed:** 2026-04-05T22:03:56Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Extended `computeTrackFactor()` with optional `trackConfig?: TrackConfig` and `raceDistance?: number` params
- Applied open-stretch +0.12 delta to `adjustedStaticF` when `postPosition` is in `open_stretch_lanes`
- Applied short-race -0.08 delta when `raceDistance <= short_race_threshold` and `postPosition >= 5`
- Both deltas feed into the existing dynamic blend — modulating TRACK_BIAS_VOLTE rather than stacking
- All 3-arg callers in `lib/formscore.ts` remain 100% backwards-compatible (no changes required)
- 28 tests pass: 20 original + 8 new covering both modifier paths, simultaneous application, and fallback

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend computeTrackFactor with track config modifiers (RED→GREEN)** - `6e6602a` (feat)
2. **Task 2: Verify full test suite still green** - no commit (verification only, no files changed)

## Files Created/Modified

- `lib/analysis.ts` - Extended `computeTrackFactor()` with 5-param signature, `adjustedStaticF` logic, and `import type { TrackConfig } from "./types"`
- `lib/__tests__/analysis.test.ts` - Added `import type { TrackConfig }`, `solvalla` fixture, and 8 new `it()` blocks inside `describe("computeTrackFactor")`

## Decisions Made

- Deltas applied to `adjustedStaticF` BEFORE the dynamic blend per D-03 — this correctly modulates the TRACK_BIAS_VOLTE outer-post penalty rather than stacking independently on the final blended result
- `short_race_threshold` boundary is inclusive (`<=`) per plan spec Test 5: distance equal to threshold triggers the -0.08 delta
- `lib/formscore.ts` not modified — existing 3-arg calls to `computeTrackFactor` are backwards-compatible by design

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `computeTrackFactor()` is ready for use in Phase 3 Plan 02 (CS data flow wiring)
- Plans 02 and 03 can now call `computeTrackFactor(pos, method, history, trackConfig, raceDistance)` with full modifier support
- `lib/formscore.ts` callers remain unchanged — Plans 02/03 will wire trackConfig at the CS computation layer in AnalysisPanel

## Self-Check: PASSED

- FOUND: lib/analysis.ts
- FOUND: lib/__tests__/analysis.test.ts
- FOUND: 03-01-SUMMARY.md
- FOUND: commit 6e6602a
- computeTrackFactor 5-param signature confirmed
- adjustedStaticF variable confirmed in function body
- import type { TrackConfig } from "./types" confirmed

---
*Phase: 03-track-cs-adjustment-admin-ui*
*Completed: 2026-04-05*
