# Retrospective

## Milestone: v1.0 — Bulk Results + Track CS

**Shipped:** 2026-04-06  
**Phases:** 3 | **Plans:** 9 | **Tasks:** ~15

### What Was Built

- `track_configs` DB-tabell med 15 seedade svenska travbanor och `TrackConfig` TypeScript-interface
- Bulk results-knapp med sekventiell hämtning, tre-status-feedback och delete av hopplösa omgångar
- `computeTrackFactor()` utökad med open-stretch (+0.12) och kort lopp (-0.08) CS-deltas
- `TrackAdjustmentBadge` i HorseCard + Spårfaktor-kolumn i AnalysisPanel
- Admin-sida `/admin` med per-bana inline-redigering, åtkomstskyddad via env-var

### What Worked

- **TDD-mönstret** (RED→GREEN) fungerade väl för algoritm-changes i `computeTrackFactor()` — 8 nya tester, 28 totalt gröna, noll regressioner
- **Gap-closure via `--gaps-only`** var effektivt — UAT identifierade 4 gaps (2 i fas 2, 2 i fas 3) som stängdes snabbt och atomärt
- **CONTEXT.md + beslutstabell** (D-01 till D-07) för fas 3 eliminerade algoritm-ambiguitet — inga "vad menar vi med detta?" under exekvering
- **Service client-mönstret** för RLS bypass (etablerat i `tracks.ts`, återanvänt i `games.ts`) är rent och konsekvent
- **Prop-threading** för `TrackConfig` från page.tsx → HorseCard fungerade utan arkitekturproblem

### What Was Inefficient

- **REQUIREMENTS.md-bockar** uppdaterades inte löpande — 17 av 22 krav stod som "Pending" trots att de var implementerade. Kräver manuell fixning vid milestone-avslut.
- **STATE.md** hölls inte uppdaterat under körning — speglade "Phase 03 execution started" länge efter att allt var klart. Bör uppdateras per fas.
- **ROADMAP.md plancount** stämde inte med verkligheten (fas 2 hade 3 planer, fas 3 hade 5 planer — inklusive gap-fixes) — tools tog inte hänsyn till gap-closure-planer i sin räkning.

### Patterns Established

- **Gap-plan namnkonvention:** `{fas}-{N+1}-PLAN.md` med `gap_closure: true` i frontmatter — exekveras med `--gaps-only`
- **deleteGame server action:** auth-gate (createClient) + service client (createServiceClient) — rätt mönster för autentiserade delete-operationer
- **Collapsible sections med `useState(false)`** som default — enkelt och utan dependency

### Key Lessons

- Kör `npx jest` och `npx tsc --noEmit` efter varje plan, inte bara i slutet
- Migrationerna måste appliceras manuellt (Supabase Dashboard) — sätt in det som en explicit checklistepunkt i varje plan som rör DB-schema
- Gap-closure-planer bör skapas direkt efter UAT, inte i efterhand — minskar friktion vid `--gaps-only`-körning

### Cost Observations

- Sessions: 2 (2026-04-05, 2026-04-06)
- Alla planer exekverades med sonnet-modellen
- Gap-fixes var snabba och riktade — bra signal på att UAT-diagnostiken var tillräcklig

---

## Cross-Milestone Trends

| Milestone | Phases | Plans | UAT Gaps | Gap Closure Rate |
|-----------|--------|-------|----------|-----------------|
| v1.0 | 3 | 9 | 4 | 100% (4/4) |
