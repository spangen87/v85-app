# Milestones

## v1.0 Bulk Results + Track CS (Shipped: 2026-04-06)

**Phases completed:** 3 phases, 9 plans, 15 tasks  
**Files changed:** 69 files, ~11k insertions  
**Timeline:** 2026-04-05 → 2026-04-06

**Key accomplishments:**

1. `track_configs` Supabase-tabell med 15 svenska travbanor, RLS-policies, `TrackConfig` TypeScript-interface och `getTrackConfig()` server action — enhetstestad och TypeScript-ren
2. Utvärderingssidan refaktorerad för att visa ALLA laddade omgångar med täckningsstatus ("Klar"/"Saknar resultat"-badges)
3. `BulkResultsButton`: sekventiell hämtning med 500ms fördröjning, tre-status-feedback (Klar/Inte redo/Fel), samt delete-knapp för omgångar som inte kan hämtas
4. `computeTrackFactor()` utökad med open-stretch (+0.12) och kort lopp (-0.08) CS-deltas via valfria `TrackConfig`/`raceDistance`-parametrar — bakåtkompatibel, 28 tester gröna
5. `TrackAdjustmentBadge` i HorseCard och Spårfaktor-kolumn i AnalysisPanel visar live CS-justeringar med tooltip
6. Admin-sida `/admin` med per-bana inline-redigering, åtkomstkontroll via `ADMIN_USER_IDS` env-var, service-klient-baserad upsert

---
