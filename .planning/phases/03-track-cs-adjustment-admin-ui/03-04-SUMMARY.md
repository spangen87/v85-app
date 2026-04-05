---
phase: 03-track-cs-adjustment-admin-ui
plan: "04"
subsystem: navigation
tags: [admin, nav, auth, bottonnav, topnav, server-component]
dependency_graph:
  requires: []
  provides: [admin-nav-entry-point]
  affects: [app/(authenticated)/layout.tsx, components/BottomNav.tsx, components/TopNav.tsx]
tech_stack:
  added: []
  patterns: [async-server-component, env-var-admin-check, conditional-nav]
key_files:
  created: []
  modified:
    - app/(authenticated)/layout.tsx
    - components/BottomNav.tsx
    - components/TopNav.tsx
decisions:
  - "Admin gate is cosmetic only in nav — real authorization enforced by admin/page.tsx server-side redirect"
  - "isAdmin computed independently in both layout.tsx (for BottomNav) and TopNav.tsx (already async, no prop needed)"
  - "ADMIN_USER_IDS parsed from env var server-side; never exposed to client"
metrics:
  duration: "2 minutes"
  completed: "2026-04-05T22:03:55Z"
  tasks_completed: 2
  files_modified: 3
---

# Phase 03 Plan 04: Admin Navigation Entry Points Summary

Admin nav entry points wired via server-side `ADMIN_USER_IDS` env check: BottomNav 5th tab (cog icon) and TopNav Admin link visible only to admin users.

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Make AuthenticatedLayout async, compute isAdmin, pass to BottomNav | 86fe1c8 | app/(authenticated)/layout.tsx, components/BottomNav.tsx |
| 2 | Add conditional Admin link to TopNav | dff4e8b | components/TopNav.tsx |

## What Was Built

### Task 1 — AuthenticatedLayout + BottomNav

`app/(authenticated)/layout.tsx` was converted from a synchronous to an async server component. It now fetches the current user via Supabase auth and computes `isAdmin` by checking the user's ID against the `ADMIN_USER_IDS` environment variable (comma-separated list). The boolean `isAdmin` is passed as a prop to `BottomNav`.

`components/BottomNav.tsx` was updated to accept `isAdmin?: boolean` (defaults to `false`). When `isAdmin` is `true`, a 5th tab is rendered after the existing 4 tabs. The tab uses a Heroicons cog-6-tooth (settings) filled SVG icon (24x24), the label "Admin", href `/admin`, and the same active/inactive color scheme as the other tabs (`text-indigo-600 dark:text-indigo-500` when active).

### Task 2 — TopNav Admin link

`components/TopNav.tsx` is already an async server component that fetches the user. The same `ADMIN_USER_IDS` pattern was added after the existing user fetch. When `isAdmin` is `true`, a `<NavActiveLink href="/admin" label="Admin" />` is rendered after the existing 4 nav links, before the spacer `<div className="flex-1" />`.

## Verification

- `npx tsc --noEmit` — exits 0 (no TypeScript errors)
- `npx jest --no-coverage` — 34/34 tests pass across 3 suites
- `npm run lint` — 4 pre-existing errors in unrelated files (InstallPrompt.tsx, RaceList.tsx, ThemeProvider.tsx, sallskap.ts); 0 new errors introduced by this plan

## Deviations from Plan

None — plan executed exactly as written. The lint errors found during verification are pre-existing in files untouched by this plan; logged to `deferred-items.md`.

## Known Stubs

None — no stubs or hardcoded placeholder values introduced.

## Threat Flags

No new security-relevant surface introduced. The admin nav links are cosmetic gates; real authorization is enforced by the server-side redirect in `admin/page.tsx` (existing, not modified here). The `ADMIN_USER_IDS` env var is read server-side only and never serialized to the client.

## Self-Check: PASSED
