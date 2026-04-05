---
phase: 03-track-cs-adjustment-admin-ui
plan: "03"
subsystem: admin-ui
tags: [admin, track-config, server-action, rls, auth-gate]
dependency_graph:
  requires:
    - 03-01-PLAN.md  # track_configs table + getTrackConfig
  provides:
    - getAllTrackConfigs server action
    - upsertTrackConfig server action
    - /admin page (gated by ADMIN_USER_IDS)
    - TrackConfigRow client component
  affects:
    - lib/actions/tracks.ts
    - app/(authenticated)/admin/page.tsx
    - components/admin/TrackConfigRow.tsx
tech_stack:
  added: []
  patterns:
    - Server component auth gate via ADMIN_USER_IDS env var + redirect
    - Service client (SUPABASE_SERVICE_ROLE_KEY) for write operations
    - Per-row client component form state with loading/success/error cycle
    - TDD: export stub tests before implementation
key_files:
  created:
    - lib/__tests__/admin_tracks.test.ts
    - app/(authenticated)/admin/page.tsx
    - components/admin/TrackConfigRow.tsx
  modified:
    - lib/actions/tracks.ts
decisions:
  - "Admin page uses server-side ADMIN_USER_IDS check before any data fetch — redirect on mismatch, no flash of admin content"
  - "upsertTrackConfig uses createServiceClient (service_role) not createClient (anon) — RLS write policy requires service_role"
  - "open_stretch_lanes validated client-side before calling server action — server receives pre-validated number[]"
  - "parsedLanes declared as const (array mutation is valid with const) — satisfies prefer-const lint rule"
metrics:
  duration: "~10 minutes"
  completed_date: "2026-04-05"
  tasks_completed: 2
  files_changed: 4
requirements:
  - TRACK-UI-01
  - TRACK-UI-02
  - TRACK-UI-03
  - TRACK-UI-04
---

# Phase 3 Plan 03: Admin UI for Track Configuration Summary

**One-liner:** Admin page at `/admin` gated by ADMIN_USER_IDS env var, showing all track_configs with per-row inline editing using upsertTrackConfig server action and service client.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (RED) | Add failing export tests | 60e9c67 | lib/__tests__/admin_tracks.test.ts |
| 1 (GREEN) | Add getAllTrackConfigs and upsertTrackConfig | d4faa7e | lib/actions/tracks.ts |
| 2 | Create admin page and TrackConfigRow component | 8abc34b | app/(authenticated)/admin/page.tsx, components/admin/TrackConfigRow.tsx |
| fix | Lint fix — prefer-const for parsedLanes | 2c3603f | components/admin/TrackConfigRow.tsx |

## What Was Built

### `lib/actions/tracks.ts` — Two new server actions appended

- **`getAllTrackConfigs()`** — fetches all rows from `track_configs` ordered by `track_name`, returns empty array on error
- **`upsertTrackConfig(config)`** — upserts a track row using `onConflict: "track_name"`, sets `updated_at: new Date().toISOString()`. Uses `createServiceClient()` (service_role key) to bypass RLS write restrictions.

### `app/(authenticated)/admin/page.tsx` — Server component with auth gate

Auth flow (server-side, before any render):
1. Get user from Supabase Auth — redirect to `/login` if not authenticated
2. Parse `ADMIN_USER_IDS` env var — redirect to `/` if user.id not in list
3. Call `getAllTrackConfigs()` — pass configs to `TrackConfigRow` per row

Empty state: shows "Inga banor konfigurerade." when no rows returned.

### `components/admin/TrackConfigRow.tsx` — Client component with per-row form state

Fields per row:
- `open_stretch` — toggle switch (aria-role="switch")
- `open_stretch_lanes` — text input (comma-separated), disabled+dimmed when open_stretch is off
- `short_race_threshold` — number input (0–9999 m)

Save flow:
1. Validate `open_stretch_lanes` tokens — each must parse as integer 1–20; invalid shows inline error, blocks server action call
2. Set `status: "loading"` → call `upsertTrackConfig()`
3. On success: `status: "success"` → button turns green "Sparad" → setTimeout 2000ms → resets to "idle"
4. On error: `status: "idle"` → shows red inline error text below button

### `lib/__tests__/admin_tracks.test.ts` — Export stub tests (TDD RED→GREEN)

Two tests confirming `getAllTrackConfigs` and `upsertTrackConfig` are exported as functions. No Supabase mock needed — tests verify exports only; live behavior verified manually per VALIDATION.md.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed `let` → `const` for `parsedLanes` in TrackConfigRow**
- **Found during:** ESLint run after Task 2 commit
- **Issue:** ESLint `prefer-const` rule flagged `let parsedLanes: number[] = []` — the array itself is never reassigned (only `.push()` is called), so `const` is correct
- **Fix:** Changed `let parsedLanes` to `const parsedLanes`
- **Files modified:** `components/admin/TrackConfigRow.tsx`
- **Commit:** 2c3603f

### Deferred Items

Pre-existing lint errors in `InstallPrompt.tsx`, `RaceList.tsx`, `ThemeProvider.tsx`, `sallskap.ts` (setState-in-effect warnings and unused variable) — out of scope for this plan. Logged to deferred-items.md.

## Known Stubs

None — all data is wired through `getAllTrackConfigs()` server action. The edit form binds to real `track_configs` rows; save calls `upsertTrackConfig()` which writes to the live DB.

## Threat Flags

No new threat surface beyond what the plan's threat model already covers:
- `/admin` route: gated server-side (T-3-03-01)
- `upsertTrackConfig`: service_role only (T-3-03-02)
- `open_stretch_lanes` input: client-side validation (T-3-03-03)

## Self-Check: PASSED

Files exist:
- FOUND: app/(authenticated)/admin/page.tsx
- FOUND: components/admin/TrackConfigRow.tsx
- FOUND: lib/__tests__/admin_tracks.test.ts
- FOUND: lib/actions/tracks.ts (modified)

Commits exist:
- 60e9c67 — test: failing export tests
- d4faa7e — feat: getAllTrackConfigs and upsertTrackConfig
- 8abc34b — feat: admin page + TrackConfigRow
- 2c3603f — fix: prefer-const lint
