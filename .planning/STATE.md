# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-05)

**Core value:** Rätt häst på rätt plats — snabb, datadrivet underlag för att ranka hästar i V85 och liknande spel, utan manuellt arbete.
**Current focus:** Phase 1 — Foundation (DB Schema & Types)

## Current Position

Phase: 1 of 3 (Foundation — DB Schema & Types)
Plan: 0 of ? in current phase
Status: Ready to plan
Last activity: 2026-04-05 — Roadmap created, requirements mapped, STATE.md initialized

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: -
- Total execution time: -

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: -
- Trend: -

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Phase 1: `track_name` is the join key to `games.track` — must match ATG API string exactly; verify against existing `games` rows before seeding migration
- Phase 1: RLS write policy uses service_role (not admin user check in DB); server action enforces ADMIN_USER_IDS env var check before calling service client
- Phase 3: Track-adjusted CS stays client-side only — never stored in `starters` — to prevent cross-algorithm evaluation comparisons
- Phase 3: Open-stretch modifier modulates (reduces) existing `TRACK_BIAS_VOLTE` outer-post penalty rather than stacking an additional modifier on top

### Pending Todos

None yet.

### Blockers/Concerns

- **Phase 3 pre-req:** The interaction between `TRACK_BIAS_VOLTE` and the open-stretch/short-race modifiers needs an explicit "replace vs modulate" decision with worked examples before Phase 3 coding starts. Captured as research flag in SUMMARY.md.
- **Phase 1 data risk:** ATG API track name strings (e.g. "Åby" vs "Åby travbana") must be verified against the live `games` table before writing migration seed data. A mismatch silently breaks all track config lookups.

## Session Continuity

Last session: 2026-04-05
Stopped at: Roadmap created and written to disk. REQUIREMENTS.md traceability already populated (phase assignments were set during requirements definition). Ready to run /gsd-plan-phase 1.
Resume file: None
