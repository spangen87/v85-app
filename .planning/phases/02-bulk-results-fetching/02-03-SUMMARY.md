---
plan: 02-03
phase: 02-bulk-results-fetching
status: complete
gap_closure: true
gap_tests: [6b, 6c]
completed: 2026-04-06
---

## What Was Built

Closed UAT gaps 6b and 6c from phase 02.

## Changes

### lib/actions/games.ts (new)
- `deleteGame(gameId)` server action — auth-gated, uses service client to bypass RLS
- Cascades to races → starters automatically (ON DELETE CASCADE in schema)

### components/EvaluationPanel.tsx
- **Gap 6c**: "Laddade omgångar" section is now collapsible, collapsed by default. Shows count in heading. Toggle with ▶/▼ chevron.
- **Gap 6b**: Each game row without results now has an ✕ delete button. Clicking it optimistically removes from local state, calls `deleteGame`, then `router.refresh()`. On error, reverts local state and shows `alert`.
- `pendingGames` now derived from `localGames` (not prop `allGames`) so bulk button count updates after delete.

## UAT Gaps Closed

- Gap 6b (major): Omgångar utan resultat kan nu tas bort med ✕-knappen
- Gap 6c (minor): "Laddade omgångar" är nu kollapsad som standard
