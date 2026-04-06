---
phase: 03-track-cs-adjustment-admin-ui
plan: "02"
subsystem: ui
tags: [track-factor, horse-card, analysis-panel, cs-adjustment, badge]
dependency_graph:
  requires:
    - "03-01-PLAN.md"
  provides:
    - TrackAdjustmentBadge in HorseCard compact view
    - trackConfig prop chain from page.tsx through MainPageClient → RaceList → HorseCard + AnalysisPanel
    - AnalysisPanel spårfaktor column with base vs adjusted delta
  affects:
    - app/(authenticated)/page.tsx
    - components/MainPageClient.tsx
    - components/RaceList.tsx
    - components/HorseCard.tsx
    - components/AnalysisPanel.tsx
tech_stack:
  added: []
  patterns:
    - Server-side TrackConfig fetch passed as serialized prop to client components
    - Client-side computeTrackFactor() called inline for badge delta computation
    - Conditional rendering: badge only shown when abs(delta) >= 1 CS point
key_files:
  created: []
  modified:
    - app/(authenticated)/page.tsx
    - components/MainPageClient.tsx
    - components/RaceList.tsx
    - components/HorseCard.tsx
    - components/AnalysisPanel.tsx
decisions:
  - TrackConfig fetched server-side in page.tsx (single await after selectedGame derived) — not re-fetched client-side
  - trackDelta heuristic: (adjustedF - baseF) * 500 — approximation sufficient for >= 1 threshold display; exact CS impact requires full-field normalization
  - TrackAdjustmentBadge defined inline in HorseCard (not a separate file) — matches existing ScoreBadge pattern
  - AnalysisPanel shows spårfaktor column only when trackConfig is present — no layout change when no config
metrics:
  duration: "~25 minutes"
  completed: "2026-04-05T22:13:07Z"
  tasks_completed: 2
  files_modified: 5
requirements:
  - TRACK-CS-05
  - TRACK-UI-05
---

# Phase 3 Plan 02: TrackConfig Prop Threading + TrackAdjustmentBadge Summary

TrackConfig fetched server-side in page.tsx, threaded through MainPageClient → RaceList → HorseCard and AnalysisPanel; HorseCard renders a green ↑ or red ↓ badge after ScoreBadge when the track factor adjusts CS by ≥1 point.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Fetch TrackConfig in page.tsx and thread prop to RaceList via MainPageClient | cbed74f | page.tsx, MainPageClient.tsx, RaceList.tsx, AnalysisPanel.tsx |
| 2 | Add TrackAdjustmentBadge to HorseCard compact view | cbed74f | HorseCard.tsx |

## What Was Built

### Task 1 — TrackConfig prop threading

**`app/(authenticated)/page.tsx`**
- Added `import { getTrackConfig } from "@/lib/actions/tracks"` and `TrackConfig` type import
- After `selectedGame` is derived, added: `const trackConfig: TrackConfig | null = selectedGame ? await getTrackConfig(selectedGame.track) : null`
- Passed `trackConfig` to `<MainPageClient>` JSX

**`components/MainPageClient.tsx`**
- Added `TrackConfig` to type imports from `@/lib/types`
- Added `trackConfig?: TrackConfig | null` to `MainPageClientProps` interface
- Added `trackConfig = null` to function destructuring
- Passed `trackConfig` to `<RaceList>` JSX

**`components/RaceList.tsx`**
- Added `TrackConfig` to type imports from `@/lib/types`
- Added `trackConfig?: TrackConfig | null` to props type and destructuring
- Passed `trackConfig={trackConfig ?? undefined}` to `<AnalysisPanel>` and `<HorseCard>`

**`components/AnalysisPanel.tsx`**
- Added `import { computeTrackFactor }` from `@/lib/analysis` and `TrackConfig` type import
- Added `trackConfig?: TrackConfig` to `AnalysisPanelProps`
- Extended `RankedStarter` interface with `trackFactorBase`, `trackFactorAdjusted`, `trackFactorDelta` fields
- Updated `rankStarters()` to accept and use `trackConfig`, computing per-horse track factor delta
- Added conditional "Spårfaktor" column in the analysis table header and per-row cells — shows adjusted value + delta badge when `Math.abs(delta) >= 0.01`

### Task 2 — TrackAdjustmentBadge

**`components/HorseCard.tsx`**
- Added `import { computeTrackFactor }` from `@/lib/analysis` and `TrackConfig` type import
- Added `trackConfig?: TrackConfig` to HorseCard props
- Added `TrackAdjustmentBadge` component (defined inline near `ScoreBadge`):
  - Green `↑` badge: `bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400`
  - Red `↓` badge: `bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400`
  - `title` tooltip: Swedish copy per UI-SPEC ("Open stretch: +0.12 (spår N, Bannamn)" or "Kort lopp: -0.08 (spår N)")
  - `aria-label`: "Spårjustering: +N CS-poäng (open stretch)" / "Spårjustering: -N CS-poäng (kort lopp)"
- Added `trackDelta` computation before JSX return: `Math.round((adjustedF - baseF) * 500)`, null if `|csDelta| < 1`
- Rendered `<TrackAdjustmentBadge>` immediately after `<ScoreBadge>` in the right-side badge row — only when `trackDelta !== null && trackConfig && starter.post_position != null`

## Verification Results

- `npx tsc --noEmit`: exit 0 — no TypeScript errors
- `npx jest --no-coverage`: 45/45 tests passed, 4 suites
- `npm run lint`: 4 pre-existing issues (3 errors in `InstallPrompt.tsx`, `ThemeProvider.tsx`; 1 warning in `sallskap.ts`) — none introduced by this plan

## Deviations from Plan

None — plan executed exactly as written.

The only minor note: Tasks 1 and 2 were committed in a single atomic commit (`cbed74f`) because Task 2 resolves the TypeScript error introduced by Task 1 (passing `trackConfig` to HorseCard before HorseCard accepted it). Committing both together keeps the repo in a green TypeScript state at every commit.

## Known Stubs

None. All data flows are wired end-to-end:
- `getTrackConfig()` queries the `track_configs` table seeded in Phase 1
- `computeTrackFactor()` uses the live `TrackConfig` data
- Badge renders conditionally based on actual computed delta

## Threat Flags

No new threat surface introduced beyond what the plan's threat model already covers. `TrackConfig` is non-sensitive configuration data flowing server → client as a serialized prop (T-3-02-01: accepted). Track-adjusted CS is never persisted (T-3-02-02: accepted).

## Self-Check: PASSED

| Item | Status |
|------|--------|
| `app/(authenticated)/page.tsx` exists | FOUND |
| `components/HorseCard.tsx` exists | FOUND |
| `components/AnalysisPanel.tsx` exists | FOUND |
| `.planning/phases/03-track-cs-adjustment-admin-ui/03-02-SUMMARY.md` exists | FOUND |
| Commit `cbed74f` exists | FOUND |
| TypeScript compiles clean | PASSED |
| Jest 45/45 tests pass | PASSED |
