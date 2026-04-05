# Roadmap: v85-app — Bulk Results + Track CS Adjustment

## Overview

This milestone adds two complementary features to the existing Next.js + Supabase trotting
analysis app. Phase 1 establishes the database foundation that track CS adjustment depends on.
Phase 2 delivers bulk results fetching — an independent, immediately user-visible improvement
to the evaluation view. Phase 3 closes the loop: wires track configuration into the CS formula
and provides an admin UI to correct pre-seeded track values. All three phases extend established
codebase patterns without introducing new dependencies or architectural primitives.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation — DB Schema & Types** - Create `track_configs` table, seed 10 Swedish tracks, define TypeScript interface and server actions (completed 2026-04-05)
- [ ] **Phase 2: Bulk Results Fetching** - Add "Hämta alla resultat" button to evaluation view with sequential fetching and per-round status
- [ ] **Phase 3: Track CS Adjustment & Admin UI** - Wire track config into `computeTrackFactor()`, add HorseCard visual indicator, and global admin page

## Phase Details

### Phase 1: Foundation — DB Schema & Types
**Goal**: Track configuration data exists in the database, is readable by all authenticated users, and is fully typed — unblocking all Phase 3 CS and admin work
**Depends on**: Nothing (first phase)
**Requirements**: TRACK-DB-01, TRACK-DB-02, TRACK-DB-03, TRACK-DB-04, TRACK-DB-05
**Success Criteria** (what must be TRUE):
  1. The `track_configs` table exists in Supabase with the correct columns and at least 10 pre-populated Swedish track rows
  2. An authenticated user can read from `track_configs` via Supabase; an unauthenticated request is rejected by RLS
  3. Calling `getTrackConfig("Solvalla")` from a server action returns a typed `TrackConfig` object (not `null`)
  4. The `TrackConfig` TypeScript interface in `lib/types.ts` compiles without errors and covers all DB columns
  5. Write operations to `track_configs` from the browser anon key are blocked by RLS policy
**Plans**: 1 plan

Plans:
- [ ] 01-PLAN.md — Migration v9 (track_configs table + RLS + 15-row seed), TrackConfig interface, getTrackConfig server action, unit tests

### Phase 2: Bulk Results Fetching
**Goal**: Users can fetch results for all pending evaluation rounds with one button click, see per-round status, and continue seeing partial results when some rounds fail or are not yet ready
**Depends on**: Nothing (independent of Phase 1)
**Requirements**: EVAL-01, EVAL-02, EVAL-03, EVAL-04, EVAL-05
**Success Criteria** (what must be TRUE):
  1. The evaluation view lists all loaded rounds and shows which ones are missing results at a glance
  2. Clicking "Hämta alla resultat" triggers sequential fetching — each round waits for the previous to complete before starting
  3. Rounds that return HTTP 422 (not ready yet) are shown as "Inte redo" and are not counted as errors
  4. Rounds that succeed show "Klar" and rounds that fail with a server error show a distinct error state — both visible simultaneously after a partial-success batch
  5. The button becomes disabled while fetching is in progress and re-enables when the batch completes
**Plans**: TBD
**UI hint**: yes

### Phase 3: Track CS Adjustment & Admin UI
**Goal**: CS rankings reflect track-specific post-position bias using the configured data, admins can review and correct pre-seeded values, and horse cards show when a track factor changed a horse's CS
**Depends on**: Phase 1
**Requirements**: TRACK-CS-01, TRACK-CS-02, TRACK-CS-03, TRACK-CS-04, TRACK-CS-05, TRACK-CS-06, TRACK-UI-01, TRACK-UI-02, TRACK-UI-03, TRACK-UI-04, TRACK-UI-05, TRACK-UI-06
**Success Criteria** (what must be TRUE):
  1. A horse in post position 1 on an open-stretch track (e.g. Solvalla) receives a higher `computeTrackFactor()` value than the same horse would receive with the static fallback alone
  2. A horse in post position 7 or higher on a short-race track receives a lower factor when `race.distance` is below the configured threshold
  3. When no `TrackConfig` is available, `computeTrackFactor()` produces identical output to the current static implementation — no existing CS scores change
  4. A horse card shows a green (bra spår) or red (dåligt spår) badge next to CS when the track factor produced a non-zero bonus or penalty for that horse's post position
  5. Navigating to `/admin` as a configured admin user shows a form per track where open stretch, favored lanes, and short-race threshold can be edited and saved
  6. Saving a track update via the admin form persists the change to `track_configs` and the updated value is reflected immediately on next page load
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation — DB Schema & Types | 1/1 | Complete   | 2026-04-05 |
| 2. Bulk Results Fetching | 0/? | Not started | - |
| 3. Track CS Adjustment & Admin UI | 0/? | Not started | - |
